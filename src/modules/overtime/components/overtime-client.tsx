"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import { ajukanLembur, batalLembur, buatLembur, type LemburItem } from "../actions/overtime.actions";

function todayInput(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function LemburClient({
	items,
	karyawanOptions,
}: {
	items: LemburItem[];
	karyawanOptions: Array<{ value: string; label: string }>;
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [karyawanId, setKaryawanId] = useState("");
	const [tanggal, setTanggal] = useState(todayInput());
	const [jamMulai, setJamMulai] = useState("");
	const [jamSelesai, setJamSelesai] = useState("");
	const [alasan, setAlasan] = useState("");

	function run(action: Promise<{ success: boolean; message: string }>) {
		startTransition(async () => {
			const result = await action;
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			router.refresh();
		});
	}

	const kolomLembur: DataTableColumn<LemburItem>[] = [
		{ id: "tanggal", header: "Tanggal", accessor: "tanggal" },
		{ id: "karyawan", header: "Karyawan", accessor: "karyawanNama" },
		{
			id: "jam",
			header: "Jam",
			sortable: false,
			searchable: false,
			render: (item) => <span>{item.jamMulai}–{item.jamSelesai}</span>,
		},
		{
			id: "jumlahJam",
			header: "Total",
			headerClassName: "text-right",
			cellClassName: "text-right",
			render: (item) => <span>{item.jumlahJam} jam</span>,
			sortValue: (item) => item.jumlahJam,
			searchable: false,
		},
		{
			id: "status",
			header: "Status",
			render: (item) => <span>{item.status.replaceAll("_", " ")}</span>,
			sortValue: (item) => item.status,
			searchValue: (item) => item.status.replaceAll("_", " "),
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
					{item.status === "DRAFT" ? (
						<button type="button" onClick={() => run(ajukanLembur(item.id))} disabled={isPending} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50 disabled:opacity-60">
							Ajukan
						</button>
					) : null}
					{["DRAFT", "DIAJUKAN"].includes(item.status) ? (
						<button type="button" onClick={() => run(batalLembur(item.id))} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
							Batal
						</button>
					) : null}
				</div>
			),
		},
	];

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Buat Pengajuan</h2>
				<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
					<FloatingSelect name="karyawanId" label="Karyawan" value={karyawanId} onValueChange={setKaryawanId} options={karyawanOptions} placeholder="Pilih karyawan" searchable />
					<FloatingInput name="tanggal" label="Tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.currentTarget.value)} />
					<FloatingInput name="jamMulai" label="Jam Mulai" type="time" value={jamMulai} onChange={(e) => setJamMulai(e.currentTarget.value)} />
					<FloatingInput name="jamSelesai" label="Jam Selesai" type="time" value={jamSelesai} onChange={(e) => setJamSelesai(e.currentTarget.value)} />
					<FloatingInput name="alasan" label="Alasan" value={alasan} onChange={(e) => setAlasan(e.currentTarget.value)} />
				</div>
				<div className="mt-4 flex justify-end">
					<button
						type="button"
						disabled={isPending}
						onClick={() => {
							if (!karyawanId || !jamMulai || !jamSelesai) {
								toast.error("Lengkapi karyawan dan jam.");
								return;
							}
							run(buatLembur({ karyawanId, tanggal, jamMulai, jamSelesai, alasan }));
						}}
						className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
					>
						Simpan Draf
					</button>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<div className="mt-2">
					<DataTable
						data={items}
						columns={kolomLembur}
						getRowId={(item) => item.id}
						emptyMessage="Belum ada lembur."
					/>
				</div>
			</div>
		</div>
	);
}
