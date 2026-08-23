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

				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Nama Unit</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Kode</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Parent</th>
								<th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-100">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{units.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
										Belum ada unit organisasi.
									</td>
								</tr>
							) : (
								units.map((unit) => {
									const isSelected = selectedUnitId === unit.id;
									const depth = getDepth(unit, units);
									return (
										<tr
											key={unit.id}
											className={`border-b border-blue-100 dark:border-blue-900/60 ${isSelected ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}
										>
											<td className="px-4 py-3 text-slate-700 dark:text-slate-200">
												<span style={{ paddingLeft: `${depth * 16}px` }} className="inline-flex items-center gap-2">
													{depth > 0 ? <span className="text-slate-400 dark:text-slate-500">↳</span> : null}
													<span>{unit.nama}</span>
												</span>
											</td>
											<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{unit.kode ?? "-"}</td>
											<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{unit.parentId ? (parentNameMap.get(unit.parentId) ?? "-") : "Root"}</td>
											<td className="px-4 py-3 text-right">
												<EditButton
													type="button"
													size="xs"
													withIcon={false}
													onClick={() => {
														setSelectedUnitId(unit.id);
														formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
													}}
												>
													Edit
												</EditButton>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>
		</form>
	);
}
