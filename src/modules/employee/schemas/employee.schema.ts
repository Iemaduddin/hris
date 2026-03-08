import {
	BloodType,
	DocumentType,
	EducationDegree,
	EmployeeStatus,
	EmploymentType,
	FamilyRelation,
	Gender,
	MaritalStatus,
	Religion,
} from "@/generated/prisma/client";
import { z } from "zod";
import type { EmployeeWizardStepKey, EmployeeWizardStepPayloadMap } from "../types/employee.type";

const nullableText = z.string().trim();

const emergencyContactSchema = z.object({
	name: nullableText,
	phone: nullableText,
	relation: nullableText,
});

function optionalEnumString<T extends string>(values: readonly T[], message: string) {
	return z
		.string()
		.trim()
		.refine((value) => !value || values.includes(value as T), { message });
}

const personalSchema = z.object({
	id: z.string().optional(),
	userId: z.string().trim(),
	employeeNumber: z.string().trim().min(1, "NIK karyawan wajib diisi."),
	fullName: z.string().trim().min(1, "Nama lengkap wajib diisi."),
	nickname: nullableText,
	gender: z.nativeEnum(Gender, { message: "Gender tidak valid." }),
	birthPlace: nullableText,
	birthDate: nullableText,
	nationalId: nullableText,
	taxId: nullableText,
	religion: optionalEnumString(Object.values(Religion), "Agama tidak valid."),
	bloodType: optionalEnumString(Object.values(BloodType), "Golongan darah tidak valid."),
	maritalStatus: optionalEnumString(Object.values(MaritalStatus), "Status pernikahan tidak valid."),
	photo: nullableText,
	personalEmail: nullableText,
	workEmail: nullableText,
	phone: nullableText,
	emergencyContact: emergencyContactSchema,
	currentAddress: nullableText,
	currentCity: nullableText,
	currentProvince: nullableText,
	currentPostal: nullableText,
	idAddress: nullableText,
	idCity: nullableText,
	idProvince: nullableText,
	idPostal: nullableText,
	status: z.nativeEnum(EmployeeStatus, { message: "Status karyawan tidak valid." }),
	employmentType: z.nativeEnum(EmploymentType, { message: "Jenis kepegawaian tidak valid." }),
	joinDate: z.string().trim().min(1, "Tanggal join wajib diisi."),
	probationEndDate: nullableText,
	contractEndDate: nullableText,
	resignDate: nullableText,
	resignReason: nullableText,
	terminationNote: nullableText,
});

const positionSchema = z.object({
	organizationalUnitId: nullableText,
	positionId: nullableText,
	workLocationId: nullableText,
	isPrimary: z.boolean(),
	isCurrent: z.boolean(),
	effectiveDate: z.string().trim().min(1, "Tanggal efektif wajib diisi."),
	endDate: nullableText,
	note: nullableText,
});

const familySchema = z.object({
	name: z.string().trim().min(1, "Nama anggota keluarga wajib diisi."),
	relation: z.nativeEnum(FamilyRelation, { message: "Relasi keluarga tidak valid." }),
	gender: z.nativeEnum(Gender, { message: "Gender tidak valid." }),
	birthDate: nullableText,
	nationalId: nullableText,
	occupation: nullableText,
	isDependent: z.boolean(),
	isBpjsDependent: z.boolean(),
	isHeir: z.boolean(),
});

const educationSchema = z.object({
	degree: z.nativeEnum(EducationDegree, { message: "Jenjang pendidikan tidak valid." }),
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

const bankAccountSchema = z.object({
	bankName: z.string().trim().min(1, "Nama bank wajib diisi."),
	bankCode: nullableText,
	accountNumber: z.string().trim().min(1, "Nomor rekening wajib diisi."),
	accountName: z.string().trim().min(1, "Nama pemilik rekening wajib diisi."),
	isPrimary: z.boolean(),
});

const bpjsSchema = z.object({
	bpjsHealthNumber: nullableText,
	bpjsHealthClass: nullableText,
	bpjsHealthDate: nullableText,
	bpjsTkNumber: nullableText,
	bpjsJhtDate: nullableText,
	bpjsJpDate: nullableText,
	bpjsJkkDate: nullableText,
	bpjsJkmDate: nullableText,
});

const documentSchema = z.object({
	documentType: z.nativeEnum(DocumentType, { message: "Tipe dokumen tidak valid." }),
	name: z.string().trim().min(1, "Nama dokumen wajib diisi."),
	fileUrl: z.string().trim().min(1, "URL file wajib diisi."),
	fileSize: nullableText,
	mimeType: nullableText,
	expiredAt: nullableText,
	note: nullableText,
	uploadedAt: nullableText,
});

const stepSchemaMap: {
	[K in EmployeeWizardStepKey]: z.ZodType<EmployeeWizardStepPayloadMap[K]>;
} = {
	personal: personalSchema,
	position: z.array(positionSchema),
	family: z.array(familySchema),
	education: z.array(educationSchema),
	workHistory: z.array(workHistorySchema),
	bankAccount: z.array(bankAccountSchema),
	bpjs: bpjsSchema,
	document: z.array(documentSchema),
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

	const errors: Record<string, string> = {};

	for (const issue of result.error.issues) {
		const path = issue.path.join(".");
		if (path && !errors[path]) {
			errors[path] = issue.message;
		}
	}

	return {
		isValid: false,
		errors,
	};
}
