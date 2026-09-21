import { z } from "zod";
import type {
	ScheduleAssignmentFormValues,
	ScheduleAssignmentValidationErrors,
	ScheduleAssignmentValidationResult,
} from "../types/schedule.type";

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

const scheduleAssignmentSchema = z.object({
	id: z.number().optional(),
	karyawanId: z.string().min(1, "Karyawan wajib dipilih."),
	jadwalKerjaId: z.number().min(1, "Jadwal kerja wajib dipilih."),
	tanggalMulai: z.string().min(1, "Tanggal mulai wajib diisi."),
	tanggalSelesai: z.string().nullable(),
});

export function parseAndValidateScheduleAssignmentData(formData: FormData): ScheduleAssignmentValidationResult {
	const rawData = {
		id: toNullableNumber(toStringValue(formData, "id")),
		karyawanId: toStringValue(formData, "karyawanId"),
		jadwalKerjaId: Number(toStringValue(formData, "jadwalKerjaId")),
		tanggalMulai: toStringValue(formData, "tanggalMulai"),
		tanggalSelesai: toNullable(toStringValue(formData, "tanggalSelesai")),
	};

	const parsed = scheduleAssignmentSchema.safeParse(rawData);

	if (!parsed.success) {
		const errors: ScheduleAssignmentValidationErrors = {};

		for (const issue of parsed.error.issues) {
			const path = issue.path.join(".");
			if (path && !(path in errors)) {
				errors[path as keyof ScheduleAssignmentValidationErrors] = issue.message;
			}
		}

		return {
			isValid: false,
			errors,
		};
	}

	const data: ScheduleAssignmentFormValues = parsed.data;

	return {
		isValid: true,
		data,
	};
}
