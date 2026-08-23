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
	unitOrganisasiId: z.string().nullable(),
	golonganPosisiId: z.string().nullable(),
	nama: z.string().min(1, "Nama jabatan wajib diisi."),
	kode: z.string().max(50, "Kode maksimal 50 karakter.").nullable(),
	deskripsi: z.string().max(500, "Deskripsi maksimal 500 karakter.").nullable(),
});

export function parseAndValidatePositionData(formData: FormData): PositionValidationResult {
	const rawData = {
		id: toStringValue(formData, "id") || undefined,
		unitOrganisasiId: toNullable(toStringValue(formData, "unitOrganisasiId")),
		golonganPosisiId: toNullable(toStringValue(formData, "golonganPosisiId")),
		nama: toStringValue(formData, "nama"),
		kode: toNullable(toStringValue(formData, "kode")),
		deskripsi: toNullable(toStringValue(formData, "deskripsi")),
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
