"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toTimeValue } from "@/src/lib/time";
import {
	parseAndValidateKalenderKerjaData,
	parseAndValidateJadwalKerjaData,
	parseAndValidateHariLiburData,
} from "../schemas/work-schedule.schema";
import type {
	KalenderKerjaActionResult,
	KalenderKerjaListItem,
	JadwalKerjaActionResult,
	JadwalKerjaListItem,
	HariLiburActionResult,
	HariLiburListItem,
} from "../types/work-schedule.type";

// ============================================================
// Kalender Kerja
// ============================================================

export async function getKalenderKerjaList(): Promise<KalenderKerjaListItem[]> {
	return prisma.kalenderKerja.findMany({
		orderBy: { nama: "asc" },
		include: {
			_count: {
				select: { jadwalKerja: true, hariLibur: true },
			},
		},
	});
}

export async function getKalenderKerjaById(id: number) {
	return prisma.kalenderKerja.findUnique({
		where: { id },
		include: {
			jadwalKerja: { orderBy: { hari: "asc" } },
			hariLibur: { orderBy: { tanggal: "asc" } },
		},
	});
}

export async function createKalenderKerja(formData: FormData): Promise<KalenderKerjaActionResult> {
	const validation = parseAndValidateKalenderKerjaData(formData);
	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return { success: false, message: `Data kalender tidak valid: ${messages}`, errors: validation.errors };
	}

	const { data } = validation;

	try {
		if (data.isDefault) {
			await prisma.kalenderKerja.updateMany({
				where: { isDefault: true },
				data: { isDefault: false },
			});
		}

		const created = await prisma.kalenderKerja.create({
			data: {
				nama: data.nama,
				kode: data.kode,
				deskripsi: data.deskripsi,
				isDefault: data.isDefault,
				isActive: data.isActive,
			},
		});

		revalidatePath("/settings/work-schedule");
		return { success: true, message: "Kalender kerja berhasil dibuat.", id: created.id };
	} catch {
		return { success: false, message: "Gagal membuat kalender kerja." };
	}
}

export async function updateKalenderKerja(formData: FormData): Promise<KalenderKerjaActionResult> {
	const validation = parseAndValidateKalenderKerjaData(formData);
	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return { success: false, message: `Data kalender tidak valid: ${messages}`, errors: validation.errors };
	}

	const { data } = validation;
	if (!data.id) {
		return { success: false, message: "ID kalender tidak ditemukan.", errors: { id: "ID wajib ada." } };
	}

	try {
		if (data.isDefault) {
			await prisma.kalenderKerja.updateMany({
				where: { isDefault: true, id: { not: data.id } },
				data: { isDefault: false },
			});
		}

		await prisma.kalenderKerja.update({
			where: { id: data.id },
			data: {
				nama: data.nama,
				kode: data.kode,
				deskripsi: data.deskripsi,
				isDefault: data.isDefault,
				isActive: data.isActive,
			},
		});

		revalidatePath("/settings/work-schedule");
		return { success: true, message: "Kalender kerja berhasil diperbarui.", id: data.id };
	} catch {
		return { success: false, message: "Gagal memperbarui kalender kerja." };
	}
}

export async function deleteKalenderKerja(id: number): Promise<KalenderKerjaActionResult> {
	try {
		await prisma.kalenderKerja.delete({ where: { id } });
		revalidatePath("/settings/work-schedule");
		return { success: true, message: "Kalender kerja berhasil dihapus." };
	} catch {
		return { success: false, message: "Gagal menghapus kalender kerja." };
	}
}

export async function saveKalenderKerjaAction(formData: FormData): Promise<KalenderKerjaActionResult> {
	const id = Number(formData.get("id") ?? 0) || undefined;
	return id ? updateKalenderKerja(formData) : createKalenderKerja(formData);
}

export async function submitKalenderKerjaAction(
	_prevState: KalenderKerjaActionResult | null,
	formData: FormData,
): Promise<KalenderKerjaActionResult> {
	return saveKalenderKerjaAction(formData);
}

// ============================================================
// Jadwal Kerja
// ============================================================

export async function getJadwalKerjaByKalender(kalenderKerjaId: number): Promise<JadwalKerjaListItem[]> {
	return prisma.jadwalKerja.findMany({
		where: { kalenderKerjaId },
		orderBy: { hari: "asc" },
	});
}

export async function createJadwalKerja(formData: FormData): Promise<JadwalKerjaActionResult> {
	const validation = parseAndValidateJadwalKerjaData(formData);
	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return { success: false, message: `Data jadwal kerja tidak valid: ${messages}`, errors: validation.errors };
	}

	const { data } = validation;

	try {
		const created = await prisma.jadwalKerja.create({
			data: {
				kalenderKerjaId: data.kalenderKerjaId,
				hari: data.hari as "SENIN" | "SELASA" | "RABU" | "KAMIS" | "JUMAT" | "SABTU" | "MINGGU",
				isHariKerja: data.isHariKerja,
				jamMasuk: data.isHariKerja ? toTimeValue(data.jamMasuk) : null,
				jamKeluar: data.isHariKerja ? toTimeValue(data.jamKeluar) : null,
				jamMulaiIstirahat: toTimeValue(data.jamMulaiIstirahat),
				jamSelesaiIstirahat: toTimeValue(data.jamSelesaiIstirahat),
			},
		});

		revalidatePath("/settings/work-schedule");
		return { success: true, message: "Jadwal kerja berhasil dibuat.", id: created.id };
	} catch (e: unknown) {
		if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
			return { success: false, message: "Jadwal untuk hari tersebut sudah ada di kalender ini." };
		}
		return { success: false, message: "Gagal membuat jadwal kerja." };
	}
}

