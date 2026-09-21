import { z } from "zod";
import type {
	KalenderKerjaFormValues,
	KalenderKerjaValidationErrors,
	KalenderKerjaValidationResult,
	JadwalKerjaFormValues,
	JadwalKerjaValidationErrors,
	JadwalKerjaValidationResult,
	HariLiburFormValues,
	HariLiburValidationErrors,
	HariLiburValidationResult,
} from "../types/work-schedule.type";

function toStringValue(formData: FormData, key: string) {
	return String(formData.get(key) ?? "").trim();
}

function toNullable(value: string) {
	return value ? value : null;
}

function toNullableNumber(value: string): number | undefined {
	const num = Number(value);
	return isNaN(num) ? undefined : num;
}

// ============================================================
// Kalender Kerja
// ============================================================

const kalenderKerjaSchema = z.object({
	id: z.number().optional(),
	nama: z.string().min(1, "Nama kalender wajib diisi."),
	kode: z.string().max(50, "Kode maksimal 50 karakter.").nullable(),
	deskripsi: z.string().max(500, "Deskripsi maksimal 500 karakter.").nullable(),
	isDefault: z.boolean(),
	isActive: z.boolean(),
});

export function parseAndValidateKalenderKerjaData(formData: FormData): KalenderKerjaValidationResult {
	const rawData = {
		id: toNullableNumber(toStringValue(formData, "id")),
		nama: toStringValue(formData, "nama"),
		kode: toNullable(toStringValue(formData, "kode")),
		deskripsi: toNullable(toStringValue(formData, "deskripsi")),
		isDefault: toStringValue(formData, "isDefault") === "true",
		isActive: toStringValue(formData, "isActive") !== "false",
	};

	const parsed = kalenderKerjaSchema.safeParse(rawData);

	if (!parsed.success) {
		const errors: KalenderKerjaValidationErrors = {};
		for (const issue of parsed.error.issues) {
			const path = issue.path.join(".");
			if (path && !(path in errors)) {
				errors[path as keyof KalenderKerjaValidationErrors] = issue.message;
			}
		}
		return { isValid: false, errors };
	}

	return { isValid: true, data: parsed.data };
}

// ============================================================
// Jadwal Kerja
// ============================================================

const jadwalKerjaSchema = z.object({
	id: z.number().optional(),
	kalenderKerjaId: z.number().min(1, "Kalender kerja wajib dipilih."),
	hari: z.string().min(1, "Hari wajib dipilih."),
	isHariKerja: z.boolean(),
	jamMasuk: z.string().min(1, "Jam masuk wajib diisi."),
	jamKeluar: z.string().min(1, "Jam keluar wajib diisi."),
	jamMulaiIstirahat: z.string().nullable(),
	jamSelesaiIstirahat: z.string().nullable(),
});

export function parseAndValidateJadwalKerjaData(formData: FormData): JadwalKerjaValidationResult {
	const rawData = {
		id: toNullableNumber(toStringValue(formData, "id")),
		kalenderKerjaId: Number(toStringValue(formData, "kalenderKerjaId")),
		hari: toStringValue(formData, "hari"),
		isHariKerja: toStringValue(formData, "isHariKerja") === "true",
		jamMasuk: toStringValue(formData, "jamMasuk"),
		jamKeluar: toStringValue(formData, "jamKeluar"),
		jamMulaiIstirahat: toNullable(toStringValue(formData, "jamMulaiIstirahat")),
		jamSelesaiIstirahat: toNullable(toStringValue(formData, "jamSelesaiIstirahat")),
	};

	const parsed = jadwalKerjaSchema.safeParse(rawData);

	if (!parsed.success) {
		const errors: JadwalKerjaValidationErrors = {};
		for (const issue of parsed.error.issues) {
			const path = issue.path.join(".");
			if (path && !(path in errors)) {
				errors[path as keyof JadwalKerjaValidationErrors] = issue.message;
			}
		}
		return { isValid: false, errors };
	}

	return { isValid: true, data: parsed.data };
}

// ============================================================
// Hari Libur
// ============================================================

const hariLiburSchema = z.object({
	id: z.number().optional(),
	kalenderKerjaId: z.number().min(1, "Kalender kerja wajib dipilih."),
	tanggal: z.string().min(1, "Tanggal wajib diisi."),
	nama: z.string().min(1, "Nama hari libur wajib diisi."),
	deskripsi: z.string().max(500, "Deskripsi maksimal 500 karakter.").nullable(),
	isCutiBersama: z.boolean(),
});

export function parseAndValidateHariLiburData(formData: FormData): HariLiburValidationResult {
	const rawData = {
		id: toNullableNumber(toStringValue(formData, "id")),
		kalenderKerjaId: Number(toStringValue(formData, "kalenderKerjaId")),
		tanggal: toStringValue(formData, "tanggal"),
		nama: toStringValue(formData, "nama"),
		deskripsi: toNullable(toStringValue(formData, "deskripsi")),
		isCutiBersama: toStringValue(formData, "isCutiBersama") === "true",
	};

	const parsed = hariLiburSchema.safeParse(rawData);

	if (!parsed.success) {
		const errors: HariLiburValidationErrors = {};
		for (const issue of parsed.error.issues) {
			const path = issue.path.join(".");
			if (path && !(path in errors)) {
				errors[path as keyof HariLiburValidationErrors] = issue.message;
			}
		}
		return { isValid: false, errors };
	}

	return { isValid: true, data: parsed.data };
}
