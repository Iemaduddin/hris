import prisma from "@/src/lib/prisma";

/**
 * Nomor urut aman-konkuren untuk dokumen (CUTI.2026.00001, LEMBUR.2026.00001, ...).
 * Memakai tabel `penomoran` yang sama dengan nomor karyawan.
 */
export async function nextSerialNumber(prefix: string, year: number, digits = 5, maxAttempts = 5): Promise<string> {
	const kunci = `${prefix}.${year}`;
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const rows = await prisma.$queryRaw<Array<{ terakhir: number }>>`
			INSERT INTO "penomoran" ("id", "kunci", "terakhir", "updatedAt")
			VALUES (md5(random()::text || clock_timestamp()::text), ${kunci}, 1, NOW())
			ON CONFLICT ("kunci") DO UPDATE SET "terakhir" = "penomoran"."terakhir" + 1, "updatedAt" = NOW()
			RETURNING "terakhir"`;
		const seq = rows[0]?.terakhir ?? 1;
		const serial = `${kunci}.${String(seq).padStart(digits, "0")}`;
		const clash =
			prefix === "CUTI"
				? await prisma.pengajuanKetidakhadiran.findUnique({ where: { nomorPengajuan: serial }, select: { id: true } })
				: prefix === "DINAS"
					? await prisma.dinasWFH.findUnique({ where: { nomorPengajuan: serial }, select: { id: true } })
					: prefix === "KTR"
						? await prisma.kontrakKerja.findUnique({ where: { nomorKontrak: serial }, select: { id: true } })
						: null;
		if (!clash) return serial;
	}
	throw new Error("Gagal mengenerate nomor pengajuan.");
}
