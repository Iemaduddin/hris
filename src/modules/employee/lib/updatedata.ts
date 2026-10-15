import prisma from "@/src/lib/prisma";
import { catatAudit } from "@/src/modules/audit/lib/audit";

export const KATEGORI_UPDATE_DATA = ["ALAMAT", "KONTAK", "KELUARGA", "PENDIDIKAN", "DOKUMEN"] as const;
export type KategoriUpdateDataInput = (typeof KATEGORI_UPDATE_DATA)[number];

export function labelKategori(k: string): string {
	return k === "ALAMAT"
		? "Alamat"
		: k === "KONTAK"
			? "Kontak"
			: k === "KELUARGA"
				? "Keluarga"
				: k === "PENDIDIKAN"
					? "Pendidikan"
					: k === "DOKUMEN"
						? "Dokumen"
						: k;
}

function teks(v: unknown): string {
	return typeof v === "string" ? v.trim() : "";
}

/** Validasi dataBaru per kategori. Return pesan error atau null bila valid. */
export function validasiUpdateData(kategori: string, dataBaru: Record<string, unknown>): string | null {
	if (!(KATEGORI_UPDATE_DATA as readonly string[]).includes(kategori)) return "Kategori tidak valid.";
	if (kategori === "ALAMAT") {
		if (!teks(dataBaru["alamat"])) return "Alamat baru wajib diisi.";
		if (teks(dataBaru["alamat"]).length > 500) return "Alamat maksimal 500 karakter.";
		return null;
	}
	if (kategori === "KONTAK") {
		const telepon = teks(dataBaru["telepon"]);
		const email = teks(dataBaru["email"]);
		if (!telepon && !email) return "Isi telepon atau email baru.";
		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Format email tidak valid.";
		if (telepon && telepon.length > 30) return "Telepon maksimal 30 karakter.";
		return null;
	}
	if (kategori === "KELUARGA") {
		if (!teks(dataBaru["nama"])) return "Nama anggota keluarga wajib diisi.";
		if (!["PASANGAN", "ANAK", "ORANG_TUA", "SAUDARA", "LAINNYA"].includes(teks(dataBaru["hubungan"]))) {
			return "Hubungan tidak valid.";
		}
		if (!["LAKI_LAKI", "PEREMPUAN"].includes(teks(dataBaru["gender"]))) return "Jenis kelamin tidak valid.";
		return null;
	}
	if (kategori === "PENDIDIKAN") {
		const gelar = [
			"SD",
			"SMP",
			"SMA_SMK",
			"D1",
			"D2",
			"D3",
			"D4",
			"S1",
			"S2",
			"S3",
			"LAINNYA",
		];
		if (!gelar.includes(teks(dataBaru["gelar"]))) return "Gelar tidak valid.";
		if (!teks(dataBaru["institusi"])) return "Institusi wajib diisi.";
		return null;
	}
	if (kategori === "DOKUMEN") {
		const jenis = [
			"KTP",
			"NPWP",
			"IJAZAH",
			"TRANSKRIP",
			"PAKLARING",
			"SERTIFIKAT",
			"KONTRAK_KERJA",
			"FOTO",
			"KARTU_KELUARGA",
			"BPJS_KESEHATAN",
			"BPJS_KETENAGAKERJAAN",
			"CV",
			"LAINNYA",
		];
		if (!jenis.includes(teks(dataBaru["jenisDokumen"]))) return "Jenis dokumen tidak valid.";
		if (!teks(dataBaru["nama"])) return "Nama dokumen wajib diisi.";
		if (!teks(dataBaru["urlFile"])) return "File dokumen wajib diunggah dulu.";
		return null;
	}
	return "Kategori tidak valid.";
}

/** Ringkasan satu baris untuk inbox approval. */
export function ringkasanUpdateData(kategori: string, dataBaru: Record<string, unknown>): string {
	if (kategori === "ALAMAT") return `Alamat → ${teks(dataBaru["alamat"]).slice(0, 60)}`;
	if (kategori === "KONTAK") {
		const parts = [];
		if (teks(dataBaru["telepon"])) parts.push(teks(dataBaru["telepon"]));
		if (teks(dataBaru["email"])) parts.push(teks(dataBaru["email"]));
		return `Kontak → ${parts.join(" • ")}`;
	}
	if (kategori === "KELUARGA") return `Keluarga: ${teks(dataBaru["nama"])} (${teks(dataBaru["hubungan"])})`;
	if (kategori === "PENDIDIKAN") return `Pendidikan: ${teks(dataBaru["gelar"])} — ${teks(dataBaru["institusi"])}`;
	if (kategori === "DOKUMEN") return `Dokumen: ${teks(dataBaru["nama"])} (${teks(dataBaru["jenisDokumen"])})`;
	return kategori;
}

