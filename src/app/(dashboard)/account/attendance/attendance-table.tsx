"use client";

import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import type { MonthlyRecapItem } from "@/src/modules/recap/actions/recap.actions";

const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" });

const kolomRekap: DataTableColumn<MonthlyRecapItem>[] = [
  {
    id: "date",
    header: "Tanggal",
    render: (item) => <span>{dateFormatter.format(new Date(item.date))}</span>,
    sortValue: (item) => item.date,
    searchValue: (item) => dateFormatter.format(new Date(item.date)),
  },
  {
    id: "status",
    header: "Status",
    render: (item) => <span className="font-medium">{item.status.replaceAll("_", " ")}</span>,
    sortValue: (item) => item.status,
    searchValue: (item) => item.status.replaceAll("_", " "),
  },
  {
    id: "telat",
    header: "Telat",
    headerClassName: "text-right",
    cellClassName: "text-right",
    render: (item) => <span>{item.lateMinutes}&prime;</span>,
    sortValue: (item) => item.lateMinutes,
    searchable: false,
  },
  {
    id: "lembur",
    header: "Lembur",
    headerClassName: "text-right",
    cellClassName: "text-right",
    render: (item) => <span>{item.overtimeMinutes}&prime;</span>,
    sortValue: (item) => item.overtimeMinutes,
    searchable: false,
  },
];

export default function AttendanceTable({ items }: { items: MonthlyRecapItem[] }) {
  return (
    <DataTable
      data={items}
      columns={kolomRekap}
      getRowId={(item) => String(item.id)}
      emptyMessage="Belum ada rekap periode ini."
    />
  );
}
