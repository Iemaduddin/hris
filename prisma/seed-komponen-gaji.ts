import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

/**
 * Master komponen gaji untuk dokumentasi & demo perhitungan payroll.
 * Idempoten via upsert kode.
 *
 * Catatan: komponen TJ_* (tunjangan per hari/shift), UPAH_LEMBUR, BPJS_*,
 * dan POTONGAN_ALPA adalah data master bawaan yang sudah ada — file ini hanya
 * melengkapi dua yang belum ada (GAJI_POKOK, POT_PPH21). Jangan menambah
 * entri yang semakna dengan yang sudah ada agar tidak duplikat.
 */
const KOMPONEN = [
	{ kode: "GAJI_POKOK", nama: "Gaji Pokok", kelompok: "PENDAPATAN" as const, tipe: "NOMINAL" as const, nilai: 0, urutan: 1 },
	{ kode: "POT_PPH21", nama: "PPh 21", kelompok: "POTONGAN" as const, tipe: "NOMINAL" as const, nilai: 0, urutan: 5 },
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
