"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { addDays, dateOnlyInput, toDbDate } from "@/src/lib/time";

export type RosterListItem = {
	id: number;
	karyawanId: string;
	karyawanNama: string;
	nomorKaryawan: string;
	tanggal: string;
	shiftId: string;
	shiftKode: string;
	shiftNama: string;
};

export type RosterActionResult = { success: boolean; message: string };

function parseDay(value: string): Date | null {
	if (!value) return null;
	try {
		return toDbDate(value);
	} catch {
		return null;
	}
}

export async function getRosterPeriode(mulai: string, selesai: string, karyawanId?: string): Promise<RosterListItem[]> {
	const start = parseDay(mulai);
	const end = parseDay(selesai);
	if (!start || !end) return [];

	const rows = await prisma.rosterShift.findMany({
		where: {
			tanggal: { gte: start, lte: end },
			...(karyawanId ? { karyawanId } : {}),
		},
		orderBy: [{ tanggal: "asc" }, { karyawan: { namaLengkap: "asc" } }],
		include: {
			karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
			shift: { select: { kode: true, nama: true } },
		},
	});

	return rows.map((r) => ({
		id: r.id,
		karyawanId: r.karyawanId,
		karyawanNama: r.karyawan.namaLengkap,
		nomorKaryawan: r.karyawan.nomorKaryawan,
		tanggal: dateOnlyInput(r.tanggal),
		shiftId: r.shiftId,
		shiftKode: r.shift.kode,
		shiftNama: r.shift.nama,
	}));
}

export async function simpanRosterPola(input: {
	karyawanIds: string[];
	mulai: string;
	selesai: string;
	polaShiftIds: string[];
}): Promise<RosterActionResult> {
	const start = parseDay(input.mulai);
	const end = parseDay(input.selesai);
	if (!start || !end || start > end) return { success: false, message: "Rentang tanggal tidak valid." };
	if (input.karyawanIds.length === 0) return { success: false, message: "Pilih minimal satu karyawan." };
	if (input.polaShiftIds.length === 0) return { success: false, message: "Pilih minimal satu shift untuk pola." };

	const shifts = await prisma.shift.findMany({
		where: { id: { in: input.polaShiftIds }, isActive: true },
		select: { id: true },
	});
	if (shifts.length === 0) return { success: false, message: "Shift tidak valid." };
	const validIds = shifts.map((s) => s.id);

	let cursor = start;
	let dayIndex = 0;
	let count = 0;
	while (cursor <= end) {
		const shiftId = validIds[dayIndex % validIds.length];
		for (const karyawanId of input.karyawanIds) {
			await prisma.rosterShift.upsert({
				where: { karyawanId_tanggal: { karyawanId, tanggal: cursor } },
				update: { shiftId },
				create: { karyawanId, tanggal: cursor, shiftId },
			});
			count++;
		}
		cursor = addDays(cursor, 1);
		dayIndex++;
	}

	revalidatePath("/roster");
	return { success: true, message: `Roster tersimpan: ${count} penugasan.` };
}

export async function hapusRoster(input: {
	karyawanIds: string[];
	mulai: string;
	selesai: string;
}): Promise<RosterActionResult> {
	const start = parseDay(input.mulai);
	const end = parseDay(input.selesai);
	if (!start || !end || input.karyawanIds.length === 0) {
		return { success: false, message: "Parameter tidak valid." };
	}

	const result = await prisma.rosterShift.deleteMany({
		where: { karyawanId: { in: input.karyawanIds }, tanggal: { gte: start, lte: end } },
	});

	revalidatePath("/roster");
	return { success: true, message: `${result.count} roster dihapus.` };
}

export type PenugasanKalenderItem = {
	id: number;
	karyawanId: string;
	karyawanNama: string;
	kalenderKerjaId: number;
	kalenderNama: string;
	tanggalMulai: string;
	tanggalSelesai: string | null;
};

export async function getPenugasanKalender(): Promise<PenugasanKalenderItem[]> {
	const rows = await prisma.penugasanKalender.findMany({
		orderBy: { tanggalMulai: "desc" },
		include: {
			karyawan: { select: { namaLengkap: true } },
			kalenderKerja: { select: { nama: true } },
		},
	});
	return rows.map((r) => ({
		id: r.id,
		karyawanId: r.karyawanId,
		karyawanNama: r.karyawan.namaLengkap,
		kalenderKerjaId: r.kalenderKerjaId,
		kalenderNama: r.kalenderKerja.nama,
		tanggalMulai: dateOnlyInput(r.tanggalMulai),
		tanggalSelesai: r.tanggalSelesai ? dateOnlyInput(r.tanggalSelesai) : null,
	}));
}

export async function simpanPenugasanKalender(input: {
	karyawanId: string;
	kalenderKerjaId: number;
	tanggalMulai: string;
	tanggalSelesai?: string;
}): Promise<RosterActionResult> {
	const mulai = parseDay(input.tanggalMulai);
	const selesai = input.tanggalSelesai ? parseDay(input.tanggalSelesai) : null;
	if (!input.karyawanId || !mulai || !input.kalenderKerjaId) {
		return { success: false, message: "Karyawan, kalender, dan tanggal mulai wajib diisi." };
	}
	if (selesai && selesai < mulai) {
		return { success: false, message: "Tanggal selesai tidak boleh sebelum tanggal mulai." };
	}

	await prisma.$transaction(async (tx) => {
		await tx.penugasanKalender.updateMany({
			where: { karyawanId: input.karyawanId, tanggalSelesai: null },
			data: { tanggalSelesai: addDays(mulai, -1) },
		});
		await tx.penugasanKalender.create({
			data: {
				karyawanId: input.karyawanId,
				kalenderKerjaId: input.kalenderKerjaId,
				tanggalMulai: mulai,
				tanggalSelesai: selesai,
			},
		});
	});

	revalidatePath("/roster");
	return { success: true, message: "Penugasan kalender tersimpan." };
}

export async function hapusPenugasanKalender(id: number): Promise<RosterActionResult> {
	try {
		await prisma.penugasanKalender.delete({ where: { id } });
		revalidatePath("/roster");
		return { success: true, message: "Penugasan dihapus." };
	} catch {
		return { success: false, message: "Gagal menghapus penugasan." };
	}
}

export async function getKalenderOptions(): Promise<Array<{ value: number; label: string }>> {
	const rows = await prisma.kalenderKerja.findMany({
		where: { isActive: true },
		orderBy: { nama: "asc" },
		select: { id: true, nama: true, isDefault: true },
	});
	return rows.map((k) => ({ value: k.id, label: k.isDefault ? `${k.nama} (Default)` : k.nama }));
}
