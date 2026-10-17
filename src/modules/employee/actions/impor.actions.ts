"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { canManageUsers } from "@/src/lib/auth-guard";
import { recordAudit } from "@/src/modules/audit/lib/audit";
import { generateEmployeeNumber } from "./employee.actions";
import {
	EMPLOYEE_CSV_HEADERS,
	HISTORY_CSV_HEADERS,
	MAX_IMPORT_ROWS,
	buildCsv,
	parseCsv,
	validateEmployeeShape,
	validateHistoryShape,
} from "../lib/impor";

export type ImportActionResult = { success: boolean; message: string; created?: number };

export type ImportRow = { rowNumber: number; summary: string; errors: string[] };

export type ImportValidationResult = {
	total: number;
	validCount: number;
	invalidCount: number;
	rows: ImportRow[];
};

/** Revalidate best-effort: di luar konteks request (E2E/CLI) Next melempar — abaikan. */
function revalidateBestEffort(path: string): void {
	try {
		revalidatePath(path);
	} catch {
		// abaikan — hygiene cache, bukan logika inti
	}
}

function toRecord(header: readonly string[], cells: string[]): Record<string, string> {
	const obj: Record<string, string> = {};
	header.forEach((h, i) => {
		obj[h] = (cells[i] ?? "").trim();
	});
	return obj;
}

async function allowed(): Promise<boolean> {
	try {
		return await canManageUsers();
	} catch {
		return false;
	}
}

/** Validasi kering impor karyawan: bentuk + NIK/nomor ganda (intra-file & vs DB). */
export async function validateEmployeeImportCore(csv: string): Promise<ImportValidationResult & { success: boolean; message: string }> {
	const table = parseCsv(csv);
	if (table.length === 0) return { success: false, message: "File kosong.", total: 0, validCount: 0, invalidCount: 0, rows: [] };
	const header = table[0].map((h) => h.trim());
	for (const h of EMPLOYEE_CSV_HEADERS) {
		if (!header.includes(h)) {
			return { success: false, message: `Header kurang kolom: ${h}. Unduh template dulu.`, total: 0, validCount: 0, invalidCount: 0, rows: [] };
		}
	}
	const dataRows = table.slice(1);
	if (dataRows.length > MAX_IMPORT_ROWS) {
		return { success: false, message: `Maksimal ${MAX_IMPORT_ROWS} baris per impor.`, total: 0, validCount: 0, invalidCount: 0, rows: [] };
	}

	const records = dataRows.map((cells, i) => ({ rowNumber: i + 2, record: toRecord(header, cells) }));
	const shapes = records.map(({ rowNumber, record }) => validateEmployeeShape(record, rowNumber));

	// NIK/nomor yang sudah ada di DB.
	const nikFile = [...new Set(records.map(({ record }) => record["nik"]).filter(Boolean))];
	const nomorFile = [...new Set(records.map(({ record }) => record["nomorKaryawan"]).filter(Boolean))];
	const [nikDb, nomorDb] = await Promise.all([
		nikFile.length
			? prisma.karyawan.findMany({ where: { nik: { in: nikFile } }, select: { nik: true } })
			: [],
		nomorFile.length
			? prisma.karyawan.findMany({ where: { nomorKaryawan: { in: nomorFile } }, select: { nomorKaryawan: true } })
			: [],
	]);
	const existingNik = new Set(nikDb.map((r) => r.nik));
	const existingNumbers = new Set(nomorDb.map((r) => r.nomorKaryawan));

	// Ganda intra-file.
	const countDuplicates = (arr: string[]) => {
		const m = new Map<string, number>();
		for (const v of arr) if (v) m.set(v, (m.get(v) ?? 0) + 1);
		return new Set([...m.entries()].filter(([, n]) => n > 1).map(([v]) => v));
	};
	const duplicateNikInFile = countDuplicates(records.map(({ record }) => record["nik"]));
	const duplicateNumbersInFile = countDuplicates(records.map(({ record }) => record["nomorKaryawan"]));

	const rows: ImportRow[] = shapes.map(({ rowNumber, data }) => {
		const errors = [...validateEmployeeShape(data, rowNumber).errors];
		const nik = data["nik"];
		const nomor = data["nomorKaryawan"];
		if (nik && duplicateNikInFile.has(nik)) errors.push("nik ganda di file ini");
		if (nik && existingNik.has(nik)) errors.push("nik sudah dipakai karyawan lain");
		if (nomor && duplicateNumbersInFile.has(nomor)) errors.push("nomorKaryawan ganda di file ini");
		if (nomor && existingNumbers.has(nomor)) errors.push("nomorKaryawan sudah dipakai");
		return { rowNumber, summary: `${data["namaLengkap"] || "(tanpa nama)"}${nomor ? ` • ${nomor}` : ""}`, errors };
	});

	const invalidCount = rows.filter((b) => b.errors.length > 0).length;
	return {
		success: true,
		message: invalidCount === 0 ? `${rows.length} baris siap diimpor.` : `${invalidCount} dari ${rows.length} baris bermasalah.`,
		total: rows.length,
		validCount: rows.length - invalidCount,
		invalidCount,
		rows,
	};
}

