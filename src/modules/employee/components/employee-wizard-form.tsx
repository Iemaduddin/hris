"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { getEmployeeWizardDetailAction, saveEmployeeWizardStepAction } from "../actions/employee.actions";
import {
	EMPLOYEE_WIZARD_STEPS,
	type EmployeeEducationPayload,
	type EmployeeWizardDetail,
	type EmployeeWizardReferenceOptions,
	type EmployeeWizardStepKey,
	type EmployeeWizardSummary,
} from "../types/employee.type";
import PersonalStep from "./personal-step";
import PositionStep from "./position-step";
import FamilyStep from "./family-step";
import EducationStep from "./education-step";
import WorkHistoryStep from "./work-history-step";
import KontrakStep from "./contract-step";

type EmployeeWizardFormProps = {
	summaries: EmployeeWizardSummary[];
	referenceOptions: EmployeeWizardReferenceOptions;
	selectedEmployeeId?: string;
	loadKey?: number;
	onResetSelection?: () => void;
};

const STEP_LABELS: Record<EmployeeWizardStepKey, string> = {
	personal: "1. Data Pribadi",
	position: "2. Penempatan",
	family: "3. Keluarga",
	education: "4. Pendidikan",
	workHistory: "5. Riwayat Kerja",
	kontrak: "6. Kontrak",
};

function emptyWizardDetail(): EmployeeWizardDetail {
	const today = new Date().toISOString().split("T")[0];
	return {
		employeeId: "",
		personal: {
			id: "",
			userId: "",
			directSupervisorId: "",
			employeeNumber: "",
			fullName: "",
			gender: "LAKI_LAKI",
			birthDate: "",
			nationalId: "",
			taxId: "",
			ptkpStatus: "TK_0",
			bankNama: "",
			bankNorek: "",
			bankAtasNama: "",
			workEmail: "",
			phone: "",
			address: "",
			status: "AKTIF",
			joinDate: today,
			resignDate: "",
		},
		positions: [{
			organizationalUnitId: "",
			positionId: "",
			workLocationId: "",
			isPrimary: true,
			isCurrent: true,
			effectiveDate: today,
			note: "",
		}],
		families: [],
		educations: [],
		workHistories: [],
		kontrak: [],
	};
}

