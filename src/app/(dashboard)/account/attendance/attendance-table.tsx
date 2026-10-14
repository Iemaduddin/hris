"use client";

import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import type { RekapBulananItem } from "@/src/modules/recap/actions/recap.actions";

const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" });

const kolomRekap: DataTableColumn<RekapBulananItem>[] = [
  {
    id: "tanggal",
    header: "Tanggal",
    render: (item) => <span>{dateFormatter.format(new Date(item.tanggal))}</span>,
    sortValue: (item) => item.tanggal,
    searchValue: (item) => dateFormatter.format(new Date(item.tanggal)),
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
    render: (item) => <span>{item.telatMenit}&prime;</span>,
    sortValue: (item) => item.telatMenit,
    searchable: false,
  },
  {
    id: "lembur",
    header: "Lembur",
    headerClassName: "text-right",
    cellClassName: "text-right",
    render: (item) => <span>{item.lemburMenit}&prime;</span>,
    sortValue: (item) => item.lemburMenit,
    searchable: false,
  },
];

export default function AttendanceTable({ items }: { items: RekapBulananItem[] }) {
  return (
    <DataTable
      data={items}
      columns={kolomRekap}
      getRowId={(item) => String(item.id)}
      emptyMessage="Belum ada rekap periode ini."
    />
  );
}