/** Eksekusi impor karyawan (validasi ulang; gagal bila ada satu baris bermasalah). */
export async function executeEmployeeImportCore(csv: string, actorUserId?: string): Promise<ImportActionResult> {
	const check = await validateEmployeeImportCore(csv);
	if (!check.success) return { success: false, message: check.message };
	if (check.invalidCount > 0) return { success: false, message: `${check.invalidCount} baris bermasalah — perbaiki dulu.` };
	if (check.total === 0) return { success: false, message: "Tidak ada baris data." };

	const table = parseCsv(csv);
	const header = table[0].map((h) => h.trim());
	const records = table.slice(1).map((cells) => toRecord(header, cells));

	let created = 0;
	for (const o of records) {
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
		created++;
	}

	await recordAudit({
		actorUserId: actorUserId ?? null,
		aksi: "IMPORT.KARYAWAN",
		entityType: "Karyawan",
		entityId: "bulk",
		sebelum: null,
		sesudah: { dibuat: created, total: check.total },
		alasan: `Impor CSV ${created} karyawan`,
	});
	revalidateBestEffort("/employees");
	revalidateBestEffort("/employees/import");
	return { success: true, message: `${created} karyawan diimpor.`, created };
}

/** Validasi kering impor riwayat (append; karyawan dicocokkan via nomorKaryawan). */
export async function validateHistoryImportCore(csv: string): Promise<ImportValidationResult & { success: boolean; message: string }> {
	const table = parseCsv(csv);
	if (table.length === 0) return { success: false, message: "File kosong.", total: 0, validCount: 0, invalidCount: 0, rows: [] };
	const header = table[0].map((h) => h.trim());
	for (const h of HISTORY_CSV_HEADERS) {
		if (!header.includes(h)) {
			return { success: false, message: `Header kurang kolom: ${h}. Unduh template dulu.`, total: 0, validCount: 0, invalidCount: 0, rows: [] };
		}
	}
	const dataRows = table.slice(1);
	if (dataRows.length > MAX_IMPORT_ROWS) {
		return { success: false, message: `Maksimal ${MAX_IMPORT_ROWS} baris per impor.`, total: 0, validCount: 0, invalidCount: 0, rows: [] };
	}
	const uniqueNumbers = [...new Set(dataRows.map((cells) => (cells[header.indexOf("nomorKaryawan")] ?? "").trim()).filter(Boolean))];
	const found = await prisma.karyawan.findMany({
		where: { nomorKaryawan: { in: uniqueNumbers } },
		select: { nomorKaryawan: true },
	});
	const foundSet = new Set(found.map((r) => r.nomorKaryawan));
	const rows: ImportRow[] = dataRows.map((cells, i) => {
		const record = toRecord(header, cells);
		const errors = [...validateHistoryShape(record, i + 2).errors];
		if (record["nomorKaryawan"] && !foundSet.has(record["nomorKaryawan"])) errors.push("nomorKaryawan tidak ditemukan");
		return { rowNumber: i + 2, summary: `${record["nomorKaryawan"] || "-"} • ${record["namaPerusahaan"] || "-"}`, errors };
	});
	const invalidCount = rows.filter((b) => b.errors.length > 0).length;
	return {
		success: true,
		message: invalidCount === 0 ? `${rows.length} baris siap diimpor.` : `${invalidCount} dari ${rows.length} baris bermasalah.`,
		total: rows.length,
		validCount: rows.length - invalidCount,
		invalidCount,
		rows,
	};
}

