"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { parseAndValidatePositionData } from "../schemas/position.schema";
import type { PositionActionResult, PositionFormOptions, PositionOption } from "../types/position.type";

export async function getPositionOptions(): Promise<PositionOption[]> {
	const positions = await prisma.posisi.findMany({
		orderBy: { nama: "asc" },
		select: {
			id: true,
			unitOrganisasiId: true,
			golonganPosisiId: true,
			nama: true,
			kode: true,
			deskripsi: true,
			unitOrganisasi: {
				select: { nama: true },
			},
			golonganPosisi: {
				select: { nama: true },
			},
		},
	});

	return positions.map((item) => ({
		id: item.id,
		unitOrganisasiId: item.unitOrganisasiId,
		orgUnitName: item.unitOrganisasi?.nama ?? null,
		golonganPosisiId: item.golonganPosisiId,
		golonganPosisiNama: item.golonganPosisi?.nama ?? null,
		nama: item.nama,
		kode: item.kode,
		deskripsi: item.deskripsi,
	}));
}

export async function getPositionFormOptions(): Promise<PositionFormOptions> {
	const [organizationalUnits, jobGrades] = await Promise.all([
		prisma.unitOrganisasi.findMany({
			orderBy: { nama: "asc" },
			select: {
				id: true,
				nama: true,
				kode: true,
			},
		}),
		prisma.golonganPosisi.findMany({
			orderBy: { nama: "asc" },
			select: {
				id: true,
				nama: true,
				kode: true,
			},
		}),
	]);

	return {
		organizationalUnits,
		jobGrades,
	};
}

export async function createPosition(formData: FormData): Promise<PositionActionResult> {
	const validation = parseAndValidatePositionData(formData);

	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return {
			success: false,
			message: `Data posisi tidak valid: ${messages}`,
			errors: validation.errors,
		};
	}

	const { data } = validation;

	try {
		const created = await prisma.posisi.create({
			data: {
				unitOrganisasiId: data.unitOrganisasiId,
				golonganPosisiId: data.golonganPosisiId,
				nama: data.nama,
				kode: data.kode,
				deskripsi: data.deskripsi,
			},
		});

		revalidatePath("/settings/position");

		return {
			success: true,
			message: "Position berhasil dibuat.",
			id: created.id,
		};
	} catch {
		return { success: false, message: "Gagal membuat position." };
	}
}

export async function updatePosition(formData: FormData): Promise<PositionActionResult> {
	const validation = parseAndValidatePositionData(formData);

	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return {
			success: false,
			message: `Data posisi tidak valid: ${messages}`,
			errors: validation.errors,
		};
	}

	const { data } = validation;

	if (!data.id) {
		return {
			success: false,
			message: "ID position tidak ditemukan untuk update.",
			errors: { id: "ID wajib ada untuk proses update." },
		};
	}

	try {
		await prisma.posisi.update({
			where: { id: data.id },
			data: {
				unitOrganisasiId: data.unitOrganisasiId,
				golonganPosisiId: data.golonganPosisiId,
				nama: data.nama,
				kode: data.kode,
				deskripsi: data.deskripsi,
			},
		});

		revalidatePath("/settings/position");

		return {
			success: true,
			message: "Position berhasil diperbarui.",
			id: data.id,
		};
	} catch {
		return { success: false, message: "Gagal memperbarui position." };
	}
}

export async function savePositionAction(formData: FormData): Promise<PositionActionResult> {
	const id = String(formData.get("id") ?? "").trim();

	if (id) {
		return updatePosition(formData);
	}

	return createPosition(formData);
}

export async function submitPositionAction(
	_prevState: PositionActionResult | null,
	formData: FormData,
): Promise<PositionActionResult> {
	return savePositionAction(formData);
}
