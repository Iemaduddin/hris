"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { canManageUsers } from "@/src/lib/auth-guard";
import { catatAudit } from "@/src/modules/audit/lib/audit";
import { generateEmployeeNumber } from "./employee.actions";
import {
	HEADER_KARYAWAN,
	HEADER_RIWAYAT,
	MAKS_BARIS_IMPOR,
	buildCsv,
	parseCsv,
	validasiBentukKaryawan,
	validasiBentukRiwayat,
} from "../lib/impor";

export type ImporActionResult = { success: boolean; message: string; dibuat?: number };

export type BarisImpor = { noBaris: number; ringkasan: string; galat: string[] };

export type HasilValidasiImpor = {
	total: number;
	jumlahValid: number;
	jumlahGagal: number;
	baris: BarisImpor[];
};

/** Revalidate best-effort: di luar konteks request (E2E/CLI) Next melempar — abaikan. */
function segarkan(path: string): void {
	try {
		revalidatePath(path);
	} catch {
		// abaikan — hygiene cache, bukan logika inti
	}
}

function keObj(header: readonly string[], cells: string[]): Record<string, string> {
	const obj: Record<string, string> = {};
	header.forEach((h, i) => {
		obj[h] = (cells[i] ?? "").trim();
	});
	return obj;
}

async function boleh(): Promise<boolean> {
	try {
		return await canManageUsers();
	} catch {
		return false;
	}
}

/** Validasi kering impor karyawan: bentuk + NIK/nomor ganda (intra-file & vs DB). */
export async function validasiImporKaryawanInti(csv: string): Promise<HasilValidasiImpor & { success: boolean; message: string }> {
	const tabel = parseCsv(csv);
	if (tabel.length === 0) return { success: false, message: "File kosong.", total: 0, jumlahValid: 0, jumlahGagal: 0, baris: [] };
	const header = tabel[0].map((h) => h.trim());
	for (const h of HEADER_KARYAWAN) {
		if (!header.includes(h)) {
			return { success: false, message: `Header kurang kolom: ${h}. Unduh template dulu.`, total: 0, jumlahValid: 0, jumlahGagal: 0, baris: [] };
		}
	}
	const dataRows = tabel.slice(1);
	if (dataRows.length > MAKS_BARIS_IMPOR) {
		return { success: false, message: `Maksimal ${MAKS_BARIS_IMPOR} baris per impor.`, total: 0, jumlahValid: 0, jumlahGagal: 0, baris: [] };
	}

	const objs = dataRows.map((cells, i) => ({ noBaris: i + 2, obj: keObj(header, cells) }));
	const bentuk = objs.map(({ noBaris, obj }) => validasiBentukKaryawan(obj, noBaris));

	// NIK/nomor yang sudah ada di DB.
	const nikFile = [...new Set(objs.map(({ obj }) => obj["nik"]).filter(Boolean))];
	const nomorFile = [...new Set(objs.map(({ obj }) => obj["nomorKaryawan"]).filter(Boolean))];
	const [nikDb, nomorDb] = await Promise.all([
		nikFile.length
			? prisma.karyawan.findMany({ where: { nik: { in: nikFile } }, select: { nik: true } })
			: [],
		nomorFile.length
			? prisma.karyawan.findMany({ where: { nomorKaryawan: { in: nomorFile } }, select: { nomorKaryawan: true } })
			: [],
	]);
	const nikDbSet = new Set(nikDb.map((r) => r.nik));
	const nomorDbSet = new Set(nomorDb.map((r) => r.nomorKaryawan));

	// Ganda intra-file.
	const hitung = (arr: string[]) => {
		const m = new Map<string, number>();
		for (const v of arr) if (v) m.set(v, (m.get(v) ?? 0) + 1);
		return new Set([...m.entries()].filter(([, n]) => n > 1).map(([v]) => v));
	};
	const nikGandaFile = hitung(objs.map(({ obj }) => obj["nik"]));
	const nomorGandaFile = hitung(objs.map(({ obj }) => obj["nomorKaryawan"]));

	const baris: BarisImpor[] = bentuk.map(({ noBaris, data }) => {
		const galat = [...validasiBentukKaryawan(data, noBaris).galat];
		const nik = data["nik"];
		const nomor = data["nomorKaryawan"];
		if (nik && nikGandaFile.has(nik)) galat.push("nik ganda di file ini");
		if (nik && nikDbSet.has(nik)) galat.push("nik sudah dipakai karyawan lain");
		if (nomor && nomorGandaFile.has(nomor)) galat.push("nomorKaryawan ganda di file ini");
		if (nomor && nomorDbSet.has(nomor)) galat.push("nomorKaryawan sudah dipakai");
		return { noBaris, ringkasan: `${data["namaLengkap"] || "(tanpa nama)"}${nomor ? ` • ${nomor}` : ""}`, galat };
	});

	const jumlahGagal = baris.filter((b) => b.galat.length > 0).length;
	return {
		success: true,
		message: jumlahGagal === 0 ? `${baris.length} baris siap diimpor.` : `${jumlahGagal} dari ${baris.length} baris bermasalah.`,
		total: baris.length,
		jumlahValid: baris.length - jumlahGagal,
		jumlahGagal,
		baris,
	};
}

