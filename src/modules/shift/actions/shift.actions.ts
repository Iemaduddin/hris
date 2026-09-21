"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/src/lib/prisma";
import { fromTimeValue, toTimeValue } from "@/src/lib/time";
import { parseAndValidateShiftData } from "../schemas/shift.schema";
import type { ShiftActionResult, ShiftListItem } from "../types/shift.type";

export async function getShiftList(): Promise<ShiftListItem[]> {
	const rows = await prisma.shift.findMany({ orderBy: { kode: "asc" } });
	return rows.map((s) => ({
		id: s.id,
		kode: s.kode,
		nama: s.nama,
		jamMasuk: fromTimeValue(s.jamMasuk),
		jamKeluar: fromTimeValue(s.jamKeluar),
		lintasHari: s.lintasHari,
		toleransiTelatMenit: s.toleransiTelatMenit,
		isActive: s.isActive,
	}));
}

export async function getActiveShiftOptions(): Promise<Array<{ value: string; label: string }>> {
	const rows = await prisma.shift.findMany({
		where: { isActive: true },
		orderBy: { kode: "asc" },
		select: { id: true, kode: true, nama: true, jamMasuk: true, jamKeluar: true },
	});
	return rows.map((s) => ({
		value: s.id,
		label: `${s.kode} — ${s.nama} (${fromTimeValue(s.jamMasuk)}–${fromTimeValue(s.jamKeluar)})`,
	}));
}

export async function saveShiftAction(formData: FormData): Promise<ShiftActionResult> {
	const validation = parseAndValidateShiftData(formData);
	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return { success: false, message: `Data shift tidak valid: ${messages}`, errors: validation.errors };
	}

	const { data } = validation;
	const id = String(formData.get("id") ?? "").trim();

	try {
		if (id) {
			await prisma.shift.update({
				where: { id },
				data: {
					kode: data.kode,
					nama: data.nama,
					jamMasuk: toTimeValue(data.jamMasuk)!,
					jamKeluar: toTimeValue(data.jamKeluar)!,
					lintasHari: data.lintasHari,
					toleransiTelatMenit: data.toleransiTelatMenit,
					isActive: data.isActive,
				},
			});
		} else {
			await prisma.shift.create({
				data: {
					kode: data.kode,
					nama: data.nama,
					jamMasuk: toTimeValue(data.jamMasuk)!,
					jamKeluar: toTimeValue(data.jamKeluar)!,
					lintasHari: data.lintasHari,
					toleransiTelatMenit: data.toleransiTelatMenit,
					isActive: data.isActive,
				},
			});
		}

		revalidatePath("/settings/shift");
		return { success: true, message: id ? "Shift berhasil diperbarui." : "Shift berhasil dibuat." };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return { success: false, message: "Kode shift sudah digunakan.", errors: { kode: "Kode harus unik." } };
		}
		return { success: false, message: "Gagal menyimpan shift." };
	}
}

export async function submitShiftAction(
	_prevState: ShiftActionResult | null,
	formData: FormData,
): Promise<ShiftActionResult> {
	return saveShiftAction(formData);
}

export async function deleteShiftAction(id: string): Promise<ShiftActionResult> {
	try {
		await prisma.shift.delete({ where: { id } });
		revalidatePath("/settings/shift");
		return { success: true, message: "Shift berhasil dihapus." };
	} catch {
		return { success: false, message: "Gagal menghapus shift. Shift yang sudah dipakai roster tidak bisa dihapus." };
	}
}