/** Eksekusi impor riwayat (append ke data yang ada). */
export async function executeHistoryImportCore(csv: string, actorUserId?: string): Promise<ImportActionResult> {
	const check = await validateHistoryImportCore(csv);
	if (!check.success) return { success: false, message: check.message };
	if (check.invalidCount > 0) return { success: false, message: `${check.invalidCount} baris bermasalah — perbaiki dulu.` };
	if (check.total === 0) return { success: false, message: "Tidak ada baris data." };

	const table = parseCsv(csv);
	const header = table[0].map((h) => h.trim());
	const idMap = new Map(
		(
			await prisma.karyawan.findMany({
				where: { nomorKaryawan: { in: table.slice(1).map((c) => (c[header.indexOf("nomorKaryawan")] ?? "").trim()).filter(Boolean) } },
				select: { id: true, nomorKaryawan: true },
			})
		).map((k) => [k.nomorKaryawan, k.id]),
	);
	let created = 0;
	for (const cells of table.slice(1)) {
		const o = toRecord(header, cells);
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
		created++;
	}
	await recordAudit({
		actorUserId: actorUserId ?? null,
		aksi: "IMPORT.RIWAYAT",
		entityType: "RiwayatPekerjaan",
		entityId: "bulk",
		sebelum: null,
		sesudah: { dibuat: created, total: check.total },
		alasan: `Impor CSV ${created} riwayat`,
	});
	revalidateBestEffort("/employees/import");
	return { success: true, message: `${created} riwayat diimpor (append).`, created };
}

/** Ekspor CSV karyawan (kolom sama dengan template impor). */
export async function exportEmployeesCore(): Promise<{ success: boolean; message: string; csv?: string }> {
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
	return { success: true, message: `${rows.length} baris.`, csv: buildCsv(EMPLOYEE_CSV_HEADERS, matrix) };
}

/** Ekspor CSV riwayat pekerjaan. */
export async function exportHistoryCore(): Promise<{ success: boolean; message: string; csv?: string }> {
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
	return { success: true, message: `${rows.length} baris.`, csv: buildCsv(HISTORY_CSV_HEADERS, matrix) };
}

export type QualityIssue = {
	key: string;
	label: string;
	count: number;
	samples: Array<{ id: string; nomorKaryawan: string; namaLengkap: string; info: string }>;
};