/** Eksekusi impor karyawan (validasi ulang; gagal bila ada satu baris bermasalah). */
export async function eksekusiImporKaryawanInti(csv: string, actorUserId?: string): Promise<ImporActionResult> {
	const cek = await validasiImporKaryawanInti(csv);
	if (!cek.success) return { success: false, message: cek.message };
	if (cek.jumlahGagal > 0) return { success: false, message: `${cek.jumlahGagal} baris bermasalah — perbaiki dulu.` };
	if (cek.total === 0) return { success: false, message: "Tidak ada baris data." };

	const tabel = parseCsv(csv);
	const header = tabel[0].map((h) => h.trim());
	const objs = tabel.slice(1).map((cells) => keObj(header, cells));

	let dibuat = 0;
	for (const o of objs) {
		let nomor = o["nomorKaryawan"];
		if (!nomor) {
			const gen = await generateEmployeeNumber({ joinDate: o["tanggalMasuk"] || undefined });
			if (!gen.success) return { success: false, message: `Gagal generate nomor baris ${o["namaLengkap"]}: ${gen.message}` };
			nomor = gen.employeeNumber;
		}
		await prisma.karyawan.create({
			data: {
				nomorKaryawan: nomor,
				namaLengkap: o["namaLengkap"],
				gender: o["gender"] as never,
				tanggalLahir: o["tanggalLahir"] ? new Date(o["tanggalLahir"]) : null,
				nik: o["nik"] || null,
				npwp: o["npwp"] || null,
				telepon: o["telepon"] || null,
				email: o["email"] || null,
				alamat: o["alamat"] || null,
				statusPtkp: (o["statusPtkp"] || "TK_0") as never,
				tanggalMasuk: new Date(o["tanggalMasuk"]),
				bankNama: o["bankNama"] || null,
				bankNorek: o["bankNorek"]?.replace(/\s+/g, "") || null,
				bankAtasNama: o["bankAtasNama"] || null,
				status: (o["status"] || "AKTIF") as never,
			},
		});
		dibuat++;
	}

	await catatAudit({
		actorUserId: actorUserId ?? null,
		aksi: "IMPORT.KARYAWAN",
		entityType: "Karyawan",
		entityId: "bulk",
		sebelum: null,
		sesudah: { dibuat, total: cek.total },
		alasan: `Impor CSV ${dibuat} karyawan`,
	});
	segarkan("/employees");
	segarkan("/employees/import");
	return { success: true, message: `${dibuat} karyawan diimpor.`, dibuat };
}

