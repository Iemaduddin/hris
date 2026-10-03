/**
 * Tahap M3 - Slip Gaji.
 * Menyiapkan data payroll supaya GET /api/v1/payslip punya isi:
 *   1. KontrakKerja AKTIF + gajiPokok (sumber gaji pokok pada hitung).
 *   2. GajiKaryawan -> KomponenGaji (pendapatan/tunjangan/iuran).
 *   3. RekapHarian (hari hadir/alpa) untuk periode yang dihitung.
 *   4. SalaryRun: buat -> hitung -> final -> terbitkan -> Payslip.
 * Idempoten: aman dijalankan berulang.
 */
import "dotenv/config";
import prisma from "../src/lib/prisma";
import { hitungGajiKaryawan } from "../src/modules/payroll/lib/calculate";

type Periode = { tahun: number; bulan: number };

const PERIODES: Periode[] = [
	{ tahun: 2026, bulan: 9 },
	{ tahun: 2026, bulan: 10 },
];

const GAJI_POKOK: Record<string, number> = {
	"EMP-E2E-001": 8_000_000,
	INF01202608001: 15_000_000,
};

const periodeKey = (p: Periode) => `${p.tahun}-${String(p.bulan).padStart(2, "0")}`;
const tanggalMulai = (p: Periode) => new Date(Date.UTC(p.tahun, p.bulan - 1, 1));
const tanggalSelesai = (p: Periode) => new Date(Date.UTC(p.tahun, p.bulan, 0));

function hariDalamPeriode(p: Periode): Date[] {
	const out: Date[] = [];
	for (let d = 1; d <= 31; d++) {
		const t = new Date(Date.UTC(p.tahun, p.bulan - 1, d));
		if (t.getUTCMonth() !== p.bulan - 1) break;
		out.push(t);
	}
	return out;
}

const ALPA_DATES = new Set(["2026-09-10", "2026-09-24"]);

/** Hari terakhir yang boleh punya rekap (hutang presensi hari depan tidak ada). */
function batasHari(): Date {
	const kini = new Date();
	return new Date(Date.UTC(kini.getUTCFullYear(), kini.getUTCMonth(), kini.getUTCDate()));
}

async function seedRekap(karyawanId: string, p: Periode) {
	let dibuat = 0;
	for (const t of hariDalamPeriode(p)) {
		const key = t.toISOString().slice(0, 10);
		const akhirPekan = t.getUTCDay() === 0 || t.getUTCDay() === 6;
		if (akhirPekan) continue;
		if (t.getTime() > batasHari().getTime()) continue;
		const status = ALPA_DATES.has(key) ? "ALPA" : "HADIR";
		const ada = await prisma.rekapHarian.findUnique({
			where: { karyawanId_tanggal: { karyawanId, tanggal: t } },
		});
		if (ada) continue;
		await prisma.rekapHarian.create({
			data: { karyawanId, tanggal: t, sumberJadwal: "MANUAL", status },
		});
		dibuat++;
	}
	return dibuat;
}

async function ensureKontrak(karyawanId: string, gajiPokok: number, nomor: string) {
	const ada = await prisma.kontrakKerja.findFirst({
		where: { karyawanId, status: "AKTIF" },
		select: { id: true },
	});
	if (ada) return ada.id;
	const dibuat = await prisma.kontrakKerja.create({
		data: {
			karyawanId,
			nomorKontrak: nomor,
			jenisKontrak: "PKWTT",
			status: "AKTIF",
			tanggalMulai: new Date(Date.UTC(2026, 0, 1)),
			gajiPokok,
		},
	});
	return dibuat.id;
}

async function ensureKomponen(karyawanId: string) {
	const ada = await prisma.gajiKaryawan.count({ where: { karyawanId, isActive: true } });
	if (ada > 0) return ada;
	const komponen = await prisma.komponenGaji.findMany({
		where: { isActive: true },
		select: { id: true },
	});
	await prisma.gajiKaryawan.createMany({
		data: komponen.map((k) => ({ karyawanId, komponenId: k.id })),
	});
	return komponen.length;
}