function parseTanggal(v: unknown): Date | null {
	const s = teks(v);
	if (!s) return null;
	const d = new Date(s);
	return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Terapkan usulan yang disetujui final ke tabel master.
 * Dipanggil sebagai onFinalApprove; mengembalikan gagal bila data tak valid
 * supaya status approval dikembalikan ke MENUNGGU (pola engine).
 */
export async function terapkanUpdateData(id: string): Promise<{ success: boolean; message: string }> {
	const row = await prisma.updateDataRequest.findUnique({ where: { id } });
	if (!row) return { success: false, message: "Pengajuan tidak ditemukan." };
	const dataBaru = (row.dataBaru ?? {}) as Record<string, unknown>;
	const err = validasiUpdateData(row.kategori, dataBaru);
	if (err) return { success: false, message: err };

	const karyawan = await prisma.karyawan.findUnique({
		where: { id: row.karyawanId },
		select: { id: true, alamat: true, telepon: true, email: true },
	});
	if (!karyawan) return { success: false, message: "Karyawan tidak ditemukan." };

	let sebelum: unknown = row.dataLama ?? null;
	let sesudah: unknown = dataBaru;

	if (row.kategori === "ALAMAT") {
		sebelum = { alamat: karyawan.alamat };
		sesudah = { alamat: teks(dataBaru["alamat"]) };
		await prisma.karyawan.update({ where: { id: row.karyawanId }, data: { alamat: teks(dataBaru["alamat"]) } });
	} else if (row.kategori === "KONTAK") {
		const patch: { telepon?: string | null; email?: string | null } = {};
		if ("telepon" in dataBaru) patch.telepon = teks(dataBaru["telepon"]) || null;
		if ("email" in dataBaru) patch.email = teks(dataBaru["email"]) || null;
		sebelum = { telepon: karyawan.telepon, email: karyawan.email };
		sesudah = patch;
		await prisma.karyawan.update({ where: { id: row.karyawanId }, data: patch });
	} else if (row.kategori === "KELUARGA") {
		const data = {
			nama: teks(dataBaru["nama"]),
			hubungan: teks(dataBaru["hubungan"]) as never,
			gender: teks(dataBaru["gender"]) as never,
			tanggalLahir: parseTanggal(dataBaru["tanggalLahir"]),
			nik: teks(dataBaru["nik"]) || null,
			pekerjaan: teks(dataBaru["pekerjaan"]) || null,
		};
		if (row.targetId) {
			const lama = await prisma.keluargaKaryawan.findFirst({
				where: { id: row.targetId, karyawanId: row.karyawanId },
			});
			if (!lama) return { success: false, message: "Data keluarga tujuan tidak ditemukan." };
			sebelum = lama;
			const updated = await prisma.keluargaKaryawan.update({ where: { id: row.targetId }, data });
			sesudah = updated;
		} else {
			const created = await prisma.keluargaKaryawan.create({ data: { karyawanId: row.karyawanId, ...data } });
			sesudah = created;
		}
	} else if (row.kategori === "PENDIDIKAN") {
		const toInt = (v: unknown): number | null => {
			const n = Number.parseInt(teks(v), 10);
			return Number.isFinite(n) ? n : null;
		};
		const toFloat = (v: unknown): number | null => {
			const n = Number.parseFloat(String(v ?? "").replace(",", "."));
			return Number.isFinite(n) ? n : null;
		};
		const created = await prisma.pendidikanKaryawan.create({
			data: {
				karyawanId: row.karyawanId,
				gelar: teks(dataBaru["gelar"]) as never,
				institusi: teks(dataBaru["institusi"]),
				jurusan: teks(dataBaru["jurusan"]) || null,
				tahunMulai: toInt(dataBaru["tahunMulai"]),
				tahunLulus: toInt(dataBaru["tahunLulus"]),
				ipk: toFloat(dataBaru["ipk"]),
				isHighest: dataBaru["isHighest"] === true,
			},
		});
		sesudah = created;
	} else {
		const created = await prisma.dokumenKaryawan.create({
			data: {
				karyawanId: row.karyawanId,
				jenisDokumen: teks(dataBaru["jenisDokumen"]) as never,
				nama: teks(dataBaru["nama"]),
				urlFile: teks(dataBaru["urlFile"]),
				tanggalKadaluarsa: parseTanggal(dataBaru["tanggalKadaluarsa"]),
				catatan: `Verifikasi mandiri ${row.nomor}${teks(dataBaru["catatan"]) ? ` — ${teks(dataBaru["catatan"])}` : ""}`,
			},
		});
		sesudah = created;
	}

	const finalStep = await prisma.approvalStep.findFirst({
		where: { referensiType: "UPDATE_DATA", referensiId: id, status: "DISETUJUI" },
		orderBy: { tahap: "desc" },
		select: { diprosesOlehId: true },
	});
	await prisma.updateDataRequest.update({
		where: { id },
		data: { diputuskanOlehId: finalStep?.diprosesOlehId ?? null, diputuskanPada: new Date() },
	});
	await catatAudit({
		actorUserId: finalStep?.diprosesOlehId ?? null,
		aksi: "UPDATE_DATA.DITERAPKAN",
		entityType: "UpdateDataRequest",
		entityId: id,
		sebelum,
		sesudah,
		alasan: row.alasan,
	});
	return { success: true, message: "Perubahan diterapkan ke data master." };
}