/** Validasi kering impor riwayat (append; karyawan dicocokkan via nomorKaryawan). */
export async function validasiImporRiwayatInti(csv: string): Promise<HasilValidasiImpor & { success: boolean; message: string }> {
	const tabel = parseCsv(csv);
	if (tabel.length === 0) return { success: false, message: "File kosong.", total: 0, jumlahValid: 0, jumlahGagal: 0, baris: [] };
	const header = tabel[0].map((h) => h.trim());
	for (const h of HEADER_RIWAYAT) {
		if (!header.includes(h)) {
			return { success: false, message: `Header kurang kolom: ${h}. Unduh template dulu.`, total: 0, jumlahValid: 0, jumlahGagal: 0, baris: [] };
		}
	}
	const dataRows = tabel.slice(1);
	if (dataRows.length > MAKS_BARIS_IMPOR) {
		return { success: false, message: `Maksimal ${MAKS_BARIS_IMPOR} baris per impor.`, total: 0, jumlahValid: 0, jumlahGagal: 0, baris: [] };
	}
	const nomorUnik = [...new Set(dataRows.map((cells) => (cells[header.indexOf("nomorKaryawan")] ?? "").trim()).filter(Boolean))];
	const ada = await prisma.karyawan.findMany({
		where: { nomorKaryawan: { in: nomorUnik } },
		select: { nomorKaryawan: true },
	});
	const adaSet = new Set(ada.map((r) => r.nomorKaryawan));
	const baris: BarisImpor[] = dataRows.map((cells, i) => {
		const obj = keObj(header, cells);
		const galat = [...validasiBentukRiwayat(obj, i + 2).galat];
		if (obj["nomorKaryawan"] && !adaSet.has(obj["nomorKaryawan"])) galat.push("nomorKaryawan tidak ditemukan");
		return { noBaris: i + 2, ringkasan: `${obj["nomorKaryawan"] || "-"} • ${obj["namaPerusahaan"] || "-"}`, galat };
	});
	const jumlahGagal = baris.filter((b) => b.galat.length > 0).length;
	return {
		success: true,
		message: jumlahGagal === 0 ? `${baris.length} baris siap diimpor.` : `${jumlahGagal} dari ${baris.length} baris bermasalah.`,
		total: baris.length,
		jumlahValid: baris.length - jumlahGagal,
		jumlahGagal,
		baris,
	};
}

/** Eksekusi impor riwayat (append ke data yang ada). */
export async function eksekusiImporRiwayatInti(csv: string, actorUserId?: string): Promise<ImporActionResult> {
	const cek = await validasiImporRiwayatInti(csv);
	if (!cek.success) return { success: false, message: cek.message };
	if (cek.jumlahGagal > 0) return { success: false, message: `${cek.jumlahGagal} baris bermasalah — perbaiki dulu.` };
	if (cek.total === 0) return { success: false, message: "Tidak ada baris data." };

	const tabel = parseCsv(csv);
	const header = tabel[0].map((h) => h.trim());
	const idMap = new Map(
		(
			await prisma.karyawan.findMany({
				where: { nomorKaryawan: { in: tabel.slice(1).map((c) => (c[header.indexOf("nomorKaryawan")] ?? "").trim()).filter(Boolean) } },
				select: { id: true, nomorKaryawan: true },
			})
		).map((k) => [k.nomorKaryawan, k.id]),
	);
	let dibuat = 0;
	for (const cells of tabel.slice(1)) {
		const o = keObj(header, cells);
		const karyawanId = idMap.get(o["nomorKaryawan"]);
		if (!karyawanId) continue;
		await prisma.riwayatPekerjaan.create({
			data: {
				karyawanId,
				namaPerusahaan: o["namaPerusahaan"],
				posisi: o["posisi"] || null,
				tanggalMulai: o["tanggalMulai"] ? new Date(o["tanggalMulai"]) : null,
				tanggalSelesai: o["tanggalSelesai"] ? new Date(o["tanggalSelesai"]) : null,
				gajiTerakhir: o["gajiTerakhir"] ? o["gajiTerakhir"] : null,
				alasanKeluar: o["alasanKeluar"] || null,
				teleponReferensi: o["teleponReferensi"] || null,
			},
		});
		dibuat++;
	}
	await catatAudit({
		actorUserId: actorUserId ?? null,
		aksi: "IMPORT.RIWAYAT",
		entityType: "RiwayatPekerjaan",
		entityId: "bulk",
		sebelum: null,
		sesudah: { dibuat, total: cek.total },
		alasan: `Impor CSV ${dibuat} riwayat`,
	});
	segarkan("/employees/import");
	return { success: true, message: `${dibuat} riwayat diimpor (append).`, dibuat };
}

/** Ekspor CSV karyawan (kolom sama dengan template impor). */
export async function eksporKaryawanInti(): Promise<{ success: boolean; message: string; csv?: string }> {
	const rows = await prisma.karyawan.findMany({
		orderBy: { namaLengkap: "asc" },
		select: {
			nomorKaryawan: true, namaLengkap: true, gender: true, tanggalLahir: true, nik: true, npwp: true,
			telepon: true, email: true, alamat: true, statusPtkp: true, tanggalMasuk: true,
			bankNama: true, bankNorek: true, bankAtasNama: true, status: true,
		},
	});
	const matrix = rows.map((k) => [
		k.nomorKaryawan, k.namaLengkap, k.gender,
		k.tanggalLahir ? k.tanggalLahir.toISOString().slice(0, 10) : "",
		k.nik ?? "", k.npwp ?? "", k.telepon ?? "", k.email ?? "", k.alamat ?? "",
		k.statusPtkp, k.tanggalMasuk.toISOString().slice(0, 10),
		k.bankNama ?? "", k.bankNorek ?? "", k.bankAtasNama ?? "", k.status,
	]);
	return { success: true, message: `${rows.length} baris.`, csv: buildCsv(HEADER_KARYAWAN, matrix) };
}

