import { z } from "zod";
import type { JobGradeFormValues, JobGradeValidationErrors, JobGradeValidationResult } from "../types/job-grade.type";

function toStringValue(formData: FormData, key: string) {
	return String(formData.get(key) ?? "").trim();
}

function toNullable(value: string) {
	return value ? value : null;
}

const jobGradeSchema = z.object({
	id: z.string().optional(),
	nama: z.string().min(1, "Nama grade wajib diisi."),
	kode: z.string().max(50, "Kode maksimal 50 karakter.").nullable(),
	deskripsi: z.string().max(500, "Deskripsi maksimal 500 karakter.").nullable(),
});

export function parseAndValidateJobGradeData(formData: FormData): JobGradeValidationResult {
	const rawData = {
		id: toStringValue(formData, "id") || undefined,
		nama: toStringValue(formData, "nama"),
		kode: toNullable(toStringValue(formData, "kode")),
		deskripsi: toNullable(toStringValue(formData, "deskripsi")),
	};

	const parsed = jobGradeSchema.safeParse(rawData);

	if (!parsed.success) {
		const errors: JobGradeValidationErrors = {};

		for (const issue of parsed.error.issues) {
			const path = issue.path.join(".");
			if (path && !(path in errors)) {
				errors[path as keyof JobGradeValidationErrors] = issue.message;
			}
		}

		return {
			isValid: false,
			errors,
		};
	}

	const data: JobGradeFormValues = parsed.data;

	return {
		isValid: true,
		data,
	};
}