async function jalankanRun(p: Periode, karyawanIds: string[]) {
	const key = periodeKey(p);
	let run = await prisma.salaryRun.findUnique({ where: { periode: key } });

	if (!run) {
		run = await prisma.salaryRun.create({
			data: { periode: key, tanggalMulai: tanggalMulai(p), tanggalSelesai: tanggalSelesai(p) },
		});
	}

	// hitung ulang selama run belum FINAL/DITERBITKAN
	await prisma.salaryRunDetail.deleteMany({ where: { runId: run.id } });
	for (const id of karyawanIds) {
		const h = await hitungGajiKaryawan(id, tanggalMulai(p), tanggalSelesai(p));
		await prisma.salaryRunDetail.create({
			data: {
				runId: run.id,
				karyawanId: id,
				gajiPokok: h.gajiPokok,
				totalPendapatan: h.totalPendapatan,
				totalPotongan: h.totalPotongan,
				gajiBersih: h.gajiBersih,
				hariHadir: h.hariHadir,
				hariAlpa: h.hariAlpa,
				jamLembur: h.jamLembur,
				rincian: h.rincian as never,
			},
		});
	}

	await prisma.salaryRun.update({ where: { id: run.id }, data: { status: "DIHITUNG" } });
	await prisma.salaryRun.update({ where: { id: run.id }, data: { status: "FINAL" } });

	const detail = await prisma.salaryRunDetail.findMany({
		where: { runId: run.id },
		select: { karyawanId: true },
	});
	for (const d of detail) {
		await prisma.payslip.upsert({
			where: { runId_karyawanId: { runId: run.id, karyawanId: d.karyawanId } },
			update: {},
			create: {
				nomor: `SLIP-${key}-${d.karyawanId.slice(-6).toUpperCase()}`,
				runId: run.id,
				karyawanId: d.karyawanId,
			},
		});
	}
	await prisma.salaryRun.update({ where: { id: run.id }, data: { status: "DITERBITKAN" } });
	return { key, status: "DITERBITKAN", jumlah: detail.length };
}

async function main() {
	const karyawan = await prisma.karyawan.findMany({
		where: { status: { in: ["AKTIF", "PROBASI"] } },
		select: { id: true, nomorKaryawan: true, namaLengkap: true },
	});
	if (karyawan.length === 0) throw new Error("Tidak ada karyawan aktif.");

	// bersihkan rekap yang terlanjur dibuat untuk tanggal mendatang
	for (const k of karyawan) {
		const dibuang = await prisma.rekapHarian.deleteMany({
			where: { karyawanId: k.id, sumberJadwal: "MANUAL", tanggal: { gt: batasHari() } },
		});
		if (dibuang.count > 0) console.log(`rekap ${k.nomorKaryawan}: buang ${dibuang.count} tanggal mendatang`);
	}

	for (const k of karyawan) {
		const gaji = GAJI_POKOK[k.nomorKaryawan] ?? 5_000_000;
		const kontrak = await ensureKontrak(k.id, gaji, `KTR-${k.nomorKaryawan}-2026`);
		const komponen = await ensureKomponen(k.id);
		console.log(`kontrak ${k.nomorKaryawan}: ${kontrak} (GP ${gaji}) + ${komponen} komponen`);
	}

	const ids = karyawan.map((k) => k.id);
	for (const p of PERIODES) {
		for (const id of ids) {
			const n = await seedRekap(id, p);
			if (n > 0) console.log(`rekap ${periodeKey(p)}: +${n} hari`);
		}
	}

	for (const p of PERIODES) {
		const hasil = await jalankanRun(p, ids);
		console.log(`run ${hasil.key}: ${hasil.status} (${hasil.jumlah} slip)`);
	}

	const slips = await prisma.payslip.findMany({
		orderBy: { nomor: "desc" },
		include: { run: { select: { periode: true, status: true } } },
	});
	console.log(`\nTotal payslip: ${slips.length}`);
	for (const s of slips) console.log(`  ${s.nomor}  ${s.run.periode}  ${s.run.status}`);

	const detail = await prisma.salaryRunDetail.findMany({
		where: { karyawanId: ids[0] },
		select: {
			run: { select: { periode: true } },
			gajiPokok: true,
			totalPendapatan: true,
			totalPotongan: true,
			gajiBersih: true,
			hariHadir: true,
			hariAlpa: true,
		},
		orderBy: { run: { periode: "desc" } },
	});
	console.log(`\nDetail karyawan uji:`);
	for (const d of detail) {
		console.log(
			`  ${d.run.periode}: GP ${d.gajiPokok} | pendapatan ${d.totalPendapatan} | potongan ${d.totalPotongan} | bersih ${d.gajiBersih} | hadir ${d.hariHadir} | alpa ${d.hariAlpa}`,
		);
	}
}

main().finally(() => prisma.$disconnect());