/** Ekspor CSV riwayat pekerjaan. */
export async function eksporRiwayatInti(): Promise<{ success: boolean; message: string; csv?: string }> {
	const rows = await prisma.riwayatPekerjaan.findMany({
		orderBy: [{ karyawan: { namaLengkap: "asc" } }, { tanggalMulai: "asc" }],
		include: { karyawan: { select: { nomorKaryawan: true } } },
	});
	const matrix = rows.map((r) => [
		r.karyawan.nomorKaryawan, r.namaPerusahaan, r.posisi ?? "",
		r.tanggalMulai ? r.tanggalMulai.toISOString().slice(0, 10) : "",
		r.tanggalSelesai ? r.tanggalSelesai.toISOString().slice(0, 10) : "",
		r.gajiTerakhir ? r.gajiTerakhir.toString() : "",
		r.alasanKeluar ?? "", r.teleponReferensi ?? "",
	]);
	return { success: true, message: `${rows.length} baris.`, csv: buildCsv(HEADER_RIWAYAT, matrix) };
}

export type MasalahKualitas = {
	kunci: string;
	label: string;
	jumlah: number;
	contoh: Array<{ id: string; nomorKaryawan: string; namaLengkap: string; info: string }>;
};

/** Dashboard kualitas data: NIK ganda + field tak lengkap + relasi hilang. */
export async function getKualitasDataInti(): Promise<{ success: boolean; message: string; masalah?: MasalahKualitas[] }> {
	const semua = await prisma.karyawan.findMany({
		orderBy: { namaLengkap: "asc" },
		select: {
			id: true, nomorKaryawan: true, namaLengkap: true, nik: true, telepon: true, email: true, alamat: true,
			bankNama: true, bankNorek: true, bankAtasNama: true, atasanLangsungId: true, userId: true,
			posisiKaryawan: { where: { isCurrent: true }, take: 1, select: { id: true } },
			kontrakKerja: { where: { status: { in: ["AKTIF", "AKAN_BERAKHIR"] } }, take: 1, select: { id: true } },
		},
	});

	const grupNik = new Map<string, typeof semua>();
	for (const k of semua) {
		if (!k.nik) continue;
		const arr = grupNik.get(k.nik) ?? [];
		arr.push(k);
		grupNik.set(k.nik, arr);
	}
	const ganda = [...grupNik.values()].filter((arr) => arr.length > 1);

	const ambil = (pred: (k: (typeof semua)[number]) => string | null): MasalahKualitas["contoh"] =>
		semua
			.map((k) => ({ k, info: pred(k) }))
			.filter((x): x is { k: (typeof semua)[number]; info: string } => x.info !== null)
			.slice(0, 100)
			.map(({ k, info }) => ({ id: k.id, nomorKaryawan: k.nomorKaryawan, namaLengkap: k.namaLengkap, info }));

	const masalah: MasalahKualitas[] = [
		{
			kunci: "nik-ganda",
			label: "NIK ganda",
			jumlah: ganda.reduce((a, arr) => a + arr.length, 0),
			contoh: ganda.flatMap((arr) => arr.map((k) => ({ id: k.id, nomorKaryawan: k.nomorKaryawan, namaLengkap: k.namaLengkap, info: `NIK ${k.nik} dipakai ${arr.length}x` }))).slice(0, 100),
		},
		{ kunci: "tanpa-nik", label: "Tanpa NIK", jumlah: 0, contoh: ambil((k) => (!k.nik ? "NIK kosong" : null)) },
		{ kunci: "tanpa-telepon", label: "Tanpa telepon", jumlah: 0, contoh: ambil((k) => (!k.telepon ? "Telepon kosong" : null)) },
		{ kunci: "tanpa-alamat", label: "Tanpa alamat", jumlah: 0, contoh: ambil((k) => (!k.alamat ? "Alamat kosong" : null)) },
		{ kunci: "tanpa-email", label: "Tanpa email", jumlah: 0, contoh: ambil((k) => (!k.email ? "Email kosong" : null)) },
		{
			kunci: "rekening-tak-lengkap",
			label: "Rekening tak lengkap",
			jumlah: 0,
			contoh: ambil((k) => {
				const isi = [k.bankNama, k.bankNorek, k.bankAtasNama].filter(Boolean).length;
				return isi > 0 && isi < 3 ? `${isi}/3 field terisi` : null;
			}),
		},
		{ kunci: "tanpa-penempatan", label: "Tanpa penempatan aktif", jumlah: 0, contoh: ambil((k) => (k.posisiKaryawan.length === 0 ? "Tak ada posisi current" : null)) },
		{ kunci: "tanpa-kontrak", label: "Tanpa kontrak aktif", jumlah: 0, contoh: ambil((k) => (k.kontrakKerja.length === 0 ? "Tak ada kontrak AKTIF" : null)) },
		{ kunci: "tanpa-atasan", label: "Tanpa atasan langsung", jumlah: 0, contoh: ambil((k) => (!k.atasanLangsungId ? "Atasan kosong" : null)) },
		{ kunci: "tanpa-akun", label: "Tanpa akun login", jumlah: 0, contoh: ambil((k) => (!k.userId ? "Belum taut user" : null)) },
	];
	// Jumlah eksak dihitung dari seluruh data (contoh dibatasi 100 baris).
	const hitungPenuh = (pred: (k: (typeof semua)[number]) => boolean) => semua.filter(pred).length;
	const peta: Record<string, (k: (typeof semua)[number]) => boolean> = {
		"tanpa-nik": (k) => !k.nik,
		"tanpa-telepon": (k) => !k.telepon,
		"tanpa-alamat": (k) => !k.alamat,
		"tanpa-email": (k) => !k.email,
		"rekening-tak-lengkap": (k) => {
			const isi = [k.bankNama, k.bankNorek, k.bankAtasNama].filter(Boolean).length;
			return isi > 0 && isi < 3;
		},
		"tanpa-penempatan": (k) => k.posisiKaryawan.length === 0,
		"tanpa-kontrak": (k) => k.kontrakKerja.length === 0,
		"tanpa-atasan": (k) => !k.atasanLangsungId,
		"tanpa-akun": (k) => !k.userId,
	};
	for (const m of masalah) {
		const fn = peta[m.kunci];
		if (fn) m.jumlah = hitungPenuh(fn);
	}
	return { success: true, message: "OK", masalah };
}

