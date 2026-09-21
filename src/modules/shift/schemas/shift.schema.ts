import { z } from "zod";
import type { ShiftValidationErrors, ShiftValidationResult } from "../types/shift.type";

const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

function toStringValue(formData: FormData, key: string) {
	return String(formData.get(key) ?? "").trim();
}

const shiftSchema = z.object({
	id: z.string().optional(),
	kode: z.string().trim().min(1, "Kode shift wajib diisi.").max(20, "Kode maksimal 20 karakter."),
	nama: z.string().trim().min(1, "Nama shift wajib diisi."),
	jamMasuk: z.string().trim().regex(TIME_RE, "Jam masuk format HH:MM."),
	jamKeluar: z.string().trim().regex(TIME_RE, "Jam keluar format HH:MM."),
	lintasHari: z.boolean(),
	toleransiTelatMenit: z.coerce.number().int().min(0).max(480),
	isActive: z.boolean(),
});

export function parseAndValidateShiftData(formData: FormData): ShiftValidationResult {
	const parsed = shiftSchema.safeParse({
		id: toStringValue(formData, "id") || undefined,
		kode: toStringValue(formData, "kode").toUpperCase(),
		nama: toStringValue(formData, "nama"),
		jamMasuk: toStringValue(formData, "jamMasuk"),
		jamKeluar: toStringValue(formData, "jamKeluar"),
		lintasHari: toStringValue(formData, "lintasHari") === "true",
		toleransiTelatMenit: toStringValue(formData, "toleransiTelatMenit") || 0,
		isActive: toStringValue(formData, "isActive") !== "false",
	});

	if (!parsed.success) {
		const errors: ShiftValidationErrors = {};
		for (const issue of parsed.error.issues) {
			const path = issue.path.join(".");
			if (path && !(path in errors)) {
				errors[path as keyof ShiftValidationErrors] = issue.message;
			}
		}
		return { isValid: false, errors };
	}

	return { isValid: true, data: parsed.data };
}
