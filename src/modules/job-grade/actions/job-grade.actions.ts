"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { parseAndValidateJobGradeData } from "../schemas/job-grade.schema";
import type { JobGradeActionResult, JobGradeOption } from "../types/job-grade.type";

export async function getJobGradeOptions(): Promise<JobGradeOption[]> {
	const grades = await prisma.golonganPosisi.findMany({
		orderBy: { nama: "asc" },
		select: {
			id: true,
			nama: true,
			kode: true,
			deskripsi: true,
		},
	});

	return grades;
}

export async function createJobGrade(formData: FormData): Promise<JobGradeActionResult> {
	const validation = parseAndValidateJobGradeData(formData);

	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return {
			success: false,
			message: `Data golongan tidak valid: ${messages}`,
			errors: validation.errors,
		};
	}

	const { data } = validation;

	try {
		const created = await prisma.golonganPosisi.create({
			data: {
				nama: data.nama,
				kode: data.kode,
				deskripsi: data.deskripsi,
			},
		});

		revalidatePath("/settings/job-grade");

		return {
			success: true,
			message: "Golongan Posisi berhasil dibuat.",
			id: created.id,
		};
	} catch {
		return { success: false, message: "Gagal membuat golongan posisi." };
	}
}

export async function updateJobGrade(formData: FormData): Promise<JobGradeActionResult> {
	const validation = parseAndValidateJobGradeData(formData);

	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return {
			success: false,
			message: `Data golongan tidak valid: ${messages}`,
			errors: validation.errors,
		};
	}

	const { data } = validation;

	if (!data.id) {
		return {
			success: false,
			message: "ID golongan posisi tidak ditemukan untuk update.",
			errors: { id: "ID wajib ada untuk proses update." },
		};
	}

	try {
		await prisma.golonganPosisi.update({
			where: { id: data.id },
			data: {
				nama: data.nama,
				kode: data.kode,
				deskripsi: data.deskripsi,
			},
		});

		revalidatePath("/settings/job-grade");

		return {
			success: true,
			message: "Golongan Posisi berhasil diperbarui.",
			id: data.id,
		};
	} catch {
		return { success: false, message: "Gagal memperbarui golongan posisi." };
	}
}

export async function saveJobGradeAction(formData: FormData): Promise<JobGradeActionResult> {
	const id = String(formData.get("id") ?? "").trim();

	if (id) {
		return updateJobGrade(formData);
	}

	return createJobGrade(formData);
}

export async function submitJobGradeAction(
	_prevState: JobGradeActionResult | null,
	formData: FormData,
): Promise<JobGradeActionResult> {
	return saveJobGradeAction(formData);
}
