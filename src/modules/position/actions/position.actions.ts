"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { parseAndValidatePositionData } from "../schemas/position.schema";
import type { PositionActionResult, PositionFormOptions, PositionOption } from "../types/position.type";

export async function getPositionOptions(): Promise<PositionOption[]> {
	const positions = await prisma.position.findMany({
		orderBy: [{ name: "asc" }],
		select: {
			id: true,
			organizationalUnitId: true,
			jobGradeId: true,
			name: true,
			code: true,
			description: true,
			isActive: true,
			organizationalUnit: {
				select: { name: true },
			},
			jobGrade: {
				select: { name: true },
			},
		},
	});

	return positions.map((item) => ({
		id: item.id,
		organizationalUnitId: item.organizationalUnitId,
		organizationalUnitName: item.organizationalUnit?.name ?? null,
		jobGradeId: item.jobGradeId,
		jobGradeName: item.jobGrade?.name ?? null,
		name: item.name,
		code: item.code,
		description: item.description,
		isActive: item.isActive,
	}));
}

export async function getPositionFormOptions(): Promise<PositionFormOptions> {
	const [organizationalUnits, jobGrades] = await Promise.all([
		prisma.organizationalUnit.findMany({
			orderBy: [{ level: "asc" }, { order: "asc" }, { name: "asc" }],
			select: {
				id: true,
				name: true,
				code: true,
				level: true,
			},
		}),
		prisma.jobGrade.findMany({
			orderBy: [{ level: "asc" }, { name: "asc" }],
			select: {
				id: true,
				name: true,
				code: true,
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
		return {
			success: false,
			message: "Validasi gagal.",
			errors: validation.errors,
		};
	}

	const { data } = validation;

	try {
		const created = await prisma.position.create({
			data: {
				organizationalUnitId: data.organizationalUnitId,
				jobGradeId: data.jobGradeId,
				name: data.name,
				code: data.code,
				description: data.description,
				isActive: data.isActive,
			},
		});

		revalidatePath("/settings/position");

		return {
			success: true,
			message: "Position berhasil dibuat.",
			id: created.id,
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				success: false,
				message: "Kode jabatan sudah digunakan.",
				errors: { code: "Kode jabatan harus unik." },
			};
		}

		const message = error instanceof Error ? error.message : "Gagal membuat position.";
		return { success: false, message };
	}
}

export async function updatePosition(formData: FormData): Promise<PositionActionResult> {
	const validation = parseAndValidatePositionData(formData);

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
			message: "ID position tidak ditemukan untuk update.",
			errors: { id: "ID wajib ada untuk proses update." },
		};
	}

	try {
		await prisma.position.update({
			where: { id: data.id },
			data: {
				organizationalUnitId: data.organizationalUnitId,
				jobGradeId: data.jobGradeId,
				name: data.name,
				code: data.code,
				description: data.description,
				isActive: data.isActive,
			},
		});

		revalidatePath("/settings/position");

		return {
			success: true,
			message: "Position berhasil diperbarui.",
			id: data.id,
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				success: false,
				message: "Kode jabatan sudah digunakan.",
				errors: { code: "Kode jabatan harus unik." },
			};
		}

		const message = error instanceof Error ? error.message : "Gagal memperbarui position.";
		return { success: false, message };
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