export default function EmployeeWizardForm({ summaries, referenceOptions, selectedEmployeeId: externalSelectedId, loadKey, onResetSelection }: EmployeeWizardFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [activeStepIndex, setActiveStepIndex] = useState(0);
	const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
	const [errorMap, setErrorMap] = useState<Record<string, string>>({});
	const [summaryItems, setSummaryItems] = useState<EmployeeWizardSummary[]>(summaries);
	const [form, setForm] = useState<EmployeeWizardDetail>(emptyWizardDetail());
	const pendingFilesRef = useRef<Map<string, File>>(new Map());

	const activeStep = EMPLOYEE_WIZARD_STEPS[activeStepIndex];

	useEffect(() => {
		if (externalSelectedId) {
			loadEmployee(externalSelectedId);
		}
	}, [loadKey]);

	function handleFileReady(index: number, field: "ijazah" | "transkrip", file: File) {
		pendingFilesRef.current.set(`${index}-${field}`, file);
	}

	function handleFileDelete(index: number, field: "ijazah" | "transkrip") {
		pendingFilesRef.current.delete(`${index}-${field}`);
	}

	function getStepPayload(step: EmployeeWizardStepKey) {
		if (step === "personal") return form.personal;
		if (step === "position") return form.positions;
		if (step === "family") return form.families;
		if (step === "education") return form.educations;
		if (step === "workHistory") return form.workHistories;
		return form.kontrak;
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
				toast.error(result.message || "Gagal memuat karyawan.");
				return;
			}

			setForm({
				...result.data,
				positions: result.data.positions.length ? result.data.positions : [{
					organizationalUnitId: "",
					positionId: "",
					workLocationId: "",
					isPrimary: true,
					isCurrent: true,
					effectiveDate: new Date().toISOString().split("T")[0],
					note: "",
				}],
			});
			setSelectedEmployeeId(employeeId);
			setActiveStepIndex(0);
			toast.success(employeeId ? "Draft karyawan dimuat." : "Form karyawan baru siap.");
		});
	}

	async function uploadPendingFiles(): Promise<Record<string, string>> {
		const urls: Record<string, string> = {};

		for (const [key, file] of pendingFilesRef.current) {
			const [indexStr, field] = key.split("-");
			const index = parseInt(indexStr);
			const educations = form.educations;
			const grade = educations[index]?.degree || "Tidak Diketahui";

			const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
			const customFileName = `${baseName}_${field}_${grade}`;

			const formData = new FormData();
			formData.append("file", file);
			formData.append("ownerType", "karyawan");
			formData.append("ownerId", form.employeeId);
			formData.append("subfolder", "dokumen");
			formData.append("fileName", customFileName);
			formData.append("jenis", field);

			try {
				const res = await fetch("/api/files", { method: "POST", body: formData });
				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || "Gagal upload file");
				}

				urls[key] = data.url;
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Gagal upload file.");
				throw err;
			}
		}

		return urls;
	}

	function saveCurrentStep(moveNext: boolean) {
		setErrorMap({});
		startTransition(async () => {
			try {
				let payload = getStepPayload(activeStep);

				if (activeStep === "education" && pendingFilesRef.current.size > 0) {
					const uploadedUrls = await uploadPendingFiles();
					const educations = [...(payload as EmployeeEducationPayload[])];

					for (const [key, url] of Object.entries(uploadedUrls)) {
						const [indexStr, field] = key.split("-");
						const index = parseInt(indexStr);
						if (educations[index]) {
							educations[index] = { ...educations[index], [field]: url };
						}
					}

					payload = educations;
					pendingFilesRef.current.clear();

					setForm((prev) => ({ ...prev, educations }));
				}

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

				if (result.employeeNumber) {
					setForm((prev) => ({
						...prev,
						personal: {
							...prev.personal,
							employeeNumber: result.employeeNumber ?? prev.personal.employeeNumber,
						},
					}));
				}

				upsertSummary();
				router.refresh();
				toast.success(result.message || "Tahap berhasil disimpan.");

				if (moveNext && activeStepIndex < EMPLOYEE_WIZARD_STEPS.length - 1) {
					setActiveStepIndex((prev) => prev + 1);
				}
			} catch {
				// Error sudah ditampilkan via toast di uploadPendingFiles
			}
		});
	}

	function handleStepChange(step: EmployeeWizardStepKey, updater: (prev: never) => never) {
		setForm((prev) => {
			const key = step === "personal" ? "personal"
				: step === "position" ? "positions"
				: step === "family" ? "families"
				: step === "education" ? "educations"
				: step === "workHistory" ? "workHistories"
				: "kontrak";
			return { ...prev, [key]: updater(prev[key] as never) };
		});
	}

	return (
		<div className="mt-4 space-y-5">
			<div className="rounded-xl border border-blue-100 p-4 dark:border-blue-900/60">
				<div className="flex items-center justify-between">
					<p className="text-xs text-slate-500 dark:text-slate-400">
						Setiap tahap dapat disimpan terpisah. Anda bisa menutup halaman dan melanjutkan lagi nanti.
					</p>
					<button
						type="button"
						onClick={() => {
							loadEmployee("");
							onResetSelection?.();
						}}
						className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
					>
						Buat Draft Baru
					</button>
				</div>
			</div>

			<div className="rounded-xl border border-blue-100 p-4 dark:border-blue-900/60">
				<div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
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
						<p className="text-xs text-slate-500 dark:text-slate-400">
							{form.personal.fullName && form.personal.employeeNumber
								? `${form.personal.fullName} - ${form.personal.employeeNumber}`
								: form.personal.fullName
									? form.personal.fullName
									: "Karyawan baru"}
						</p>
					</div>
				</div>

				{activeStep === "personal" && (
					<PersonalStep
						value={form.personal}
						onChange={(updater) => handleStepChange("personal", updater as never)}
						errorMap={errorMap}
						referenceOptions={referenceOptions}
					/>
				)}

				{activeStep === "position" && (
					<PositionStep
						value={form.positions}
						onChange={(updater) => handleStepChange("position", updater as never)}
						errorMap={errorMap}
						referenceOptions={referenceOptions}
						isPending={isPending}
					/>
				)}

				{activeStep === "family" && (
					<FamilyStep
						value={form.families}
						onChange={(updater) => handleStepChange("family", updater as never)}
						errorMap={errorMap}
						referenceOptions={referenceOptions}
					/>
				)}

				{activeStep === "education" && (
					<EducationStep
						value={form.educations}
						onChange={(updater) => handleStepChange("education", updater as never)}
						errorMap={errorMap}
						referenceOptions={referenceOptions}
						employeeName={form.personal.fullName || "Karyawan Baru"}
						onFileReady={handleFileReady}
						onFileDelete={handleFileDelete}
					/>
				)}

				{activeStep === "workHistory" && (
					<WorkHistoryStep
						value={form.workHistories}
						onChange={(updater) => handleStepChange("workHistory", updater as never)}
						errorMap={errorMap}
						referenceOptions={referenceOptions}
					/>
				)}

				{activeStep === "kontrak" && (
					<KontrakStep
						value={form.kontrak}
						onChange={(updater) => handleStepChange("kontrak", updater as never)}
						errorMap={errorMap}
						referenceOptions={referenceOptions}
					/>
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
