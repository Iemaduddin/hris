import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });

/** Karyawan uji M1 (user employee@example.com). */
const KARYAWAN_ID = "cmuugt0s60000qcuo43xi14xg";

const jam = (h: number, m = 0) => new Date(1970, 0, 1, h, m);

const SHIFTS = [
	{ kode: "PAGI", nama: "Shift Pagi", jamMasuk: jam(8), jamKeluar: jam(16), lintasHari: false },
	{ kode: "SIANG", nama: "Shift Siang", jamMasuk: jam(12), jamKeluar: jam(20), lintasHari: false },
	{ kode: "MALAM", nama: "Shift Malam", jamMasuk: jam(22), jamKeluar: jam(6), lintasHari: true },
];

/** Siklus 6 hari: 2x PAGI, 2x SIANG, 2x MALAM (untuk menguji roster lintas hari). */
const SIKLUS = ["PAGI", "PAGI", "SIANG", "SIANG", "MALAM", "MALAM"];

const DARI = "2026-10-01";
const SAMPAI = "2026-10-20";

/**
 * `@db.Date` disimpan Prisma dari komponen UTC, jadi tanggal lokal harus
 * dipetakan lewat `Date.UTC` — sama seperti `toDbDate()` di aplikasi.
 * Pakai `new Date(y, m, d)` lokal akan menggeser mundur satu hari (UTC+7).
 */
function tanggalDb(iso: string): Date {
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(Date.UTC(y, m - 1, d));
}

function rentang(a: string, b: string): Date[] {
	const out: Date[] = [];
	const cur = tanggalDb(a);
	const end = tanggalDb(b);
	while (cur.getTime() <= end.getTime()) {
		out.push(new Date(cur));
		cur.setUTCDate(cur.getUTCDate() + 1);
	}
	return out;
}

function pad(n: number): string {
	return String(n).padStart(2, "0");
}

function tglLocal(d: Date): string {
	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

async function main() {
	console.log(`Lokasi acuan: ${KARYAWAN_ID}`);
	console.log(`Rentang roster: ${DARI} .. ${SAMPAI} (waktu lokal ${Intl.DateTimeFormat().resolvedOptions().timeZone})`);

	// 1. Shift
	const shiftId: Record<string, string> = {};
	for (const s of SHIFTS) {
		const row = await prisma.shift.upsert({
			where: { kode: s.kode },
			create: { kode: s.kode, nama: s.nama, jamMasuk: s.jamMasuk, jamKeluar: s.jamKeluar, lintasHari: s.lintasHari, toleransiTelatMenit: 15 },
			update: { nama: s.nama, jamMasuk: s.jamMasuk, jamKeluar: s.jamKeluar, lintasHari: s.lintasHari, toleransiTelatMenit: 15 },
		});
		shiftId[s.kode] = row.id;
	}

	// Tunjukkan cara Prisma membaca TIME (menentukan apakah jam tampil 8 atau 15)
	const cek = await prisma.shift.findUnique({ where: { kode: "PAGI" } });
	if (cek) {
		console.log(`TIME PAGI: iso=${cek.jamMasuk.toISOString()}  getHours()=${pad(cek.jamMasuk.getHours())}:${pad(cek.jamMasuk.getMinutes())}`);
	}

	// 2. Kalender kerja (wajib untuk penugasan)
	const kalender =
		(await prisma.kalenderKerja.findFirst({ where: { isActive: true }, orderBy: { id: "asc" } })) ??
		(await prisma.kalenderKerja.create({ data: { nama: "Kalender Kerja Reguler", kode: "REGULER", isDefault: true } }));

	// 2. Penugasan kalender (agar endpoint /jadwal punya isi di bagian "penugasan")
	const mulai = tanggalDb(DARI);
	const selesai = tanggalDb(SAMPAI);
	await prisma.penugasanKalender.deleteMany({ where: { karyawanId: KARYAWAN_ID } });
	await prisma.penugasanKalender.create({
		data: { karyawanId: KARYAWAN_ID, kalenderKerjaId: kalender.id, tanggalMulai: mulai, tanggalSelesai: selesai },
	});
	console.log(`Penugasan kalender "${kalender.nama}" #${kalender.id}: ${DARI} .. ${SAMPAI}`);

	// 3. Roster shift harian (reset dulu agar tidak sisa baris geser-satu-hari)
	await prisma.rosterShift.deleteMany({ where: { karyawanId: KARYAWAN_ID } });
	const tanggalList = rentang(DARI, SAMPAI);
	let dibuat = 0;
	let diperbarui = 0;
	for (let i = 0; i < tanggalList.length; i++) {
		const tanggal = tanggalList[i];
		const kode = SIKLUS[i % SIKLUS.length];
		const row = await prisma.rosterShift.upsert({
			where: { karyawanId_tanggal: { karyawanId: KARYAWAN_ID, tanggal } },
			create: { karyawanId: KARYAWAN_ID, tanggal, shiftId: shiftId[kode] },
			update: { shiftId: shiftId[kode] },
		});
		if (row.createdAt.getTime() === row.updatedAt.getTime()) dibuat++;
		else diperbarui++;
	}
	console.log(`Roster: ${tanggalList.length} tanggal (${dibuat} baru, ${diperbarui} diperbarui)`);

	// 5. Ringkasan hari ini + 7 hari ke depan
	const today = new Date();
	const preview = await prisma.rosterShift.findMany({
		where: { karyawanId: KARYAWAN_ID, tanggal: { gte: today, lte: new Date(today.getTime() + 7 * 86400_000) } },
		orderBy: { tanggal: "asc" },
		include: { shift: true },
	});
	console.log("Preview 7 hari ke depan:");
	for (const r of preview) {
		console.log(
			`  ${tglLocal(r.tanggal)}  ${r.shift.kode.padEnd(5)} ${pad(r.shift.jamMasuk.getHours())}:${pad(r.shift.jamMasuk.getMinutes())}-${pad(r.shift.jamKeluar.getHours())}:${pad(r.shift.jamKeluar.getMinutes())}  lintasHari=${r.shift.lintasHari}`,
		);
	}
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
