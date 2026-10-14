"use server";

import {
	JenisKelamin,
	StatusKaryawan,
	StatusPtkp,
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
	type EmployeeListItem,
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

const BANK_OPTIONS = [
	"BCA",
	"BRI",
	"MANDIRI",
	"BNI",
	"BTN",
	"BSI",
	"CIMB",
	"DANAMON",
	"PERMATA",
	"MEGA",
	"BJB",
	"LAINNYA",
] as const;

function toOptionLabel(value: string) {
	return value
		.split("_")
		.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`)
		.join(" ");
}

/** Kategori TER PP 58/2023 untuk label dropdown PTKP. */
function ptkpKeTer(value: string): string {
	if (value === "K_3") return "C";
	if (value === "TK_2" || value === "TK_3" || value === "K_1" || value === "K_2") return "B";
	return "A";
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
			directSupervisorId: "",
			employeeNumber: "",
			fullName: "",
			gender: JenisKelamin.LAKI_LAKI,
			birthDate: "",
			nationalId: "",
			taxId: "",
			ptkpStatus: StatusPtkp.TK_0,
			bankNama: "",
			bankNorek: "",
			bankAtasNama: "",
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
	};
}

export async function getEmployeeWizardBootstrapData(): Promise<{
	summaries: EmployeeWizardSummary[];
	referenceOptions: EmployeeWizardReferenceOptions;
}> {
	const [employees, users, units, positions, locations, atasan] = await Promise.all([
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
		prisma.karyawan.findMany({
			where: { status: { in: [StatusKaryawan.AKTIF, StatusKaryawan.PROBASI] } },
			orderBy: [{ namaLengkap: "asc" }],
			select: { id: true, namaLengkap: true, nomorKaryawan: true },
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
			atasanOptions: atasan.map((item) => ({ value: item.id, label: `${item.namaLengkap} (${item.nomorKaryawan})` })),
			organizationalUnits: units.map((item) => ({ value: item.id, label: item.kode ? `${item.nama} (${item.kode})` : item.nama })),
			positions: positions.map((item) => ({ value: item.id, label: item.kode ? `${item.nama} (${item.kode})` : item.nama })),
			positionUnitMap: Object.fromEntries(positions.filter((item) => item.unitOrganisasiId).map((item) => [item.id, item.unitOrganisasiId!])),
			workLocations: locations.map((item) => ({ value: item.id, label: item.kode ? `${item.nama} (${item.kode})` : item.nama })),
			jenisKelamin: enumOptions(Object.values(JenisKelamin)),
			statusKaryawan: enumOptions(Object.values(StatusKaryawan)),
			statusPtkp: (Object.values(StatusPtkp) as string[]).map((value) => ({
				value,
				label: `${value.replace("_", "/")} (TER ${ptkpKeTer(value)})`,
			})),
			bankOptions: BANK_OPTIONS.map((b) => ({ value: b, label: b })),
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
			directSupervisorId: employee.atasanLangsungId ?? "",
			employeeNumber: employee.nomorKaryawan,
			fullName: employee.namaLengkap,
			gender: employee.gender,
			birthDate: toDateInputValue(employee.tanggalLahir),
			nationalId: employee.nik ?? "",
			taxId: employee.npwp ?? "",
			ptkpStatus: employee.statusPtkp,
			bankNama: employee.bankNama ?? "",
			bankNorek: employee.bankNorek ?? "",
			bankAtasNama: employee.bankAtasNama ?? "",
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
		educations: employee.pendidikanKaryawan.map((item) => {
			const ijazahDoc = employee.dokumenKaryawan.find(
				(d) => d.jenisDokumen === JenisDokumen.IJAZAH && d.nama.includes(item.institusi),
			);
			const transkripDoc = employee.dokumenKaryawan.find(
				(d) => d.jenisDokumen === JenisDokumen.TRANSKRIP && d.nama.includes(item.institusi),
			);
			return {
				degree: item.gelar,
				institution: item.institusi,
				major: item.jurusan ?? "",
				startYear: item.tahunMulai ? String(item.tahunMulai) : "",
				graduationYear: item.tahunLulus ? String(item.tahunLulus) : "",
				gpa: item.ipk !== null ? String(item.ipk) : "",
				isHighest: item.isHighest,
				ijazah: ijazahDoc?.urlFile ?? "",
				transkrip: transkripDoc?.urlFile ?? "",
			};
		}),
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

				const linkedUserId = toNullableText(data.userId);
				if (linkedUserId) {
					const taken = await prisma.karyawan.findFirst({
						where: { userId: linkedUserId, NOT: employeeId ? { id: employeeId } : undefined },
						select: { id: true, namaLengkap: true },
					});
					if (taken) {
						return {
							success: false,
							message: `Akun user sudah tertaut ke karyawan ${taken.namaLengkap}. Satu akun hanya untuk satu karyawan.`,
							errors: { userId: "Akun user sudah tertaut ke karyawan lain." },
						};
					}
				}

				const supervisorId = toNullableText(data.directSupervisorId);
				if (supervisorId) {
					if (employeeId && supervisorId === employeeId) {
						return {
							success: false,
							message: "Atasan langsung tidak boleh diri sendiri.",
							errors: { directSupervisorId: "Atasan langsung tidak boleh diri sendiri." },
						};
					}
					const supervisorExists = await prisma.karyawan.findUnique({
						where: { id: supervisorId },
						select: { id: true },
					});
					if (!supervisorExists) {
						return {
							success: false,
							message: "Atasan langsung tidak ditemukan.",
							errors: { directSupervisorId: "Atasan langsung tidak ditemukan." },
						};
					}
				}

			const payloadToSave = {
				userId: linkedUserId,
				atasanLangsungId: supervisorId,
				nomorKaryawan: data.employeeNumber,
				namaLengkap: data.fullName,
				gender: data.gender as JenisKelamin,
				tanggalLahir: parseDate(data.birthDate),
				nik: toNullableText(data.nationalId),
				npwp: toNullableText(data.taxId),
				statusPtkp: (data.ptkpStatus || StatusPtkp.TK_0) as StatusPtkp,
				bankNama: toNullableText(data.bankNama),
				bankNorek: toNullableText(data.bankNorek)?.replace(/\s+/g, ""),
				bankAtasNama: toNullableText(data.bankAtasNama),
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
				const today = new Date();
				today.setHours(0, 0, 0, 0);

				const keyOf = (unitId: string | null, posId: string | null, locId: string | null, effective: Date) =>
					[unitId ?? "", posId ?? "", locId ?? "", toDateInputValue(effective)].join("|");

				await prisma.$transaction(async (tx) => {
					const existing = await tx.posisiKaryawan.findMany({ where: { karyawanId: employeeId } });
					const existingByKey = new Map(existing.map((rec) => [keyOf(rec.unitOrganisasiId, rec.posisiId, rec.lokasiKerjaId, rec.tanggalEfektif), rec]));
					const submittedKeys = new Set<string>();
					const submittedCurrentKeys = new Set<string>();

					for (const item of rows) {
						const effective = parseDate(item.effectiveDate) ?? new Date();
						const unitId = toNullableText(item.organizationalUnitId);
						const posId = toNullableText(item.positionId);
						const locId = toNullableText(item.workLocationId);
						const key = keyOf(unitId, posId, locId, effective);
						submittedKeys.add(key);
						if (item.isCurrent) submittedCurrentKeys.add(key);

						const found = existingByKey.get(key);
						if (found) {
							await tx.posisiKaryawan.update({
								where: { id: found.id },
								data: {
									isPrimary: item.isPrimary,
									isCurrent: item.isCurrent,
									tanggalBerakhir: item.isCurrent ? null : (found.tanggalBerakhir ?? today),
									catatan: toNullableText(item.note),
								},
							});
						} else {
							await tx.posisiKaryawan.create({
								data: {
									karyawanId: employeeId,
									unitOrganisasiId: unitId,
									posisiId: posId,
									lokasiKerjaId: locId,
									isPrimary: item.isPrimary,
									isCurrent: item.isCurrent,
									tanggalEfektif: effective,
									tanggalBerakhir: item.isCurrent ? null : today,
									catatan: toNullableText(item.note),
								},
							});
						}
					}

					for (const rec of existing) {
						const key = keyOf(rec.unitOrganisasiId, rec.posisiId, rec.lokasiKerjaId, rec.tanggalEfektif);
						if (submittedKeys.has(key)) {
							if (rec.isCurrent && !submittedCurrentKeys.has(key)) {
								await tx.posisiKaryawan.update({
									where: { id: rec.id },
									data: { isCurrent: false, tanggalBerakhir: rec.tanggalBerakhir ?? today },
								});
							}
							continue;
						}
						const effectiveDay = new Date(rec.tanggalEfektif);
						effectiveDay.setHours(0, 0, 0, 0);
						if (effectiveDay.getTime() > today.getTime()) {
							await tx.posisiKaryawan.delete({ where: { id: rec.id } });
						} else if (rec.isCurrent || !rec.tanggalBerakhir) {
							await tx.posisiKaryawan.update({
								where: { id: rec.id },
								data: { isCurrent: false, tanggalBerakhir: rec.tanggalBerakhir ?? today },
							});
						}
					}
				});

				const employee = await prisma.karyawan.findUnique({
					where: { id: employeeId },
					select: { nomorKaryawan: true, tanggalMasuk: true },
				});

				let generatedNumber: string | undefined;
				if (employee && !employee.nomorKaryawan) {
					const primaryPos = rows.find((r) => r.isPrimary) ?? rows[0];
					if (primaryPos) {
						const numResult = await generateEmployeeNumber({
							workLocationId: primaryPos.workLocationId,
							joinDate: employee.tanggalMasuk,
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
						: "Tahap penempatan berhasil disimpan. Riwayat penempatan dipertahankan.",
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
					await tx.dokumenKaryawan.deleteMany({
						where: {
							karyawanId: employeeId,
							jenisDokumen: { in: [JenisDokumen.IJAZAH, JenisDokumen.TRANSKRIP] },
						},
					});

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
							})),
						});

						const docRows: Array<{
							karyawanId: string;
							jenisDokumen: JenisDokumen;
							nama: string;
							urlFile: string;
						}> = [];

						for (const item of rows) {
							if (item.ijazah) {
								docRows.push({
									karyawanId: employeeId,
									jenisDokumen: JenisDokumen.IJAZAH,
									nama: `Ijazah ${item.degree} - ${item.institution}`,
									urlFile: item.ijazah,
								});
							}
							if (item.transkrip) {
								docRows.push({
									karyawanId: employeeId,
									jenisDokumen: JenisDokumen.TRANSKRIP,
									nama: `Transkrip Nilai ${item.degree} - ${item.institution}`,
									urlFile: item.transkrip,
								});
							}
						}

						if (docRows.length) {
							await tx.dokumenKaryawan.createMany({ data: docRows });
						}
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
				const today = new Date();
				today.setHours(0, 0, 0, 0);

				await prisma.$transaction(async (tx) => {
					const existing = await tx.kontrakKerja.findMany({ where: { karyawanId: employeeId } });
					const existingByNumber = new Map(existing.map((rec) => [rec.nomorKontrak, rec]));
					const submittedNumbers = new Set(rows.map((item) => item.contractNumber.trim()));

					for (const item of rows) {
						const nomor = item.contractNumber.trim();
						const data = {
							jenisKontrak: item.contractType as JenisKontrak,
							tanggalMulai: parseDate(item.startDate) ?? new Date(),
							tanggalSelesai: parseDate(item.endDate),
							status: item.status as StatusKontrak,
							gajiPokok: item.baseSalary ? new Prisma.Decimal(item.baseSalary) : null,
							catatan: toNullableText(item.note),
						};
						const found = existingByNumber.get(nomor);
						if (found) {
							await tx.kontrakKerja.update({ where: { id: found.id }, data });
						} else {
							await tx.kontrakKerja.create({
								data: { karyawanId: employeeId, nomorKontrak: nomor, ...data },
							});
						}
					}

					for (const rec of existing) {
						if (submittedNumbers.has(rec.nomorKontrak)) continue;
						const startDay = new Date(rec.tanggalMulai);
						startDay.setHours(0, 0, 0, 0);
						if (startDay.getTime() > today.getTime()) {
							await tx.kontrakKerja.delete({ where: { id: rec.id } });
						}
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
			const target = (error.meta?.target as string[] | undefined) ?? [];
			if (target.includes("nik")) {
				return {
					success: false,
					message: "NIK sudah digunakan karyawan lain.",
					errors: { nationalId: "NIK harus unik." },
				};
			}
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
	joinDate?: Date | string | null;
}): Promise<{ success: boolean; employeeNumber: string; message: string }> {
	const { workLocationId, joinDate } = params;

	const location = workLocationId
		? await prisma.lokasiKerja.findUnique({
				where: { id: workLocationId },
				select: { kode: true, nama: true },
			})
		: null;

	const rawCode = (location?.kode ?? location?.nama ?? "XXX").toUpperCase().replace(/[^A-Z0-9]/g, "");
	const cabang = (rawCode || "XXX").slice(0, 4);

	const parsedJoin = joinDate instanceof Date ? joinDate : joinDate ? parseDate(joinDate) : null;
	const tahun = String((parsedJoin ?? new Date()).getFullYear());

	const kunci = `${cabang}.${tahun}`;

	for (let attempt = 0; attempt < 5; attempt++) {
		const incremented = await prisma.$queryRaw<Array<{ terakhir: number }>>`
			INSERT INTO "penomoran" ("id", "kunci", "terakhir", "updatedAt")
			VALUES (md5(random()::text || clock_timestamp()::text), ${kunci}, 1, NOW())
			ON CONFLICT ("kunci") DO UPDATE SET "terakhir" = "penomoran"."terakhir" + 1, "updatedAt" = NOW()
			RETURNING "terakhir"`;
		const seq = incremented[0]?.terakhir ?? 1;
		const employeeNumber = `${kunci}.${String(seq).padStart(5, "0")}`;

		const exists = await prisma.karyawan.findUnique({
			where: { nomorKaryawan: employeeNumber },
			select: { id: true },
		});
		if (!exists) {
			return {
				success: true,
				employeeNumber,
				message: `Nomor karyawan berhasil digenerate: ${employeeNumber}`,
			};
		}
	}

	return {
		success: false,
		employeeNumber: "",
		message: "Gagal mengenerate nomor karyawan setelah beberapa percobaan.",
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

export async function getEmployeesList(): Promise<EmployeeListItem[]> {
	const employees = await prisma.karyawan.findMany({
		orderBy: [{ updatedAt: "desc" }],
		select: {
			id: true,
			nomorKaryawan: true,
			namaLengkap: true,
			email: true,
			telepon: true,
			status: true,
			tanggalMasuk: true,
			updatedAt: true,
			posisiKaryawan: {
				where: { isCurrent: true },
				take: 1,
				select: {
					unitOrganisasi: { select: { nama: true } },
					posisi: { select: { nama: true } },
					lokasiKerja: { select: { nama: true } },
				},
			},
		},
	});

	return employees.map((emp) => ({
		id: emp.id,
		employeeNumber: emp.nomorKaryawan,
		fullName: emp.namaLengkap,
		workEmail: emp.email ?? "",
		phone: emp.telepon ?? "",
		status: emp.status,
		joinDate: emp.tanggalMasuk?.toISOString() ?? "",
		positionName: emp.posisiKaryawan[0]?.posisi?.nama ?? "-",
		unitName: emp.posisiKaryawan[0]?.unitOrganisasi?.nama ?? "-",
		workLocationName: emp.posisiKaryawan[0]?.lokasiKerja?.nama ?? "-",
		updatedAt: emp.updatedAt.toISOString(),
	}));
}

export type KontrakMasaBerakhirItem = {
	id: string;
	nomorKontrak: string;
	karyawanId: string;
	karyawanNama: string;
	nomorKaryawan: string;
	jenisKontrak: string;
	tanggalMulai: string;
	tanggalSelesai: string;
	sisaHari: number;
	status: string;
};

export async function getKontrakMasaBerakhir(hariKeDepan = 30): Promise<KontrakMasaBerakhirItem[]> {
	const now = new Date();
	const batas = new Date();
	batas.setDate(batas.getDate() + hariKeDepan);

	const rows = await prisma.kontrakKerja.findMany({
		where: {
			tanggalSelesai: { gte: now, lte: batas },
			status: { in: [StatusKontrak.AKTIF, StatusKontrak.AKAN_BERAKHIR] },
		},
		orderBy: { tanggalSelesai: "asc" },
		include: {
			karyawan: { select: { id: true, namaLengkap: true, nomorKaryawan: true } },
		},
	});

	return rows.map((item) => ({
		id: item.id,
		nomorKontrak: item.nomorKontrak,
		karyawanId: item.karyawan.id,
		karyawanNama: item.karyawan.namaLengkap,
		nomorKaryawan: item.karyawan.nomorKaryawan,
		jenisKontrak: item.jenisKontrak,
		tanggalMulai: item.tanggalMulai.toISOString(),
		tanggalSelesai: item.tanggalSelesai!.toISOString(),
		sisaHari: Math.max(0, Math.ceil((item.tanggalSelesai!.getTime() - now.getTime()) / 86400000)),
		status: item.status,
	}));
}

export async function sinkronStatusKontrak(hariPeringatan = 30): Promise<{ success: boolean; message: string; berakhir: number; akanBerakhir: number }> {
	const now = new Date();
	const batas = new Date();
	batas.setDate(batas.getDate() + hariPeringatan);

	const [berakhir, akanBerakhir, kembaliAktif] = await Promise.all([
		prisma.kontrakKerja.updateMany({
			where: {
				tanggalSelesai: { lt: now },
				status: { in: [StatusKontrak.AKTIF, StatusKontrak.AKAN_BERAKHIR] },
			},
			data: { status: StatusKontrak.BERAKHIR },
		}),
		prisma.kontrakKerja.updateMany({
			where: {
				tanggalSelesai: { gte: now, lte: batas },
				status: StatusKontrak.AKTIF,
			},
			data: { status: StatusKontrak.AKAN_BERAKHIR },
		}),
		prisma.kontrakKerja.updateMany({
			where: {
				OR: [{ tanggalSelesai: null }, { tanggalSelesai: { gt: batas } }],
				status: StatusKontrak.AKAN_BERAKHIR,
			},
			data: { status: StatusKontrak.AKTIF },
		}),
	]);

	revalidatePath("/employees");

	return {
		success: true,
		message: `Sinkronisasi selesai: ${berakhir.count} berakhir, ${akanBerakhir.count} akan berakhir, ${kembaliAktif.count} kembali aktif.`,
		berakhir: berakhir.count,
		akanBerakhir: akanBerakhir.count,
	};
}
