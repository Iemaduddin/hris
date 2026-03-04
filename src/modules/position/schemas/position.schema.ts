import { z } from "zod";
import type { PositionFormValues, PositionValidationErrors, PositionValidationResult } from "../types/position.type";

function toStringValue(formData: FormData, key: string) {
	return String(formData.get(key) ?? "").trim();
}

function toNullable(value: string) {
	return value ? value : null;
}

const positionSchema = z.object({
	id: z.string().optional(),
	organizationalUnitId: z.string().nullable(),
	jobGradeId: z.string().nullable(),
	name: z.string().min(1, "Nama jabatan wajib diisi."),
	code: z.string().max(50, "Kode maksimal 50 karakter.").nullable(),
	description: z.string().max(500, "Deskripsi maksimal 500 karakter.").nullable(),
	isActive: z.boolean(),
});

export function parseAndValidatePositionData(formData: FormData): PositionValidationResult {
	const rawData = {
		id: toStringValue(formData, "id") || undefined,
		organizationalUnitId: toNullable(toStringValue(formData, "organizationalUnitId")),
		jobGradeId: toNullable(toStringValue(formData, "jobGradeId")),
		name: toStringValue(formData, "name"),
		code: toNullable(toStringValue(formData, "code")),
		description: toNullable(toStringValue(formData, "description")),
		isActive: toStringValue(formData, "isActive") !== "false",
	};

	const parsed = positionSchema.safeParse(rawData);

	if (!parsed.success) {
		const errors: PositionValidationErrors = {};

		for (const issue of parsed.error.issues) {
			const path = issue.path.join(".");
			if (path && !(path in errors)) {
				errors[path as keyof PositionValidationErrors] = issue.message;
			}
		}

		return {
			isValid: false,
			errors,
		};
	}

	const data: PositionFormValues = parsed.data;

	return {
		isValid: true,
		data,
	};
}