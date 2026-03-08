"use server";

import {
	BloodType,
	DocumentType,
	EducationDegree,
	EmployeeStatus,
	EmploymentType,
	FamilyRelation,
	Gender,
	MaritalStatus,
	Prisma,
	Religion,
} from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import {
	EMPLOYEE_WIZARD_STEPS,
	type EmployeeBankAccountPayload,
	type EmployeeBpjsPayload,
	type EmployeeDocumentPayload,
	type EmployeeEducationPayload,
	type EmployeeFamilyPayload,
	type EmployeePersonalPayload,
	type EmployeePositionPayload,
	type EmployeeWizardActionResult,
	type EmployeeWizardDetail,
	type EmployeeWizardOption,
	type EmployeeWizardReferenceOptions,
	type EmployeeWizardStepKey,
	type EmployeeWizardSummary,
	type EmployeeWorkHistoryPayload,
} from "../types/employee.type";
import { parseEmployeeStepPayload } from "../schemas/employee.schema";

function toOptionLabel(value: string) {
	return value
		.toLowerCase()
		.split("_")
		.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
		.join(" ");
}

function enumOptions(values: string[]): EmployeeWizardOption[] {
	return values.map((value) => ({
		value,
		label: toOptionLabel(value),
	}));
}

function toDateInputValue(value: Date | null | undefined) {
	if (!value) return "";
	const year = value.getFullYear();
	const month = String(value.getMonth() + 1).padStart(2, "0");
	const day = String(value.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseIntOrNull(value: string) {
	if (!value) return null;
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? null : parsed;
}

function parseFloatOrNull(value: string) {
	if (!value) return null;
	const parsed = Number.parseFloat(value);
	return Number.isNaN(parsed) ? null : parsed;
}

function parseBigIntOrNull(value: string) {
	if (!value) return null;
	try {
		return BigInt(value);
	} catch {
		return null;
	}
}

function toNullableText(value: string) {
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function toNullableEnum<T extends string>(value: string, enums: readonly T[]) {
	const trimmed = value.trim();
	if (!trimmed) return null;
	return enums.includes(trimmed as T) ? (trimmed as T) : null;
}

function isWizardStep(value: string): value is EmployeeWizardStepKey {
	return EMPLOYEE_WIZARD_STEPS.includes(value as EmployeeWizardStepKey);
}

function parsePayload(formData: FormData) {
	const rawPayload = String(formData.get("payload") ?? "{}");
	try {
		return JSON.parse(rawPayload) as unknown;
	} catch {
		return null;
	}
}

function normalizeEmergencyContact(value: { name: string; phone: string; relation: string }) {
	const name = value.name.trim();
	const phone = value.phone.trim();
	const relation = value.relation.trim();

	if (!name && !phone && !relation) {
		return null;
	}

	return {
		name,
		phone,
		relation,
	};
}

function defaultDetail(employeeId = ""): EmployeeWizardDetail {
	return {
		employeeId,
		personal: {
			id: employeeId,
			userId: "",
			employeeNumber: "",
			fullName: "",
			nickname: "",
			gender: Gender.MALE,
			birthPlace: "",
			birthDate: "",
			nationalId: "",
			taxId: "",
			religion: "",
			bloodType: "",
			maritalStatus: "",
			photo: "",
			personalEmail: "",
			workEmail: "",
			phone: "",
			emergencyContact: { name: "", phone: "", relation: "" },
			currentAddress: "",
			currentCity: "",
			currentProvince: "",
			currentPostal: "",
			idAddress: "",
			idCity: "",
			idProvince: "",
			idPostal: "",
			status: EmployeeStatus.ACTIVE,
			employmentType: EmploymentType.PERMANENT,
			joinDate: "",
			probationEndDate: "",
			contractEndDate: "",
			resignDate: "",
			resignReason: "",
			terminationNote: "",
		},
		positions: [],
		families: [],
		educations: [],
		workHistories: [],
		bankAccounts: [],
		bpjs: {
			bpjsHealthNumber: "",
			bpjsHealthClass: "",
			bpjsHealthDate: "",
			bpjsTkNumber: "",
			bpjsJhtDate: "",
			bpjsJpDate: "",
			bpjsJkkDate: "",
			bpjsJkmDate: "",
		},
		documents: [],
	};
}

export async function getEmployeeWizardBootstrapData(): Promise<{
	summaries: EmployeeWizardSummary[];
	referenceOptions: EmployeeWizardReferenceOptions;
}> {
	const [employees, users, units, positions, locations] = await Promise.all([
		prisma.employee.findMany({
			orderBy: [{ updatedAt: "desc" }],
			select: {
				id: true,
				employeeNumber: true,
				fullName: true,
				status: true,
				updatedAt: true,
			},
		}),
		prisma.user.findMany({
			orderBy: [{ name: "asc" }],
			select: {
				id: true,
				name: true,
				email: true,
			},
		}),
		prisma.organizationalUnit.findMany({
			where: { isActive: true },
			orderBy: [{ name: "asc" }],
			select: { id: true, name: true, code: true },
		}),
		prisma.position.findMany({
			where: { isActive: true },
			orderBy: [{ name: "asc" }],
			select: { id: true, name: true, code: true },
		}),
		prisma.workLocation.findMany({
			where: { isActive: true },
			orderBy: [{ name: "asc" }],
			select: { id: true, name: true, code: true },
		}),
	]);

	return {
		summaries: employees.map((item) => ({
			id: item.id,
			employeeNumber: item.employeeNumber,
			fullName: item.fullName,
			status: item.status,
			updatedAt: item.updatedAt.toISOString(),
		})),
		referenceOptions: {
			users: users.map((item) => ({ value: item.id, label: `${item.name} (${item.email})` })),
			organizationalUnits: units.map((item) => ({ value: item.id, label: item.code ? `${item.name} (${item.code})` : item.name })),
			positions: positions.map((item) => ({ value: item.id, label: item.code ? `${item.name} (${item.code})` : item.name })),
			workLocations: locations.map((item) => ({ value: item.id, label: item.code ? `${item.name} (${item.code})` : item.name })),
			genders: enumOptions(Object.values(Gender)),
			religions: enumOptions(Object.values(Religion)),
			bloodTypes: enumOptions(Object.values(BloodType)),
			maritalStatuses: enumOptions(Object.values(MaritalStatus)),
			employeeStatuses: enumOptions(Object.values(EmployeeStatus)),
			employmentTypes: enumOptions(Object.values(EmploymentType)),
			familyRelations: enumOptions(Object.values(FamilyRelation)),
			educationDegrees: enumOptions(Object.values(EducationDegree)),
			documentTypes: enumOptions(Object.values(DocumentType)),
		},
	};
}

export async function getEmployeeWizardDetail(employeeId: string): Promise<EmployeeWizardDetail | null> {
	if (!employeeId) {
		return null;
	}

	const employee = await prisma.employee.findUnique({
		where: { id: employeeId },
		include: {
			positions: { orderBy: [{ effectiveDate: "desc" }] },
			families: { orderBy: [{ createdAt: "asc" }] },
			educations: { orderBy: [{ createdAt: "asc" }] },
			workHistories: { orderBy: [{ createdAt: "asc" }] },
			bankAccounts: { orderBy: [{ createdAt: "asc" }] },
			bpjs: true,
			documents: { orderBy: [{ uploadedAt: "desc" }] },
		},
	});

	if (!employee) {
		return null;
	}

	const contact = employee.emergencyContact as Prisma.JsonObject | null;

	return {
		employeeId: employee.id,
		personal: {
			id: employee.id,
			userId: employee.userId ?? "",
			employeeNumber: employee.employeeNumber,
			fullName: employee.fullName,
			nickname: employee.nickname ?? "",
			gender: employee.gender,
			birthPlace: employee.birthPlace ?? "",
			birthDate: toDateInputValue(employee.birthDate),
			nationalId: employee.nationalId ?? "",
			taxId: employee.taxId ?? "",
			religion: employee.religion ?? "",
			bloodType: employee.bloodType ?? "",
			maritalStatus: employee.maritalStatus ?? "",
			photo: employee.photo ?? "",
			personalEmail: employee.personalEmail ?? "",
			workEmail: employee.workEmail ?? "",
			phone: employee.phone ?? "",
			emergencyContact: {
				name: String(contact?.name ?? ""),
				phone: String(contact?.phone ?? ""),
				relation: String(contact?.relation ?? ""),
			},
			currentAddress: employee.currentAddress ?? "",
			currentCity: employee.currentCity ?? "",
			currentProvince: employee.currentProvince ?? "",
			currentPostal: employee.currentPostal ?? "",
			idAddress: employee.idAddress ?? "",
			idCity: employee.idCity ?? "",
			idProvince: employee.idProvince ?? "",
			idPostal: employee.idPostal ?? "",
			status: employee.status,
			employmentType: employee.employmentType,
			joinDate: toDateInputValue(employee.joinDate),
			probationEndDate: toDateInputValue(employee.probationEndDate),
			contractEndDate: toDateInputValue(employee.contractEndDate),
			resignDate: toDateInputValue(employee.resignDate),
			resignReason: employee.resignReason ?? "",
			terminationNote: employee.terminationNote ?? "",
		},
		positions: employee.positions.map((item) => ({
			organizationalUnitId: item.organizationalUnitId ?? "",
			positionId: item.positionId ?? "",
			workLocationId: item.workLocationId ?? "",
			isPrimary: item.isPrimary,
			isCurrent: item.isCurrent,
			effectiveDate: toDateInputValue(item.effectiveDate),
			endDate: toDateInputValue(item.endDate),
			note: item.note ?? "",
		})),
		families: employee.families.map((item) => ({
			name: item.name,
			relation: item.relation,
			gender: item.gender,
			birthDate: toDateInputValue(item.birthDate),
			nationalId: item.nationalId ?? "",
			occupation: item.occupation ?? "",
			isDependent: item.isDependent,
			isBpjsDependent: item.isBpjsDependent,
			isHeir: item.isHeir,
		})),
		educations: employee.educations.map((item) => ({
			degree: item.degree,
			institution: item.institution,
			major: item.major ?? "",
			startYear: item.startYear ? String(item.startYear) : "",
			graduationYear: item.graduationYear ? String(item.graduationYear) : "",
			gpa: item.gpa !== null ? String(item.gpa) : "",
			isHighest: item.isHighest,
			documentUrl: item.documentUrl ?? "",
		})),
		workHistories: employee.workHistories.map((item) => ({
			companyName: item.companyName,
			position: item.position ?? "",
			startDate: toDateInputValue(item.startDate),
			endDate: toDateInputValue(item.endDate),
			lastSalary: item.lastSalary ? item.lastSalary.toString() : "",
			reasonLeaving: item.reasonLeaving ?? "",
			referencePhone: item.referencePhone ?? "",
		})),
		bankAccounts: employee.bankAccounts.map((item) => ({
			bankName: item.bankName,
			bankCode: item.bankCode ?? "",
			accountNumber: item.accountNumber,
			accountName: item.accountName,
			isPrimary: item.isPrimary,
		})),
		bpjs: {
			bpjsHealthNumber: employee.bpjs?.bpjsHealthNumber ?? "",
			bpjsHealthClass: employee.bpjs?.bpjsHealthClass ? String(employee.bpjs.bpjsHealthClass) : "",
			bpjsHealthDate: toDateInputValue(employee.bpjs?.bpjsHealthDate),
			bpjsTkNumber: employee.bpjs?.bpjsTkNumber ?? "",
			bpjsJhtDate: toDateInputValue(employee.bpjs?.bpjsJhtDate),
			bpjsJpDate: toDateInputValue(employee.bpjs?.bpjsJpDate),
			bpjsJkkDate: toDateInputValue(employee.bpjs?.bpjsJkkDate),
			bpjsJkmDate: toDateInputValue(employee.bpjs?.bpjsJkmDate),
		},
		documents: employee.documents.map((item) => ({
			documentType: item.documentType,
			name: item.name,
			fileUrl: item.fileUrl,
			fileSize: item.fileSize !== null ? item.fileSize.toString() : "",
			mimeType: item.mimeType ?? "",
			expiredAt: toDateInputValue(item.expiredAt),
			note: item.note ?? "",
			uploadedAt: toDateInputValue(item.uploadedAt),
		})),
	};
}

export async function saveEmployeeWizardStepAction(formData: FormData): Promise<EmployeeWizardActionResult> {
	const stepRaw = String(formData.get("step") ?? "");
	let employeeId = String(formData.get("employeeId") ?? "").trim();

	if (!isWizardStep(stepRaw)) {
		return {
			success: false,
			message: "Tahap wizard tidak valid.",
		};
	}

	const payload = parsePayload(formData);
	if (payload === null) {
		return {
			success: false,
			message: "Payload tidak valid.",
		};
	}

	if (stepRaw !== "personal" && !employeeId) {
		return {
			success: false,
			message: "Simpan data pribadi terlebih dahulu sebelum menyimpan tahap ini.",
		};
	}

	try {
		switch (stepRaw) {
			case "personal": {
				const parsed = parseEmployeeStepPayload("personal", payload);
				if (!parsed.isValid) {
					return {
						success: false,
						message: "Validasi gagal.",
						errors: parsed.errors,
					};
				}

				const data = parsed.data as EmployeePersonalPayload;
				const emergencyContact = normalizeEmergencyContact(data.emergencyContact);
				const joinDate = parseDate(data.joinDate);
				if (!joinDate) {
					return {
						success: false,
						message: "Tanggal join tidak valid.",
						errors: { joinDate: "Tanggal join tidak valid." },
					};
				}

				const payloadToSave = {
					userId: toNullableText(data.userId),
					employeeNumber: data.employeeNumber,
					fullName: data.fullName,
					nickname: toNullableText(data.nickname),
					gender: data.gender as Gender,
					birthPlace: toNullableText(data.birthPlace),
					birthDate: parseDate(data.birthDate),
					nationalId: toNullableText(data.nationalId),
					taxId: toNullableText(data.taxId),
					religion: toNullableEnum(data.religion, Object.values(Religion)),
					bloodType: toNullableEnum(data.bloodType, Object.values(BloodType)),
					maritalStatus: toNullableEnum(data.maritalStatus, Object.values(MaritalStatus)),
					photo: toNullableText(data.photo),
					personalEmail: toNullableText(data.personalEmail),
					workEmail: toNullableText(data.workEmail),
					phone: toNullableText(data.phone),
					emergencyContact: emergencyContact ?? Prisma.JsonNull,
					currentAddress: toNullableText(data.currentAddress),
					currentCity: toNullableText(data.currentCity),
					currentProvince: toNullableText(data.currentProvince),
					currentPostal: toNullableText(data.currentPostal),
					idAddress: toNullableText(data.idAddress),
					idCity: toNullableText(data.idCity),
					idProvince: toNullableText(data.idProvince),
					idPostal: toNullableText(data.idPostal),
					status: data.status as EmployeeStatus,
					employmentType: data.employmentType as EmploymentType,
					joinDate,
					probationEndDate: parseDate(data.probationEndDate),
					contractEndDate: parseDate(data.contractEndDate),
					resignDate: parseDate(data.resignDate),
					resignReason: toNullableText(data.resignReason),
					terminationNote: toNullableText(data.terminationNote),
				};

				const saved = employeeId
					? await prisma.employee.update({
							where: { id: employeeId },
							data: payloadToSave,
						})
					: await prisma.employee.create({
							data: payloadToSave,
						});

				employeeId = saved.id;
				return {
					success: true,
					message: formData.get("employeeId") ? "Tahap data pribadi berhasil diperbarui." : "Draft employee berhasil dibuat.",
					employeeId,
				};
			}

			case "position": {
				const parsed = parseEmployeeStepPayload("position", payload);
				if (!parsed.isValid) {
					return { success: false, message: "Validasi gagal.", errors: parsed.errors };
				}

				const rows = parsed.data as EmployeePositionPayload[];
			await prisma.$transaction(async (tx) => {
				await tx.employeePosition.deleteMany({ where: { employeeId } });
				if (rows.length) {
					await tx.employeePosition.createMany({
						data: rows.map((item) => ({
							employeeId,
							organizationalUnitId: toNullableText(item.organizationalUnitId),
							positionId: toNullableText(item.positionId),
							workLocationId: toNullableText(item.workLocationId),
							isPrimary: item.isPrimary,
							isCurrent: item.isCurrent,
							effectiveDate: parseDate(item.effectiveDate) ?? new Date(),
							endDate: parseDate(item.endDate),
							note: toNullableText(item.note),
						})),
					});
				}
			});
				break;
			}

			case "family": {
				const parsed = parseEmployeeStepPayload("family", payload);
				if (!parsed.isValid) {
					return { success: false, message: "Validasi gagal.", errors: parsed.errors };
				}
				const rows = parsed.data as EmployeeFamilyPayload[];
			await prisma.$transaction(async (tx) => {
				await tx.employeeFamily.deleteMany({ where: { employeeId } });
				if (rows.length) {
					await tx.employeeFamily.createMany({
						data: rows.map((item) => ({
							employeeId,
							name: item.name,
							relation: item.relation as FamilyRelation,
							gender: item.gender as Gender,
							birthDate: parseDate(item.birthDate),
							nationalId: toNullableText(item.nationalId),
							occupation: toNullableText(item.occupation),
							isDependent: item.isDependent,
							isBpjsDependent: item.isBpjsDependent,
							isHeir: item.isHeir,
						})),
					});
				}
			});
				break;
			}

			case "education": {
				const parsed = parseEmployeeStepPayload("education", payload);
				if (!parsed.isValid) {
					return { success: false, message: "Validasi gagal.", errors: parsed.errors };
				}
				const rows = parsed.data as EmployeeEducationPayload[];
			await prisma.$transaction(async (tx) => {
				await tx.employeeEducation.deleteMany({ where: { employeeId } });
				if (rows.length) {
					await tx.employeeEducation.createMany({
						data: rows.map((item) => ({
							employeeId,
							degree: item.degree as EducationDegree,
							institution: item.institution,
							major: toNullableText(item.major),
							startYear: parseIntOrNull(item.startYear),
							graduationYear: parseIntOrNull(item.graduationYear),
							gpa: parseFloatOrNull(item.gpa),
							isHighest: item.isHighest,
							documentUrl: toNullableText(item.documentUrl),
						})),
					});
				}
			});
				break;
			}

			case "workHistory": {
				const parsed = parseEmployeeStepPayload("workHistory", payload);
				if (!parsed.isValid) {
					return { success: false, message: "Validasi gagal.", errors: parsed.errors };
				}
				const rows = parsed.data as EmployeeWorkHistoryPayload[];
			await prisma.$transaction(async (tx) => {
				await tx.employeeWorkHistory.deleteMany({ where: { employeeId } });
				if (rows.length) {
					await tx.employeeWorkHistory.createMany({
						data: rows.map((item) => ({
							employeeId,
							companyName: item.companyName,
							position: toNullableText(item.position),
							startDate: parseDate(item.startDate),
							endDate: parseDate(item.endDate),
							lastSalary: item.lastSalary ? new Prisma.Decimal(item.lastSalary) : null,
							reasonLeaving: toNullableText(item.reasonLeaving),
							referencePhone: toNullableText(item.referencePhone),
						})),
					});
				}
			});
				break;
			}

			case "bankAccount": {
				const parsed = parseEmployeeStepPayload("bankAccount", payload);
				if (!parsed.isValid) {
					return { success: false, message: "Validasi gagal.", errors: parsed.errors };
				}
				const rows = parsed.data as EmployeeBankAccountPayload[];
			await prisma.$transaction(async (tx) => {
				await tx.employeeBankAccount.deleteMany({ where: { employeeId } });
				if (rows.length) {
					await tx.employeeBankAccount.createMany({
						data: rows.map((item) => ({
							employeeId,
							bankName: item.bankName,
							bankCode: toNullableText(item.bankCode),
							accountNumber: item.accountNumber,
							accountName: item.accountName,
							isPrimary: item.isPrimary,
						})),
					});
				}
			});
				break;
			}

			case "bpjs": {
				const parsed = parseEmployeeStepPayload("bpjs", payload);
				if (!parsed.isValid) {
					return { success: false, message: "Validasi gagal.", errors: parsed.errors };
				}
				const data = parsed.data as EmployeeBpjsPayload;
			await prisma.employeeBpjs.upsert({
				where: { employeeId },
				create: {
					employeeId,
					bpjsHealthNumber: toNullableText(data.bpjsHealthNumber),
					bpjsHealthClass: parseIntOrNull(data.bpjsHealthClass),
					bpjsHealthDate: parseDate(data.bpjsHealthDate),
					bpjsTkNumber: toNullableText(data.bpjsTkNumber),
					bpjsJhtDate: parseDate(data.bpjsJhtDate),
					bpjsJpDate: parseDate(data.bpjsJpDate),
					bpjsJkkDate: parseDate(data.bpjsJkkDate),
					bpjsJkmDate: parseDate(data.bpjsJkmDate),
				},
				update: {
					bpjsHealthNumber: toNullableText(data.bpjsHealthNumber),
					bpjsHealthClass: parseIntOrNull(data.bpjsHealthClass),
					bpjsHealthDate: parseDate(data.bpjsHealthDate),
					bpjsTkNumber: toNullableText(data.bpjsTkNumber),
					bpjsJhtDate: parseDate(data.bpjsJhtDate),
					bpjsJpDate: parseDate(data.bpjsJpDate),
					bpjsJkkDate: parseDate(data.bpjsJkkDate),
					bpjsJkmDate: parseDate(data.bpjsJkmDate),
				},
			});
				break;
			}

			case "document": {
				const parsed = parseEmployeeStepPayload("document", payload);
				if (!parsed.isValid) {
					return { success: false, message: "Validasi gagal.", errors: parsed.errors };
				}
				const rows = parsed.data as EmployeeDocumentPayload[];
			await prisma.$transaction(async (tx) => {
				await tx.employeeDocument.deleteMany({ where: { employeeId } });
				if (rows.length) {
					await tx.employeeDocument.createMany({
						data: rows.map((item) => ({
							employeeId,
							documentType: item.documentType as DocumentType,
							name: item.name,
							fileUrl: item.fileUrl,
							fileSize: parseBigIntOrNull(item.fileSize),
							mimeType: toNullableText(item.mimeType),
							expiredAt: parseDate(item.expiredAt),
							note: toNullableText(item.note),
							uploadedAt: parseDate(item.uploadedAt) ?? new Date(),
						})),
					});
				}
			});
				break;
			}
		}

		revalidatePath("/employees");
		return {
			success: true,
			message: "Tahap berhasil disimpan.",
			employeeId,
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				success: false,
				message: "NIK karyawan sudah digunakan.",
				errors: { employeeNumber: "NIK karyawan harus unik." },
			};
		}

		const message = error instanceof Error ? error.message : "Gagal menyimpan tahap employee.";
		return {
			success: false,
			message,
		};
	}
}

export async function getEmployeeWizardDetailAction(employeeId: string): Promise<{
	success: boolean;
	message: string;
	data: EmployeeWizardDetail;
}> {
	if (!employeeId) {
		return {
			success: true,
			message: "Form baru siap diisi.",
			data: defaultDetail(),
		};
	}

	const detail = await getEmployeeWizardDetail(employeeId);
	if (!detail) {
		return {
			success: false,
			message: "Data employee tidak ditemukan.",
			data: defaultDetail(),
		};
	}

	return {
		success: true,
		message: "Data employee berhasil dimuat.",
		data: detail,
	};
}
