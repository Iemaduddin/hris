import { z } from "zod";
import type {
	OrganizationalUnitFormValues,
	OrganizationalUnitValidationErrors,
	OrganizationalUnitValidationResult,
} from "../types/organizational-unit.type";

function toStringValue(formData: FormData, key: string) {
	return String(formData.get(key) ?? "").trim();
}

function toNullable(value: string) {
	return value ? value : null;
}

const organizationalUnitSchema = z.object({
	id: z.string().optional(),
	parentId: z.string().nullable(),
	nama: z.string().min(1, "Nama unit wajib diisi."),
	kode: z.string().max(50, "Kode maksimal 50 karakter.").nullable(),
	deskripsi: z.string().max(500, "Deskripsi maksimal 500 karakter.").nullable(),
}).superRefine((value, context) => {
	if (value.id && value.parentId && value.id === value.parentId) {
		context.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["parentId"],
			message: "Parent unit tidak boleh sama dengan unit yang sedang diedit.",
		});
	}
});

export function parseAndValidateOrganizationalUnitData(formData: FormData): OrganizationalUnitValidationResult {
	const rawData = {
		id: toStringValue(formData, "id") || undefined,
		parentId: toNullable(toStringValue(formData, "parentId")),
		nama: toStringValue(formData, "nama"),
		kode: toNullable(toStringValue(formData, "kode")),
		deskripsi: toNullable(toStringValue(formData, "deskripsi")),
	};

	const parsed = organizationalUnitSchema.safeParse(rawData);

	if (!parsed.success) {
		const errors: OrganizationalUnitValidationErrors = {};

		for (const issue of parsed.error.issues) {
			const path = issue.path.join(".");
			if (path && !(path in errors)) {
				errors[path as keyof OrganizationalUnitValidationErrors] = issue.message;
			}
		}

		return {
			isValid: false,
			errors,
		};
	}

	const data: OrganizationalUnitFormValues = parsed.data;

	return {
		isValid: true,
		data,
	};
}
