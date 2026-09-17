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

/** Koordinat opsional: "" → null, selain itu wajib angka dalam rentang valid. */
const coordinateSchema = (min: number, max: number, label: string) =>
	z.preprocess(
		(value) => {
			if (value === null || value === undefined) return null;
			if (typeof value === "string") return value.trim() === "" ? null : Number(value);
			return value;
		},
		z
			.number({ message: `${label} harus berupa angka.` })
			.min(min, `${label} harus antara ${min} sampai ${max}.`)
			.max(max, `${label} harus antara ${min} sampai ${max}.`)
			.nullable(),
	);

const radiusSchema = z.preprocess(
	(value) => {
		if (value === null || value === undefined) return null;
		if (typeof value === "string") return value.trim() === "" ? null : Number(value);
		return value;
	},
	z
		.number({ message: "Radius harus berupa angka." })
		.int("Radius harus bilangan bulat.")
		.min(1, "Radius minimal 1 meter.")
		.max(100_000, "Radius maksimal 100.000 meter.")
		.nullable(),
);

const workLocationSchema = z.object({
	id: z.string().optional(),
	nama: z.string().min(1, "Nama lokasi wajib diisi."),
	kode: z.string().max(50, "Kode maksimal 50 karakter.").nullable(),
	alamat: z.string().max(500, "Alamat maksimal 500 karakter.").nullable(),
	kota: z.string().max(100, "Kota maksimal 100 karakter.").nullable(),
	provinsi: z.string().max(100, "Provinsi maksimal 100 karakter.").nullable(),
	kodePos: z.string().max(20, "Kode pos maksimal 20 karakter.").nullable(),
	latitude: coordinateSchema(-90, 90, "Latitude"),
	longitude: coordinateSchema(-180, 180, "Longitude"),
	radiusMeter: radiusSchema,
	isActive: z.boolean(),
});

export function parseAndValidateWorkLocationData(formData: FormData): WorkLocationValidationResult {
	const rawData = {
		id: toStringValue(formData, "id") || undefined,
		nama: toStringValue(formData, "nama"),
		kode: toNullable(toStringValue(formData, "kode")),
		alamat: toNullable(toStringValue(formData, "alamat")),
		kota: toNullable(toStringValue(formData, "kota")),
		provinsi: toNullable(toStringValue(formData, "provinsi")),
		kodePos: toNullable(toStringValue(formData, "kodePos")),
		latitude: toStringValue(formData, "latitude"),
		longitude: toStringValue(formData, "longitude"),
		radiusMeter: toStringValue(formData, "radiusMeter"),
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
