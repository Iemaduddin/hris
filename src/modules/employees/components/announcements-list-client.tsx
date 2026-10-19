"use client";

import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import type { AnnouncementItem } from "@/src/modules/employees/actions/announcements.actions";

const columns: DataTableColumn<AnnouncementItem>[] = [
	{ id: "title", header: "Judul", accessor: "title" },
	{
		id: "target",
		header: "Target",
		render: (row) => <span>{row.unitName ?? "Semua"}</span>,
		sortValue: (row) => row.unitName ?? "Semua",
	},
	{ id: "body", header: "Isi", accessor: "body" },
];

export default function AnnouncementsListClient({ items }: { items: AnnouncementItem[] }) {
	return <DataTable data={items} columns={columns} getRowId={(row) => row.id} emptyMessage="Belum ada pengumuman untuk Anda." />;
}
