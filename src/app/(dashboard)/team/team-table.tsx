"use client";

import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import type { AnggotaTimHari } from "@/src/modules/employee/actions/team.actions";

const kolomTim: DataTableColumn<AnggotaTimHari>[] = [
  {
    id: "nama",
    header: "Nama",
    render: (a) => (
      <span>
        {a.nama} <span className="text-xs text-slate-500">({a.nomorKaryawan})</span>
      </span>
    ),
    sortValue: (a) => a.nama,
    searchValue: (a) => `${a.nama} ${a.nomorKaryawan}`,
  },
  { id: "status", header: "Status", accessor: "status" },
  {
    id: "shift",
    header: "Shift",
    render: (a) => <span>{a.shift ?? "-"}</span>,
    sortValue: (a) => a.shift ?? "-",
    searchValue: (a) => a.shift ?? "",
  },
  {
    id: "info",
    header: "Keterangan",
    sortable: false,
    searchable: false,
    render: (a) => <span>{a.info ?? "-"}</span>,
  },
];

export default function TeamTable({ anggota }: { anggota: AnggotaTimHari[] }) {
  return (
    <DataTable
      data={anggota}
      columns={kolomTim}
      getRowId={(a) => a.karyawanId}
      emptyMessage="Belum ada anggota tim."
    />
  );
}
