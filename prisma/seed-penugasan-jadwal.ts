import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

/**
 * Penugasan jadwal contoh untuk dokumentasi & demo halaman Penugasan Jadwal.
 * Idempoten via unique [karyawanId, tanggalMulai].
 * Prasyarat: seed:karyawan (karyawan demo) + seed:work-schedule (jadwal kerja).
 */
const MULAI = new Date("2026-10-01T00:00:00Z");
const SELESAI = new Date("2026-10-31T00:00:00Z");
const NOMOR = ["DEMO-2026-001", "DEMO-2026-002", "DEMO-2026-003"];

async function main() {
	const jadwal = await prisma.jadwalKerja.findFirst({
		include: { kalenderKerja: { select: { nama: true } } },
		orderBy: { id: "asc" },
	});
	if (!jadwal) throw new Error("Jadwal kerja belum ada — jalankan seed:work-schedule dulu.");
	console.log(`pakai jadwal: ${jadwal.kalenderKerja.nama} / ${jadwal.hari} (id=${jadwal.id})`);

	for (const nomor of NOMOR) {
		const k = await prisma.karyawan.findUnique({ where: { nomorKaryawan: nomor }, select: { id: true } });
		if (!k) throw new Error(`Karyawan ${nomor} belum ada — jalankan seed:karyawan dulu.`);
		const ada = await prisma.penugasanJadwal.findUnique({
			where: { karyawanId_tanggalMulai: { karyawanId: k.id, tanggalMulai: MULAI } },
			select: { id: true },
		});
		if (ada) {
			console.log(`${nomor}: sudah ada`);
			continue;
		}
		await prisma.penugasanJadwal.create({
			data: { karyawanId: k.id, jadwalKerjaId: jadwal.id, tanggalMulai: MULAI, tanggalSelesai: SELESAI },
		});
		console.log(`${nomor}: dibuat (Okt 2026)`);
	}
	console.log(`total penugasan: ${await prisma.penugasanJadwal.count()}`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
