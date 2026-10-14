import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });

/**
 * Master jenis ketidakhadiran — idempoten via upsert kode.
 * Dipakai seed-demo (butuh CUTI_TAHUNAN). Saldo per karyawan dibuat
 * lewat generate saldo (UI/API), bukan di sini.
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
	for (const j of JENIS) {
		const row = await prisma.jenisKetidakhadiran.upsert({
			where: { kode: j.kode },
			create: { ...j, isActive: true },
			update: { ...j, isActive: true },
		});
		console.log(`jenis ${row.kode}: OK (wajibLampiran=${row.wajibLampiran})`);
	}

	console.log(`total jenis: ${await prisma.jenisKetidakhadiran.count()}`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
