"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import FloatingTextarea from "@/src/components/ui/floating-input/textarea";
import { AddButton, EditButton } from "@/src/components/ui/button";
import { submitJobGradeAction } from "../actions/job-grade.actions";
import type {
	JobGradeActionResult,
	JobGradeFormValues,
	JobGradeOption,
} from "../types/job-grade.type";

const EMPTY_FORM: JobGradeFormValues = {
	id: "",
	nama: "",
	kode: null,
	deskripsi: null,
};

function SubmitButton({ hasId }: { hasId: boolean }) {
	const { pending } = useFormStatus();

	return (
		<AddButton type="submit" disabled={pending} withIcon={false}>
			{pending ? "Menyimpan..." : hasId ? "Update Grade" : "Simpan Grade"}
		</AddButton>
	);
}

type JobGradeFormProps = {
	grades: JobGradeOption[];
};

function toGradeLabel(grade: JobGradeOption) {
	const kodeSuffix = grade.kode ? ` (${grade.kode})` : "";
	return `${grade.nama}${kodeSuffix}`;
}

function toFormValues(grade?: JobGradeOption): JobGradeFormValues {
	if (!grade) return EMPTY_FORM;

	return {
		id: grade.id,
		nama: grade.nama,
		kode: grade.kode,
		deskripsi: grade.deskripsi,
	};
}

export default function JobGradeForm({ grades }: JobGradeFormProps) {
	const [state, formAction] = useActionState<JobGradeActionResult | null, FormData>(submitJobGradeAction, null);
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [selectedGradeId, setSelectedGradeId] = useState("");

	const selectedGrade = useMemo(
		() => grades.find((item) => item.id === selectedGradeId),
		[grades, selectedGradeId],
	);

	const [formValues, setFormValues] = useState<JobGradeFormValues>(() => toFormValues(selectedGrade));

	useEffect(() => {
		setFormValues(toFormValues(selectedGrade));
	}, [selectedGrade]);

	const gradeSelectOptions = useMemo(
		() => grades.map((item) => ({ label: toGradeLabel(item), value: item.id })),
		[grades],
	);

	useEffect(() => {
		if (!state || state.success || !state.errors) return;

		const orderedFields = ["nama", "kode", "deskripsi"] as const;

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
		if (!state) return;

		if (state.success) {
			toast.success(state.message || "Data golongan posisi berhasil disimpan.");
			if (state.id) setSelectedGradeId(state.id);
		} else {
			toast.error(state.message || "Gagal menyimpan data golongan posisi.");
		}
	}, [state]);

	useEffect(() => {
		if (state?.success) {
			router.refresh();
		}
	}, [state, router]);

	return (
		<form ref={formRef} action={formAction} className="mt-4">
			<div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-blue-100 p-3 dark:border-blue-900/60">
				<div className="flex-1">
					<FloatingSelect
						name="selectedGrade"
						label="Pilih Grade (Edit)"
						value={selectedGradeId}
						onValueChange={(nextValue) => setSelectedGradeId(nextValue)}
						options={gradeSelectOptions}
						placeholder="Buat grade baru"
						searchable
					/>
				</div>
				<EditButton type="button" onClick={() => setSelectedGradeId("")} withIcon={false}>
					Buat Baru
				</EditButton>
			</div>

			<input type="hidden" name="id" value={formValues.id ?? ""} readOnly />

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<FloatingInput
					name="nama"
					label="Nama Grade"
					value={formValues.nama}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || "";
						setFormValues((prev) => ({ ...prev, nama: nextValue }));
					}}
					errorText={state?.errors?.nama}
					required
				/>
				<FloatingInput
					name="kode"
					label="Kode"
					value={formValues.kode ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, kode: nextValue }));
					}}
					errorText={state?.errors?.kode}
				/>

				<FloatingTextarea
					name="deskripsi"
					label="Deskripsi"
					value={formValues.deskripsi ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, deskripsi: nextValue }));
					}}
					errorText={state?.errors?.deskripsi}
					containerClassName="md:col-span-3"
				/>
			</div>

			<div className="mt-4 flex items-center justify-end gap-4">
				<SubmitButton hasId={Boolean(formValues.id)} />
			</div>

			<div className="mt-6 rounded-xl border border-blue-100 dark:border-blue-900/60">
				<div className="border-b border-blue-100 px-4 py-3 dark:border-blue-900/60">
					<h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Daftar Golongan Posisi</h3>
					<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Klik Edit untuk memuat data ke form di atas.</p>
				</div>

				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Nama</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Kode</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Deskripsi</th>
								<th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-100">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{grades.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
										Belum ada golongan posisi.
									</td>
								</tr>
							) : (
								grades.map((grade) => (
									<tr
										key={grade.id}
										className={`border-b border-blue-100 dark:border-blue-900/60 ${selectedGradeId === grade.id ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}
									>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{grade.nama}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{grade.kode ?? "-"}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{grade.deskripsi ?? "-"}</td>
										<td className="px-4 py-3 text-right">
												<EditButton
													type="button"
													size="xs"
													withIcon={false}
													onClick={() => {
														setSelectedGradeId(grade.id);
														formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
													}}
												>
													Edit
												</EditButton>
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
