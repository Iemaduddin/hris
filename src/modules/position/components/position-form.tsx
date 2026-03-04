"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import FloatingTextarea from "@/src/components/ui/floating-input/textarea";
import { submitPositionAction } from "../actions/position.actions";
import type {
	PositionActionResult,
	PositionFormOptions,
	PositionFormValues,
	PositionOption,
	PositionSelectOption,
} from "../types/position.type";

const EMPTY_FORM: PositionFormValues = {
	id: "",
	organizationalUnitId: null,
	jobGradeId: null,
	name: "",
	code: null,
	description: null,
	isActive: true,
};

function SubmitButton({ hasId }: { hasId: boolean }) {
	const { pending } = useFormStatus();

	return (
		<button
			type="submit"
			disabled={pending}
			className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
		>
			{pending ? "Menyimpan..." : hasId ? "Update Position" : "Simpan Position"}
		</button>
	);
}

type PositionFormProps = {
	positions: PositionOption[];
	formOptions: PositionFormOptions;
};

function toPositionLabel(position: PositionOption) {
	const codeSuffix = position.code ? ` (${position.code})` : "";
	return `${position.name}${codeSuffix}`;
}

function toUnitLabel(unit: PositionSelectOption) {
	const codeSuffix = unit.code ? ` (${unit.code})` : "";
	const indent = "— ".repeat(Math.max(unit.level ?? 0, 0));
	return `${indent}${unit.name}${codeSuffix}`;
}

function toGradeLabel(grade: PositionSelectOption) {
	const codeSuffix = grade.code ? ` (${grade.code})` : "";
	return `${grade.name}${codeSuffix}`;
}

function toFormValues(position?: PositionOption): PositionFormValues {
	if (!position) return EMPTY_FORM;

	return {
		id: position.id,
		organizationalUnitId: position.organizationalUnitId,
		jobGradeId: position.jobGradeId,
		name: position.name,
		code: position.code,
		description: position.description,
		isActive: position.isActive,
	};
}

export default function PositionForm({ positions, formOptions }: PositionFormProps) {
	const [state, formAction] = useActionState<PositionActionResult | null, FormData>(submitPositionAction, null);
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [selectedPositionId, setSelectedPositionId] = useState("");

	const selectedPosition = useMemo(
		() => positions.find((item) => item.id === selectedPositionId),
		[positions, selectedPositionId],
	);

	const [formValues, setFormValues] = useState<PositionFormValues>(() => toFormValues(selectedPosition));

	useEffect(() => {
		setFormValues(toFormValues(selectedPosition));
	}, [selectedPosition]);

	const positionSelectOptions = useMemo(
		() => positions.map((item) => ({ label: toPositionLabel(item), value: item.id })),
		[positions],
	);

	const organizationalUnitOptions = useMemo(
		() => formOptions.organizationalUnits.map((item) => ({ label: toUnitLabel(item), value: item.id })),
		[formOptions.organizationalUnits],
	);

	const jobGradeOptions = useMemo(
		() => formOptions.jobGrades.map((item) => ({ label: toGradeLabel(item), value: item.id })),
		[formOptions.jobGrades],
	);

	useEffect(() => {
		if (!state || state.success || !state.errors) return;

		const orderedFields = ["name", "code", "organizationalUnitId", "jobGradeId", "description"] as const;

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

		toast.success(state.message || "Data position berhasil disimpan.");
		if (state.id) setSelectedPositionId(state.id);
		router.refresh();
	}, [router, state]);

	return (
		<form ref={formRef} action={formAction} className="mt-4">
			<div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-blue-100 p-3 dark:border-blue-900/60">
				<div className="flex-1">
					<FloatingSelect
						name="selectedPosition"
						label="Pilih Position (Edit)"
						value={selectedPositionId}
						onValueChange={(nextValue) => setSelectedPositionId(nextValue)}
						options={positionSelectOptions}
						placeholder="Buat position baru"
						searchable
					/>
				</div>
				<button
					type="button"
					onClick={() => setSelectedPositionId("")}
					className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
				>
					Buat Baru
				</button>
			</div>

			<input type="hidden" name="id" value={formValues.id ?? ""} readOnly />

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<FloatingInput
					name="name"
					label="Nama Position"
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
				<FloatingSelect
					name="isActive"
					label="Status"
					value={formValues.isActive ? "true" : "false"}
					onValueChange={(nextValue) => setFormValues((prev) => ({ ...prev, isActive: nextValue !== "false" }))}
					options={[
						{ label: "Aktif", value: "true" },
						{ label: "Tidak Aktif", value: "false" },
					]}
					errorText={state?.errors?.isActive}
				/>

				<FloatingSelect
					name="organizationalUnitId"
					label="Unit Organisasi"
					value={formValues.organizationalUnitId ?? ""}
					onValueChange={(nextValue) => setFormValues((prev) => ({ ...prev, organizationalUnitId: nextValue || null }))}
					options={organizationalUnitOptions}
					errorText={state?.errors?.organizationalUnitId}
					placeholder="Tanpa unit"
					searchable
				/>
				<FloatingSelect
					name="jobGradeId"
					label="Job Grade"
					value={formValues.jobGradeId ?? ""}
					onValueChange={(nextValue) => setFormValues((prev) => ({ ...prev, jobGradeId: nextValue || null }))}
					options={jobGradeOptions}
					errorText={state?.errors?.jobGradeId}
					placeholder="Tanpa grade"
					searchable
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
					<h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Daftar Position</h3>
					<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Klik Edit untuk memuat data ke form di atas.</p>
				</div>

				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Nama</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Kode</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Unit</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Grade</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Status</th>
								<th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-100">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{positions.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
										Belum ada position.
									</td>
								</tr>
							) : (
								positions.map((position) => (
									<tr
										key={position.id}
										className={`border-b border-blue-100 dark:border-blue-900/60 ${selectedPositionId === position.id ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}
									>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{position.name}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{position.code ?? "-"}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{position.organizationalUnitName ?? "-"}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{position.jobGradeName ?? "-"}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{position.isActive ? "Aktif" : "Tidak Aktif"}</td>
										<td className="px-4 py-3 text-right">
											<button
												type="button"
												onClick={() => {
													setSelectedPositionId(position.id);
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