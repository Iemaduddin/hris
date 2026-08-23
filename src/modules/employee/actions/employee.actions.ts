"use server";

import {
	JenisKelamin,
	StatusKaryawan,
	JenisKontrak,
	HubunganKeluarga,
	GelarPendidikan,
	JenisDokumen,
	StatusKontrak,
	Prisma,
} from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import {
	EMPLOYEE_WIZARD_STEPS,
	type EmployeeKontrakPayload,
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
		.split("_")
		.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`)
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

function toNullableText(value: string) {
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
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

function defaultDetail(employeeId = ""): EmployeeWizardDetail {
	return {
		employeeId,
		personal: {
			id: employeeId,
			userId: "",
			employeeNumber: "",
			fullName: "",
			gender: JenisKelamin.LAKI_LAKI,
			birthDate: "",
			nationalId: "",
			taxId: "",
			workEmail: "",
			phone: "",
			address: "",
			status: StatusKaryawan.AKTIF,
			joinDate: "",
			resignDate: "",
		},
		positions: [],
		families: [],
		educations: [],
		workHistories: [],
		kontrak: [],
		documents: [],
	};
}

export async function getEmployeeWizardBootstrapData(): Promise<{
	summaries: EmployeeWizardSummary[];
	referenceOptions: EmployeeWizardReferenceOptions;
}> {
	const [employees, users, units, positions, locations] = await Promise.all([
		prisma.karyawan.findMany({
			orderBy: [{ updatedAt: "desc" }],
			select: {
				id: true,
				nomorKaryawan: true,
				namaLengkap: true,
				status: true,
				updatedAt: true,
			},
		}),
		prisma.user.findMany({
			orderBy: [{ email: "asc" }],
			select: {
				id: true,
				name: true,
				email: true,
			},
		}),
		prisma.unitOrganisasi.findMany({
			orderBy: [{ nama: "asc" }],
			select: { id: true, nama: true, kode: true },
		}),
		prisma.posisi.findMany({
			orderBy: [{ nama: "asc" }],
			select: { id: true, nama: true, kode: true, unitOrganisasiId: true },
		}),
		prisma.lokasiKerja.findMany({
			orderBy: [{ nama: "asc" }],
			select: { id: true, nama: true, kode: true },
		}),
	]);

	return {
		summaries: employees.map((item) => ({
			id: item.id,
			employeeNumber: item.nomorKaryawan,
			fullName: item.namaLengkap,
			status: item.status,
			updatedAt: item.updatedAt.toISOString(),
		})),
		referenceOptions: {
			users: users.map((item) => ({ value: item.id, label: `${item.name} (${item.email})` })),
			userNames: Object.fromEntries(users.map((item) => [item.id, item.name])),
			organizationalUnits: units.map((item) => ({ value: item.id, label: item.kode ? `${item.nama} (${item.kode})` : item.nama })),
			positions: positions.map((item) => ({ value: item.id, label: item.kode ? `${item.nama} (${item.kode})` : item.nama })),
			positionUnitMap: Object.fromEntries(positions.filter((item) => item.unitOrganisasiId).map((item) => [item.id, item.unitOrganisasiId!])),
			workLocations: locations.map((item) => ({ value: item.id, label: item.kode ? `${item.nama} (${item.kode})` : item.nama })),
			jenisKelamin: enumOptions(Object.values(JenisKelamin)),
			statusKaryawan: enumOptions(Object.values(StatusKaryawan)),
			jenisKontrak: enumOptions(Object.values(JenisKontrak)),
			hubunganKeluarga: enumOptions(Object.values(HubunganKeluarga)),
			gelarPendidikan: [
				{ value: "S3", label: "S3" },
				{ value: "S2", label: "S2" },
				{ value: "S1", label: "S1" },
				{ value: "D4", label: "D4" },
				{ value: "D3", label: "D3" },
				{ value: "D2", label: "D2" },
				{ value: "D1", label: "D1" },
				{ value: "SMA_SMK", label: "SMA/SMK" },
				{ value: "SMP", label: "SMP" },
				{ value: "SD", label: "SD" },
				{ value: "LAINNYA", label: "LAINNYA" },
			],
			jenisDokumen: enumOptions(Object.values(JenisDokumen)),
		},
	};
}

export async function getEmployeeWizardDetail(employeeId: string): Promise<EmployeeWizardDetail | null> {
	if (!employeeId) {
		return null;
	}

	const employee = await prisma.karyawan.findUnique({
		where: { id: employeeId },
		include: {
			posisiKaryawan: { orderBy: [{ tanggalEfektif: "desc" }] },
			keluargaKaryawan: { orderBy: [{ createdAt: "asc" }] },
			pendidikanKaryawan: { orderBy: [{ createdAt: "asc" }] },
			riwayatPekerjaan: { orderBy: [{ createdAt: "asc" }] },
			kontrakKerja: { orderBy: [{ tanggalMulai: "desc" }] },
			dokumenKaryawan: { orderBy: [{ tanggalUnggah: "desc" }] },
		},
	});

	if (!employee) {
		return null;
	}

	return {
		employeeId: employee.id,
		personal: {
			id: employee.id,
			userId: employee.userId ?? "",
			employeeNumber: employee.nomorKaryawan,
			fullName: employee.namaLengkap,
			gender: employee.gender,
			birthDate: toDateInputValue(employee.tanggalLahir),
			nationalId: employee.nik ?? "",
			taxId: employee.npwp ?? "",
			workEmail: employee.email ?? "",
			phone: employee.telepon ?? "",
			address: employee.alamat ?? "",
			status: employee.status,
			joinDate: toDateInputValue(employee.tanggalMasuk),
			resignDate: toDateInputValue(employee.tanggalResign),
		},
		positions: employee.posisiKaryawan.map((item) => ({
			organizationalUnitId: item.unitOrganisasiId ?? "",
			positionId: item.posisiId ?? "",
			workLocationId: item.lokasiKerjaId ?? "",
			isPrimary: item.isPrimary,
			isCurrent: item.isCurrent,
			effectiveDate: toDateInputValue(item.tanggalEfektif),
			note: item.catatan ?? "",
		})),
		families: employee.keluargaKaryawan.map((item) => ({
			name: item.nama,
			relation: item.hubungan,
			gender: item.gender,
			birthDate: toDateInputValue(item.tanggalLahir),
			nationalId: item.nik ?? "",
			occupation: item.pekerjaan ?? "",
		})),
		educations: employee.pendidikanKaryawan.map((item) => ({
			degree: item.gelar,
			institution: item.institusi,
			major: item.jurusan ?? "",
			startYear: item.tahunMulai ? String(item.tahunMulai) : "",
			graduationYear: item.tahunLulus ? String(item.tahunLulus) : "",
			gpa: item.ipk !== null ? String(item.ipk) : "",
			isHighest: item.isHighest,
			documentUrl: item.urlDokumen ?? "",
		})),
		workHistories: employee.riwayatPekerjaan.map((item) => ({
			companyName: item.namaPerusahaan,
			position: item.posisi ?? "",
			startDate: toDateInputValue(item.tanggalMulai),
			endDate: toDateInputValue(item.tanggalSelesai),
			lastSalary: item.gajiTerakhir ? item.gajiTerakhir.toString() : "",
			reasonLeaving: item.alasanKeluar ?? "",
			referencePhone: item.teleponReferensi ?? "",
		})),
		kontrak: employee.kontrakKerja.map((item) => ({
			contractNumber: item.nomorKontrak,
			contractType: item.jenisKontrak,
			startDate: toDateInputValue(item.tanggalMulai),
			endDate: toDateInputValue(item.tanggalSelesai),
			status: item.status,
			baseSalary: item.gajiPokok ? item.gajiPokok.toString() : "",
			documentUrl: item.urlDokumen ?? "",
			note: item.catatan ?? "",
		})),
		documents: employee.dokumenKaryawan.map((item) => ({
			documentType: item.jenisDokumen,
			name: item.nama,
			fileUrl: item.urlFile,
			fileSize: item.ukuranFile !== null ? item.ukuranFile.toString() : "",
			mimeType: item.tipeFile ?? "",
			expiredAt: toDateInputValue(item.tanggalKadaluarsa),
			note: item.catatan ?? "",
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
					const messages = Object.values(parsed.errors).join("; ");
					return {
						success: false,
						message: `Data pribadi belum lengkap: ${messages}`,
						errors: parsed.errors,
					};
				}

				const data = parsed.data as EmployeePersonalPayload;
				const joinDate = parseDate(data.joinDate);
				if (!joinDate) {
					return {
						success: false,
						message: "Tanggal masuk tidak valid.",
						errors: { joinDate: "Tanggal masuk tidak valid." },
					};
				}

				const payloadToSave = {
					userId: toNullableText(data.userId),
					nomorKaryawan: data.employeeNumber,
					namaLengkap: data.fullName,
					gender: data.gender as JenisKelamin,
					tanggalLahir: parseDate(data.birthDate),
					nik: toNullableText(data.nationalId),
					npwp: toNullableText(data.taxId),
					email: toNullableText(data.workEmail),
					telepon: toNullableText(data.phone),
					alamat: toNullableText(data.address),
					status: data.status as StatusKaryawan,
					tanggalMasuk: joinDate,
					tanggalResign: parseDate(data.resignDate),
				};

				const saved = employeeId
					? await prisma.karyawan.update({
							where: { id: employeeId },
							data: payloadToSave,
						})
					: await prisma.karyawan.create({
							data: payloadToSave,
						});

				employeeId = saved.id;
				return {
					success: true,
					message: formData.get("employeeId") ? "Tahap data pribadi berhasil diperbarui." : "Draft karyawan berhasil dibuat.",
					employeeId,
				};
			}

			case "position": {
				const parsed = parseEmployeeStepPayload("position", payload);
				if (!parsed.isValid) {
					return { success: false, message: "Data penempatan tidak valid. Periksa tanggal efektif dan field wajib lainnya.", errors: parsed.errors };
				}

				const rows = parsed.data as EmployeePositionPayload[];
				await prisma.$transaction(async (tx) => {
					await tx.posisiKaryawan.deleteMany({ where: { karyawanId: employeeId } });
					if (rows.length) {
						await tx.posisiKaryawan.createMany({
							data: rows.map((item) => ({
								karyawanId: employeeId,
								unitOrganisasiId: toNullableText(item.organizationalUnitId),
								posisiId: toNullableText(item.positionId),
								lokasiKerjaId: toNullableText(item.workLocationId),
								isPrimary: item.isPrimary,
								isCurrent: item.isCurrent,
								tanggalEfektif: parseDate(item.effectiveDate) ?? new Date(),
								tanggalBerakhir: null,
								catatan: toNullableText(item.note),
							})),
						});
					}
				});

				const existing = await prisma.karyawan.findUnique({
					where: { id: employeeId },
					select: { nomorKaryawan: true },
				});

				let generatedNumber: string | undefined;
				if (existing && !existing.nomorKaryawan) {
					const primaryPos = rows.find((r) => r.isPrimary) ?? rows[0];
					if (primaryPos) {
						const numResult = await generateEmployeeNumber({
							workLocationId: primaryPos.workLocationId,
							organizationalUnitId: primaryPos.organizationalUnitId,
							positionId: primaryPos.positionId,
						});
						if (numResult.success) {
							await prisma.karyawan.update({
								where: { id: employeeId },
								data: { nomorKaryawan: numResult.employeeNumber },
							});
							generatedNumber = numResult.employeeNumber;
						}
					}
				}

				return {
					success: true,
					message: generatedNumber
						? `Penempatan disimpan. Nomor karyawan berhasil dibuat: ${generatedNumber} (cek tahap 1).`
						: "Tahap penempatan berhasil disimpan.",
					employeeId,
					employeeNumber: generatedNumber,
				};
			}

			case "family": {
				const parsed = parseEmployeeStepPayload("family", payload);
				if (!parsed.isValid) {
					return { success: false, message: "Data keluarga tidak valid. Periksa nama anggota keluarga dan field wajib lainnya.", errors: parsed.errors };
				}
				const rows = parsed.data as EmployeeFamilyPayload[];
				await prisma.$transaction(async (tx) => {
					await tx.keluargaKaryawan.deleteMany({ where: { karyawanId: employeeId } });
					if (rows.length) {
						await tx.keluargaKaryawan.createMany({
							data: rows.map((item) => ({
								karyawanId: employeeId,
								nama: item.name,
								hubungan: item.relation as HubunganKeluarga,
								gender: item.gender as JenisKelamin,
								tanggalLahir: parseDate(item.birthDate),
								nik: toNullableText(item.nationalId),
								pekerjaan: toNullableText(item.occupation),
							})),
						});
					}
				});
				break;
			}

			case "education": {
				const parsed = parseEmployeeStepPayload("education", payload);
				if (!parsed.isValid) {
					return { success: false, message: "Data pendidikan tidak valid. Periksa nama institusi dan field wajib lainnya.", errors: parsed.errors };
				}
				const rows = parsed.data as EmployeeEducationPayload[];
				await prisma.$transaction(async (tx) => {
					await tx.pendidikanKaryawan.deleteMany({ where: { karyawanId: employeeId } });
					if (rows.length) {
						await tx.pendidikanKaryawan.createMany({
							data: rows.map((item) => ({
								karyawanId: employeeId,
								gelar: item.degree as GelarPendidikan,
								institusi: item.institution,
								jurusan: toNullableText(item.major),
								tahunMulai: parseIntOrNull(item.startYear),
								tahunLulus: parseIntOrNull(item.graduationYear),
								ipk: parseFloatOrNull(item.gpa),
								isHighest: item.isHighest,
								urlDokumen: toNullableText(item.documentUrl),
							})),
						});
					}
				});
				break;
			}

			case "workHistory": {
				const parsed = parseEmployeeStepPayload("workHistory", payload);
				if (!parsed.isValid) {
					return { success: false, message: "Data riwayat kerja tidak valid. Periksa nama perusahaan dan field wajib lainnya.", errors: parsed.errors };
				}
				const rows = parsed.data as EmployeeWorkHistoryPayload[];
				await prisma.$transaction(async (tx) => {
					await tx.riwayatPekerjaan.deleteMany({ where: { karyawanId: employeeId } });
					if (rows.length) {
						await tx.riwayatPekerjaan.createMany({
							data: rows.map((item) => ({
								karyawanId: employeeId,
								namaPerusahaan: item.companyName,
								posisi: toNullableText(item.position),
								tanggalMulai: parseDate(item.startDate),
								tanggalSelesai: parseDate(item.endDate),
								gajiTerakhir: item.lastSalary ? new Prisma.Decimal(item.lastSalary) : null,
								alasanKeluar: toNullableText(item.reasonLeaving),
								teleponReferensi: toNullableText(item.referencePhone),
							})),
						});
					}
				});
				break;
			}

			case "kontrak": {
				const parsed = parseEmployeeStepPayload("kontrak", payload);
				if (!parsed.isValid) {
					return { success: false, message: "Data kontrak tidak valid. Periksa nomor kontrak, tanggal mulai, dan field wajib lainnya.", errors: parsed.errors };
				}
				const rows = parsed.data as EmployeeKontrakPayload[];
				await prisma.$transaction(async (tx) => {
					await tx.kontrakKerja.deleteMany({ where: { karyawanId: employeeId } });
					if (rows.length) {
						await tx.kontrakKerja.createMany({
							data: rows.map((item) => ({
								karyawanId: employeeId,
								nomorKontrak: item.contractNumber,
								jenisKontrak: item.contractType as JenisKontrak,
								tanggalMulai: parseDate(item.startDate) ?? new Date(),
								tanggalSelesai: parseDate(item.endDate),
								status: item.status as StatusKontrak,
								gajiPokok: item.baseSalary ? new Prisma.Decimal(item.baseSalary) : null,
								urlDokumen: toNullableText(item.documentUrl),
								catatan: toNullableText(item.note),
							})),
						});
					}
				});
				break;
			}

			case "document": {
				const parsed = parseEmployeeStepPayload("document", payload);
				if (!parsed.isValid) {
					return { success: false, message: "Data dokumen tidak valid. Periksa nama dokumen, URL file, dan field wajib lainnya.", errors: parsed.errors };
				}
				const rows = parsed.data as EmployeeDocumentPayload[];
				await prisma.$transaction(async (tx) => {
					await tx.dokumenKaryawan.deleteMany({ where: { karyawanId: employeeId } });
					if (rows.length) {
						await tx.dokumenKaryawan.createMany({
							data: rows.map((item) => ({
								karyawanId: employeeId,
								jenisDokumen: item.documentType as JenisDokumen,
								nama: item.name,
								urlFile: item.fileUrl,
								ukuranFile: item.fileSize ? BigInt(item.fileSize) : null,
								tipeFile: toNullableText(item.mimeType),
								tanggalKadaluarsa: parseDate(item.expiredAt),
								catatan: toNullableText(item.note),
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
				message: "Nomor karyawan sudah digunakan.",
				errors: { employeeNumber: "Nomor karyawan harus unik." },
			};
		}

		const message = error instanceof Error ? error.message : "Gagal menyimpan tahap karyawan.";
		return {
			success: false,
			message,
		};
	}
}

export async function generateEmployeeNumber(params: {
	workLocationId?: string;
	organizationalUnitId?: string;
	positionId?: string;
}): Promise<{ success: boolean; employeeNumber: string; message: string }> {
	const { workLocationId, organizationalUnitId, positionId } = params;

	const [location, unit, position] = await Promise.all([
		workLocationId ? prisma.lokasiKerja.findUnique({ where: { id: workLocationId }, select: { kode: true } }) : null,
		organizationalUnitId ? prisma.unitOrganisasi.findUnique({ where: { id: organizationalUnitId }, select: { kode: true } }) : null,
		positionId
			? prisma.posisi.findUnique({
					where: { id: positionId },
					select: { kode: true, golonganPosisi: { select: { kode: true } } },
				})
			: null,
	]);

	const locCode = location?.kode ?? "LOC";
	const unitCode = unit?.kode ?? "UNIT";
	const golCode = position?.golonganPosisi?.kode ?? "G0";
	const posCode = position?.kode ?? "POS";

	const prefix = `${locCode}-${unitCode}-${golCode}-${posCode}`;

	const lastEmployee = await prisma.karyawan.findFirst({
		where: { nomorKaryawan: { startsWith: prefix } },
		orderBy: { nomorKaryawan: "desc" },
		select: { nomorKaryawan: true },
	});

	let seq = 1;
	if (lastEmployee) {
		const lastSeq = lastEmployee.nomorKaryawan.split("-").pop();
		const parsed = Number.parseInt(lastSeq ?? "0", 10);
		if (!Number.isNaN(parsed)) {
			seq = parsed + 1;
		}
	}

	const employeeNumber = `${prefix}-${String(seq).padStart(3, "0")}`;

	return {
		success: true,
		employeeNumber,
		message: `Nomor karyawan berhasil digenerate: ${employeeNumber}`,
	};
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
			message: "Data karyawan tidak ditemukan.",
			data: defaultDetail(),
		};
	}

	return {
		success: true,
		message: "Data karyawan berhasil dimuat.",
		data: detail,
	};
}
