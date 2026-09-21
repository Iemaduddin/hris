"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { parseAndValidateScheduleAssignmentData } from "../schemas/schedule.schema";
import type {
	ScheduleAssignmentActionResult,
	ScheduleAssignmentListItem,
	KaryawanOption,
	JadwalKerjaOption,
} from "../types/schedule.type";

export async function getScheduleAssignments(): Promise<ScheduleAssignmentListItem[]> {
	const assignments = await prisma.penugasanJadwal.findMany({
		orderBy: { tanggalMulai: "desc" },
		include: {
			karyawan: {
				select: {
					namaLengkap: true,
					nomorKaryawan: true,
				},
			},
			jadwalKerja: {
				include: {
					kalenderKerja: {
						select: { nama: true },
					},
				},
			},
		},
	});

	return assignments;
}

export async function getKaryawanOptions(): Promise<KaryawanOption[]> {
	const karyawan = await prisma.karyawan.findMany({
		where: { status: "AKTIF" },
		orderBy: { namaLengkap: "asc" },
		select: {
			id: true,
			namaLengkap: true,
			nomorKaryawan: true,
		},
	});

	return karyawan;
}

export async function getJadwalKerjaOptions(): Promise<JadwalKerjaOption[]> {
	const jadwal = await prisma.jadwalKerja.findMany({
		where: { isHariKerja: true },
		orderBy: { hari: "asc" },
		include: {
			kalenderKerja: {
				select: { nama: true },
			},
		},
	});

	return jadwal;
}

export async function getScheduleOptions() {
	const [karyawan, jadwalKerja] = await Promise.all([
		getKaryawanOptions(),
		getJadwalKerjaOptions(),
	]);

	return { karyawan, jadwalKerja };
}

export async function createScheduleAssignment(formData: FormData): Promise<ScheduleAssignmentActionResult> {
	const validation = parseAndValidateScheduleAssignmentData(formData);

	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return {
			success: false,
			message: `Data penugasan jadwal tidak valid: ${messages}`,
			errors: validation.errors,
		};
	}

	const { data } = validation;

	try {
		const created = await prisma.penugasanJadwal.create({
			data: {
				karyawanId: data.karyawanId,
				jadwalKerjaId: data.jadwalKerjaId,
				tanggalMulai: new Date(data.tanggalMulai),
				tanggalSelesai: data.tanggalSelesai ? new Date(data.tanggalSelesai) : null,
			},
		});

		revalidatePath("/schedule");

		return {
			success: true,
			message: "Penugasan jadwal berhasil dibuat.",
			id: created.id,
		};
	} catch {
		return { success: false, message: "Gagal membuat penugasan jadwal." };
	}
}

export async function updateScheduleAssignment(formData: FormData): Promise<ScheduleAssignmentActionResult> {
	const validation = parseAndValidateScheduleAssignmentData(formData);

	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return {
			success: false,
			message: `Data penugasan jadwal tidak valid: ${messages}`,
			errors: validation.errors,
		};
	}

	const { data } = validation;

	if (!data.id) {
		return {
			success: false,
			message: "ID penugasan jadwal tidak ditemukan untuk update.",
			errors: { id: "ID wajib ada untuk proses update." },
		};
	}

	try {
		await prisma.penugasanJadwal.update({
			where: { id: data.id },
			data: {
				karyawanId: data.karyawanId,
				jadwalKerjaId: data.jadwalKerjaId,
				tanggalMulai: new Date(data.tanggalMulai),
				tanggalSelesai: data.tanggalSelesai ? new Date(data.tanggalSelesai) : null,
			},
		});

		revalidatePath("/schedule");

		return {
			success: true,
			message: "Penugasan jadwal berhasil diperbarui.",
			id: data.id,
		};
	} catch {
		return { success: false, message: "Gagal memperbarui penugasan jadwal." };
	}
}

export async function deleteScheduleAssignment(id: number): Promise<ScheduleAssignmentActionResult> {
	try {
		await prisma.penugasanJadwal.delete({
			where: { id },
		});

		revalidatePath("/schedule");

		return {
			success: true,
			message: "Penugasan jadwal berhasil dihapus.",
		};
	} catch {
		return { success: false, message: "Gagal menghapus penugasan jadwal." };
	}
}

export async function saveScheduleAssignmentAction(formData: FormData): Promise<ScheduleAssignmentActionResult> {
	const id = Number(formData.get("id") ?? 0) || undefined;

	if (id) {
		return updateScheduleAssignment(formData);
	}

	return createScheduleAssignment(formData);
}

export async function submitScheduleAssignmentAction(
	_prevState: ScheduleAssignmentActionResult | null,
	formData: FormData,
): Promise<ScheduleAssignmentActionResult> {
	return saveScheduleAssignmentAction(formData);
}
