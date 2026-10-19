"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
	deleteComponent,
	saveComponent,
	saveEmployeeSalaries,
	type EmployeeSalaryItem,
	type ComponentItem,
} from "../actions/payroll.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

const KELOMPOK_OPTIONS = [
	{ value: "PENDAPATAN", label: "Pendapatan" },
	{ value: "TUNJANGAN", label: "Tunjangan" },
	{ value: "POTONGAN", label: "Potongan" },
	{ value: "IURAN", label: "Iuran (karyawan)" },
	{ value: "BIAYA_PERUSAHAAN", label: "Biaya perusahaan (tak potong gaji)" },
];

const TIPE_OPTIONS = [
	{ value: "NOMINAL", label: "Nominal tetap" },
	{ value: "PERSEN", label: "% dari gaji pokok" },
	{ value: "PER_HARI", label: "Per hari hadir" },
	{ value: "PER_JAM_LEMBUR", label: "Per jam lembur" },
	{ value: "PER_SHIFT_MALAM", label: "Per shift malam" },
];

const BOOL_OPTIONS = [
	{ value: "true", label: "Ya" },
	{ value: "false", label: "Tidak" },
];

const rupiah = new Intl.NumberFormat("id-ID");

export default function KomponenClient({
	items,
	assignMap,
}: {
	items: ComponentItem[];
	assignMap: EmployeeSalaryItem[];
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [selectedId, setSelectedId] = useState("");
	const [code, setKode] = useState("");
	const [name, setNama] = useState("");
	const [group, setKelompok] = useState("TUNJANGAN");
	const [type, setTipe] = useState("NOMINAL");
	const [value, setNilai] = useState("");
	const [upperLimit, setBatasAtas] = useState("");
	const [isActive, setIsActive] = useState("true");

	const [assignKaryawan, setAssignKaryawan] = useState("");
	const [assignChecked, setAssignChecked] = useState<string[]>([]);

	function applySelection(id: string) {
		setSelectedId(id);
		const next = items.find((i) => i.id === id);
		if (next) {
			setKode(next.code);
			setNama(next.name);
			setKelompok(next.group);
			setTipe(next.type);
			setNilai(next.value);
			setBatasAtas(next.upperLimit ?? "");
			setIsActive(next.isActive ? "true" : "false");
		} else {
			setKode("");
			setNama("");
			setNilai("");
			setBatasAtas("");
			setIsActive("true");
		}
	}

	function handleSave() {
		if (!code || !name) {
			toast.error("Kode dan nama wajib diisi.");
			return;
		}
		const fd = new FormData();
		if (selectedId) fd.set("id", selectedId);
		fd.set("code", code);
		fd.set("name", name);
		fd.set("group", group);
		fd.set("type", type);
		fd.set("value", value || "0");
		fd.set("upperLimit", upperLimit);
		fd.set("isActive", isActive);
		startTransition(async () => {
			const result = await saveComponent(fd);
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			applySelection("");
			router.refresh();
		});
	}

	function handleHapusKomponen(id: string) {
		if (!confirm("Hapus komponen ini?")) return;
		startTransition(async () => {
			const result = await deleteComponent(id);
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			router.refresh();
		});
	}

	const kolomKomponen: DataTableColumn<ComponentItem>[] = [
		{
			id: "code",
			header: "Kode",
			render: (item) => <span className="font-medium">{item.code}</span>,
			sortValue: (item) => item.code,
			searchValue: (item) => `${item.code} ${item.name}`,
		},
		{ id: "name", header: "Nama", accessor: "name" },
		{ id: "group", header: "Kelompok", accessor: "group" },
		{
			id: "type",
			header: "Tipe",
			render: (item) => <span>{item.type.replaceAll("_", " ")}</span>,
			sortValue: (item) => item.type,
			searchValue: (item) => item.type.replaceAll("_", " "),
		},
		{
			id: "value",
			header: "Nilai",
			headerClassName: "text-right",
			cellClassName: "text-right",
			render: (item) => <span>{item.type === "PERSEN" ? `${item.value}%` : rupiah.format(Number(item.value))}</span>,
			sortValue: (item) => Number(item.value),
			searchable: false,
		},
		{
			id: "aksi",
			header: "Aksi",
			headerClassName: "text-right",
			cellClassName: "text-right",
			sortable: false,
			searchable: false,
			render: (item) => (
				<div className="inline-flex gap-2">
					<button type="button" onClick={() => applySelection(item.id)} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
						Edit
					</button>
					<button
						type="button"
						disabled={isPending}
						onClick={() => handleHapusKomponen(item.id)}
						className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
					>
						Hapus
					</button>
				</div>
			),
		},
	];

	function pickAssignKaryawan(id: string) {
		setAssignKaryawan(id);
		const found = assignMap.find((a) => a.employeeId === id);
		setAssignChecked(found ? found.componentIds : []);
	}

	function handleSaveAssign() {
		if (!assignKaryawan) {
			toast.error("Pilih karyawan.");
			return;
		}
		startTransition(async () => {
			const result = await saveEmployeeSalaries(assignKaryawan, assignChecked);
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			router.refresh();
		});
	}

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
						{selectedId ? "Edit Komponen" : "Komponen Baru"}
					</h2>
				</div>
				<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
					<FloatingInput name="code" label="Kode" value={code} onChange={(e) => setKode(e.currentTarget.value.toUpperCase())} />
					<FloatingInput name="name" label="Nama" value={name} onChange={(e) => setNama(e.currentTarget.value)} />
					<FloatingSelect name="group" label="Kelompok" value={group} onValueChange={setKelompok} options={KELOMPOK_OPTIONS} />
					<FloatingSelect name="type" label="Tipe Hitung" value={type} onValueChange={setTipe} options={TIPE_OPTIONS} />
					<FloatingInput name="value" label="Nilai" type="number" value={value} onChange={(e) => setNilai(e.currentTarget.value)} />
					<FloatingInput name="upperLimit" label="Batas Atas (opsional)" type="number" value={upperLimit} onChange={(e) => setBatasAtas(e.currentTarget.value)} />
					<FloatingSelect name="isActive" label="Aktif" value={isActive} onValueChange={setIsActive} options={BOOL_OPTIONS} />
				</div>
				<div className="mt-4 flex justify-end gap-2">
					{selectedId ? (
						<button type="button" onClick={() => applySelection("")} className="inline-flex h-10 items-center rounded-lg border border-blue-200 px-4 text-sm hover:bg-blue-50">
							Buat Baru
						</button>
					) : null}
					<button type="button" onClick={handleSave} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
						Simpan
					</button>
				</div>
				<div className="mt-4">
					<DataTable
						data={items}
						columns={kolomKomponen}
						getRowId={(item) => item.id}
						emptyMessage="Belum ada komponen."
					/>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Komponen per Employee</h2>
				<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
					<FloatingSelect
						name="assignKaryawan"
						label="Employee"
						value={assignKaryawan}
						onValueChange={pickAssignKaryawan}
						options={assignMap.map((a) => ({ value: a.employeeId, label: a.employeeName }))}
						placeholder="Pilih karyawan"
						searchable
					/>
				</div>
				{assignKaryawan ? (
					<>
						<div className="mt-4 grid grid-cols-1 gap-1 md:grid-cols-2">
							{items.filter((i) => i.isActive).map((item) => (
								<label key={item.id} className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={assignChecked.includes(item.id)}
										onChange={() =>
											setAssignChecked((prev) => (prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id]))
										}
										className="h-4 w-4"
									/>
									<span>
										{item.code} — {item.name}
									</span>
								</label>
							))}
						</div>
						<div className="mt-4 flex justify-end">
							<button type="button" onClick={handleSaveAssign} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
								Simpan
							</button>
						</div>
					</>
				) : null}
			</div>
		</div>
	);
}
