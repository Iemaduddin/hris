import { OrgUnitType } from "@/generated/prisma/enums";
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
	name: z.string().min(1, "Nama unit wajib diisi."),
	code: z.string().max(50, "Kode maksimal 50 karakter.").nullable(),
	type: z.nativeEnum(OrgUnitType, { message: "Tipe unit tidak valid." }),
	description: z.string().max(500, "Deskripsi maksimal 500 karakter.").nullable(),
	order: z.number().int("Urutan harus berupa angka bulat.").min(0, "Urutan tidak boleh negatif."),
	isActive: z.boolean(),
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
		name: toStringValue(formData, "name"),
		code: toNullable(toStringValue(formData, "code")),
		type: toStringValue(formData, "type") as OrgUnitType,
		description: toNullable(toStringValue(formData, "description")),
		order: Number.parseInt(toStringValue(formData, "order") || "0", 10),
		isActive: toStringValue(formData, "isActive") !== "false",
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