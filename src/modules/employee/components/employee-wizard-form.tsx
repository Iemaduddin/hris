"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import FloatingTextarea from "@/src/components/ui/floating-input/textarea";
import { getEmployeeWizardDetailAction, saveEmployeeWizardStepAction } from "../actions/employee.actions";
import {
	EMPLOYEE_WIZARD_STEPS,
	type EmployeeBankAccountPayload,
	type EmployeeBpjsPayload,
	type EmployeeDocumentPayload,
	type EmployeeEducationPayload,
	type EmployeeFamilyPayload,
	type EmployeePersonalPayload,
	type EmployeePositionPayload,
	type EmployeeWizardDetail,
	type EmployeeWizardReferenceOptions,
	type EmployeeWizardStepKey,
	type EmployeeWizardSummary,
	type EmployeeWorkHistoryPayload,
} from "../types/employee.type";

type EmployeeWizardFormProps = {
	summaries: EmployeeWizardSummary[];
	referenceOptions: EmployeeWizardReferenceOptions;
};

const STEP_LABELS: Record<EmployeeWizardStepKey, string> = {
	personal: "1. Data Pribadi",
	position: "2. Penempatan",
	family: "3. Keluarga",
	education: "4. Pendidikan",
	workHistory: "5. Riwayat Kerja",
	bankAccount: "6. Rekening",
	bpjs: "7. BPJS",
	document: "8. Dokumen",
};

function emptyPersonal(): EmployeePersonalPayload {
	return {
		id: "",
		userId: "",
		employeeNumber: "",
		fullName: "",
		nickname: "",
		gender: "MALE",
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
		status: "ACTIVE",
		employmentType: "PERMANENT",
		joinDate: "",
		probationEndDate: "",
		contractEndDate: "",
		resignDate: "",
		resignReason: "",
		terminationNote: "",
	};
}

function emptyPosition(): EmployeePositionPayload {
	return {
		organizationalUnitId: "",
		positionId: "",
		workLocationId: "",
		isPrimary: true,
		isCurrent: true,
		effectiveDate: "",
		endDate: "",
		note: "",
	};
}

function emptyFamily(): EmployeeFamilyPayload {
	return {
		name: "",
		relation: "SPOUSE",
		gender: "MALE",
		birthDate: "",
		nationalId: "",
		occupation: "",
		isDependent: false,
		isBpjsDependent: false,
		isHeir: false,
	};
}

function emptyEducation(): EmployeeEducationPayload {
	return {
		degree: "S1",
		institution: "",
		major: "",
		startYear: "",
		graduationYear: "",
		gpa: "",
		isHighest: false,
		documentUrl: "",
	};
}

function emptyWorkHistory(): EmployeeWorkHistoryPayload {
	return {
		companyName: "",
		position: "",
		startDate: "",
		endDate: "",
		lastSalary: "",
		reasonLeaving: "",
		referencePhone: "",
	};
}

function emptyBankAccount(): EmployeeBankAccountPayload {
	return {
		bankName: "",
		bankCode: "",
		accountNumber: "",
		accountName: "",
		isPrimary: false,
	};
}

function emptyBpjs(): EmployeeBpjsPayload {
	return {
		bpjsHealthNumber: "",
		bpjsHealthClass: "",
		bpjsHealthDate: "",
		bpjsTkNumber: "",
		bpjsJhtDate: "",
		bpjsJpDate: "",
		bpjsJkkDate: "",
		bpjsJkmDate: "",
	};
}

function emptyDocument(): EmployeeDocumentPayload {
	return {
		documentType: "KTP",
		name: "",
		fileUrl: "",
		fileSize: "",
		mimeType: "",
		expiredAt: "",
		note: "",
		uploadedAt: "",
	};
}

function emptyWizardDetail(): EmployeeWizardDetail {
	return {
		employeeId: "",
		personal: emptyPersonal(),
		positions: [emptyPosition()],
		families: [],
		educations: [],
		workHistories: [],
		bankAccounts: [],
		bpjs: emptyBpjs(),
		documents: [],
	};
}

function boolOptions() {
	return [
		{ value: "true", label: "Ya" },
		{ value: "false", label: "Tidak" },
	];
}

function removeWithConfirm(onRemove: () => void) {
	if (!window.confirm("Yakin ingin menghapus item ini?")) {
		return;
	}
	onRemove();
}

