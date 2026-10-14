"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import FloatingTextarea from "@/src/components/ui/floating-input/textarea";
import { AddButton, EditButton } from "@/src/components/ui/button";
import { submitOrganizationalUnitAction } from "../actions/organizational-unit.actions";
import type {
	OrganizationalUnitActionResult,
	OrganizationalUnitFormValues,
	OrganizationalUnitOption,
} from "../types/organizational-unit.type";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

const EMPTY_FORM: OrganizationalUnitFormValues = {
	id: "",
	parentId: null,
	nama: "",
	kode: null,
	deskripsi: null,
};

function SubmitButton({ hasId }: { hasId: boolean }) {
	const { pending } = useFormStatus();

	return (
		<AddButton type="submit" disabled={pending} withIcon={false}>
			{pending ? "Menyimpan..." : hasId ? "Update Unit" : "Simpan Unit"}
		</AddButton>
	);
}

type OrganizationalUnitFormProps = {
	units: OrganizationalUnitOption[];
};

function toDisplayLabel(unit: OrganizationalUnitOption, allUnits: OrganizationalUnitOption[]) {
	const depth = getDepth(unit, allUnits);
	const indent = "— ".repeat(depth);
	const kodeSuffix = unit.kode ? ` (${unit.kode})` : "";
	return `${indent}${unit.nama}${kodeSuffix}`;
}

function getDepth(unit: OrganizationalUnitOption, allUnits: OrganizationalUnitOption[]): number {
	if (!unit.parentId) return 0;
	const parent = allUnits.find((u) => u.id === unit.parentId);
	if (!parent) return 0;
	return 1 + getDepth(parent, allUnits);
}

function toFormValues(unit?: OrganizationalUnitOption): OrganizationalUnitFormValues {
	if (!unit) return EMPTY_FORM;

	return {
		id: unit.id,
		parentId: unit.parentId,
		nama: unit.nama,
		kode: unit.kode,
		deskripsi: unit.deskripsi,
	};
}

function UnitAksiCell({ unitId, onPilih }: { unitId: string; onPilih: (id: string) => void }) {
	return (
		<EditButton
			type="button"
			size="xs"
			withIcon={false}
			onClick={() => onPilih(unitId)}
		>
			Edit
		</EditButton>
	);
}

export default function OrganizationalUnitForm({ units }: OrganizationalUnitFormProps) {
	const [state, formAction] = useActionState<OrganizationalUnitActionResult | null, FormData>(submitOrganizationalUnitAction, null);
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [selectedUnitId, setSelectedUnitId] = useState("");

	const selectedUnit = useMemo(
		() => units.find((item) => item.id === selectedUnitId),
		[selectedUnitId, units],
	);

	const [formValues, setFormValues] = useState<OrganizationalUnitFormValues>(() => toFormValues(selectedUnit));

	useEffect(() => {
		setFormValues(toFormValues(selectedUnit));
	}, [selectedUnit]);

	const unitSelectOptions = useMemo(
		() => units.map((item) => ({ label: toDisplayLabel(item, units), value: item.id })),
		[units],
	);

	const parentSelectOptions = useMemo(
		() =>
			units
				.filter((item) => item.id !== formValues.id)
				.map((item) => ({
					label: toDisplayLabel(item, units),
					value: item.id,
				})),
		[formValues.id, units],
	);

	const parentNameMap = useMemo(() => {
		const map = new Map<string, string>();
		for (const unit of units) {
			map.set(unit.id, unit.nama);
		}
		return map;
	}, [units]);

	function handlePilihEdit(id: string) {
		setSelectedUnitId(id);
		formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	const kolomUnit: DataTableColumn<OrganizationalUnitOption>[] = [
		{
			id: "nama",
			header: "Nama Unit",
			render: (unit) => {
				const depth = getDepth(unit, units);
				return (
					<span style={{ paddingLeft: `${depth * 16}px` }} className="inline-flex items-center gap-2">
						{depth > 0 ? <span className="text-slate-400 dark:text-slate-500">↳</span> : null}
						<span className="font-medium">{unit.nama}</span>
					</span>
				);
			},
			sortValue: (unit) => unit.nama,
			searchValue: (unit) => `${unit.nama} ${unit.kode ?? ""}`,
		},
		{
			id: "kode",
			header: "Kode",
			render: (unit) => <span>{unit.kode ?? "-"}</span>,
			sortValue: (unit) => unit.kode ?? "-",
			searchValue: (unit) => unit.kode ?? "",
		},
		{
			id: "parent",
			header: "Parent",
			render: (unit) => <span>{unit.parentId ? (parentNameMap.get(unit.parentId) ?? "-") : "Root"}</span>,
			sortValue: (unit) => (unit.parentId ? (parentNameMap.get(unit.parentId) ?? "-") : "Root"),
			searchValue: (unit) => (unit.parentId ? (parentNameMap.get(unit.parentId) ?? "") : "Root"),
		},
		{
			id: "aksi",
			header: "Aksi",
			headerClassName: "text-right",
			cellClassName: "text-right",
			sortable: false,
			searchable: false,
			render: (unit) => <UnitAksiCell unitId={unit.id} onPilih={handlePilihEdit} />,
		},
	];

	useEffect(() => {
		if (!state || state.success || !state.errors) return;

		const orderedFields = ["nama", "kode", "parentId", "deskripsi"] as const;

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
			toast.success(state.message || "Data unit organisasi berhasil disimpan.");
			if (state.id) {
				setSelectedUnitId(state.id);
			}
		} else {
			toast.error(state.message || "Gagal menyimpan data unit organisasi.");
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
						name="selectedUnit"
						label="Pilih Unit (Edit)"
						value={selectedUnitId}
						onValueChange={(nextValue) => setSelectedUnitId(nextValue)}
						options={unitSelectOptions}
						placeholder="Buat unit baru"
						searchable
					/>
				</div>
				<EditButton type="button" onClick={() => setSelectedUnitId("")} withIcon={false}>
					Buat Baru
				</EditButton>
			</div>

			<input type="hidden" name="id" value={formValues.id ?? ""} readOnly />

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<FloatingInput
					name="nama"
					label="Nama Unit"
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
					label="Kode Unit"
					value={formValues.kode ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, kode: nextValue }));
					}}
					errorText={state?.errors?.kode}
				/>

				<FloatingSelect
					name="parentId"
					label="Parent Unit"
					value={formValues.parentId ?? ""}
					onValueChange={(nextValue) => setFormValues((prev) => ({ ...prev, parentId: nextValue || null }))}
					options={parentSelectOptions}
					errorText={state?.errors?.parentId}
					placeholder="Root Unit"
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
					containerClassName="md:col-span-3"
				/>
			</div>

			<div className="mt-4 flex items-center justify-end gap-4">
				<SubmitButton hasId={Boolean(formValues.id)} />
			</div>

			<div className="mt-6 rounded-xl border border-blue-100 dark:border-blue-900/60">
				<div className="border-b border-blue-100 px-4 py-3 dark:border-blue-900/60">
					<h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Daftar Unit Organisasi</h3>
					<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Klik Edit untuk memuat data ke form di atas.</p>
				</div>

				<div className="p-4">
					<DataTable
						data={units}
						columns={kolomUnit}
						getRowId={(unit) => unit.id}
						emptyMessage="Belum ada unit organisasi."
					/>
				</div>
			</div>
		</form>
	);
}
