"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import { processSubmissionAction } from "@/src/modules/approval/actions/approval.actions";
import type { DataUpdateItem } from "@/src/modules/employees/actions/data-updates.actions";

export type UpdateDataHrRow = DataUpdateItem & { employeeName: string; employeeNumber: string };

export default function UpdateDataHrClient({ userId, rows }: { userId: string; rows: UpdateDataHrRow[] }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	function handleProses(id: string, keputusan: "SETUJU" | "TOLAK") {
		const note = keputusan === "TOLAK" ? (prompt("Alasan penolakan:") ?? "") : "";
		if (keputusan === "TOLAK" && !note) return;
		startTransition(async () => {
			const result = await processSubmissionAction(userId, "UPDATE_DATA", id, keputusan, note || undefined);
			if (!result.success) toast.error(result.message);
			else toast.success(result.message);
			router.refresh();
		});
	}

	const kolom: DataTableColumn<UpdateDataHrRow>[] = [
		{ id: "number", header: "Nomor", accessor: "number" },
		{
			id: "karyawan",
			header: "Employee",
			render: (r) => (
				<span>
					{r.employeeName} <span className="text-xs text-slate-500">({r.employeeNumber})</span>
				</span>
			),
			sortValue: (r) => r.employeeName,
			searchValue: (r) => `${r.employeeName} ${r.employeeNumber}`,
		},
		{
			id: "category",
			header: "Kategori",
			render: (r) => <span>{r.category}</span>,
			sortValue: (r) => r.category,
			searchValue: (r) => r.category,
		},
		{ id: "summary", header: "Usulan", accessor: "summary" },
		{
			id: "status",
			header: "Status",
			render: (r) => <span>{r.status.replaceAll("_", " ")}</span>,
			sortValue: (r) => r.status,
			searchValue: (r) => r.status,
		},
		{
			id: "aksi",
			header: "Aksi",
			headerClassName: "text-right",
			cellClassName: "text-right",
			sortable: false,
			searchable: false,
			render: (r) =>
				r.status === "MENUNGGU_APPROVAL" ? (
					<div className="inline-flex gap-2">
						<button
							type="button"
							disabled={isPending}
							onClick={() => handleProses(r.id, "SETUJU")}
							className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
						>
							Setuju + Terapkan
						</button>
						<button
							type="button"
							disabled={isPending}
							onClick={() => handleProses(r.id, "TOLAK")}
							className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
						>
							Tolak
						</button>
					</div>
				) : (
					<Link href="/approval" className="text-xs text-blue-600 hover:underline">
						Lihat di Approval
					</Link>
				),
		},
	];

	return (
		<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
			<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Verifikasi HR ({rows.length})</h2>
			<p className="mt-1 text-xs text-slate-500">
				Menyetujui langsung menerapkan perubahan ke data master dan tercatat di audit.
			</p>
			<div className="mt-4">
				<DataTable data={rows} columns={kolom} getRowId={(r) => r.id} emptyMessage="Belum ada usulan." />
			</div>
		</div>
	);
}
