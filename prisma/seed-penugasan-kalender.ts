import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

/**
 * Penugasan kalender contoh untuk dokumentasi & demo.
 * Idempoten: lewati bila karyawan sudah punya penugasan yang mencakup Oktober 2026.
 * Prasyarat: seed:karyawan (karyawan demo) + seed:kalender (kalender kerja).
 */
const MULAI = new Date(Date.UTC(2026, 9, 1));
const SELESAI = new Date(Date.UTC(2026, 9, 31));
const NOMOR = ["DEMO-2026-001", "DEMO-2026-002", "DEMO-2026-003"];

async function main() {
	const kalender =
		(await prisma.kalenderKerja.findFirst({ where: { isDefault: true }, select: { id: true, nama: true } })) ??
		(await prisma.kalenderKerja.findFirst({ select: { id: true, nama: true } }));
	if (!kalender) throw new Error("Kalender kerja belum ada — jalankan seed:kalender dulu.");
	console.log(`pakai kalender: ${kalender.nama} (id=${kalender.id})`);

	for (const nomor of NOMOR) {
		const k = await prisma.karyawan.findUnique({ where: { nomorKaryawan: nomor }, select: { id: true } });
		if (!k) throw new Error(`Karyawan ${nomor} belum ada — jalankan seed:karyawan dulu.`);
		const ada = await prisma.penugasanKalender.findFirst({
			where: { karyawanId: k.id, tanggalMulai: { lte: SELESAI }, OR: [{ tanggalSelesai: null }, { tanggalSelesai: { gte: MULAI } }] },
			select: { id: true },
		});
		if (ada) {
			console.log(`${nomor}: sudah ada`);
			continue;
		}
		await prisma.penugasanKalender.create({
			data: { karyawanId: k.id, kalenderKerjaId: kalender.id, tanggalMulai: MULAI, tanggalSelesai: SELESAI },
		});
		console.log(`${nomor}: dibuat (Okt 2026)`);
	}
	console.log(`total penugasan: ${await prisma.penugasanKalender.count()}`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
