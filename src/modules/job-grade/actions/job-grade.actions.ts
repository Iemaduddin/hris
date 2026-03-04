"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { parseAndValidateJobGradeData } from "../schemas/job-grade.schema";
import type { JobGradeActionResult, JobGradeOption } from "../types/job-grade.type";

export async function getJobGradeOptions(): Promise<JobGradeOption[]> {
	const grades = await prisma.jobGrade.findMany({
		orderBy: [{ level: "asc" }, { name: "asc" }],
		select: {
			id: true,
			name: true,
			code: true,
			level: true,
			minSalary: true,
			maxSalary: true,
			description: true,
		},
	});

	return grades.map((grade) => ({
		id: grade.id,
		name: grade.name,
		code: grade.code,
		level: grade.level,
		minSalary: grade.minSalary ? grade.minSalary.toString() : null,
		maxSalary: grade.maxSalary ? grade.maxSalary.toString() : null,
		description: grade.description,
	}));
}

export async function createJobGrade(formData: FormData): Promise<JobGradeActionResult> {
	const validation = parseAndValidateJobGradeData(formData);

	if (!validation.isValid) {
		return {
			success: false,
			message: "Validasi gagal.",
			errors: validation.errors,
		};
	}

	const { data } = validation;

	try {
		const created = await prisma.jobGrade.create({
			data: {
				name: data.name,
				code: data.code,
				level: data.level,
				minSalary: data.minSalary,
				maxSalary: data.maxSalary,
				description: data.description,
			},
		});

		revalidatePath("/settings/job-grade");

		return {
			success: true,
			message: "Job grade berhasil dibuat.",
			id: created.id,
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				success: false,
				message: "Kode grade sudah digunakan.",
				errors: { code: "Kode grade harus unik." },
			};
		}

		const message = error instanceof Error ? error.message : "Gagal membuat job grade.";
		return { success: false, message };
	}
}

export async function updateJobGrade(formData: FormData): Promise<JobGradeActionResult> {
	const validation = parseAndValidateJobGradeData(formData);

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
			message: "ID job grade tidak ditemukan untuk update.",
			errors: { id: "ID wajib ada untuk proses update." },
		};
	}

	try {
		await prisma.jobGrade.update({
			where: { id: data.id },
			data: {
				name: data.name,
				code: data.code,
				level: data.level,
				minSalary: data.minSalary,
				maxSalary: data.maxSalary,
				description: data.description,
			},
		});

		revalidatePath("/settings/job-grade");

		return {
			success: true,
			message: "Job grade berhasil diperbarui.",
			id: data.id,
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				success: false,
				message: "Kode grade sudah digunakan.",
				errors: { code: "Kode grade harus unik." },
			};
		}

		const message = error instanceof Error ? error.message : "Gagal memperbarui job grade.";
		return { success: false, message };
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