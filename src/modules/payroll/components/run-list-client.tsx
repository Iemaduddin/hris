"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import { createSalaryRun, deleteRun, type SalaryRunItem } from "../actions/payroll.actions";

const rupiah = new Intl.NumberFormat("id-ID");

function currentPeriode(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function RunListClient({ runs }: { runs: SalaryRunItem[] }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [periode, setPeriode] = useState(currentPeriode());

	function handleBuat() {
		startTransition(async () => {
			const result = await createSalaryRun(periode);
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			router.refresh();
		});
	}

	function handleHapus(id: string) {
		if (!confirm("Hapus run ini?")) return;
		startTransition(async () => {
			const result = await deleteRun(id);
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			router.refresh();
		});
	}

	const kolomRun: DataTableColumn<SalaryRunItem>[] = [
		{
			id: "periode",
			header: "Periode",
			render: (r) => <span className="font-medium">{r.periode}</span>,
			sortValue: (r) => r.periode,
			searchValue: (r) => r.periode,
		},
		{
			id: "status",
			header: "Status",
			render: (r) => <span>{r.status.replaceAll("_", " ")}</span>,
			sortValue: (r) => r.status,
			searchValue: (r) => r.status.replaceAll("_", " "),
		},
		{
			id: "employeeCount",
			header: "Employee",
			headerClassName: "text-right",
			cellClassName: "text-right",
			render: (r) => <span>{r.employeeCount}</span>,
			sortValue: (r) => r.employeeCount,
			searchable: false,
		},
		{
			id: "totalNet",
			header: "Total Bersih",
			headerClassName: "text-right",
			cellClassName: "text-right",
			render: (r) => <span>{rupiah.format(Number(r.totalNet))}</span>,
			sortValue: (r) => Number(r.totalNet),
			searchable: false,
		},
		{
			id: "aksi",
			header: "Aksi",
			headerClassName: "text-right",
			cellClassName: "text-right",
			sortable: false,
			searchable: false,
			render: (r) => (
				<div className="inline-flex gap-2">
					<Link href={`/payroll/run/${r.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
						Buka
					</Link>
					{["DRAF", "DIHITUNG"].includes(r.status) ? (
						<button
							type="button"
							disabled={isPending}
							onClick={() => handleHapus(r.id)}
							className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
						>
							Hapus
						</button>
					) : null}
				</div>
			),
		},
	];

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Buat Periode Baru</h2>
				<div className="mt-4 flex flex-wrap items-end gap-4">
					<FloatingInput name="periode" label="Periode (YYYY-MM)" value={periode} onChange={(e) => setPeriode(e.currentTarget.value)} />
					<button type="button" onClick={handleBuat} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
						Buat Run
					</button>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<div className="mt-2">
					<DataTable
						data={runs}
						columns={kolomRun}
						getRowId={(r) => r.id}
						emptyMessage="Belum ada salary run."
					/>
				</div>
			</div>
		</div>
	);
}