export default function EmployeeWizardForm({ summaries, referenceOptions }: EmployeeWizardFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [activeStepIndex, setActiveStepIndex] = useState(0);
	const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
	const [errorMap, setErrorMap] = useState<Record<string, string>>({});
	const [summaryItems, setSummaryItems] = useState<EmployeeWizardSummary[]>(summaries);
	const [form, setForm] = useState<EmployeeWizardDetail>(emptyWizardDetail());

	const activeStep = EMPLOYEE_WIZARD_STEPS[activeStepIndex];

	const summarySelectOptions = useMemo(
		() =>
			summaryItems.map((item) => ({
				value: item.id,
				label: `${item.employeeNumber} - ${item.fullName}`,
			})),
		[summaryItems],
	);

	function getStepPayload(step: EmployeeWizardStepKey) {
		if (step === "personal") return form.personal;
		if (step === "position") return form.positions;
		if (step === "family") return form.families;
		if (step === "education") return form.educations;
		if (step === "workHistory") return form.workHistories;
		if (step === "bankAccount") return form.bankAccounts;
		if (step === "bpjs") return form.bpjs;
		return form.documents;
	}

	function upsertSummary() {
		if (!form.employeeId || !form.personal.employeeNumber || !form.personal.fullName) return;

		setSummaryItems((prev) => {
			const nextItem: EmployeeWizardSummary = {
				id: form.employeeId,
				employeeNumber: form.personal.employeeNumber,
				fullName: form.personal.fullName,
				status: form.personal.status,
				updatedAt: new Date().toISOString(),
			};
			const idx = prev.findIndex((item) => item.id === nextItem.id);
			if (idx === -1) {
				return [nextItem, ...prev];
			}
			const copy = [...prev];
			copy[idx] = nextItem;
			return copy;
		});
	}

	function loadEmployee(employeeId: string) {
		setErrorMap({});
		startTransition(async () => {
			const result = await getEmployeeWizardDetailAction(employeeId);
			if (!result.success) {
				toast.error(result.message || "Gagal memuat employee.");
				return;
			}

			setForm({
				...result.data,
				positions: result.data.positions.length ? result.data.positions : [emptyPosition()],
			});
			setSelectedEmployeeId(employeeId);
			setActiveStepIndex(0);
			toast.success(employeeId ? "Draft employee dimuat." : "Form employee baru siap.");
		});
	}

	function saveCurrentStep(moveNext: boolean) {
		setErrorMap({});
		startTransition(async () => {
			const payload = getStepPayload(activeStep);
			const formData = new FormData();
			formData.set("step", activeStep);
			formData.set("employeeId", form.employeeId);
			formData.set("payload", JSON.stringify(payload));

			const result = await saveEmployeeWizardStepAction(formData);
			if (!result.success) {
				setErrorMap(result.errors ?? {});
				toast.error(result.message || "Gagal menyimpan tahap.");
				return;
			}

			if (result.employeeId && !form.employeeId) {
				setForm((prev) => ({
					...prev,
					employeeId: result.employeeId ?? prev.employeeId,
					personal: {
						...prev.personal,
						id: result.employeeId ?? prev.personal.id,
					},
				}));
				setSelectedEmployeeId(result.employeeId);
			}

			upsertSummary();
			router.refresh();
			toast.success(result.message || "Tahap berhasil disimpan.");

			if (moveNext && activeStepIndex < EMPLOYEE_WIZARD_STEPS.length - 1) {
				setActiveStepIndex((prev) => prev + 1);
			}
		});
	}

	function getError(field: string) {
		return errorMap[field];
	}

	function getRowError(index: number, field: string) {
		return errorMap[`${index}.${field}`];
	}

	return (
		<div className="mt-4 space-y-5">
			<div className="rounded-xl border border-blue-100 p-4 dark:border-blue-900/60">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
					<FloatingSelect
						name="employeePicker"
						label="Pilih Employee (lanjut edit)"
						value={selectedEmployeeId}
						onValueChange={(value) => {
							if (!value) return;
							loadEmployee(value);
						}}
						options={summarySelectOptions}
						placeholder="Buat employee baru"
						containerClassName="md:col-span-3"
					/>
					<button
						type="button"
						onClick={() => loadEmployee("")}
						className="inline-flex h-11 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
					>
						Buat Draft Baru
					</button>
				</div>

				<p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
					Setiap tahap dapat disimpan terpisah. Anda bisa menutup halaman dan melanjutkan lagi nanti.
				</p>
			</div>

			<div className="rounded-xl border border-blue-100 p-4 dark:border-blue-900/60">
				<div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
					{EMPLOYEE_WIZARD_STEPS.map((step, index) => {
						const isActive = index === activeStepIndex;
						return (
							<button
								key={step}
								type="button"
								onClick={() => setActiveStepIndex(index)}
								className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
									isActive
										? "border-blue-500 bg-blue-600 text-white"
										: "border-blue-200 text-slate-700 hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
								}`}
							>
								{STEP_LABELS[step]}
							</button>
						);
					})}
				</div>
			</div>

			<div className="rounded-xl border border-blue-100 p-4 dark:border-blue-900/60">
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
					<div>
						<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{STEP_LABELS[activeStep]}</h3>
						<p className="text-xs text-slate-500 dark:text-slate-400">Employee ID: {form.employeeId || "Belum dibuat"}</p>
					</div>
				</div>

				{activeStep === "personal" && (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<FloatingInput
							name="employeeNumber"
							label="NIK Karyawan"
							value={form.personal.employeeNumber}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, employeeNumber: event.currentTarget.value } }))}
							errorText={getError("employeeNumber")}
							required
						/>
						<FloatingInput
							name="fullName"
							label="Nama Lengkap"
							value={form.personal.fullName}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, fullName: event.currentTarget.value } }))}
							errorText={getError("fullName")}
							required
						/>
						<FloatingInput
							name="nickname"
							label="Nama Panggilan"
							value={form.personal.nickname}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, nickname: event.currentTarget.value } }))}
						/>

						<FloatingSelect
							name="userId"
							label="Akun User"
							value={form.personal.userId}
							onValueChange={(value) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, userId: value } }))}
							options={referenceOptions.users}
							placeholder="Tidak ditautkan"
						/>
						<FloatingSelect
							name="gender"
							label="Gender"
							value={form.personal.gender}
							onValueChange={(value) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, gender: value } }))}
							options={referenceOptions.genders}
							errorText={getError("gender")}
						/>
						<FloatingInput
							name="birthPlace"
							label="Tempat Lahir"
							value={form.personal.birthPlace}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, birthPlace: event.currentTarget.value } }))}
						/>

						<FloatingInput
							name="birthDate"
							label="Tanggal Lahir"
							type="date"
							value={form.personal.birthDate}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, birthDate: event.currentTarget.value } }))}
						/>
						<FloatingInput
							name="nationalId"
							label="NIK KTP"
							value={form.personal.nationalId}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, nationalId: event.currentTarget.value } }))}
						/>
						<FloatingInput
							name="taxId"
							label="NPWP"
							value={form.personal.taxId}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, taxId: event.currentTarget.value } }))}
						/>

						<FloatingSelect
							name="religion"
							label="Agama"
							value={form.personal.religion}
							onValueChange={(value) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, religion: value } }))}
							options={referenceOptions.religions}
							placeholder="Pilih agama"
						/>
						<FloatingSelect
							name="bloodType"
							label="Golongan Darah"
							value={form.personal.bloodType}
							onValueChange={(value) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, bloodType: value } }))}
							options={referenceOptions.bloodTypes}
							placeholder="Pilih golongan darah"
						/>
						<FloatingSelect
							name="maritalStatus"
							label="Status Pernikahan"
							value={form.personal.maritalStatus}
							onValueChange={(value) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, maritalStatus: value } }))}
							options={referenceOptions.maritalStatuses}
							placeholder="Pilih status"
						/>

						<FloatingInput
							name="photo"
							label="URL Foto"
							value={form.personal.photo}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, photo: event.currentTarget.value } }))}
							containerClassName="md:col-span-3"
						/>

						<FloatingInput
							name="personalEmail"
							label="Email Personal"
							value={form.personal.personalEmail}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, personalEmail: event.currentTarget.value } }))}
						/>
						<FloatingInput
							name="workEmail"
							label="Email Kantor"
							value={form.personal.workEmail}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, workEmail: event.currentTarget.value } }))}
						/>
						<FloatingInput
							name="phone"
							label="No. HP"
							value={form.personal.phone}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, phone: event.currentTarget.value } }))}
						/>

						<FloatingInput
							name="emergencyContactName"
							label="Kontak Darurat - Nama"
							value={form.personal.emergencyContact.name}
							onChange={(event) =>
								setForm((prev) => ({
									...prev,
									personal: {
										...prev.personal,
										emergencyContact: { ...prev.personal.emergencyContact, name: event.currentTarget.value },
									},
								}))
							}
						/>
						<FloatingInput
							name="emergencyContactPhone"
							label="Kontak Darurat - No. HP"
							value={form.personal.emergencyContact.phone}
							onChange={(event) =>
								setForm((prev) => ({
									...prev,
									personal: {
										...prev.personal,
										emergencyContact: { ...prev.personal.emergencyContact, phone: event.currentTarget.value },
									},
								}))
							}
						/>
						<FloatingInput
							name="emergencyContactRelation"
							label="Kontak Darurat - Relasi"
							value={form.personal.emergencyContact.relation}
							onChange={(event) =>
								setForm((prev) => ({
									...prev,
									personal: {
										...prev.personal,
										emergencyContact: { ...prev.personal.emergencyContact, relation: event.currentTarget.value },
									},
								}))
							}
						/>

						<FloatingTextarea
							name="currentAddress"
							label="Alamat Domisili"
							value={form.personal.currentAddress}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, currentAddress: event.currentTarget.value } }))}
							containerClassName="md:col-span-3"
						/>
						<FloatingInput
							name="currentCity"
							label="Kota Domisili"
							value={form.personal.currentCity}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, currentCity: event.currentTarget.value } }))}
						/>
						<FloatingInput
							name="currentProvince"
							label="Provinsi Domisili"
							value={form.personal.currentProvince}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, currentProvince: event.currentTarget.value } }))}
						/>
						<FloatingInput
							name="currentPostal"
							label="Kode Pos Domisili"
							value={form.personal.currentPostal}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, currentPostal: event.currentTarget.value } }))}
						/>

						<FloatingTextarea
							name="idAddress"
							label="Alamat Sesuai KTP"
							value={form.personal.idAddress}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, idAddress: event.currentTarget.value } }))}
							containerClassName="md:col-span-3"
						/>
						<FloatingInput
							name="idCity"
							label="Kota KTP"
							value={form.personal.idCity}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, idCity: event.currentTarget.value } }))}
						/>
						<FloatingInput
							name="idProvince"
							label="Provinsi KTP"
							value={form.personal.idProvince}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, idProvince: event.currentTarget.value } }))}
						/>
						<FloatingInput
							name="idPostal"
							label="Kode Pos KTP"
							value={form.personal.idPostal}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, idPostal: event.currentTarget.value } }))}
						/>

						<FloatingSelect
							name="status"
							label="Status Karyawan"
							value={form.personal.status}
							onValueChange={(value) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, status: value } }))}
							options={referenceOptions.employeeStatuses}
						/>
						<FloatingSelect
							name="employmentType"
							label="Jenis Kepegawaian"
							value={form.personal.employmentType}
							onValueChange={(value) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, employmentType: value } }))}
							options={referenceOptions.employmentTypes}
						/>
						<FloatingInput
							name="joinDate"
							label="Tanggal Join"
							type="date"
							value={form.personal.joinDate}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, joinDate: event.currentTarget.value } }))}
							errorText={getError("joinDate")}
							required
						/>

						<FloatingInput
							name="probationEndDate"
							label="Akhir Probation"
							type="date"
							value={form.personal.probationEndDate}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, probationEndDate: event.currentTarget.value } }))}
						/>
						<FloatingInput
							name="contractEndDate"
							label="Akhir Kontrak"
							type="date"
							value={form.personal.contractEndDate}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, contractEndDate: event.currentTarget.value } }))}
						/>
						<FloatingInput
							name="resignDate"
							label="Tanggal Resign"
							type="date"
							value={form.personal.resignDate}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, resignDate: event.currentTarget.value } }))}
						/>
						<FloatingInput
							name="resignReason"
							label="Alasan Resign"
							value={form.personal.resignReason}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, resignReason: event.currentTarget.value } }))}
							containerClassName="md:col-span-2"
						/>
						<FloatingTextarea
							name="terminationNote"
							label="Catatan Terminasi"
							value={form.personal.terminationNote}
							onChange={(event) => setForm((prev) => ({ ...prev, personal: { ...prev.personal, terminationNote: event.currentTarget.value } }))}
							containerClassName="md:col-span-3"
						/>
					</div>
				)}

				{activeStep === "position" && (
					<div className="space-y-4">
						{form.positions.map((row, index) => (
							<div key={`position-${index}`} className="rounded-lg border border-blue-100 p-4 dark:border-blue-900/60">
								<div className="mb-3 flex items-center justify-between">
									<h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Riwayat Penempatan #{index + 1}</h4>
									<button
										type="button"
										onClick={() =>
											removeWithConfirm(() =>
												setForm((prev) => ({
													...prev,
													positions: prev.positions.filter((_, itemIndex) => itemIndex !== index),
												})),
											)
										}
										className="text-xs font-medium text-red-600 hover:underline"
									>
										Hapus
									</button>
								</div>
								<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
									<FloatingSelect
										name={`position-organizationalUnitId-${index}`}
										label="Unit Organisasi"
										value={row.organizationalUnitId}
										onValueChange={(value) =>
											setForm((prev) => ({
												...prev,
												positions: prev.positions.map((item, itemIndex) =>
													itemIndex === index ? { ...item, organizationalUnitId: value } : item,
												),
											}))
										}
										options={referenceOptions.organizationalUnits}
										placeholder="Pilih unit"
									/>
									<FloatingSelect
										name={`position-positionId-${index}`}
										label="Posisi"
										value={row.positionId}
										onValueChange={(value) =>
											setForm((prev) => ({
												...prev,
												positions: prev.positions.map((item, itemIndex) =>
													itemIndex === index ? { ...item, positionId: value } : item,
												),
											}))
										}
										options={referenceOptions.positions}
										placeholder="Pilih posisi"
									/>
									<FloatingSelect
										name={`position-workLocationId-${index}`}
										label="Lokasi Kerja"
										value={row.workLocationId}
										onValueChange={(value) =>
											setForm((prev) => ({
												...prev,
												positions: prev.positions.map((item, itemIndex) =>
													itemIndex === index ? { ...item, workLocationId: value } : item,
												),
											}))
										}
										options={referenceOptions.workLocations}
										placeholder="Pilih lokasi"
									/>
									<FloatingInput
										name={`position-effectiveDate-${index}`}
										label="Tanggal Efektif"
										type="date"
										value={row.effectiveDate}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												positions: prev.positions.map((item, itemIndex) =>
													itemIndex === index ? { ...item, effectiveDate: event.currentTarget.value } : item,
												),
											}))
										}
										errorText={getRowError(index, "effectiveDate")}
									/>
									<FloatingInput
										name={`position-endDate-${index}`}
										label="Tanggal Berakhir"
										type="date"
										value={row.endDate}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												positions: prev.positions.map((item, itemIndex) =>
													itemIndex === index ? { ...item, endDate: event.currentTarget.value } : item,
												),
											}))
										}
									/>
									<FloatingSelect
										name={`position-isPrimary-${index}`}
										label="Jabatan Utama"
										value={row.isPrimary ? "true" : "false"}
										onValueChange={(value) =>
											setForm((prev) => ({
												...prev,
												positions: prev.positions.map((item, itemIndex) =>
													itemIndex === index ? { ...item, isPrimary: value === "true" } : item,
												),
											}))
										}
										options={boolOptions()}
									/>
									<FloatingSelect
										name={`position-isCurrent-${index}`}
										label="Posisi Saat Ini"
										value={row.isCurrent ? "true" : "false"}
										onValueChange={(value) =>
											setForm((prev) => ({
												...prev,
												positions: prev.positions.map((item, itemIndex) =>
													itemIndex === index ? { ...item, isCurrent: value === "true" } : item,
												),
											}))
										}
										options={boolOptions()}
									/>
									<FloatingTextarea
										name={`position-note-${index}`}
										label="Catatan"
										value={row.note}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												positions: prev.positions.map((item, itemIndex) =>
													itemIndex === index ? { ...item, note: event.currentTarget.value } : item,
												),
											}))
										}
										containerClassName="md:col-span-3"
									/>
								</div>
							</div>
						))}

						<button
							type="button"
							onClick={() => setForm((prev) => ({ ...prev, positions: [...prev.positions, emptyPosition()] }))}
							className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
						>
							Tambah Penempatan
						</button>
					</div>
				)}

				{activeStep === "family" && (
					<div className="space-y-4">
						{form.families.map((row, index) => (
							<div key={`family-${index}`} className="rounded-lg border border-blue-100 p-4 dark:border-blue-900/60">
								<div className="mb-3 flex items-center justify-between">
									<h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Data Keluarga #{index + 1}</h4>
									<button
										type="button"
										onClick={() =>
											removeWithConfirm(() =>
												setForm((prev) => ({
													...prev,
													families: prev.families.filter((_, itemIndex) => itemIndex !== index),
												})),
											)
										}
										className="text-xs font-medium text-red-600 hover:underline"
									>
										Hapus
									</button>
								</div>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
									<FloatingInput
										name={`family-name-${index}`}
										label="Nama"
										value={row.name}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												families: prev.families.map((item, itemIndex) =>
													itemIndex === index ? { ...item, name: event.currentTarget.value } : item,
												),
											}))
										}
										errorText={getRowError(index, "name")}
									/>
									<FloatingSelect
										name={`family-relation-${index}`}
										label="Relasi"
										value={row.relation}
										onValueChange={(value) =>
											setForm((prev) => ({
												...prev,
												families: prev.families.map((item, itemIndex) =>
													itemIndex === index ? { ...item, relation: value } : item,
												),
											}))
										}
										options={referenceOptions.familyRelations}
									/>
									<FloatingSelect
										name={`family-gender-${index}`}
										label="Gender"
										value={row.gender}
										onValueChange={(value) =>
											setForm((prev) => ({
												...prev,
												families: prev.families.map((item, itemIndex) =>
													itemIndex === index ? { ...item, gender: value } : item,
												),
											}))
										}
										options={referenceOptions.genders}
									/>

									<FloatingInput
										name={`family-birthDate-${index}`}
										label="Tanggal Lahir"
										type="date"
										value={row.birthDate}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												families: prev.families.map((item, itemIndex) =>
													itemIndex === index ? { ...item, birthDate: event.currentTarget.value } : item,
												),
											}))
										}
									/>
									<FloatingInput
										name={`family-nationalId-${index}`}
										label="NIK"
										value={row.nationalId}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												families: prev.families.map((item, itemIndex) =>
													itemIndex === index ? { ...item, nationalId: event.currentTarget.value } : item,
												),
											}))
										}
									/>
									<FloatingInput
										name={`family-occupation-${index}`}
										label="Pekerjaan"
										value={row.occupation}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												families: prev.families.map((item, itemIndex) =>
													itemIndex === index ? { ...item, occupation: event.currentTarget.value } : item,
												),
											}))
										}
									/>

									<FloatingSelect
										name={`family-isDependent-${index}`}
										label="Tanggungan Pajak"
										value={row.isDependent ? "true" : "false"}
										onValueChange={(value) =>
											setForm((prev) => ({
												...prev,
												families: prev.families.map((item, itemIndex) =>
													itemIndex === index ? { ...item, isDependent: value === "true" } : item,
												),
											}))
										}
										options={boolOptions()}
									/>
									<FloatingSelect
										name={`family-isBpjsDependent-${index}`}
										label="Tanggungan BPJS"
										value={row.isBpjsDependent ? "true" : "false"}
										onValueChange={(value) =>
											setForm((prev) => ({
												...prev,
												families: prev.families.map((item, itemIndex) =>
													itemIndex === index ? { ...item, isBpjsDependent: value === "true" } : item,
												),
											}))
										}
										options={boolOptions()}
									/>
									<FloatingSelect
										name={`family-isHeir-${index}`}
										label="Ahli Waris"
										value={row.isHeir ? "true" : "false"}
										onValueChange={(value) =>
											setForm((prev) => ({
												...prev,
												families: prev.families.map((item, itemIndex) =>
													itemIndex === index ? { ...item, isHeir: value === "true" } : item,
												),
											}))
										}
										options={boolOptions()}
									/>
								</div>
							</div>
						))}

						<button
							type="button"
							onClick={() => setForm((prev) => ({ ...prev, families: [...prev.families, emptyFamily()] }))}
							className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
						>
							Tambah Keluarga
						</button>
					</div>
				)}

				{activeStep === "education" && (
					<div className="space-y-4">
						{form.educations.map((row, index) => (
							<div key={`education-${index}`} className="rounded-lg border border-blue-100 p-4 dark:border-blue-900/60">
								<div className="mb-3 flex items-center justify-between">
									<h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Pendidikan #{index + 1}</h4>
									<button
										type="button"
										onClick={() =>
											removeWithConfirm(() =>
												setForm((prev) => ({
													...prev,
													educations: prev.educations.filter((_, itemIndex) => itemIndex !== index),
												})),
											)
										}
										className="text-xs font-medium text-red-600 hover:underline"
									>
										Hapus
									</button>
								</div>
								<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
									<FloatingSelect
										name={`education-degree-${index}`}
										label="Jenjang"
										value={row.degree}
										onValueChange={(value) =>
											setForm((prev) => ({
												...prev,
												educations: prev.educations.map((item, itemIndex) =>
													itemIndex === index ? { ...item, degree: value } : item,
												),
											}))
										}
										options={referenceOptions.educationDegrees}
									/>
									<FloatingInput
										name={`education-institution-${index}`}
										label="Institusi"
										value={row.institution}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												educations: prev.educations.map((item, itemIndex) =>
													itemIndex === index ? { ...item, institution: event.currentTarget.value } : item,
												),
											}))
										}
										errorText={getRowError(index, "institution")}
									/>
									<FloatingInput
										name={`education-major-${index}`}
										label="Jurusan"
										value={row.major}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												educations: prev.educations.map((item, itemIndex) =>
													itemIndex === index ? { ...item, major: event.currentTarget.value } : item,
												),
											}))
										}
									/>
									<FloatingInput
										name={`education-startYear-${index}`}
										label="Tahun Masuk"
										type="number"
										value={row.startYear}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												educations: prev.educations.map((item, itemIndex) =>
													itemIndex === index ? { ...item, startYear: event.currentTarget.value } : item,
												),
											}))
										}
									/>
									<FloatingInput
										name={`education-graduationYear-${index}`}
										label="Tahun Lulus"
										type="number"
										value={row.graduationYear}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												educations: prev.educations.map((item, itemIndex) =>
													itemIndex === index ? { ...item, graduationYear: event.currentTarget.value } : item,
												),
											}))
										}
									/>
									<FloatingInput
										name={`education-gpa-${index}`}
										label="IPK"
										value={row.gpa}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												educations: prev.educations.map((item, itemIndex) =>
													itemIndex === index ? { ...item, gpa: event.currentTarget.value } : item,
												),
											}))
										}
									/>
									<FloatingInput
										name={`education-documentUrl-${index}`}
										label="URL Dokumen"
										value={row.documentUrl}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												educations: prev.educations.map((item, itemIndex) =>
													itemIndex === index ? { ...item, documentUrl: event.currentTarget.value } : item,
												),
											}))
										}
										containerClassName="md:col-span-2"
									/>
									<FloatingSelect
										name={`education-isHighest-${index}`}
										label="Pendidikan Tertinggi"
										value={row.isHighest ? "true" : "false"}
										onValueChange={(value) =>
											setForm((prev) => ({
												...prev,
												educations: prev.educations.map((item, itemIndex) =>
													itemIndex === index ? { ...item, isHighest: value === "true" } : item,
												),
											}))
										}
										options={boolOptions()}
									/>
								</div>
							</div>
						))}

						<button
							type="button"
							onClick={() => setForm((prev) => ({ ...prev, educations: [...prev.educations, emptyEducation()] }))}
							className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
						>
							Tambah Pendidikan
						</button>
					</div>
				)}

				{activeStep === "workHistory" && (
					<div className="space-y-4">
						{form.workHistories.map((row, index) => (
							<div key={`work-history-${index}`} className="rounded-lg border border-blue-100 p-4 dark:border-blue-900/60">
								<div className="mb-3 flex items-center justify-between">
									<h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Riwayat Kerja #{index + 1}</h4>
									<button
										type="button"
										onClick={() =>
											removeWithConfirm(() =>
												setForm((prev) => ({
													...prev,
													workHistories: prev.workHistories.filter((_, itemIndex) => itemIndex !== index),
												})),
											)
										}
										className="text-xs font-medium text-red-600 hover:underline"
									>
										Hapus
									</button>
								</div>
								<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
									<FloatingInput
										name={`work-companyName-${index}`}
										label="Nama Perusahaan"
										value={row.companyName}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												workHistories: prev.workHistories.map((item, itemIndex) =>
													itemIndex === index ? { ...item, companyName: event.currentTarget.value } : item,
												),
											}))
										}
										errorText={getRowError(index, "companyName")}
									/>
									<FloatingInput
										name={`work-position-${index}`}
										label="Posisi"
										value={row.position}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												workHistories: prev.workHistories.map((item, itemIndex) =>
													itemIndex === index ? { ...item, position: event.currentTarget.value } : item,
												),
											}))
										}
									/>
									<FloatingInput
										name={`work-lastSalary-${index}`}
										label="Gaji Terakhir"
										type="number"
										value={row.lastSalary}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												workHistories: prev.workHistories.map((item, itemIndex) =>
													itemIndex === index ? { ...item, lastSalary: event.currentTarget.value } : item,
												),
											}))
										}
									/>

									<FloatingInput
										name={`work-startDate-${index}`}
										label="Mulai Kerja"
										type="date"
										value={row.startDate}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												workHistories: prev.workHistories.map((item, itemIndex) =>
													itemIndex === index ? { ...item, startDate: event.currentTarget.value } : item,
												),
											}))
										}
									/>
									<FloatingInput
										name={`work-endDate-${index}`}
										label="Selesai Kerja"
										type="date"
										value={row.endDate}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												workHistories: prev.workHistories.map((item, itemIndex) =>
													itemIndex === index ? { ...item, endDate: event.currentTarget.value } : item,
												),
											}))
										}
									/>
									<FloatingInput
										name={`work-referencePhone-${index}`}
										label="No. Referensi"
										value={row.referencePhone}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												workHistories: prev.workHistories.map((item, itemIndex) =>
													itemIndex === index ? { ...item, referencePhone: event.currentTarget.value } : item,
												),
											}))
										}
									/>

									<FloatingTextarea
										name={`work-reasonLeaving-${index}`}
										label="Alasan Berhenti"
										value={row.reasonLeaving}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												workHistories: prev.workHistories.map((item, itemIndex) =>
													itemIndex === index ? { ...item, reasonLeaving: event.currentTarget.value } : item,
												),
											}))
										}
										containerClassName="md:col-span-3"
									/>
								</div>
							</div>
						))}

						<button
							type="button"
							onClick={() => setForm((prev) => ({ ...prev, workHistories: [...prev.workHistories, emptyWorkHistory()] }))}
							className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
						>
							Tambah Riwayat Kerja
						</button>
					</div>
				)}

				{activeStep === "bankAccount" && (
					<div className="space-y-4">
						{form.bankAccounts.map((row, index) => (
							<div key={`bank-${index}`} className="rounded-lg border border-blue-100 p-4 dark:border-blue-900/60">
								<div className="mb-3 flex items-center justify-between">
									<h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Rekening #{index + 1}</h4>
									<button
										type="button"
										onClick={() =>
											removeWithConfirm(() =>
												setForm((prev) => ({
													...prev,
													bankAccounts: prev.bankAccounts.filter((_, itemIndex) => itemIndex !== index),
												})),
											)
										}
										className="text-xs font-medium text-red-600 hover:underline"
									>
										Hapus
									</button>
								</div>
								<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
									<FloatingInput
										name={`bank-bankName-${index}`}
										label="Nama Bank"
										value={row.bankName}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												bankAccounts: prev.bankAccounts.map((item, itemIndex) =>
													itemIndex === index ? { ...item, bankName: event.currentTarget.value } : item,
												),
											}))
										}
										errorText={getRowError(index, "bankName")}
									/>
									<FloatingInput
										name={`bank-bankCode-${index}`}
										label="Kode Bank"
										value={row.bankCode}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												bankAccounts: prev.bankAccounts.map((item, itemIndex) =>
													itemIndex === index ? { ...item, bankCode: event.currentTarget.value } : item,
												),
											}))
										}
									/>
									<FloatingSelect
										name={`bank-isPrimary-${index}`}
										label="Rekening Utama"
										value={row.isPrimary ? "true" : "false"}
										onValueChange={(value) =>
											setForm((prev) => ({
												...prev,
												bankAccounts: prev.bankAccounts.map((item, itemIndex) =>
													itemIndex === index ? { ...item, isPrimary: value === "true" } : item,
												),
											}))
										}
										options={boolOptions()}
									/>

									<FloatingInput
										name={`bank-accountNumber-${index}`}
										label="Nomor Rekening"
										value={row.accountNumber}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												bankAccounts: prev.bankAccounts.map((item, itemIndex) =>
													itemIndex === index ? { ...item, accountNumber: event.currentTarget.value } : item,
												),
											}))
										}
										errorText={getRowError(index, "accountNumber")}
									/>
									<FloatingInput
										name={`bank-accountName-${index}`}
										label="Nama Pemilik"
										value={row.accountName}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												bankAccounts: prev.bankAccounts.map((item, itemIndex) =>
													itemIndex === index ? { ...item, accountName: event.currentTarget.value } : item,
												),
											}))
										}
										errorText={getRowError(index, "accountName")}
									/>
								</div>
							</div>
						))}

						<button
							type="button"
							onClick={() => setForm((prev) => ({ ...prev, bankAccounts: [...prev.bankAccounts, emptyBankAccount()] }))}
							className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
						>
							Tambah Rekening
						</button>
					</div>
				)}

				{activeStep === "bpjs" && (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<FloatingInput
							name="bpjsHealthNumber"
							label="No BPJS Kesehatan"
							value={form.bpjs.bpjsHealthNumber}
							onChange={(event) => setForm((prev) => ({ ...prev, bpjs: { ...prev.bpjs, bpjsHealthNumber: event.currentTarget.value } }))}
						/>
						<FloatingInput
							name="bpjsHealthClass"
							label="Kelas BPJS Kesehatan"
							type="number"
							value={form.bpjs.bpjsHealthClass}
							onChange={(event) => setForm((prev) => ({ ...prev, bpjs: { ...prev.bpjs, bpjsHealthClass: event.currentTarget.value } }))}
						/>
						<FloatingInput
							name="bpjsHealthDate"
							label="Tanggal Aktif BPJS Kesehatan"
							type="date"
							value={form.bpjs.bpjsHealthDate}
							onChange={(event) => setForm((prev) => ({ ...prev, bpjs: { ...prev.bpjs, bpjsHealthDate: event.currentTarget.value } }))}
						/>

						<FloatingInput
							name="bpjsTkNumber"
							label="No KPJ"
							value={form.bpjs.bpjsTkNumber}
							onChange={(event) => setForm((prev) => ({ ...prev, bpjs: { ...prev.bpjs, bpjsTkNumber: event.currentTarget.value } }))}
						/>
						<FloatingInput
							name="bpjsJhtDate"
							label="Tanggal Aktif JHT"
							type="date"
							value={form.bpjs.bpjsJhtDate}
							onChange={(event) => setForm((prev) => ({ ...prev, bpjs: { ...prev.bpjs, bpjsJhtDate: event.currentTarget.value } }))}
						/>
						<FloatingInput
							name="bpjsJpDate"
							label="Tanggal Aktif JP"
							type="date"
							value={form.bpjs.bpjsJpDate}
							onChange={(event) => setForm((prev) => ({ ...prev, bpjs: { ...prev.bpjs, bpjsJpDate: event.currentTarget.value } }))}
						/>

						<FloatingInput
							name="bpjsJkkDate"
							label="Tanggal Aktif JKK"
							type="date"
							value={form.bpjs.bpjsJkkDate}
							onChange={(event) => setForm((prev) => ({ ...prev, bpjs: { ...prev.bpjs, bpjsJkkDate: event.currentTarget.value } }))}
						/>
						<FloatingInput
							name="bpjsJkmDate"
							label="Tanggal Aktif JKM"
							type="date"
							value={form.bpjs.bpjsJkmDate}
							onChange={(event) => setForm((prev) => ({ ...prev, bpjs: { ...prev.bpjs, bpjsJkmDate: event.currentTarget.value } }))}
						/>
					</div>
				)}

				{activeStep === "document" && (
					<div className="space-y-4">
						{form.documents.map((row, index) => (
							<div key={`document-${index}`} className="rounded-lg border border-blue-100 p-4 dark:border-blue-900/60">
								<div className="mb-3 flex items-center justify-between">
									<h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Dokumen #{index + 1}</h4>
									<button
										type="button"
										onClick={() =>
											removeWithConfirm(() =>
												setForm((prev) => ({
													...prev,
													documents: prev.documents.filter((_, itemIndex) => itemIndex !== index),
												})),
											)
										}
										className="text-xs font-medium text-red-600 hover:underline"
									>
										Hapus
									</button>
								</div>
								<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
									<FloatingSelect
										name={`document-type-${index}`}
										label="Tipe Dokumen"
										value={row.documentType}
										onValueChange={(value) =>
											setForm((prev) => ({
												...prev,
												documents: prev.documents.map((item, itemIndex) =>
													itemIndex === index ? { ...item, documentType: value } : item,
												),
											}))
										}
										options={referenceOptions.documentTypes}
									/>
									<FloatingInput
										name={`document-name-${index}`}
										label="Nama Dokumen"
										value={row.name}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												documents: prev.documents.map((item, itemIndex) =>
													itemIndex === index ? { ...item, name: event.currentTarget.value } : item,
												),
											}))
										}
										errorText={getRowError(index, "name")}
									/>
									<FloatingInput
										name={`document-fileUrl-${index}`}
										label="URL File"
										value={row.fileUrl}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												documents: prev.documents.map((item, itemIndex) =>
													itemIndex === index ? { ...item, fileUrl: event.currentTarget.value } : item,
												),
											}))
										}
										errorText={getRowError(index, "fileUrl")}
									/>

									<FloatingInput
										name={`document-fileSize-${index}`}
										label="Ukuran File (bytes)"
										type="number"
										value={row.fileSize}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												documents: prev.documents.map((item, itemIndex) =>
													itemIndex === index ? { ...item, fileSize: event.currentTarget.value } : item,
												),
											}))
										}
									/>
									<FloatingInput
										name={`document-mimeType-${index}`}
										label="MIME Type"
										value={row.mimeType}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												documents: prev.documents.map((item, itemIndex) =>
													itemIndex === index ? { ...item, mimeType: event.currentTarget.value } : item,
												),
											}))
										}
									/>
									<FloatingInput
										name={`document-expiredAt-${index}`}
										label="Tanggal Kadaluarsa"
										type="date"
										value={row.expiredAt}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												documents: prev.documents.map((item, itemIndex) =>
													itemIndex === index ? { ...item, expiredAt: event.currentTarget.value } : item,
												),
											}))
										}
									/>

									<FloatingInput
										name={`document-uploadedAt-${index}`}
										label="Tanggal Upload"
										type="date"
										value={row.uploadedAt}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												documents: prev.documents.map((item, itemIndex) =>
													itemIndex === index ? { ...item, uploadedAt: event.currentTarget.value } : item,
												),
											}))
										}
									/>
									<FloatingTextarea
										name={`document-note-${index}`}
										label="Catatan"
										value={row.note}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												documents: prev.documents.map((item, itemIndex) =>
													itemIndex === index ? { ...item, note: event.currentTarget.value } : item,
												),
											}))
										}
										containerClassName="md:col-span-3"
									/>
								</div>
							</div>
						))}

						<button
							type="button"
							onClick={() => setForm((prev) => ({ ...prev, documents: [...prev.documents, emptyDocument()] }))}
							className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
						>
							Tambah Dokumen
						</button>
					</div>
				)}

				<div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 pt-4 dark:border-blue-900/60">
					<button
						type="button"
						disabled={activeStepIndex === 0 || isPending}
						onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
						className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
					>
						Sebelumnya
					</button>

					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							disabled={isPending}
							onClick={() => saveCurrentStep(false)}
							className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-blue-900/70 dark:bg-blue-900/30 dark:text-blue-100"
						>
							{isPending ? "Menyimpan..." : "Simpan Tahap Ini"}
						</button>
						<button
							type="button"
							disabled={isPending || activeStepIndex === EMPLOYEE_WIZARD_STEPS.length - 1}
							onClick={() => saveCurrentStep(true)}
							className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
						>
							Simpan & Lanjut
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
