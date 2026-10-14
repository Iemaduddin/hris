"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import FloatingTextarea from "@/src/components/ui/floating-input/textarea";
import { AddButton, EditButton } from "@/src/components/ui/button";
import { submitPositionAction } from "../actions/position.actions";
import type {
	PositionActionResult,
	PositionFormOptions,
	PositionFormValues,
	PositionOption,
	PositionSelectOption,
} from "../types/position.type";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

const EMPTY_FORM: PositionFormValues = {
	id: "",
	unitOrganisasiId: null,
	golonganPosisiId: null,
	nama: "",
	kode: null,
	deskripsi: null,
};

function SubmitButton({ hasId }: { hasId: boolean }) {
	const { pending } = useFormStatus();

	return (
		<AddButton type="submit" disabled={pending} withIcon={false}>
			{pending ? "Menyimpan..." : hasId ? "Update Position" : "Simpan Position"}
		</AddButton>
	);
}

type PositionFormProps = {
	positions: PositionOption[];
	formOptions: PositionFormOptions;
};

function toPositionLabel(position: PositionOption) {
	const kodeSuffix = position.kode ? ` (${position.kode})` : "";
	return `${position.nama}${kodeSuffix}`;
}

function toUnitLabel(unit: PositionSelectOption) {
	const kodeSuffix = unit.kode ? ` (${unit.kode})` : "";
	return `${unit.nama}${kodeSuffix}`;
}

function toGradeLabel(grade: PositionSelectOption) {
	const kodeSuffix = grade.kode ? ` (${grade.kode})` : "";
	return `${grade.nama}${kodeSuffix}`;
}

function toFormValues(position?: PositionOption): PositionFormValues {
	if (!position) return EMPTY_FORM;

	return {
		id: position.id,
		unitOrganisasiId: position.unitOrganisasiId,
		golonganPosisiId: position.golonganPosisiId,
		nama: position.nama,
		kode: position.kode,
		deskripsi: position.deskripsi,
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

	function handlePilihEdit(id: string) {
		setSelectedPositionId(id);
		formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	const kolomPosisi: DataTableColumn<PositionOption>[] = [
		{
			id: "nama",
			header: "Nama",
			render: (position) => <span className="font-medium">{position.nama}</span>,
			sortValue: (position) => position.nama,
			searchValue: (position) => `${position.nama} ${position.kode ?? ""}`,
		},
		{
			id: "kode",
			header: "Kode",
			render: (position) => <span>{position.kode ?? "-"}</span>,
			sortValue: (position) => position.kode ?? "-",
			searchValue: (position) => position.kode ?? "",
		},
		{
			id: "unit",
			header: "Unit",
			render: (position) => <span>{position.unitOrganisasiNama ?? "-"}</span>,
			sortValue: (position) => position.unitOrganisasiNama ?? "-",
			searchValue: (position) => position.unitOrganisasiNama ?? "",
		},
		{
			id: "grade",
			header: "Grade",
			render: (position) => <span>{position.golonganPosisiNama ?? "-"}</span>,
			sortValue: (position) => position.golonganPosisiNama ?? "-",
			searchValue: (position) => position.golonganPosisiNama ?? "",
		},
		{
			id: "aksi",
			header: "Aksi",
			headerClassName: "text-right",
			cellClassName: "text-right",
			sortable: false,
			searchable: false,
			render: (position) => (
				<EditButton
					type="button"
					size="xs"
					withIcon={false}
					onClick={() => handlePilihEdit(position.id)}
				>
					Edit
				</EditButton>
			),
		},
	];

	useEffect(() => {
		if (!state || state.success || !state.errors) return;

		const orderedFields = ["nama", "kode", "unitOrganisasiId", "golonganPosisiId", "deskripsi"] as const;

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
			toast.success(state.message || "Data position berhasil disimpan.");
			if (state.id) setSelectedPositionId(state.id);
		} else {
			toast.error(state.message || "Gagal menyimpan data position.");
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
						name="selectedPosition"
						label="Pilih Posisi (Edit)"
						value={selectedPositionId}
						onValueChange={(nextValue) => setSelectedPositionId(nextValue)}
						options={positionSelectOptions}
						placeholder="Buat posisi baru"
						searchable
					/>
				</div>
				<EditButton type="button" onClick={() => setSelectedPositionId("")} withIcon={false}>
					Buat Baru
				</EditButton>
			</div>

			<input type="hidden" name="id" value={formValues.id ?? ""} readOnly />

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<FloatingInput
					name="nama"
					label="Nama Posisi"
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

				<FloatingSelect
					name="unitOrganisasiId"
					label="Unit Organisasi"
					value={formValues.unitOrganisasiId ?? ""}
					onValueChange={(nextValue) => setFormValues((prev) => ({ ...prev, unitOrganisasiId: nextValue || null }))}
					options={organizationalUnitOptions}
					errorText={state?.errors?.unitOrganisasiId}
					placeholder="Tanpa unit"
					searchable
				/>
				<FloatingSelect
					name="golonganPosisiId"
					label="Golongan Posisi"
					value={formValues.golonganPosisiId ?? ""}
					onValueChange={(nextValue) => setFormValues((prev) => ({ ...prev, golonganPosisiId: nextValue || null }))}
					options={jobGradeOptions}
					errorText={state?.errors?.golonganPosisiId}
					placeholder="Tanpa grade"
					searchable
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
				/>
			</div>

			<div className="mt-4 flex items-center justify-end gap-4">
				<SubmitButton hasId={Boolean(formValues.id)} />
			</div>

			<div className="mt-6 rounded-xl border border-blue-100 dark:border-blue-900/60">
				<div className="border-b border-blue-100 px-4 py-3 dark:border-blue-900/60">
					<h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Daftar Posisi</h3>
					<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Klik Edit untuk memuat data ke form di atas.</p>
				</div>

				<div className="p-4">
					<DataTable
						data={positions}
						columns={kolomPosisi}
						getRowId={(position) => position.id}
						emptyMessage="Belum ada posisi."
					/>
				</div>
			</div>
		</form>
	);
}
