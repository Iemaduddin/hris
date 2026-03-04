import { z } from "zod";
import type { JobGradeFormValues, JobGradeValidationErrors, JobGradeValidationResult } from "../types/job-grade.type";

function toStringValue(formData: FormData, key: string) {
	return String(formData.get(key) ?? "").trim();
}

function toNullable(value: string) {
	return value ? value : null;
}

const decimalPattern = /^\d+(\.\d{1,2})?$/;

const jobGradeSchema = z
	.object({
		id: z.string().optional(),
		name: z.string().min(1, "Nama grade wajib diisi."),
		code: z.string().max(50, "Kode maksimal 50 karakter.").nullable(),
		level: z.number().int("Level harus angka bulat.").min(0, "Level tidak boleh negatif."),
		minSalary: z
			.string()
			.nullable()
			.refine((value) => value === null || decimalPattern.test(value), "Gaji minimum harus angka desimal valid (maks 2 digit)."),
		maxSalary: z
			.string()
			.nullable()
			.refine((value) => value === null || decimalPattern.test(value), "Gaji maksimum harus angka desimal valid (maks 2 digit)."),
		description: z.string().max(500, "Deskripsi maksimal 500 karakter.").nullable(),
	})
	.superRefine((value, context) => {
		if (!value.minSalary || !value.maxSalary) return;

		const minSalary = Number.parseFloat(value.minSalary);
		const maxSalary = Number.parseFloat(value.maxSalary);

		if (maxSalary < minSalary) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["maxSalary"],
				message: "Gaji maksimum tidak boleh lebih kecil dari gaji minimum.",
			});
		}
	});

export function parseAndValidateJobGradeData(formData: FormData): JobGradeValidationResult {
	const rawData = {
		id: toStringValue(formData, "id") || undefined,
		name: toStringValue(formData, "name"),
		code: toNullable(toStringValue(formData, "code")),
		level: Number.parseInt(toStringValue(formData, "level") || "0", 10),
		minSalary: toNullable(toStringValue(formData, "minSalary")),
		maxSalary: toNullable(toStringValue(formData, "maxSalary")),
		description: toNullable(toStringValue(formData, "description")),
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