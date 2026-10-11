"use server";

import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";

const JENIS_LAPORAN = ["kehadiran", "cuti", "lembur", "turnover", "kontrak"] as const;
export type JenisLaporan = (typeof JENIS_LAPORAN)[number];

export type LaporanHasil = {
	columns: string[];
	rows: string[][];
};

export async function getLaporan(jenis: string, mulai: string, selesai: string): Promise<LaporanHasil> {
	if (!(JENIS_LAPORAN as readonly string[]).includes(jenis)) {
		return { columns: [], rows: [] };
	}
	const start = toDbDate(mulai);
	const end = toDbDate(selesai);
	if (!(start <= end)) return { columns: [], rows: [] };

	if (jenis === "kehadiran") {
		const rows = await prisma.rekapHarian.findMany({
			where: { tanggal: { gte: start, lte: end } },
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
			where: { tanggalMulai: { lte: end }, tanggalSelesai: { gte: start } },
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
			where: { tanggal: { gte: start, lte: end } },
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
		const masuk = await prisma.karyawan.findMany({
			where: { tanggalMasuk: { gte: start, lte: end } },
			select: { nomorKaryawan: true, namaLengkap: true, tanggalMasuk: true },
		});
		const keluar = await prisma.karyawan.findMany({
			where: { tanggalResign: { gte: start, lte: end } },
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

	const rows = await prisma.kontrakKerja.findMany({
		where: { tanggalSelesai: { gte: start, lte: end } },
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
