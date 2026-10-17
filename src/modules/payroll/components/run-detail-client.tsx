"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import {
	finalizeRun,
	calculateSalaryRun,
	publishRun,
	type RunDetailItem,
	type SalaryRunItem,
} from "../actions/payroll.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

const rupiah = new Intl.NumberFormat("id-ID");

export default function RunDetailClient({ run, detail }: { run: SalaryRunItem; detail: RunDetailItem[] }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	function runAction(action: Promise<{ success: boolean; message: string }>) {
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

	const kolomDetail: DataTableColumn<RunDetailItem>[] = [
		{
			id: "karyawan",
			header: "Karyawan",
			render: (d) => (
				<span>
					{d.employeeName} <span className="text-xs text-slate-500">({d.employeeNumber})</span>
					<details className="mt-1 text-xs text-slate-500">
						<summary className="cursor-pointer">lines</summary>
						<ul className="mt-1 space-y-1">
							{d.lines.map((r) => (
								<li key={r.code} className="flex justify-between gap-4">
									<span>
										{r.name} {r.description ? `(${r.description})` : ""}
									</span>
									<span className={r.group === "POTONGAN" || r.group === "IURAN" ? "text-red-600" : r.group === "BIAYA_PERUSAHAAN" ? "text-sky-700" : "text-emerald-700"}>
										{rupiah.format(r.amount)}
									</span>
								</li>
							))}
						</ul>
					</details>
				</span>
			),
			sortValue: (d) => d.employeeName,
			searchValue: (d) => `${d.employeeName} ${d.employeeNumber}`,
		},
		{
			id: "baseSalary",
			header: "Pokok",
			headerClassName: "text-right",
			cellClassName: "text-right",
			render: (d) => <span>{rupiah.format(Number(d.baseSalary))}</span>,
			sortValue: (d) => Number(d.baseSalary),
			searchable: false,
		},
		{
			id: "totalEarnings",
			header: "Pendapatan",
			headerClassName: "text-right",
			cellClassName: "text-right",
			render: (d) => <span>{rupiah.format(Number(d.totalEarnings))}</span>,
			sortValue: (d) => Number(d.totalEarnings),
			searchable: false,
		},
		{
			id: "totalDeductions",
			header: "Potongan",
			headerClassName: "text-right",
			cellClassName: "text-right",
			render: (d) => <span>{rupiah.format(Number(d.totalDeductions))}</span>,
			sortValue: (d) => Number(d.totalDeductions),
			searchable: false,
		},
		{
			id: "netPay",
			header: "Bersih",
			headerClassName: "text-right",
			cellClassName: "text-right font-semibold",
			render: (d) => <span>{rupiah.format(Number(d.netPay))}</span>,
			sortValue: (d) => Number(d.netPay),
			searchable: false,
		},
		{
			id: "totalCompanyCost",
			header: "Biaya PT",
			headerClassName: "text-right",
			cellClassName: "text-right text-slate-500",
			render: (d) => <span>{rupiah.format(Number(d.totalCompanyCost))}</span>,
			sortValue: (d) => Number(d.totalCompanyCost),
			searchable: false,
		},
		{
			id: "slip",
			header: "Detail",
			headerClassName: "text-right",
			cellClassName: "text-right",
			sortable: false,
			searchable: false,
			render: (d) =>
				run.status === "DITERBITKAN" ? (
					<Link href={`/payroll/payslip/SLIP-${run.periode}-${d.employeeId.slice(-6).toUpperCase()}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
						Slip
					</Link>
				) : (
					<span className="text-xs text-slate-400">-</span>
				),
		},
	];

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Periode {run.periode}</h2>
						<p className="mt-1 text-sm text-slate-500">
							{run.startDate} – {run.endDate} • {run.status.replaceAll("_", " ")} • {run.employeeCount} karyawan • Total {rupiah.format(Number(run.totalNet))}
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						{["DRAF", "DIHITUNG"].includes(run.status) ? (
							<button type="button" onClick={() => runAction(calculateSalaryRun(run.id))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
								Hitung
							</button>
						) : null}						{run.status === "DIHITUNG" ? (
							<button type="button" onClick={() => runAction(finalizeRun(run.id))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-amber-600 px-3 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-70">
								Finalisasi (Kunci)
							</button>
						) : null}
						{run.status === "FINAL" ? (
							<button type="button" onClick={() => runAction(publishRun(run.id))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70">
								Terbitkan Payslip
							</button>
						) : null}
						{["DIHITUNG", "FINAL", "DITERBITKAN"].includes(run.status) ? (
							<a href={`/api/payroll/disburse?runId=${run.id}`} className="inline-flex h-9 items-center rounded-lg border border-blue-200 px-3 text-sm hover:bg-blue-50">
								Unduh CSV Bank
							</a>
						) : null}
					</div>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<div className="mt-2">
					<DataTable
						data={detail}
						columns={kolomDetail}
						getRowId={(d) => d.id}
						emptyMessage="Belum ada detail. Klik “Hitung”."
					/>
				</div>
			</div>
		</div>
	);
}