/** Dashboard kualitas data: NIK ganda + field tak lengkap + relasi hilang. */
export async function getDataQualityCore(): Promise<{ success: boolean; message: string; issues?: QualityIssue[] }> {
	const employees = await prisma.karyawan.findMany({
		orderBy: { namaLengkap: "asc" },
		select: {
			id: true, nomorKaryawan: true, namaLengkap: true, nik: true, telepon: true, email: true, alamat: true,
			bankNama: true, bankNorek: true, bankAtasNama: true, atasanLangsungId: true, userId: true,
			posisiKaryawan: { where: { isCurrent: true }, take: 1, select: { id: true } },
			kontrakKerja: { where: { status: { in: ["AKTIF", "AKAN_BERAKHIR"] } }, take: 1, select: { id: true } },
		},
	});

	const nikGroups = new Map<string, typeof employees>();
	for (const k of employees) {
		if (!k.nik) continue;
		const arr = nikGroups.get(k.nik) ?? [];
		arr.push(k);
		nikGroups.set(k.nik, arr);
	}
	const duplicates = [...nikGroups.values()].filter((arr) => arr.length > 1);

	const collect = (pred: (k: (typeof employees)[number]) => string | null): QualityIssue["samples"] =>
		employees
			.map((k) => ({ k, info: pred(k) }))
			.filter((x): x is { k: (typeof employees)[number]; info: string } => x.info !== null)
			.slice(0, 100)
			.map(({ k, info }) => ({ id: k.id, nomorKaryawan: k.nomorKaryawan, namaLengkap: k.namaLengkap, info }));

	const issues: QualityIssue[] = [
		{
			key: "nik-ganda",
			label: "NIK ganda",
			count: duplicates.reduce((a, arr) => a + arr.length, 0),
			samples: duplicates.flatMap((arr) => arr.map((k) => ({ id: k.id, nomorKaryawan: k.nomorKaryawan, namaLengkap: k.namaLengkap, info: `NIK ${k.nik} dipakai ${arr.length}x` }))).slice(0, 100),
		},
		{ key: "tanpa-nik", label: "Tanpa NIK", count: 0, samples: collect((k) => (!k.nik ? "NIK kosong" : null)) },
		{ key: "tanpa-telepon", label: "Tanpa telepon", count: 0, samples: collect((k) => (!k.telepon ? "Telepon kosong" : null)) },
		{ key: "tanpa-alamat", label: "Tanpa alamat", count: 0, samples: collect((k) => (!k.alamat ? "Alamat kosong" : null)) },
		{ key: "tanpa-email", label: "Tanpa email", count: 0, samples: collect((k) => (!k.email ? "Email kosong" : null)) },
		{
			key: "rekening-tak-lengkap",
			label: "Rekening tak lengkap",
			count: 0,
			samples: collect((k) => {
				const filled = [k.bankNama, k.bankNorek, k.bankAtasNama].filter(Boolean).length;
				return filled > 0 && filled < 3 ? `${filled}/3 field terisi` : null;
			}),
		},
		{ key: "tanpa-penempatan", label: "Tanpa penempatan aktif", count: 0, samples: collect((k) => (k.posisiKaryawan.length === 0 ? "Tak ada posisi current" : null)) },
		{ key: "tanpa-kontrak", label: "Tanpa kontrak aktif", count: 0, samples: collect((k) => (k.kontrakKerja.length === 0 ? "Tak ada kontrak AKTIF" : null)) },
		{ key: "tanpa-atasan", label: "Tanpa atasan langsung", count: 0, samples: collect((k) => (!k.atasanLangsungId ? "Atasan kosong" : null)) },
		{ key: "tanpa-akun", label: "Tanpa akun login", count: 0, samples: collect((k) => (!k.userId ? "Belum taut user" : null)) },
	];
	// Jumlah eksak dihitung dari seluruh data (contoh dibatasi 100 baris).
	const countAll = (pred: (k: (typeof employees)[number]) => boolean) => employees.filter(pred).length;
	const matchers: Record<string, (k: (typeof employees)[number]) => boolean> = {
		"tanpa-nik": (k) => !k.nik,
		"tanpa-telepon": (k) => !k.telepon,
		"tanpa-alamat": (k) => !k.alamat,
		"tanpa-email": (k) => !k.email,
		"rekening-tak-lengkap": (k) => {
			const filled = [k.bankNama, k.bankNorek, k.bankAtasNama].filter(Boolean).length;
			return filled > 0 && filled < 3;
		},
		"tanpa-penempatan": (k) => k.posisiKaryawan.length === 0,
		"tanpa-kontrak": (k) => k.kontrakKerja.length === 0,
		"tanpa-atasan": (k) => !k.atasanLangsungId,
		"tanpa-akun": (k) => !k.userId,
	};
	for (const m of issues) {
		const fn = matchers[m.key];
		if (fn) m.count = countAll(fn);
	}
	return { success: true, message: "OK", issues };
}

// ============================================================
// Wrapper berizin (ADMIN_HR/SUPER_ADMIN) untuk UI. Inti (*Inti)
// dipakai E2E tanpa konteks sesi.
// ============================================================

export async function validateEmployeeImport(csv: string) {
	if (!(await allowed())) return { success: false, message: "Anda tidak memiliki izin.", total: 0, validCount: 0, invalidCount: 0, rows: [] };
	return validateEmployeeImportCore(csv);
}

export async function executeEmployeeImport(csv: string, actorUserId?: string) {
	if (!(await allowed())) return { success: false, message: "Anda tidak memiliki izin." };
	return executeEmployeeImportCore(csv, actorUserId);
}

export async function validateHistoryImport(csv: string) {
	if (!(await allowed())) return { success: false, message: "Anda tidak memiliki izin.", total: 0, validCount: 0, invalidCount: 0, rows: [] };
	return validateHistoryImportCore(csv);
}

export async function executeHistoryImport(csv: string, actorUserId?: string) {
	if (!(await allowed())) return { success: false, message: "Anda tidak memiliki izin." };
	return executeHistoryImportCore(csv, actorUserId);
}

export async function exportEmployees() {
	if (!(await allowed())) return { success: false, message: "Anda tidak memiliki izin." };
	return exportEmployeesCore();
}

export async function exportHistory() {
	if (!(await allowed())) return { success: false, message: "Anda tidak memiliki izin." };
	return exportHistoryCore();
}

export async function getDataQuality() {
	if (!(await allowed())) return { success: false, message: "Anda tidak memiliki izin." };
	return getDataQualityCore();
}
