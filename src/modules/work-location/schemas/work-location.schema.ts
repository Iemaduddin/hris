import { z } from "zod";
import type {
	WorkLocationFormValues,
	WorkLocationValidationErrors,
	WorkLocationValidationResult,
} from "../types/work-location.type";

function toStringValue(formData: FormData, key: string) {
	return String(formData.get(key) ?? "").trim();
}

function toNullable(value: string) {
	return value ? value : null;
}

function toNullableNumber(value: string) {
	if (!value) return null;
	const parsed = Number.parseFloat(value);
	return Number.isNaN(parsed) ? Number.NaN : parsed;
}

const workLocationSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1, "Nama lokasi wajib diisi."),
	code: z.string().max(50, "Kode maksimal 50 karakter.").nullable(),
	address: z.string().max(500, "Alamat maksimal 500 karakter.").nullable(),
	city: z.string().max(100, "Kota maksimal 100 karakter.").nullable(),
	province: z.string().max(100, "Provinsi maksimal 100 karakter.").nullable(),
	postalCode: z.string().max(20, "Kode pos maksimal 20 karakter.").nullable(),
	latitude: z.number().min(-90, "Latitude minimal -90.").max(90, "Latitude maksimal 90.").nullable(),
	longitude: z.number().min(-180, "Longitude minimal -180.").max(180, "Longitude maksimal 180.").nullable(),
	radiusMeters: z.number().int("Radius harus angka bulat.").min(1, "Radius minimal 1 meter."),
	isActive: z.boolean(),
});

export function parseAndValidateWorkLocationData(formData: FormData): WorkLocationValidationResult {
	const rawData = {
		id: toStringValue(formData, "id") || undefined,
		name: toStringValue(formData, "name"),
		code: toNullable(toStringValue(formData, "code")),
		address: toNullable(toStringValue(formData, "address")),
		city: toNullable(toStringValue(formData, "city")),
		province: toNullable(toStringValue(formData, "province")),
		postalCode: toNullable(toStringValue(formData, "postalCode")),
		latitude: toNullableNumber(toStringValue(formData, "latitude")),
		longitude: toNullableNumber(toStringValue(formData, "longitude")),
		radiusMeters: Number.parseInt(toStringValue(formData, "radiusMeters") || "100", 10),
		isActive: toStringValue(formData, "isActive") !== "false",
	};

	const parsed = workLocationSchema.safeParse(rawData);

	if (!parsed.success) {
		const errors: WorkLocationValidationErrors = {};

		for (const issue of parsed.error.issues) {
			const path = issue.path.join(".");
			if (path && !(path in errors)) {
				errors[path as keyof WorkLocationValidationErrors] = issue.message;
			}
		}

		return {
			isValid: false,
			errors,
		};
	}

	const data: WorkLocationFormValues = parsed.data;

	return {
		isValid: true,
		data,
	};
}