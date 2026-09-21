"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { hitungRekapPeriode } from "../lib/recap-engine";

export type RekapBulananItem = {
	id: number;
	karyawanId: string;
	karyawanNama: string;
	nomorKaryawan: string;
	tanggal: string;
	status: string;
	telatMenit: number;
	pulangCepatMenit: number;
	lemburMenit: number;
	masukAktual: string | null;
	keluarAktual: string | null;
};

export async function getRekapBulanan(tahun: number, bulan: number, karyawanId?: string): Promise<RekapBulananItem[]> {
	const rows = await prisma.rekapHarian.findMany({
		where: {
			tanggal: {
				gte: toDbDate(new Date(tahun, bulan - 1, 1)),
				lt: toDbDate(new Date(tahun, bulan, 1)),
			},
			...(karyawanId ? { karyawanId } : {}),
		},
		orderBy: [{ tanggal: "asc" }, { karyawan: { namaLengkap: "asc" } }],
		include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
	});

	return rows.map((r) => ({
		id: r.id,
		karyawanId: r.karyawanId,
		karyawanNama: r.karyawan.namaLengkap,
		nomorKaryawan: r.karyawan.nomorKaryawan,
		tanggal: r.tanggal.toISOString(),
		status: r.status,
		telatMenit: r.telatMenit,
		pulangCepatMenit: r.pulangCepatMenit,
		lemburMenit: r.lemburMenit,
		masukAktual: r.masukAktual?.toISOString() ?? null,
		keluarAktual: r.keluarAktual?.toISOString() ?? null,
	}));
}

export async function hitungUlangRekapAction(
	karyawanIds: string[],
	mulai: string,
	selesai: string,
): Promise<{ success: boolean; message: string; dihitung?: number }> {
	const start = new Date(mulai);
	const end = new Date(selesai);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
		return { success: false, message: "Rentang tanggal tidak valid." };
	}
	if (karyawanIds.length === 0) {
		return { success: false, message: "Pilih minimal satu karyawan." };
	}

	try {
		const hasil = await hitungRekapPeriode(karyawanIds, start, end);
		revalidatePath("/recap");
		return { success: true, message: `Rekap dihitung ulang: ${hasil.length} hari-karyawan.`, dihitung: hasil.length };
	} catch {
		return { success: false, message: "Gagal menghitung rekap." };
	}
}

export async function getKaryawanAktifOptions(): Promise<Array<{ value: string; label: string }>> {
	const rows = await prisma.karyawan.findMany({
		where: { status: { in: ["AKTIF", "PROBASI"] } },
		orderBy: { namaLengkap: "asc" },
		select: { id: true, namaLengkap: true, nomorKaryawan: true },
	});
	return rows.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` }));
}
