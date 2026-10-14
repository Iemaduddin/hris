"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { AddButton, EditButton } from "@/src/components/ui/button";
import { deleteShiftAction, submitShiftAction } from "../actions/shift.actions";
import type { ShiftActionResult, ShiftListItem } from "../types/shift.type";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

const EMPTY = { kode: "", nama: "", jamMasuk: "", jamKeluar: "", lintasHari: false, toleransiTelatMenit: "0", isActive: true };

const BOOL_OPTIONS = [
	{ value: "true", label: "Ya" },
	{ value: "false", label: "Tidak" },
];

function SubmitButton({ hasId }: { hasId: boolean }) {
	const { pending } = useFormStatus();
	return (
		<AddButton type="submit" disabled={pending} withIcon={false}>
			{pending ? "Menyimpan..." : hasId ? "Update Shift" : "Simpan Shift"}
		</AddButton>
	);
}

export default function ShiftForm({ shifts }: { shifts: ShiftListItem[] }) {
	const [state, formAction] = useActionState<ShiftActionResult | null, FormData>(submitShiftAction, null);
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [selectedId, setSelectedId] = useState("");
	const [values, setValues] = useState(EMPTY);

	function applySelection(id: string) {
		setSelectedId(id);
		const next = shifts.find((s) => s.id === id);
		if (next) {
			setValues({
				kode: next.kode,
				nama: next.nama,
				jamMasuk: next.jamMasuk,
				jamKeluar: next.jamKeluar,
				lintasHari: next.lintasHari,
				toleransiTelatMenit: String(next.toleransiTelatMenit),
				isActive: next.isActive,
			});
		} else {
			setValues(EMPTY);
		}
	}

	useEffect(() => {
		if (!state) return;
		if (state.success) {
			toast.success(state.message);
			router.refresh();
		} else {
			toast.error(state.message);
		}
	}, [state, router]);

	async function handleDelete(id: string) {
		if (!confirm("Hapus shift ini?")) return;
		const result = await deleteShiftAction(id);
		if (result.success) {
			toast.success(result.message);
			if (selectedId === id) applySelection("");
			router.refresh();
		} else {
			toast.error(result.message);
		}
	}

	const kolomShift: DataTableColumn<ShiftListItem>[] = [
		{
			id: "kode",
			header: "Kode",
			render: (s) => <span className="font-medium">{s.kode}</span>,
			sortValue: (s) => s.kode,
			searchValue: (s) => `${s.kode} ${s.nama}`,
		},
		{ id: "nama", header: "Nama", accessor: "nama" },
		{
			id: "jam",
			header: "Jam",
			sortable: false,
			searchable: false,
			render: (s) => <span>{s.jamMasuk}–{s.jamKeluar}</span>,
		},
		{
			id: "lintasHari",
			header: "Lintas Hari",
			render: (s) => <span>{s.lintasHari ? "Ya" : "Tidak"}</span>,
			sortValue: (s) => (s.lintasHari ? "Ya" : "Tidak"),
			searchable: false,
		},
		{
			id: "status",
			header: "Status",
			render: (s) => <span>{s.isActive ? "Aktif" : "Nonaktif"}</span>,
			sortValue: (s) => (s.isActive ? "Aktif" : "Nonaktif"),
			searchable: false,
		},
		{
			id: "aksi",
			header: "Aksi",
			headerClassName: "text-right",
			cellClassName: "text-right",
			sortable: false,
			searchable: false,
			render: (s) => (
				<div className="inline-flex gap-2">
					<EditButton type="button" size="xs" withIcon={false} onClick={() => applySelection(s.id)}>
						Edit
					</EditButton>
					<EditButton type="button" size="xs" withIcon={false} onClick={() => void handleDelete(s.id)}>
						Hapus
					</EditButton>
				</div>
			),
		},
	];

	return (
		<form ref={formRef} action={formAction} className="mt-4">
			<input type="hidden" name="id" value={selectedId} readOnly />

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<FloatingInput
					name="kode"
					label="Kode Shift"
					value={values.kode}
					onChange={(e) => setValues((p) => ({ ...p, kode: e.currentTarget.value.toUpperCase() }))}
					errorText={state?.errors?.kode}
					required
				/>
				<FloatingInput
					name="nama"
					label="Nama Shift"
					value={values.nama}
					onChange={(e) => setValues((p) => ({ ...p, nama: e.currentTarget.value }))}
					errorText={state?.errors?.nama}
					required
				/>
				<FloatingInput
					name="toleransiTelatMenit"
					label="Toleransi Telat (menit)"
					type="number"
					value={values.toleransiTelatMenit}
					onChange={(e) => setValues((p) => ({ ...p, toleransiTelatMenit: e.currentTarget.value }))}
				/>
				<FloatingInput
					name="jamMasuk"
					label="Jam Masuk"
					type="time"
					value={values.jamMasuk}
					onChange={(e) => setValues((p) => ({ ...p, jamMasuk: e.currentTarget.value }))}
					errorText={state?.errors?.jamMasuk}
					required
				/>
				<FloatingInput
					name="jamKeluar"
					label="Jam Keluar"
					type="time"
					value={values.jamKeluar}
					onChange={(e) => setValues((p) => ({ ...p, jamKeluar: e.currentTarget.value }))}
					errorText={state?.errors?.jamKeluar}
					required
				/>
				<FloatingSelect
					name="lintasHari"
					label="Lintas Hari (shift malam)"
					value={values.lintasHari ? "true" : "false"}
					onValueChange={(v) => setValues((p) => ({ ...p, lintasHari: v === "true" }))}
					options={BOOL_OPTIONS}
				/>
				<FloatingSelect
					name="isActive"
					label="Aktif"
					value={values.isActive ? "true" : "false"}
					onValueChange={(v) => setValues((p) => ({ ...p, isActive: v === "true" }))}
					options={BOOL_OPTIONS}
				/>
			</div>

			<div className="mt-4 flex items-center justify-end gap-2">
				{selectedId ? (
					<EditButton type="button" withIcon={false} onClick={() => applySelection("")}>
						Buat Baru
					</EditButton>
				) : null}
				<SubmitButton hasId={Boolean(selectedId)} />
			</div>

		<div className="mt-6 rounded-xl border border-blue-100 dark:border-blue-900/60">
				<div className="border-b border-blue-100 px-4 py-3 dark:border-blue-900/60">
					<h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Daftar Shift</h3>
				</div>
				<div className="p-4">
					<DataTable
						data={shifts}
						columns={kolomShift}
						getRowId={(s) => s.id}
						emptyMessage="Belum ada shift."
					/>
				</div>
			</div>
		</form>
	);
}

