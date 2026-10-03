import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });

/** Karyawan uji M1 (user employee@example.com). */
const KARYAWAN_ID = "cmuugt0s60000qcuo43xi14xg";

/** `@db.Date` Prisma memakai komponen UTC — wajib lewat Date.UTC. */
function tanggalDb(iso: string): Date {
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(Date.UTC(y, m - 1, d));
}

/** Tanggal lokal server (Asia/Bangkok, UTC+7). */
function tanggalLokal(d: Date): string {
	const p = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function main() {
	const iso = tanggalLokal(new Date());
	const tanggal = tanggalDb(iso);
	console.log(`Reset presensi UAT untuk ${iso} (karyawan ${KARYAWAN_ID})`);

	const absensi = await prisma.absensi.deleteMany({
		where: { karyawanId: KARYAWAN_ID, waktu: { gte: tanggal, lt: new Date(tanggal.getTime() + 86_400_000) } },
	});
	console.log(`Absensi dihapus : ${absensi.count}`);

	const rekap = await prisma.rekapHarian.updateMany({
		where: { karyawanId: KARYAWAN_ID, tanggal },
		data: {
			status: "ALPA",
			masukAktual: null,
			keluarAktual: null,
			telatMenit: 0,
			pulangCepatMenit: 0,
			lemburMenit: 0,
		},
	});
	console.log(`Rekap di-reset  : ${rekap.count} baris -> ALPA`);

	const sisa = await prisma.absensi.count({
		where: { karyawanId: KARYAWAN_ID, waktu: { gte: tanggal, lt: new Date(tanggal.getTime() + 86_400_000) } },
	});
	console.log(`Sisa absensi    : ${sisa}`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
