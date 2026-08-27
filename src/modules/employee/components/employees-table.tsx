"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import type { EmployeeListItem } from "../types/employee.type";

type EmployeesTableProps = {
	employees: EmployeeListItem[];
	onSelectEmployee?: (employeeId: string) => void;
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
	dateStyle: "medium",
});

const statusLabel: Record<string, string> = {
	AKTIF: "Aktif",
	NEGERI: "Negeri",
	KONTRAK: "Kontrak",
	PKL: "PKL",
	OUTSOURCE: "Outsource",
	RESIGN: "Resign",
};

function getColumns(onSelectEmployee?: (id: string) => void): DataTableColumn<EmployeeListItem>[] {
	return [
		{
			id: "employeeNumber",
			header: "No. Karyawan",
			accessor: "employeeNumber",
			sortable: true,
			searchable: true,
		},
		{
			id: "fullName",
			header: "Nama Lengkap",
			accessor: "fullName",
			sortable: true,
			searchable: true,
		},
		{
			id: "workEmail",
			header: "Email",
			accessor: "workEmail",
			sortable: true,
			searchable: true,
			responsiveHidden: true,
		},
		{
			id: "positionName",
			header: "Posisi",
			accessor: "positionName",
			sortable: true,
			searchable: true,
		},
		{
			id: "unitName",
			header: "Unit",
			accessor: "unitName",
			sortable: true,
			searchable: true,
			responsiveHidden: true,
		},
		{
			id: "workLocationName",
			header: "Lokasi",
			accessor: "workLocationName",
			sortable: true,
			searchable: true,
			responsiveHidden: true,
		},
		{
			id: "status",
			header: "Status",
			render: (row) => (
				<span
					className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
						row.status === "AKTIF"
							? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
							: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
					}`}
				>
					{statusLabel[row.status] ?? row.status}
				</span>
			),
			sortable: true,
			sortValue: (row) => row.status,
			searchValue: (row) => statusLabel[row.status] ?? row.status,
		},
		{
			id: "joinDate",
			header: "Tanggal Masuk",
			render: (row) => (row.joinDate ? dateFormatter.format(new Date(row.joinDate)) : "-"),
			sortable: true,
			sortValue: (row) => (row.joinDate ? new Date(row.joinDate) : new Date(0)),
			responsiveHidden: true,
		},
		{
			id: "actions",
			header: "Aksi",
			render: (row) => (
				<button
					type="button"
					onClick={() => onSelectEmployee?.(row.id)}
					className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-50 px-3 text-xs font-medium text-blue-600 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
				>
					Edit
				</button>
			),
		},
	];
}

export default function EmployeesTable({ employees, onSelectEmployee }: EmployeesTableProps) {
	const router = useRouter();
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [selectionResetKey, setSelectionResetKey] = useState(0);

	return (
		<div className="space-y-3">
			<DataTable
				data={employees}
				columns={getColumns(onSelectEmployee)}
				getRowId={(row) => row.id}
				sortable
				searchable
				emptyMessage="Belum ada data karyawan."
				searchPlaceholder="Cari karyawan berdasarkan nama/nomor/posisi..."
				initialPageSize={10}
				initialSortState={{ columnId: "updatedAt", direction: "desc" }}
				onSelectionChange={setSelectedIds}
				selectionResetKey={selectionResetKey}
			/>
		</div>
	);
}