// ============================================================
// Wrapper berizin (ADMIN_HR/SUPER_ADMIN) untuk UI. Inti (*Inti)
// dipakai E2E tanpa konteks sesi.
// ============================================================

export async function validasiImporKaryawan(csv: string) {
	if (!(await boleh())) return { success: false, message: "Anda tidak memiliki izin.", total: 0, jumlahValid: 0, jumlahGagal: 0, baris: [] };
	return validasiImporKaryawanInti(csv);
}

export async function eksekusiImporKaryawan(csv: string, actorUserId?: string) {
	if (!(await boleh())) return { success: false, message: "Anda tidak memiliki izin." };
	return eksekusiImporKaryawanInti(csv, actorUserId);
}

export async function validasiImporRiwayat(csv: string) {
	if (!(await boleh())) return { success: false, message: "Anda tidak memiliki izin.", total: 0, jumlahValid: 0, jumlahGagal: 0, baris: [] };
	return validasiImporRiwayatInti(csv);
}

export async function eksekusiImporRiwayat(csv: string, actorUserId?: string) {
	if (!(await boleh())) return { success: false, message: "Anda tidak memiliki izin." };
	return eksekusiImporRiwayatInti(csv, actorUserId);
}

export async function eksporKaryawan() {
	if (!(await boleh())) return { success: false, message: "Anda tidak memiliki izin." };
	return eksporKaryawanInti();
}

export async function eksporRiwayat() {
	if (!(await boleh())) return { success: false, message: "Anda tidak memiliki izin." };
	return eksporRiwayatInti();
}

export async function getKualitasData() {
	if (!(await boleh())) return { success: false, message: "Anda tidak memiliki izin." };
	return getKualitasDataInti();
}
