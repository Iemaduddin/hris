import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function toTimeOrNull(hhmm: string | null): Date | null {
	if (!hhmm) return null;
	const [h, m] = hhmm.split(":").map(Number);
	return new Date(1970, 0, 1, h, m, 0);
}

// ============================================================
// KALENDER KERJA
// ============================================================

const KALENDER_KERJA = [
	{
		nama: "Kerja Pagi (5 Hari)",
		kode: "KP-5H",
		deskripsi: "Jam kerja 08:00-17:00, Senin-Jumat, Sabtu-Minggu libur",
		isDefault: true,
		isActive: true,
	},
	{
		nama: "Kerja Pagi (6 Hari)",
		kode: "KP-6H",
		deskripsi: "Jam kerja 08:00-16:00, Senin-Sabtu, Minggu libur",
		isDefault: false,
		isActive: true,
	},
];

// ============================================================
// JADWAL HARIAN
// ============================================================

type HariDalamMinggu = "SENIN" | "SELASA" | "RABU" | "KAMIS" | "JUMAT" | "SABTU" | "MINGGU";

type JadwalHarian = {
	hari: HariDalamMinggu;
	isHariKerja: boolean;
	jamMasuk: string | null;
	jamKeluar: string | null;
	jamMulaiIstirahat: string | null;
	jamSelesaiIstirahat: string | null;
};

// Jadwal untuk Kalender "Kerja Pagi (5 Hari)"
const JADWAL_KP_5H: JadwalHarian[] = [
	{ hari: "SENIN", isHariKerja: true, jamMasuk: "08:00", jamKeluar: "17:00", jamMulaiIstirahat: "12:00", jamSelesaiIstirahat: "13:00" },
	{ hari: "SELASA", isHariKerja: true, jamMasuk: "08:00", jamKeluar: "17:00", jamMulaiIstirahat: "12:00", jamSelesaiIstirahat: "13:00" },
	{ hari: "RABU", isHariKerja: true, jamMasuk: "08:00", jamKeluar: "17:00", jamMulaiIstirahat: "12:00", jamSelesaiIstirahat: "13:00" },
	{ hari: "KAMIS", isHariKerja: true, jamMasuk: "08:00", jamKeluar: "17:00", jamMulaiIstirahat: "12:00", jamSelesaiIstirahat: "13:00" },
	{ hari: "JUMAT", isHariKerja: true, jamMasuk: "08:00", jamKeluar: "17:00", jamMulaiIstirahat: "12:00", jamSelesaiIstirahat: "13:00" },
	{ hari: "SABTU", isHariKerja: false, jamMasuk: null, jamKeluar: null, jamMulaiIstirahat: null, jamSelesaiIstirahat: null },
	{ hari: "MINGGU", isHariKerja: false, jamMasuk: null, jamKeluar: null, jamMulaiIstirahat: null, jamSelesaiIstirahat: null },
];

// Jadwal untuk Kalender "Kerja Pagi (6 Hari)"
const JADWAL_KP_6H: JadwalHarian[] = [
	{ hari: "SENIN", isHariKerja: true, jamMasuk: "08:00", jamKeluar: "16:00", jamMulaiIstirahat: "12:00", jamSelesaiIstirahat: "13:00" },
	{ hari: "SELASA", isHariKerja: true, jamMasuk: "08:00", jamKeluar: "16:00", jamMulaiIstirahat: "12:00", jamSelesaiIstirahat: "13:00" },
	{ hari: "RABU", isHariKerja: true, jamMasuk: "08:00", jamKeluar: "16:00", jamMulaiIstirahat: "12:00", jamSelesaiIstirahat: "13:00" },
	{ hari: "KAMIS", isHariKerja: true, jamMasuk: "08:00", jamKeluar: "16:00", jamMulaiIstirahat: "12:00", jamSelesaiIstirahat: "13:00" },
	{ hari: "JUMAT", isHariKerja: true, jamMasuk: "08:00", jamKeluar: "16:00", jamMulaiIstirahat: "12:00", jamSelesaiIstirahat: "13:00" },
	{ hari: "SABTU", isHariKerja: true, jamMasuk: "08:00", jamKeluar: "16:00", jamMulaiIstirahat: "12:00", jamSelesaiIstirahat: "13:00" },
	{ hari: "MINGGU", isHariKerja: false, jamMasuk: null, jamKeluar: null, jamMulaiIstirahat: null, jamSelesaiIstirahat: null },
];

