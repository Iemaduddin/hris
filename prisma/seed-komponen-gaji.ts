import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

/**
 * Master komponen gaji — idempoten, yang sudah ada dilewati (tidak
 * menimpa tarif yang sudah disesuaikan Finance). Set yang sama dengan
 * tombol "Seed Default MVP" di halaman Komponen Gaji.
 */
const KOMPONEN = [
	{ kode: "GAJI_POKOK", nama: "Gaji Pokok", kelompok: "PENDAPATAN" as const, tipe: "NOMINAL" as const, nilai: 0, batasAtas: null as number | null, urutan: 0 },
	{ kode: "TJ_JABATAN", nama: "Tunjangan Jabatan", kelompok: "TUNJANGAN" as const, tipe: "NOMINAL" as const, nilai: 0, batasAtas: null as number | null, urutan: 1 },
	{ kode: "TJ_KELUARGA", nama: "Tunjangan Keluarga", kelompok: "TUNJANGAN" as const, tipe: "NOMINAL" as const, nilai: 0, batasAtas: null as number | null, urutan: 2 },
	{ kode: "TJ_MAKAN", nama: "Tunjangan Makan (per hari hadir)", kelompok: "TUNJANGAN" as const, tipe: "PER_HARI" as const, nilai: 25000, batasAtas: null as number | null, urutan: 3 },
	{ kode: "TJ_TRANSPORT", nama: "Tunjangan Transport (per hari hadir)", kelompok: "TUNJANGAN" as const, tipe: "PER_HARI" as const, nilai: 20000, batasAtas: null as number | null, urutan: 4 },
	{ kode: "TJ_SHIFT_MALAM", nama: "Tunjangan Shift Malam (per shift)", kelompok: "TUNJANGAN" as const, tipe: "PER_SHIFT_MALAM" as const, nilai: 50000, batasAtas: null as number | null, urutan: 5 },
	{ kode: "UPAH_LEMBUR", nama: "Upah Lembur (per jam)", kelompok: "PENDAPATAN" as const, tipe: "PER_JAM_LEMBUR" as const, nilai: 50000, batasAtas: null as number | null, urutan: 6 },
	{ kode: "BPJS_KES", nama: "BPJS Kesehatan (1% karyawan)", kelompok: "IURAN" as const, tipe: "PERSEN" as const, nilai: 1, batasAtas: 12000000 as number | null, urutan: 7 },
	{ kode: "BPJS_JHT", nama: "BPJS JHT (2% karyawan)", kelompok: "IURAN" as const, tipe: "PERSEN" as const, nilai: 2, batasAtas: null as number | null, urutan: 8 },
	{ kode: "BPJS_JP", nama: "BPJS JP (1% karyawan)", kelompok: "IURAN" as const, tipe: "PERSEN" as const, nilai: 1, batasAtas: 10500000 as number | null, urutan: 9 },
	{ kode: "POTONGAN_ALPA", nama: "Potongan Alpa (GP/26 per hari)", kelompok: "POTONGAN" as const, tipe: "PER_HARI" as const, nilai: 0, batasAtas: null as number | null, urutan: 10 },
	{ kode: "BPJS_KES_CPY", nama: "BPJS Kesehatan (4% perusahaan)", kelompok: "BIAYA_PERUSAHAAN" as const, tipe: "PERSEN" as const, nilai: 4, batasAtas: 12000000 as number | null, urutan: 11 },
	{ kode: "BPJS_JHT_CPY", nama: "BPJS JHT (3,70% perusahaan)", kelompok: "BIAYA_PERUSAHAAN" as const, tipe: "PERSEN" as const, nilai: 3.7, batasAtas: null as number | null, urutan: 12 },
	{ kode: "BPJS_JP_CPY", nama: "BPJS JP (2% perusahaan)", kelompok: "BIAYA_PERUSAHAAN" as const, tipe: "PERSEN" as const, nilai: 2, batasAtas: 10500000 as number | null, urutan: 13 },
	{ kode: "BPJS_JKK", nama: "BPJS JKK (perusahaan, atur tarif 0,24–1,74% sesuai kelompok risiko)", kelompok: "BIAYA_PERUSAHAAN" as const, tipe: "PERSEN" as const, nilai: 0.54, batasAtas: null as number | null, urutan: 14 },
	{ kode: "BPJS_JKM", nama: "BPJS JKM (0,30% perusahaan)", kelompok: "BIAYA_PERUSAHAAN" as const, tipe: "PERSEN" as const, nilai: 0.3, batasAtas: null as number | null, urutan: 15 },
	{ kode: "POTONGAN_TELAT", nama: "Potongan Keterlambatan (per menit TERLAMBAT)", kelompok: "POTONGAN" as const, tipe: "NOMINAL" as const, nilai: 0, batasAtas: null as number | null, urutan: 16 },
	{ kode: "POT_PPH21", nama: "PPh 21", kelompok: "POTONGAN" as const, tipe: "NOMINAL" as const, nilai: 0, batasAtas: null as number | null, urutan: 17 },
];

async function main() {
	let dibuat = 0;
	for (const k of KOMPONEN) {
		const existing = await prisma.komponenGaji.findUnique({ where: { kode: k.kode }, select: { id: true } });
		if (existing) continue;
		await prisma.komponenGaji.create({
			data: { ...k, kelompok: k.kelompok as never, tipe: k.tipe as never, isActive: true },
		});
		dibuat++;
		console.log(`komponen ${k.kode}: OK`);
	}
	console.log(`dibuat ${dibuat} baru, total komponen: ${await prisma.komponenGaji.count()}`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
