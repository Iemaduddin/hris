"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { parseAndValidateWorkLocationData } from "../schemas/work-location.schema";
import type { WorkLocationActionResult, WorkLocationOption } from "../types/work-location.type";

export async function getWorkLocationOptions(): Promise<WorkLocationOption[]> {
	const locations = await prisma.lokasiKerja.findMany({
		orderBy: { nama: "asc" },
		select: {
			id: true,
			nama: true,
			kode: true,
			alamat: true,
			kota: true,
			provinsi: true,
			kodePos: true,
			isActive: true,
		},
	});

	return locations;
}

export async function createWorkLocation(formData: FormData): Promise<WorkLocationActionResult> {
	const validation = parseAndValidateWorkLocationData(formData);

	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return {
			success: false,
			message: `Data lokasi kerja tidak valid: ${messages}`,
			errors: validation.errors,
		};
	}

	const { data } = validation;

	try {
		const created = await prisma.lokasiKerja.create({
			data: {
				nama: data.nama,
				kode: data.kode,
				alamat: data.alamat,
				kota: data.kota,
				provinsi: data.provinsi,
				kodePos: data.kodePos,
				isActive: data.isActive,
			},
		});

		revalidatePath("/settings/work-location");

		return {
			success: true,
			message: "Lokasi Kerja berhasil dibuat.",
			id: created.id,
		};
	} catch {
		return { success: false, message: "Gagal membuat lokasi kerja." };
	}
}

export async function updateWorkLocation(formData: FormData): Promise<WorkLocationActionResult> {
	const validation = parseAndValidateWorkLocationData(formData);

	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return {
			success: false,
			message: `Data lokasi kerja tidak valid: ${messages}`,
			errors: validation.errors,
		};
	}

	const { data } = validation;

	if (!data.id) {
		return {
			success: false,
			message: "ID lokasi kerja tidak ditemukan untuk update.",
			errors: { id: "ID wajib ada untuk proses update." },
		};
	}

	try {
		await prisma.lokasiKerja.update({
			where: { id: data.id },
			data: {
				nama: data.nama,
				kode: data.kode,
				alamat: data.alamat,
				kota: data.kota,
				provinsi: data.provinsi,
				kodePos: data.kodePos,
				isActive: data.isActive,
			},
		});

		revalidatePath("/settings/work-location");

		return {
			success: true,
			message: "Lokasi Kerja berhasil diperbarui.",
			id: data.id,
		};
	} catch {
		return { success: false, message: "Gagal memperbarui lokasi kerja." };
	}
}

export async function saveWorkLocationAction(formData: FormData): Promise<WorkLocationActionResult> {
	const id = String(formData.get("id") ?? "").trim();

	if (id) {
		return updateWorkLocation(formData);
	}

	return createWorkLocation(formData);
}

export async function submitWorkLocationAction(
	_prevState: WorkLocationActionResult | null,
	formData: FormData,
): Promise<WorkLocationActionResult> {
	return saveWorkLocationAction(formData);
}
