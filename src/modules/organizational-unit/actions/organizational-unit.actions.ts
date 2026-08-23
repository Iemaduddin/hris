"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { parseAndValidateOrganizationalUnitData } from "../schemas/organizational-unit.schema";
import type {
	OrganizationalUnitActionResult,
	OrganizationalUnitOption,
} from "../types/organizational-unit.type";

export async function getOrganizationalUnitOptions(): Promise<OrganizationalUnitOption[]> {
	const units = await prisma.unitOrganisasi.findMany({
		orderBy: { nama: "asc" },
		select: {
			id: true,
			parentId: true,
			nama: true,
			kode: true,
			deskripsi: true,
		},
	});

	return units;
}

export async function createOrganizationalUnit(formData: FormData): Promise<OrganizationalUnitActionResult> {
	const validation = parseAndValidateOrganizationalUnitData(formData);

	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return {
			success: false,
			message: `Data unit organisasi tidak valid: ${messages}`,
			errors: validation.errors,
		};
	}

	try {
		const { data } = validation;

		const created = await prisma.unitOrganisasi.create({
			data: {
				parentId: data.parentId,
				nama: data.nama,
				kode: data.kode,
				deskripsi: data.deskripsi,
			},
		});

		revalidatePath("/settings/organizational-unit");

		return {
			success: true,
			message: "Unit organisasi berhasil dibuat.",
			id: created.id,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Gagal membuat unit organisasi.";
		return { success: false, message };
	}
}

export async function updateOrganizationalUnit(formData: FormData): Promise<OrganizationalUnitActionResult> {
	const validation = parseAndValidateOrganizationalUnitData(formData);

	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return {
			success: false,
			message: `Data unit organisasi tidak valid: ${messages}`,
			errors: validation.errors,
		};
	}

	const { data } = validation;

	if (!data.id) {
		return {
			success: false,
			message: "ID unit tidak ditemukan untuk update.",
			errors: { id: "ID wajib ada untuk proses update." },
		};
	}

	try {
		const existing = await prisma.unitOrganisasi.findUnique({
			where: { id: data.id },
		});

		if (!existing) {
			return {
				success: false,
				message: "Data unit tidak ditemukan.",
			};
		}

		await prisma.unitOrganisasi.update({
			where: { id: data.id },
			data: {
				parentId: data.parentId,
				nama: data.nama,
				kode: data.kode,
				deskripsi: data.deskripsi,
			},
		});

		revalidatePath("/settings/organizational-unit");

		return {
			success: true,
			message: "Unit organisasi berhasil diperbarui.",
			id: data.id,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Gagal memperbarui unit organisasi.";
		return { success: false, message };
	}
}

export async function saveOrganizationalUnitAction(formData: FormData): Promise<OrganizationalUnitActionResult> {
	const unitId = String(formData.get("id") ?? "").trim();

	if (unitId) {
		return updateOrganizationalUnit(formData);
	}

	return createOrganizationalUnit(formData);
}

export async function submitOrganizationalUnitAction(
	_prevState: OrganizationalUnitActionResult | null,
	formData: FormData,
): Promise<OrganizationalUnitActionResult> {
	return saveOrganizationalUnitAction(formData);
}
