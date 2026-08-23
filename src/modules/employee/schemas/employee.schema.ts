import {
	JenisKelamin,
	StatusKaryawan,
	JenisKontrak,
	HubunganKeluarga,
	GelarPendidikan,
	JenisDokumen,
	StatusKontrak,
} from "@/generated/prisma/client";
import { z } from "zod";
import type { EmployeeWizardStepKey, EmployeeWizardStepPayloadMap } from "../types/employee.type";

const nullableText = z.string().trim();

const personalSchema = z.object({
	id: z.string().optional(),
	userId: z.string().trim(),
	employeeNumber: nullableText,
	fullName: z.string().trim().min(1, "Nama lengkap wajib diisi."),
	gender: z.nativeEnum(JenisKelamin, { message: "Pilihan jenis kelamin tidak tersedia." }),
	birthDate: nullableText,
	nationalId: nullableText,
	taxId: nullableText,
	workEmail: nullableText,
	phone: nullableText,
	address: nullableText,
	status: z.nativeEnum(StatusKaryawan, { message: "Pilihan status karyawan tidak tersedia." }),
	joinDate: z.string().trim().min(1, "Tanggal masuk wajib diisi."),
	resignDate: nullableText,
});

const positionSchema = z.object({
	organizationalUnitId: nullableText,
	positionId: nullableText,
	workLocationId: nullableText,
	isPrimary: z.boolean(),
	isCurrent: z.boolean(),
	note: nullableText,
	effectiveDate: z.string().trim().min(1, "Tanggal efektif wajib diisi."),
});

const familySchema = z.object({
	name: z.string().trim().min(1, "Nama anggota keluarga wajib diisi."),
	relation: z.nativeEnum(HubunganKeluarga, { message: "Pilihan hubungan keluarga tidak tersedia." }),
	gender: z.nativeEnum(JenisKelamin, { message: "Pilihan jenis kelamin tidak tersedia." }),
	birthDate: nullableText,
	nationalId: nullableText,
	occupation: nullableText,
});

const educationSchema = z.object({
	degree: z.nativeEnum(GelarPendidikan, { message: "Pilihan gelar pendidikan tidak tersedia." }),
	institution: z.string().trim().min(1, "Nama institusi wajib diisi."),
	major: nullableText,
	startYear: nullableText,
	graduationYear: nullableText,
	gpa: nullableText,
	isHighest: z.boolean(),
	documentUrl: nullableText,
});

const workHistorySchema = z.object({
	companyName: z.string().trim().min(1, "Nama perusahaan wajib diisi."),
	position: nullableText,
	startDate: nullableText,
	endDate: nullableText,
	lastSalary: nullableText,
	reasonLeaving: nullableText,
	referencePhone: nullableText,
});

const kontrakSchema = z.object({
	contractNumber: z.string().trim().min(1, "Nomor kontrak wajib diisi."),
	contractType: z.nativeEnum(JenisKontrak, { message: "Pilihan jenis kontrak tidak tersedia." }),
	startDate: z.string().trim().min(1, "Tanggal mulai kontrak wajib diisi."),
	endDate: nullableText,
	status: z.nativeEnum(StatusKontrak, { message: "Pilihan status kontrak tidak tersedia." }),
	baseSalary: nullableText,
	documentUrl: nullableText,
	note: nullableText,
});

const documentSchema = z.object({
	documentType: z.nativeEnum(JenisDokumen, { message: "Pilihan jenis dokumen tidak tersedia." }),
	name: z.string().trim().min(1, "Nama dokumen wajib diisi."),
	fileUrl: z.string().trim().min(1, "URL file wajib diisi."),
	fileSize: nullableText,
	mimeType: nullableText,
	expiredAt: nullableText,
	note: nullableText,
});

const stepSchemaMap: {
	[K in EmployeeWizardStepKey]: z.ZodType<EmployeeWizardStepPayloadMap[K]>;
} = {
	personal: personalSchema,
	position: z.array(positionSchema),
	family: z.array(familySchema),
	education: z.array(educationSchema),
	workHistory: z.array(workHistorySchema),
	kontrak: z.array(kontrakSchema),
	document: z.array(documentSchema),
};

const STEP_FIELD_LABELS: Record<EmployeeWizardStepKey, Record<string, string>> = {
	personal: {
		userId: "Akun User",
		employeeNumber: "Nomor Karyawan",
		fullName: "Nama Lengkap",
		gender: "Jenis Kelamin",
		birthDate: "Tanggal Lahir",
		nationalId: "NIK KTP",
		taxId: "NPWP",
		workEmail: "Email Kantor",
		phone: "No. HP",
		address: "Alamat",
		status: "Status Karyawan",
		joinDate: "Tanggal Masuk",
		resignDate: "Tanggal Resign",
	},
	position: {
		organizationalUnitId: "Unit Organisasi",
		positionId: "Posisi",
		workLocationId: "Lokasi Kerja",
		effectiveDate: "Tanggal Efektif",
		note: "Catatan",
	},
	family: {
		name: "Nama",
		relation: "Hubungan",
		gender: "Jenis Kelamin",
		birthDate: "Tanggal Lahir",
		nationalId: "NIK",
		occupation: "Pekerjaan",
	},
	education: {
		degree: "Jenjang",
		institution: "Institusi",
		major: "Jurusan",
		startYear: "Tahun Masuk",
		graduationYear: "Tahun Lulus",
		gpa: "IPK",
		documentUrl: "URL Dokumen",
	},
	workHistory: {
		companyName: "Nama Perusahaan",
		position: "Posisi",
		startDate: "Tanggal Mulai",
		endDate: "Tanggal Selesai",
		lastSalary: "Gaji Terakhir",
		reasonLeaving: "Alasan Berhenti",
		referencePhone: "No. Referensi",
	},
	kontrak: {
		contractNumber: "Nomor Kontrak",
		contractType: "Jenis Kontrak",
		startDate: "Tanggal Mulai",
		endDate: "Tanggal Selesai",
		status: "Status",
		baseSalary: "Gaji Pokok",
		documentUrl: "URL Dokumen",
		note: "Catatan",
	},
	document: {
		documentType: "Jenis Dokumen",
		name: "Nama Dokumen",
		fileUrl: "URL File",
		fileSize: "Ukuran File",
		mimeType: "Tipe File",
		expiredAt: "Tanggal Kadaluarsa",
		note: "Catatan",
	},
};

export function parseEmployeeStepPayload<T extends EmployeeWizardStepKey>(
	step: T,
	payload: unknown,
):
	| { isValid: true; data: EmployeeWizardStepPayloadMap[T] }
	| { isValid: false; errors: Record<string, string> } {
	const schema = stepSchemaMap[step];
	const result = schema.safeParse(payload);

	if (result.success) {
		return {
			isValid: true,
			data: result.data,
		};
	}

	const fieldLabels = STEP_FIELD_LABELS[step];
	const errors: Record<string, string> = {};

	for (const issue of result.error.issues) {
		const path = issue.path.join(".");
		if (path && !errors[path]) {
			const label = fieldLabels[path] ?? path;
			errors[path] = `${label}: ${issue.message}`;
		}
	}

	return {
		isValid: false,
		errors,
	};
}
