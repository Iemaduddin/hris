import { z } from "zod";
import type { CompanyFormValues, CompanyValidationErrors, CompanyValidationResult } from "../types/company-data.type";

function toStringValue(formData: FormData, key: string) {
	return String(formData.get(key) ?? "").trim();
}

const companyFormSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1, "Nama perusahaan wajib diisi."),
	logo: z.string().nullable(),
	taxId: z.string().nullable(),
	phone: z.string().nullable(),
	email: z.string().email("Format email tidak valid.").nullable().or(z.literal("")),
	website: z
		.string()
		.url("Website harus berupa URL http/https yang valid.")
		.refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
			message: "Website harus berupa URL http/https yang valid.",
		})
		.nullable()
		.or(z.literal("")),
	address: z.string().nullable(),
	provinceId: z.string().nullable(),
	cityId: z.string().nullable(),
	districtId: z.string().nullable(),
	villageId: z.string().nullable(),
	postalCode: z.string().max(10, "Kode pos maksimal 10 karakter.").nullable(),
}).superRefine((value, context) => {
	if (value.cityId && !value.provinceId) {
		context.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["provinceId"],
			message: "Provinsi wajib dipilih sebelum kabupaten/kota.",
		});
	}

	if (value.districtId && !value.cityId) {
		context.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["cityId"],
			message: "Kabupaten/kota wajib dipilih sebelum kecamatan.",
		});
	}

	if (value.villageId && !value.districtId) {
		context.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["districtId"],
			message: "Kecamatan wajib dipilih sebelum kelurahan.",
		});
	}
});

function normalizeNullable(value: string) {
	return value ? value : null;
}

export function parseAndValidateCompanyData(formData: FormData): CompanyValidationResult {
	const rawData = {
		id: toStringValue(formData, "id") || undefined,
		name: toStringValue(formData, "name"),
		logo: normalizeNullable(toStringValue(formData, "logo")),
		taxId: normalizeNullable(toStringValue(formData, "taxId")),
		phone: normalizeNullable(toStringValue(formData, "phone")),
		email: normalizeNullable(toStringValue(formData, "email")),
		website: normalizeNullable(toStringValue(formData, "website")),
		address: normalizeNullable(toStringValue(formData, "address")),
		provinceId: normalizeNullable(toStringValue(formData, "provinceId")),
		cityId: normalizeNullable(toStringValue(formData, "cityId")),
		districtId: normalizeNullable(toStringValue(formData, "districtId")),
		villageId: normalizeNullable(toStringValue(formData, "villageId")),
		postalCode: normalizeNullable(toStringValue(formData, "postalCode")),
	};

	const parsed = companyFormSchema.safeParse(rawData);

	if (!parsed.success) {
		const errors: CompanyValidationErrors = {};
		for (const issue of parsed.error.issues) {
			const path = issue.path.join(".");
			if (path && !(path in errors)) {
				errors[path as keyof CompanyValidationErrors] = issue.message;
			}
		}

		return {
			isValid: false,
			errors,
		};
	}

	const data: CompanyFormValues = parsed.data as CompanyFormValues;

	return {
		isValid: true,
		data,
	};
}
