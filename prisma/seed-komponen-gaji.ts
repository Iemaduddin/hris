import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

/**
 * Master komponen gaji untuk dokumentasi & demo perhitungan payroll.
 * Idempoten via upsert kode. Nilai NOMINAL default 0 (diisi per karyawan
 * lewat GajiKaryawan / kontrak); PERSEN mengikuti mesin hitung payroll.
 */
const KOMPONEN = [
	{ kode: "GAJI_POKOK", nama: "Gaji Pokok", kelompok: "PENDAPATAN" as const, tipe: "NOMINAL" as const, nilai: 0, urutan: 1 },
	{ kode: "TUNJ_JABATAN", nama: "Tunjangan Jabatan", kelompok: "TUNJANGAN" as const, tipe: "NOMINAL" as const, nilai: 0, urutan: 2 },
	{ kode: "TUNJ_TRANSPORT", nama: "Tunjangan Transport", kelompok: "TUNJANGAN" as const, tipe: "NOMINAL" as const, nilai: 0, urutan: 3 },
	{ kode: "TUNJ_MAKAN", nama: "Tunjangan Makan", kelompok: "TUNJANGAN" as const, tipe: "NOMINAL" as const, nilai: 0, urutan: 4 },
	{ kode: "POT_PPH21", nama: "PPh 21", kelompok: "POTONGAN" as const, tipe: "NOMINAL" as const, nilai: 0, urutan: 5 },
	{ kode: "POT_BPJS_KS", nama: "BPJS Kesehatan (1%)", kelompok: "IURAN" as const, tipe: "PERSEN" as const, nilai: 1, urutan: 6 },
	{ kode: "POT_BPJS_TK", nama: "BPJS Ketenagakerjaan (2%)", kelompok: "IURAN" as const, tipe: "PERSEN" as const, nilai: 2, urutan: 7 },
];

async function main() {
	for (const k of KOMPONEN) {
		await prisma.komponenGaji.upsert({
			where: { kode: k.kode },
			create: { ...k, isActive: true },
			update: { nama: k.nama, kelompok: k.kelompok, tipe: k.tipe, nilai: k.nilai, urutan: k.urutan, isActive: true },
		});
		console.log(`komponen ${k.kode}: OK`);
	}
	console.log(`total komponen: ${await prisma.komponenGaji.count()}`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
