"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import FloatingTextarea from "@/src/components/ui/floating-input/textarea";
import { submitJobGradeAction } from "../actions/job-grade.actions";
import type { JobGradeActionResult, JobGradeFormValues, JobGradeOption } from "../types/job-grade.type";

const EMPTY_FORM: JobGradeFormValues = {
	id: "",
	name: "",
	code: null,
	level: 0,
	minSalary: null,
	maxSalary: null,
	description: null,
};

function SubmitButton({ hasId }: { hasId: boolean }) {
	const { pending } = useFormStatus();

	return (
		<button
			type="submit"
			disabled={pending}
			className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
		>
			{pending ? "Menyimpan..." : hasId ? "Update Job Grade" : "Simpan Job Grade"}
		</button>
	);
}

type JobGradeFormProps = {
	grades: JobGradeOption[];
};

function toGradeLabel(grade: JobGradeOption) {
	const codeSuffix = grade.code ? ` (${grade.code})` : "";
	return `Level ${grade.level} - ${grade.name}${codeSuffix}`;
}

function toFormValues(grade?: JobGradeOption): JobGradeFormValues {
	if (!grade) return EMPTY_FORM;

	return {
		id: grade.id,
		name: grade.name,
		code: grade.code,
		level: grade.level,
		minSalary: grade.minSalary,
		maxSalary: grade.maxSalary,
		description: grade.description,
	};
}

function formatCurrency(value: string | null) {
	if (!value) return "-";
	const numberValue = Number.parseFloat(value);
	if (Number.isNaN(numberValue)) return value;
	return `Rp ${new Intl.NumberFormat("id-ID").format(numberValue)}`;
}

export default function JobGradeForm({ grades }: JobGradeFormProps) {
	const [state, formAction] = useActionState<JobGradeActionResult | null, FormData>(submitJobGradeAction, null);
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [selectedGradeId, setSelectedGradeId] = useState("");

	const selectedGrade = useMemo(() => grades.find((item) => item.id === selectedGradeId), [grades, selectedGradeId]);
	const [formValues, setFormValues] = useState<JobGradeFormValues>(() => toFormValues(selectedGrade));

	const gradeSelectOptions = useMemo(
		() => grades.map((item) => ({ label: toGradeLabel(item), value: item.id })),
		[grades],
	);

	const sortedRows = useMemo(
		() => [...grades].sort((left, right) => left.level - right.level || left.name.localeCompare(right.name)),
		[grades],
	);

	useEffect(() => {
		setFormValues(toFormValues(selectedGrade));
	}, [selectedGrade]);

	useEffect(() => {
		if (!state || state.success || !state.errors) return;

		const orderedFields = ["name", "code", "level", "minSalary", "maxSalary", "description"] as const;

		for (const field of orderedFields) {
			if (!state.errors[field]) continue;

			const namedField = formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`);
			if (namedField && namedField.tabIndex !== -1 && namedField.getAttribute("aria-hidden") !== "true") {
				namedField.scrollIntoView({ behavior: "smooth", block: "center" });
				namedField.focus({ preventScroll: true });
				return;
			}

			const selectTrigger = formRef.current?.querySelector<HTMLElement>(`[data-select-trigger-for="${field}"]`);
			if (selectTrigger) {
				selectTrigger.scrollIntoView({ behavior: "smooth", block: "center" });
				selectTrigger.focus({ preventScroll: true });
				return;
			}
		}
	}, [state]);

	useEffect(() => {
		if (!state?.success) return;

		toast.success(state.message || "Data job grade berhasil disimpan.");
		if (state.id) setSelectedGradeId(state.id);
		router.refresh();
	}, [router, state]);

	return (
		<form ref={formRef} action={formAction} className="mt-4">
			<div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-blue-100 p-3 dark:border-blue-900/60">
				<div className="flex-1">
					<FloatingSelect
						name="selectedGrade"
						label="Pilih Job Grade (Edit)"
						value={selectedGradeId}
						onValueChange={(nextValue) => setSelectedGradeId(nextValue)}
						options={gradeSelectOptions}
						placeholder="Buat job grade baru"
						searchable
					/>
				</div>
				<button
					type="button"
					onClick={() => setSelectedGradeId("")}
					className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
				>
					Buat Baru
				</button>
			</div>

			<input type="hidden" name="id" value={formValues.id ?? ""} readOnly />

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<FloatingInput
					name="name"
					label="Nama Job Grade"
					value={formValues.name}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || "";
						setFormValues((prev) => ({ ...prev, name: nextValue }));
					}}
					errorText={state?.errors?.name}
					required
				/>
				<FloatingInput
					name="code"
					label="Kode"
					value={formValues.code ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, code: nextValue }));
					}}
					errorText={state?.errors?.code}
				/>
				<FloatingInput
					name="level"
					label="Level"
					type="number"
					min={0}
					value={String(formValues.level)}
					onChange={(event) => {
						const parsed = Number.parseInt(event.currentTarget.value || "0", 10);
						setFormValues((prev) => ({ ...prev, level: Number.isNaN(parsed) ? 0 : parsed }));
					}}
					errorText={state?.errors?.level}
					required
				/>

				<FloatingInput
					name="minSalary"
					label="Gaji Minimum"
					value={formValues.minSalary ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, minSalary: nextValue }));
					}}
					errorText={state?.errors?.minSalary}
				/>
				<FloatingInput
					name="maxSalary"
					label="Gaji Maksimum"
					value={formValues.maxSalary ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, maxSalary: nextValue }));
					}}
					errorText={state?.errors?.maxSalary}
				/>
				<FloatingTextarea
					name="description"
					label="Deskripsi"
					value={formValues.description ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, description: nextValue }));
					}}
					errorText={state?.errors?.description}
				/>
			</div>

			<div className="mt-4 flex items-center justify-end gap-4">
				<SubmitButton hasId={Boolean(formValues.id)} />
			</div>

			<div className="mt-6 rounded-xl border border-blue-100 dark:border-blue-900/60">
				<div className="border-b border-blue-100 px-4 py-3 dark:border-blue-900/60">
					<h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Daftar Job Grade</h3>
					<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Klik Edit untuk memuat data ke form di atas.</p>
				</div>

				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Nama</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Kode</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Level</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Range Gaji</th>
								<th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-100">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{sortedRows.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
										Belum ada job grade.
									</td>
								</tr>
							) : (
								sortedRows.map((grade) => (
									<tr
										key={grade.id}
										className={`border-b border-blue-100 dark:border-blue-900/60 ${selectedGradeId === grade.id ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}
									>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{grade.name}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{grade.code ?? "-"}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{grade.level}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">
											{`${formatCurrency(grade.minSalary)} - ${formatCurrency(grade.maxSalary)}`}
										</td>
										<td className="px-4 py-3 text-right">
											<button
												type="button"
												onClick={() => {
													setSelectedGradeId(grade.id);
													formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
												}}
												className="inline-flex h-8 items-center justify-center rounded-lg border border-blue-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
											>
												Edit
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</form>
	);
}