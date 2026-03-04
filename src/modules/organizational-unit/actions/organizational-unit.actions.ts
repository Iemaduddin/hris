"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { parseAndValidateOrganizationalUnitData } from "../schemas/organizational-unit.schema";
import type {
	OrganizationalUnitActionResult,
	OrganizationalUnitOption,
} from "../types/organizational-unit.type";

function buildPath(parentPath: string | null, currentId: string) {
	if (!parentPath) return currentId;
	return `${parentPath}.${currentId}`;
}

function mapUnitName(unit: { name: string; code: string | null }) {
	return unit.code ? `${unit.name} (${unit.code})` : unit.name;
}

export async function getOrganizationalUnitOptions(): Promise<OrganizationalUnitOption[]> {
	const units = await prisma.organizationalUnit.findMany({
		orderBy: [{ level: "asc" }, { order: "asc" }, { name: "asc" }],
		select: {
			id: true,
			parentId: true,
			name: true,
			code: true,
			type: true,
			description: true,
			level: true,
			path: true,
			order: true,
			isActive: true,
		},
	});

	return units;
}

export async function createOrganizationalUnit(formData: FormData): Promise<OrganizationalUnitActionResult> {
	const validation = parseAndValidateOrganizationalUnitData(formData);

	if (!validation.isValid) {
		return {
			success: false,
			message: "Validasi gagal.",
			errors: validation.errors,
		};
	}

	try {
		const { data } = validation;

		const createdId = await prisma.$transaction(async (tx) => {
			let parentPath: string | null = null;
			let level = 0;

			if (data.parentId) {
				const parent = await tx.organizationalUnit.findUnique({
					where: { id: data.parentId },
					select: { id: true, level: true, path: true },
				});

				if (!parent) {
					throw new Error("Parent unit tidak ditemukan.");
				}

				parentPath = parent.path ?? parent.id;
				level = parent.level + 1;
			}

			const created = await tx.organizationalUnit.create({
				data: {
					parentId: data.parentId,
					name: data.name,
					code: data.code,
					type: data.type,
					description: data.description,
					order: data.order,
					isActive: data.isActive,
					level,
				},
			});

			const path = buildPath(parentPath, created.id);

			await tx.organizationalUnit.update({
				where: { id: created.id },
				data: { path },
			});

			return created.id;
		});

		revalidatePath("/settings/organizational-unit");

		return {
			success: true,
			message: "Unit organisasi berhasil dibuat.",
			id: createdId,
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				success: false,
				message: "Kode unit sudah digunakan.",
				errors: { code: "Kode unit harus unik." },
			};
		}

		const message = error instanceof Error ? error.message : "Gagal membuat unit organisasi.";
		return { success: false, message };
	}
}

export async function updateOrganizationalUnit(formData: FormData): Promise<OrganizationalUnitActionResult> {
	const validation = parseAndValidateOrganizationalUnitData(formData);

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
			message: "ID unit tidak ditemukan untuk update.",
			errors: { id: "ID wajib ada untuk proses update." },
		};
	}

	try {
		await prisma.$transaction(async (tx) => {
			const existing = await tx.organizationalUnit.findUnique({
				where: { id: data.id },
				select: { id: true, level: true, path: true },
			});

			if (!existing) {
				throw new Error("Data unit tidak ditemukan.");
			}

			const oldPath = existing.path ?? existing.id;
			let parentPath: string | null = null;
			let nextLevel = 0;

			if (data.parentId) {
				const parent = await tx.organizationalUnit.findUnique({
					where: { id: data.parentId },
					select: { id: true, level: true, path: true, name: true, code: true },
				});

				if (!parent) {
					throw new Error("Parent unit tidak ditemukan.");
				}

				const parentResolvedPath = parent.path ?? parent.id;

				if (parent.id === existing.id || parentResolvedPath === oldPath || parentResolvedPath.startsWith(`${oldPath}.`)) {
					throw new Error(`Parent tidak valid: ${mapUnitName(parent)} adalah turunan dari unit ini.`);
				}

				parentPath = parentResolvedPath;
				nextLevel = parent.level + 1;
			}

			const newPath = buildPath(parentPath, existing.id);
			const levelDelta = nextLevel - existing.level;

			await tx.organizationalUnit.update({
				where: { id: existing.id },
				data: {
					parentId: data.parentId,
					name: data.name,
					code: data.code,
					type: data.type,
					description: data.description,
					order: data.order,
					isActive: data.isActive,
					level: nextLevel,
					path: newPath,
				},
			});

			if (newPath !== oldPath || levelDelta !== 0) {
				const descendants = await tx.organizationalUnit.findMany({
					where: {
						path: {
							startsWith: `${oldPath}.`,
						},
					},
					select: {
						id: true,
						path: true,
						level: true,
					},
				});

				for (const descendant of descendants) {
					if (!descendant.path) continue;
					const suffix = descendant.path.slice(oldPath.length + 1);
					const nextPath = suffix ? `${newPath}.${suffix}` : newPath;

					await tx.organizationalUnit.update({
						where: { id: descendant.id },
						data: {
							path: nextPath,
							level: descendant.level + levelDelta,
						},
					});
				}
			}
		});

		revalidatePath("/settings/organizational-unit");

		return {
			success: true,
			message: "Unit organisasi berhasil diperbarui.",
			id: data.id,
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				success: false,
				message: "Kode unit sudah digunakan.",
				errors: { code: "Kode unit harus unik." },
			};
		}

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