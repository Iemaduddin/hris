"use server";

import { revalidatePath } from "next/cache";
import { StatusAbsensi, SumberAbsensi, TipeAbsensi } from "@/generated/prisma/client";
import prisma from "@/src/lib/prisma";
import { decimalKeNumber } from "@/src/lib/decimal";
import { hitungJarakMeter, validasiRadius } from "../lib/geo";

export type PresensiTipe = keyof typeof TipeAbsensi;
export type PresensiSumber = keyof typeof SumberAbsensi;

export type PresensiListItem = {
	id: string;
	karyawanId: string;
	karyawanNama: string;
	nomorKaryawan: string;
	waktu: string;
	tipe: string;
	sumber: string;
	status: string;
	catatan: string | null;
};

export type PresensiActionResult = {
	success: boolean;
	message: string;
	/** Hasil validasi radius lokasi (PRD mobile Bag. 5.4). null = tidak dinilai. */
	diLuarRadius?: boolean | null;
	/** true bila perangkat melaporkan GPS simulasi/placeholder. */
	isMocked?: boolean;
	/** Jarak ke pusat lokasi kerja dalam meter, bila tersedia. */
	jarakMeter?: number | null;
	lokasiKerjaId?: string | null;
};

const TIPE_LIST = Object.keys(TipeAbsensi) as PresensiTipe[];
const SUMBER_LIST = Object.keys(SumberAbsensi) as PresensiSumber[];

function isValidTipe(value: string): value is PresensiTipe {
	return (TIPE_LIST as string[]).includes(value);
}

export async function getPresensiHarian(tanggal: string): Promise<PresensiListItem[]> {
	const day = new Date(tanggal);
	if (Number.isNaN(day.getTime())) return [];
	const from = new Date(day);
	from.setHours(0, 0, 0, 0);
	const to = new Date(day);
	to.setHours(23, 59, 59, 999);

	const rows = await prisma.absensi.findMany({
		where: { waktu: { gte: from, lte: to } },
		orderBy: { waktu: "desc" },
		include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
	});

	return rows.map((r) => ({
		id: r.id,
		karyawanId: r.karyawanId,
		karyawanNama: r.karyawan.namaLengkap,
		nomorKaryawan: r.karyawan.nomorKaryawan,
		waktu: r.waktu.toISOString(),
		tipe: r.tipe,
		sumber: r.sumber,
		status: r.status,
		catatan: r.catatan,
	}));
}

export async function catatPresensi(input: {
	karyawanId: string;
	tipe: string;
	sumber?: string;
	deviceId?: string;
	lokasiKerjaId?: string;
	catatan?: string;
	waktu?: string;
	latitude?: number;
	longitude?: number;
	isMocked?: boolean;
	namaPerangkat?: string;
	platform?: string;
}): Promise<PresensiActionResult> {
	if (!input.karyawanId) return { success: false, message: "Karyawan wajib dipilih." };
	if (!isValidTipe(input.tipe)) return { success: false, message: "Tipe presensi tidak valid." };

	const sumber = (SUMBER_LIST as string[]).includes(input.sumber ?? "")
		? (input.sumber as PresensiSumber)
		: "MANUAL";

	const waktu = input.waktu ? new Date(input.waktu) : new Date();
	if (Number.isNaN(waktu.getTime())) return { success: false, message: "Waktu tidak valid." };

	const karyawan = await prisma.karyawan.findUnique({
		where: { id: input.karyawanId },
		select: {
			id: true,
			posisiKaryawan: {
				where: { isCurrent: true },
				take: 1,
				select: { lokasiKerjaId: true },
			},
		},
	});
	if (!karyawan) return { success: false, message: "Karyawan tidak ditemukan." };

	// PRD mobile Bag. 5.4 — lokasi acuan diambil dari penempatan aktif karyawan
	// agar tidak dapat diklaim sembarang klien; fallback ke input (kasus HR).
	const penempatan = karyawan.posisiKaryawan[0] ?? null;
	const lokasiKerjaId = penempatan?.lokasiKerjaId ?? input.lokasiKerjaId ?? null;

	const lokasiMentah = lokasiKerjaId
		? await prisma.lokasiKerja.findUnique({
				where: { id: lokasiKerjaId },
				select: { latitude: true, longitude: true, radiusMeter: true },
			})
		: null;
	// Decimal Prisma dinormalkan dulu agar cocok dengan util geo berbasis number.
	const lokasi = lokasiMentah
		? {
				latitude: decimalKeNumber(lokasiMentah.latitude),
				longitude: decimalKeNumber(lokasiMentah.longitude),
				radiusMeter: lokasiMentah.radiusMeter,
			}
		: null;

	const latitude =
		typeof input.latitude === "number" && Number.isFinite(input.latitude) ? input.latitude : null;
	const longitude =
		typeof input.longitude === "number" && Number.isFinite(input.longitude) ? input.longitude : null;

	// PRD mobile Bag. 5.4 — di luar radius tetap dicatat, hanya ditandai.
	const diLuarRadius = validasiRadius({ latitude, longitude, lokasi });
	const jarakMeter =
		latitude != null && longitude != null && lokasi?.latitude != null && lokasi?.longitude != null
			? Math.round(
					hitungJarakMeter(latitude, longitude, Number(lokasi.latitude), Number(lokasi.longitude)),
				)
			: null;

	// Registrasi perangkat (PRD mobile Bag. 7-B5). Kegagalan tidak boleh
	// menggagalkan pencatatan presensi — presensi lebih prioritas.
	if (input.deviceId) {
		try {
			await prisma.perangkatKaryawan.upsert({
				where: { karyawanId_deviceId: { karyawanId: input.karyawanId, deviceId: input.deviceId } },
				create: {
					karyawanId: input.karyawanId,
					deviceId: input.deviceId,
					namaPerangkat: input.namaPerangkat || null,
					platform: input.platform || null,
					lastSeenAt: new Date(),
				},
				update: {
					lastSeenAt: new Date(),
					...(input.namaPerangkat ? { namaPerangkat: input.namaPerangkat } : {}),
					...(input.platform ? { platform: input.platform } : {}),
				},
			});
		} catch {
			// abaikan — audit device bersifat pelengkap
		}
	}

	await prisma.absensi.create({
		data: {
			karyawanId: input.karyawanId,
			waktu,
			tipe: input.tipe,
			sumber,
			deviceId: input.deviceId || null,
			lokasiKerjaId,
			latitude,
			longitude,
			diLuarRadius,
			isMocked: input.isMocked === true,
			status: StatusAbsensi.VALID,
			catatan: input.catatan || null,
		},
	});

	revalidatePath("/attendance");
	return {
		success: true,
		message: "Presensi tercatat.",
		diLuarRadius,
		isMocked: input.isMocked === true,
		jarakMeter,
		lokasiKerjaId,
	};
}

export async function koreksiPresensi(
	id: string,
	status: "DIKOREKSI" | "DIBATALKAN",
	catatan: string,
): Promise<PresensiActionResult> {
	if (!id) return { success: false, message: "ID presensi tidak valid." };
	try {
		await prisma.absensi.update({
			where: { id },
			data: { status, catatan: catatan || null },
		});
		revalidatePath("/attendance");
		return { success: true, message: "Presensi berhasil dikoreksi." };
	} catch {
		return { success: false, message: "Gagal mengoreksi presensi." };
	}
}
