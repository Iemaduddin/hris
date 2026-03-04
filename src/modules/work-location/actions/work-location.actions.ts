"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { parseAndValidateWorkLocationData } from "../schemas/work-location.schema";
import type { WorkLocationActionResult, WorkLocationOption } from "../types/work-location.type";

export async function getWorkLocationOptions(): Promise<WorkLocationOption[]> {
	const locations = await prisma.workLocation.findMany({
		orderBy: [{ name: "asc" }],
		select: {
			id: true,
			name: true,
			code: true,
			address: true,
			city: true,
			province: true,
			postalCode: true,
			latitude: true,
			longitude: true,
			radiusMeters: true,
			isActive: true,
		},
	});

	return locations;
}

export async function createWorkLocation(formData: FormData): Promise<WorkLocationActionResult> {
	const validation = parseAndValidateWorkLocationData(formData);

	if (!validation.isValid) {
		return {
			success: false,
			message: "Validasi gagal.",
			errors: validation.errors,
		};
	}

	const { data } = validation;

	try {
		const created = await prisma.workLocation.create({
			data: {
				name: data.name,
				code: data.code,
				address: data.address,
				city: data.city,
				province: data.province,
				postalCode: data.postalCode,
				latitude: data.latitude,
				longitude: data.longitude,
				radiusMeters: data.radiusMeters,
				isActive: data.isActive,
			},
		});

		revalidatePath("/settings/work-location");

		return {
			success: true,
			message: "Work location berhasil dibuat.",
			id: created.id,
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				success: false,
				message: "Kode lokasi sudah digunakan.",
				errors: { code: "Kode lokasi harus unik." },
			};
		}

		const message = error instanceof Error ? error.message : "Gagal membuat work location.";
		return { success: false, message };
	}
}

export async function updateWorkLocation(formData: FormData): Promise<WorkLocationActionResult> {
	const validation = parseAndValidateWorkLocationData(formData);

	if (!validation.isValid) {
		return {
			success: false,
			message: "Validasi gagal.",
			errors: validation.errors,
		};
	}

	const { data } = validation;

	if (!data.id) {
		return {
			success: false,
			message: "ID work location tidak ditemukan untuk update.",
			errors: { id: "ID wajib ada untuk proses update." },
		};
	}

	try {
		await prisma.workLocation.update({
			where: { id: data.id },
			data: {
				name: data.name,
				code: data.code,
				address: data.address,
				city: data.city,
				province: data.province,
				postalCode: data.postalCode,
				latitude: data.latitude,
				longitude: data.longitude,
				radiusMeters: data.radiusMeters,
				isActive: data.isActive,
			},
		});

		revalidatePath("/settings/work-location");

		return {
			success: true,
			message: "Work location berhasil diperbarui.",
			id: data.id,
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				success: false,
				message: "Kode lokasi sudah digunakan.",
				errors: { code: "Kode lokasi harus unik." },
			};
		}

		const message = error instanceof Error ? error.message : "Gagal memperbarui work location.";
		return { success: false, message };
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