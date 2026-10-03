import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });

/** Karyawan uji (user employee@example.com). */
const KARYAWAN_ID = "cmuugt0s60000qcuo43xi14xg";
const TAHUN = 2026;

/**
 * Data master Tahap M2 (Pengajuan) — rerunnable.
 * - 3 jenis ketidakhadiran; `SAKIT` sengaja `wajibLampiran` untuk menguji
 *   validasi lampiran (PRD mobile Bag. 5.4).
 * - Saldo cuti tahunan karyawan uji.
 */
const JENIS = [
	{
		kode: "CUTI_TAHUNAN",
		nama: "Cuti Tahunan",
		kategori: "CUTI" as const,
		deskripsi: "Cuti tahunan sesuai hak karyawan.",
		menggunakanSaldo: true,
		jatahTahunan: 12,
		wajibLampiran: false,
	},
	{
		kode: "SAKIT",
		nama: "Sakit",
		kategori: "IZIN" as const,
		deskripsi: "Izin sakit — lampiran surat dokter wajib.",
		menggunakanSaldo: false,
		jatahTahunan: null,
		wajibLampiran: true,
	},
	{
		kode: "IZIN",
		nama: "Izin",
		kategori: "IZIN" as const,
		deskripsi: "Izin keperluan pribadi singkat.",
		menggunakanSaldo: false,
		jatahTahunan: null,
		wajibLampiran: false,
	},
];

async function main() {
	const idByKode = new Map<number, string>();

	for (const j of JENIS) {
		const row = await prisma.jenisKetidakhadiran.upsert({
			where: { kode: j.kode },
			create: { ...j, isActive: true },
			update: { ...j, isActive: true },
		});
		idByKode.set(row.id, row.kode);
		console.log(`jenis  ${row.kode} -> id=${row.id} (wajibLampiran=${row.wajibLampiran})`);
	}

	const tahunan = [...idByKode.entries()].find(([, kode]) => kode === "CUTI_TAHUNAN");
	if (tahunan) {
		const saldo = await prisma.saldoCuti.upsert({
			where: {
				karyawanId_jenisKetidakhadiranId_tahun: {
					karyawanId: KARYAWAN_ID,
					jenisKetidakhadiranId: tahunan[0],
					tahun: TAHUN,
				},
			},
			create: {
				karyawanId: KARYAWAN_ID,
				jenisKetidakhadiranId: tahunan[0],
				tahun: TAHUN,
				saldoAwal: 12,
				saldoAkhir: 12,
			},
			update: { saldoAwal: 12, saldoAkhir: 12 },
		});
		console.log(`saldo  ${saldo.tahun}: ${saldo.saldoAwal} hari (id=${saldo.id})`);
	}

	console.log("total jenis   :", await prisma.jenisKetidakhadiran.count());
	console.log("total saldo   :", await prisma.saldoCuti.count());
	console.log("total pengajuan:", await prisma.pengajuanKetidakhadiran.count());
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
