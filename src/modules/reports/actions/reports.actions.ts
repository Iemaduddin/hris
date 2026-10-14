"use server";

import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { getCurrentSession } from "@/src/lib/auth-guard";

const JENIS_LAPORAN = ["kehadiran", "cuti", "lembur", "turnover", "kontrak", "telat", "saldo"] as const;
export type JenisLaporan = (typeof JENIS_LAPORAN)[number];

export type LaporanHasil = {
	columns: string[];
	rows: string[][];
};

/** Manajer hanya melihat bawahan langsung; peran lain tanpa batas. */
async function scopeKaryawanIds(): Promise<string[] | null> {
	try {
		const session = await getCurrentSession();
		if (!session) return [];
		const user = await prisma.user.findUnique({
			where: { id: session.user.id },
			select: { role: true },
		});
		if (!user || user.role !== "MANAJER") return null;
		const saya = await prisma.karyawan.findFirst({
			where: { userId: session.user.id },
			select: { id: true },
		});
		if (!saya) return [];
		const tim = await prisma.karyawan.findMany({
			where: { atasanLangsungId: saya.id },
			select: { id: true },
		});
		return tim.map((t) => t.id);
	} catch {
		return [];
	}
}

export async function getLaporan(jenis: string, mulai: string, selesai: string): Promise<LaporanHasil> {
	if (!(JENIS_LAPORAN as readonly string[]).includes(jenis)) {
		return { columns: [], rows: [] };
	}
	const start = toDbDate(mulai);
	const end = toDbDate(selesai);
	if (!(start <= end)) return { columns: [], rows: [] };
	const scope = await scopeKaryawanIds();
	const milik = scope ? { karyawanId: { in: scope } } : {};

	if (jenis === "kehadiran") {
		const rows = await prisma.rekapHarian.findMany({
			where: { tanggal: { gte: start, lte: end }, ...milik },
			orderBy: [{ tanggal: "asc" }],
			include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
			take: 2000,
		});
		return {
			columns: ["Tanggal", "Nomor", "Nama", "Status", "Telat (m)", "Pulang Cepat (m)", "Lembur (m)"],
			rows: rows.map((r) => [
				r.tanggal.toISOString().slice(0, 10),
				r.karyawan.nomorKaryawan,
				r.karyawan.namaLengkap,
				r.status,
				String(r.telatMenit),
				String(r.pulangCepatMenit),
				String(r.lemburMenit),
			]),
		};
	}

	if (jenis === "cuti") {
		const rows = await prisma.pengajuanKetidakhadiran.findMany({
			where: { tanggalMulai: { lte: end }, tanggalSelesai: { gte: start }, ...milik },
			orderBy: [{ tanggalMulai: "asc" }],
			include: {
				karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
				jenisKetidakhadiran: { select: { nama: true } },
			},
			take: 2000,
		});
		return {
			columns: ["Nomor", "Nama", "Jenis", "Mulai", "Selesai", "Hari", "Status"],
			rows: rows.map((r) => [
				r.nomorPengajuan,
				r.karyawan.namaLengkap,
				r.jenisKetidakhadiran.nama,
				r.tanggalMulai.toISOString().slice(0, 10),
				r.tanggalSelesai.toISOString().slice(0, 10),
				r.jumlahHari.toString(),
				r.status,
			]),
		};
	}

	if (jenis === "lembur") {
		const rows = await prisma.lembur.findMany({
			where: { tanggal: { gte: start, lte: end }, ...milik },
			orderBy: [{ tanggal: "asc" }],
			include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
			take: 2000,
		});
		return {
			columns: ["Tanggal", "Nomor", "Nama", "Jam", "Alasan", "Status"],
			rows: rows.map((r) => [
				r.tanggal.toISOString().slice(0, 10),
				r.karyawan.nomorKaryawan,
				r.karyawan.namaLengkap,
				r.jumlahJam.toString(),
				r.alasan,
				r.status,
			]),
		};
	}

	if (jenis === "turnover") {
		const batas = scope ? { id: { in: scope } } : {};
		const masuk = await prisma.karyawan.findMany({
			where: { tanggalMasuk: { gte: start, lte: end }, ...batas },
			select: { nomorKaryawan: true, namaLengkap: true, tanggalMasuk: true },
		});
		const keluar = await prisma.karyawan.findMany({
			where: { tanggalResign: { gte: start, lte: end }, ...batas },
			select: { nomorKaryawan: true, namaLengkap: true, tanggalResign: true, status: true },
		});
		return {
			columns: ["Pergerakan", "Nomor", "Nama", "Tanggal", "Status"],
			rows: [
				...masuk.map((k) => ["MASUK", k.nomorKaryawan, k.namaLengkap, k.tanggalMasuk.toISOString().slice(0, 10), ""]),
				...keluar.map((k) => ["KELUAR", k.nomorKaryawan, k.namaLengkap, k.tanggalResign?.toISOString().slice(0, 10) ?? "", k.status]),
			],
		};
	}

	if (jenis === "kontrak") {
		const rows = await prisma.kontrakKerja.findMany({
			where: { tanggalSelesai: { gte: start, lte: end }, ...(scope ? { karyawanId: { in: scope } } : {}) },
			orderBy: [{ tanggalSelesai: "asc" }],
			include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
			take: 2000,
		});
		return {
			columns: ["Nomor Kontrak", "Nama", "Jenis", "Mulai", "Selesai", "Status"],
			rows: rows.map((r) => [
				r.nomorKontrak,
				r.karyawan.namaLengkap,
				r.jenisKontrak,
				r.tanggalMulai.toISOString().slice(0, 10),
				r.tanggalSelesai?.toISOString().slice(0, 10) ?? "-",
				r.status,
			]),
		};
	}

	if (jenis === "telat") {
		const rows = await prisma.rekapHarian.findMany({
			where: { tanggal: { gte: start, lte: end }, status: "TERLAMBAT", ...milik },
			include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
			take: 2000,
		});
		const agg = new Map<string, { nomor: string; nama: string; hari: number; menit: number }>();
		for (const r of rows) {
			const cur = agg.get(r.karyawanId) ?? { nomor: r.karyawan.nomorKaryawan, nama: r.karyawan.namaLengkap, hari: 0, menit: 0 };
			cur.hari++;
			cur.menit += r.telatMenit;
			agg.set(r.karyawanId, cur);
		}
		return {
			columns: ["Nomor", "Nama", "Hari Telat", "Total Menit"],
			rows: [...agg.values()]
				.sort((a, b) => b.menit - a.menit)
				.map((a) => [a.nomor, a.nama, String(a.hari), String(a.menit)]),
		};
	}

	const tahun = start.getUTCFullYear();
	const saldo = await prisma.saldoCuti.findMany({
		where: { tahun, ...(scope ? { karyawanId: { in: scope } } : {}) },
		orderBy: [{ karyawan: { namaLengkap: "asc" } }],
		include: {
			karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
			jenisKetidakhadiran: { select: { nama: true } },
		},
		take: 2000,
	});
	return {
		columns: ["Nomor", "Nama", "Jenis", "Tahun", "Sisa"],
		rows: saldo.map((s) => [
			s.karyawan.nomorKaryawan,
			s.karyawan.namaLengkap,
			s.jenisKetidakhadiran.nama,
			String(s.tahun),
			s.saldoAkhir.toString(),
		]),
	};
}