export async function updateJadwalKerja(formData: FormData): Promise<JadwalKerjaActionResult> {
	const validation = parseAndValidateJadwalKerjaData(formData);
	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return { success: false, message: `Data jadwal kerja tidak valid: ${messages}`, errors: validation.errors };
	}

	const { data } = validation;
	if (!data.id) {
		return { success: false, message: "ID jadwal kerja tidak ditemukan.", errors: { id: "ID wajib ada." } };
	}

	try {
		await prisma.jadwalKerja.update({
			where: { id: data.id },
			data: {
				hari: data.hari as "SENIN" | "SELASA" | "RABU" | "KAMIS" | "JUMAT" | "SABTU" | "MINGGU",
				isHariKerja: data.isHariKerja,
				jamMasuk: data.isHariKerja ? toTimeValue(data.jamMasuk) : null,
				jamKeluar: data.isHariKerja ? toTimeValue(data.jamKeluar) : null,
				jamMulaiIstirahat: toTimeValue(data.jamMulaiIstirahat),
				jamSelesaiIstirahat: toTimeValue(data.jamSelesaiIstirahat),
			},
		});

		revalidatePath("/settings/work-schedule");
		return { success: true, message: "Jadwal kerja berhasil diperbarui.", id: data.id };
	} catch {
		return { success: false, message: "Gagal memperbarui jadwal kerja." };
	}
}

export async function deleteJadwalKerja(id: number): Promise<JadwalKerjaActionResult> {
	try {
		await prisma.jadwalKerja.delete({ where: { id } });
		revalidatePath("/settings/work-schedule");
		return { success: true, message: "Jadwal kerja berhasil dihapus." };
	} catch {
		return { success: false, message: "Gagal menghapus jadwal kerja." };
	}
}

export async function saveJadwalKerjaAction(formData: FormData): Promise<JadwalKerjaActionResult> {
	const id = Number(formData.get("id") ?? 0) || undefined;
	return id ? updateJadwalKerja(formData) : createJadwalKerja(formData);
}

export async function submitJadwalKerjaAction(
	_prevState: JadwalKerjaActionResult | null,
	formData: FormData,
): Promise<JadwalKerjaActionResult> {
	return saveJadwalKerjaAction(formData);
}

// ============================================================
// Hari Libur
// ============================================================

export async function getHariLiburByKalender(kalenderKerjaId: number): Promise<HariLiburListItem[]> {
	return prisma.hariLibur.findMany({
		where: { kalenderKerjaId },
		orderBy: { tanggal: "asc" },
	});
}

export async function createHariLibur(formData: FormData): Promise<HariLiburActionResult> {
	const validation = parseAndValidateHariLiburData(formData);
	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return { success: false, message: `Data hari libur tidak valid: ${messages}`, errors: validation.errors };
	}

	const { data } = validation;

	try {
		const created = await prisma.hariLibur.create({
			data: {
				kalenderKerjaId: data.kalenderKerjaId,
				tanggal: new Date(data.tanggal),
				nama: data.nama,
				deskripsi: data.deskripsi,
				isCutiBersama: data.isCutiBersama,
			},
		});

		revalidatePath("/settings/work-schedule");
		return { success: true, message: "Hari libur berhasil dibuat.", id: created.id };
	} catch (e: unknown) {
		if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
			return { success: false, message: "Tanggal tersebut sudah ada di kalender ini." };
		}
		return { success: false, message: "Gagal membuat hari libur." };
	}
}

export async function updateHariLibur(formData: FormData): Promise<HariLiburActionResult> {
	const validation = parseAndValidateHariLiburData(formData);
	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return { success: false, message: `Data hari libur tidak valid: ${messages}`, errors: validation.errors };
	}

	const { data } = validation;
	if (!data.id) {
		return { success: false, message: "ID hari libur tidak ditemukan.", errors: { id: "ID wajib ada." } };
	}

	try {
		await prisma.hariLibur.update({
			where: { id: data.id },
			data: {
				tanggal: new Date(data.tanggal),
				nama: data.nama,
				deskripsi: data.deskripsi,
				isCutiBersama: data.isCutiBersama,
			},
		});

		revalidatePath("/settings/work-schedule");
		return { success: true, message: "Hari libur berhasil diperbarui.", id: data.id };
	} catch {
		return { success: false, message: "Gagal memperbarui hari libur." };
	}
}

export async function deleteHariLibur(id: number): Promise<HariLiburActionResult> {
	try {
		await prisma.hariLibur.delete({ where: { id } });
		revalidatePath("/settings/work-schedule");
		return { success: true, message: "Hari libur berhasil dihapus." };
	} catch {
		return { success: false, message: "Gagal menghapus hari libur." };
	}
}

export async function saveHariLiburAction(formData: FormData): Promise<HariLiburActionResult> {
	const id = Number(formData.get("id") ?? 0) || undefined;
	return id ? updateHariLibur(formData) : createHariLibur(formData);
}

export async function submitHariLiburAction(
	_prevState: HariLiburActionResult | null,
	formData: FormData,
): Promise<HariLiburActionResult> {
	return saveHariLiburAction(formData);
}
