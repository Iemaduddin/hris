"use client";

import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import type { TeamDayMember } from "@/src/modules/employees/actions/team.actions";

const teamColumns: DataTableColumn<TeamDayMember>[] = [
  {
    id: "nama",
    header: "Nama",
    render: (a) => (
      <span>
        {a.name} <span className="text-xs text-slate-500">({a.employeeNumber})</span>
      </span>
    ),
    sortValue: (a) => a.name,
    searchValue: (a) => `${a.name} ${a.employeeNumber}`,
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

export default function TeamTable({ members }: { members: TeamDayMember[] }) {
  return (
    <DataTable
      data={members}
      columns={teamColumns}
      getRowId={(a) => a.employeeId}
      emptyMessage="Belum ada anggota tim."
    />
  );
}
