"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { OrgUnitType } from "@/generated/prisma/enums";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import FloatingTextarea from "@/src/components/ui/floating-input/textarea";
import { submitOrganizationalUnitAction } from "../actions/organizational-unit.actions";
import type {
	OrganizationalUnitActionResult,
	OrganizationalUnitFormValues,
	OrganizationalUnitOption,
} from "../types/organizational-unit.type";

const EMPTY_FORM: OrganizationalUnitFormValues = {
	id: "",
	parentId: null,
	name: "",
	code: null,
	type: OrgUnitType.OTHER,
	description: null,
	order: 0,
	isActive: true,
};

const TYPE_OPTIONS = [
	{ value: OrgUnitType.DIRECTORATE, label: "Direktorat" },
	{ value: OrgUnitType.DIVISION, label: "Divisi" },
	{ value: OrgUnitType.DEPARTMENT, label: "Departemen" },
	{ value: OrgUnitType.SECTION, label: "Seksi" },
	{ value: OrgUnitType.UNIT, label: "Unit" },
	{ value: OrgUnitType.TEAM, label: "Tim" },
	{ value: OrgUnitType.BRANCH, label: "Cabang" },
	{ value: OrgUnitType.OTHER, label: "Lainnya" },
];

function SubmitButton({ hasId }: { hasId: boolean }) {
	const { pending } = useFormStatus();

	return (
		<button
			type="submit"
			disabled={pending}
			className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
		>
			{pending ? "Menyimpan..." : hasId ? "Update Unit" : "Simpan Unit"}
		</button>
	);
}

type OrganizationalUnitFormProps = {
	units: OrganizationalUnitOption[];
};

function toDisplayLabel(unit: OrganizationalUnitOption) {
	const indent = "— ".repeat(Math.max(unit.level, 0));
	const codeSuffix = unit.code ? ` (${unit.code})` : "";
	return `${indent}${unit.name}${codeSuffix}`;
}

function toFormValues(unit?: OrganizationalUnitOption): OrganizationalUnitFormValues {
	if (!unit) return EMPTY_FORM;

	return {
		id: unit.id,
		parentId: unit.parentId,
		name: unit.name,
		code: unit.code,
		type: unit.type,
		description: unit.description,
		order: unit.order,
		isActive: unit.isActive,
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
		() => units.map((item) => ({ label: toDisplayLabel(item), value: item.id })),
		[units],
	);

	const parentSelectOptions = useMemo(
		() =>
			units
				.filter((item) => item.id !== formValues.id)
				.map((item) => ({
					label: toDisplayLabel(item),
					value: item.id,
				})),
		[formValues.id, units],
	);

	const sortedUnitRows = useMemo(
		() =>
			[...units].sort((left, right) => {
				const leftPath = left.path ?? left.id;
				const rightPath = right.path ?? right.id;
				const pathCompare = leftPath.localeCompare(rightPath);
				if (pathCompare !== 0) return pathCompare;

				const orderCompare = left.order - right.order;
				if (orderCompare !== 0) return orderCompare;

				return left.name.localeCompare(right.name);
			}),
		[units],
	);

	const parentNameMap = useMemo(() => {
		const map = new Map<string, string>();
		for (const unit of units) {
			map.set(unit.id, unit.name);
		}
		return map;
	}, [units]);

	useEffect(() => {
		if (!state || state.success || !state.errors) return;

		const orderedFields = ["name", "code", "parentId", "type", "order", "description"] as const;

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

		toast.success(state.message || "Data unit organisasi berhasil disimpan.");

		if (state.id) {
			setSelectedUnitId(state.id);
		}

		router.refresh();
	}, [router, state]);

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
				<button
					type="button"
					onClick={() => setSelectedUnitId("")}
					className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
				>
					Buat Baru
				</button>
			</div>

			<input type="hidden" name="id" value={formValues.id ?? ""} readOnly />

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<FloatingInput
					name="name"
					label="Nama Unit"
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
					label="Kode Unit"
					value={formValues.code ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, code: nextValue }));
					}}
					errorText={state?.errors?.code}
				/>
				<FloatingSelect
					name="type"
					label="Tipe Unit"
					value={formValues.type}
					onValueChange={(nextValue) => setFormValues((prev) => ({ ...prev, type: nextValue as OrgUnitType }))}
					options={TYPE_OPTIONS}
					errorText={state?.errors?.type}
					required
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
				<FloatingInput
					name="order"
					label="Urutan"
					type="number"
					min={0}
					value={String(formValues.order)}
					onChange={(event) => {
						const rawValue = event.currentTarget.value;
						const parsed = Number.parseInt(rawValue || "0", 10);
						setFormValues((prev) => ({ ...prev, order: Number.isNaN(parsed) ? 0 : parsed }));
					}}
					errorText={state?.errors?.order}
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

				<FloatingTextarea
					name="description"
					label="Deskripsi"
					value={formValues.description ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, description: nextValue }));
					}}
					errorText={state?.errors?.description}
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
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Tipe</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Parent</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Status</th>
								<th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-100">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{sortedUnitRows.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
										Belum ada unit organisasi.
									</td>
								</tr>
							) : (
								sortedUnitRows.map((unit) => {
									const isSelected = selectedUnitId === unit.id;
									return (
										<tr
											key={unit.id}
											className={`border-b border-blue-100 dark:border-blue-900/60 ${isSelected ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}
										>
											<td className="px-4 py-3 text-slate-700 dark:text-slate-200">
												<span style={{ paddingLeft: `${unit.level * 16}px` }} className="inline-flex items-center gap-2">
													{unit.level > 0 ? <span className="text-slate-400 dark:text-slate-500">↳</span> : null}
													<span>{unit.name}</span>
													{unit.code ? <span className="text-xs text-slate-500 dark:text-slate-400">({unit.code})</span> : null}
												</span>
											</td>
											<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{unit.type}</td>
											<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{unit.parentId ? (parentNameMap.get(unit.parentId) ?? "-") : "Root"}</td>
											<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{unit.isActive ? "Aktif" : "Tidak Aktif"}</td>
											<td className="px-4 py-3 text-right">
												<button
													type="button"
													onClick={() => {
														setSelectedUnitId(unit.id);
														formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
													}}
													className="inline-flex h-8 items-center justify-center rounded-lg border border-blue-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
												>
													Edit
												</button>
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