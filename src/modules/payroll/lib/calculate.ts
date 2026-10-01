import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";

export type RincianItem = {
	kode: string;
	nama: string;
	kelompok: string;
	jumlah: number;
	keterangan: string;
};

export type HitungGaji = {
	gajiPokok: number;
	totalPendapatan: number;
	totalPotongan: number;
	gajiBersih: number;
	hariHadir: number;
	hariAlpa: number;
	jamLembur: number;
	shiftMalam: number;
	rincian: RincianItem[];
};

/**
 * Aturan hitung MVP (terdokumentasi, teruji):
 * - Gaji pokok: kontrak AKTIF terbaru (tanggalMulai desc), 0 bila tidak ada.
 * - Hari hadir: rekap HADIR + TERLAMBAT + CUTI + IZIN + DINAS.
 * - Hari alpa: rekap ALPA.
 * - Jam lembur: total lembur DISETUJUI pada periode.
 * - Shift malam: roster pada periode yang shift-nya lintasHari.
 * - NOMINAL: nilai tetap. PERSEN: % x min(gajiPokok, batasAtas).
 * - PER_HARI: nilai x hariHadir. PER_JAM_LEMBUR: nilai x jamLembur.
 * - PER_SHIFT_MALAM: nilai x shiftMalam.
 * - Khusus kode POTONGAN_ALPA: hariAlpa x gajiPokok/26 (nilai diabaikan).
 * - PENDAPATAN/TUNJANGAN menambah, POTONGAN/IURAN mengurangi.
 */
export async function hitungGajiKaryawan(karyawanId: string, mulai: Date, selesai: Date): Promise<HitungGaji> {
	const start = toDbDate(mulai);
	const end = toDbDate(selesai);

	const kontrak = await prisma.kontrakKerja.findFirst({
		where: { karyawanId, status: "AKTIF" },
		orderBy: { tanggalMulai: "desc" },
		select: { gajiPokok: true },
	});
	const gajiPokok = kontrak?.gajiPokok ? Number(kontrak.gajiPokok) : 0;

	const rekap = await prisma.rekapHarian.findMany({
		where: { karyawanId, tanggal: { gte: start, lte: end } },
		select: { status: true },
	});
	const HADIR_SET = new Set(["HADIR", "TERLAMBAT", "CUTI", "IZIN", "DINAS"]);
	let hariHadir = 0;
	let hariAlpa = 0;
	for (const r of rekap) {
		if (r.status === "ALPA") hariAlpa++;
		else if (HADIR_SET.has(r.status)) hariHadir++;
	}

	const lemburAgg = await prisma.lembur.aggregate({
		where: { karyawanId, tanggal: { gte: start, lte: end }, status: "DISETUJUI" },
		_sum: { jumlahJam: true },
	});
	const jamLembur = Number(lemburAgg._sum.jumlahJam ?? 0);

	const shiftMalam = await prisma.rosterShift.count({
		where: { karyawanId, tanggal: { gte: start, lte: end }, shift: { lintasHari: true } },
	});

	const assignments = await prisma.gajiKaryawan.findMany({
		where: { karyawanId, isActive: true, komponen: { isActive: true } },
		include: { komponen: true },
		orderBy: { komponen: { urutan: "asc" } },
	});

	const rincian: RincianItem[] = [];
	let totalPendapatan = gajiPokok;
	let totalPotongan = 0;

	if (gajiPokok > 0) {
		rincian.push({ kode: "GAJI_POKOK", nama: "Gaji Pokok", kelompok: "PENDAPATAN", jumlah: gajiPokok, keterangan: "Dari kontrak aktif" });
	}

	for (const a of assignments) {
		const k = a.komponen;
		let jumlah = 0;
		let keterangan = "";
		if (k.kode === "POTONGAN_ALPA") {
			jumlah = Math.round((hariAlpa * gajiPokok) / 26);
			keterangan = `${hariAlpa} hari x GP/26`;
		} else if (k.tipe === "NOMINAL") {
			jumlah = Number(k.nilai);
		} else if (k.tipe === "PERSEN") {
			const basis = k.batasAtas ? Math.min(gajiPokok, Number(k.batasAtas)) : gajiPokok;
			jumlah = Math.round((basis * Number(k.nilai)) / 100);
			keterangan = `${k.nilai}% x ${basis}`;
		} else if (k.tipe === "PER_HARI") {
			jumlah = Math.round(Number(k.nilai) * hariHadir);
			keterangan = `${hariHadir} hari`;
		} else if (k.tipe === "PER_JAM_LEMBUR") {
			jumlah = Math.round(Number(k.nilai) * jamLembur);
			keterangan = `${jamLembur} jam`;
		} else if (k.tipe === "PER_SHIFT_MALAM") {
			jumlah = Math.round(Number(k.nilai) * shiftMalam);
			keterangan = `${shiftMalam} shift`;
		}

		rincian.push({ kode: k.kode, nama: k.nama, kelompok: k.kelompok, jumlah, keterangan });
		if (k.kelompok === "PENDAPATAN" || k.kelompok === "TUNJANGAN") {
			totalPendapatan += jumlah;
		} else {
			totalPotongan += jumlah;
		}
	}

	return {
		gajiPokok,
		totalPendapatan,
		totalPotongan,
		gajiBersih: totalPendapatan - totalPotongan,
		hariHadir,
		hariAlpa,
		jamLembur,
		shiftMalam,
		rincian,
	};
}