// Mapping jadwal per kalender
const JADWAL_PER_KALENDER: Record<string, JadwalHarian[]> = {
	"KP-5H": JADWAL_KP_5H,
	"KP-6H": JADWAL_KP_6H,
};

// ============================================================
// HARI LIBUR NASIONAL 2026
// ============================================================

const HARI_LIBUR = [
	{
		tanggal: "2026-01-01",
		nama: "Tahun Baru Masehi",
		deskripsi: "Hari Libur Nasional",
		isCutiBersama: false,
	},
	{
		tanggal: "2026-08-17",
		nama: "Hari Kemerdekaan RI",
		deskripsi: "Hari Kemerdekaan Republik Indonesia ke-81",
		isCutiBersama: false,
	},
	{
		tanggal: "2026-12-25",
		nama: "Hari Raya Natal",
		deskripsi: "Hari Libur Nasional",
		isCutiBersama: false,
	},
];

// ============================================================
// SEED FUNCTION
// ============================================================

async function main() {
	console.log("=== Seeding Work Schedule ===\n");

	// 1. Seed Kalender Kerja
	console.log("1. Seeding Kalender Kerja...");
	const kalenderMap: Record<string, number> = {};

	for (const kalender of KALENDER_KERJA) {
		const existing = await prisma.kalenderKerja.findFirst({
			where: { kode: kalender.kode },
		});

		if (existing) {
			console.log(`   Skip: ${kalender.nama} (already exists)`);
			kalenderMap[kalender.kode] = existing.id;
			continue;
		}

		const created = await prisma.kalenderKerja.create({
			data: {
				nama: kalender.nama,
				kode: kalender.kode,
				deskripsi: kalender.deskripsi,
				isDefault: kalender.isDefault,
				isActive: kalender.isActive,
			},
		});

		kalenderMap[kalender.kode] = created.id;
		console.log(`   Created: ${kalender.nama} (id: ${created.id})`);
	}

	// 2. Seed Jadwal Harian
	console.log("\n2. Seeding Jadwal Harian...");

	for (const [kode, jadwalList] of Object.entries(JADWAL_PER_KALENDER)) {
		const kalenderId = kalenderMap[kode];
		if (!kalenderId) continue;

		const kalenderNama = KALENDER_KERJA.find((k) => k.kode === kode)?.nama ?? kode;

		for (const jadwal of jadwalList) {
			const existing = await prisma.jadwalKerja.findFirst({
				where: {
					kalenderKerjaId: kalenderId,
					hari: jadwal.hari,
				},
			});

			if (existing) {
				console.log(`   Skip: ${kalenderNama} - ${jadwal.hari} (already exists)`);
				continue;
			}

			await prisma.jadwalKerja.create({
				data: {
					kalenderKerjaId: kalenderId,
					hari: jadwal.hari as HariDalamMinggu,
					isHariKerja: jadwal.isHariKerja,
					jamMasuk: toTimeOrNull(jadwal.jamMasuk),
					jamKeluar: toTimeOrNull(jadwal.jamKeluar),
					jamMulaiIstirahat: toTimeOrNull(jadwal.jamMulaiIstirahat),
					jamSelesaiIstirahat: toTimeOrNull(jadwal.jamSelesaiIstirahat),
				},
			});

			console.log(`   Created: ${kalenderNama} - ${jadwal.hari} (${jadwal.jamMasuk ?? "libur"})`);
		}
	}

	// 3. Seed Hari Libur (gunakan kalender default)
	console.log("\n3. Seeding Hari Libur Nasional...");

	const defaultKalender = await prisma.kalenderKerja.findFirst({
		where: { isDefault: true },
	});

	if (!defaultKalender) {
		console.log("   Skip: Tidak ada kalender default");
	} else {
		for (const libur of HARI_LIBUR) {
			const tanggal = new Date(libur.tanggal);

			const existing = await prisma.hariLibur.findFirst({
				where: {
					kalenderKerjaId: defaultKalender.id,
					tanggal: tanggal,
				},
			});

			if (existing) {
				console.log(`   Skip: ${libur.nama} (already exists)`);
				continue;
			}

			await prisma.hariLibur.create({
				data: {
					kalenderKerjaId: defaultKalender.id,
					tanggal: tanggal,
					nama: libur.nama,
					deskripsi: libur.deskripsi,
					isCutiBersama: libur.isCutiBersama,
				},
			});

			console.log(`   Created: ${libur.nama} (${libur.tanggal})`);
		}
	}

	console.log("\n=== Done! ===");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
