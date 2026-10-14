"use client";

import Link from "next/link";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import type { getOnboardingSaya } from "@/src/modules/employee/actions/onboarding.actions";

type OnboardingSayaRow = Awaited<ReturnType<typeof getOnboardingSaya>>[number];

const kolomOnboarding: DataTableColumn<OnboardingSayaRow>[] = [
  {
    id: "checklist",
    header: "Checklist",
    render: (o) => <span className="font-medium">{o.templateNama ?? "Kustom"}</span>,
    sortValue: (o) => o.templateNama ?? "Kustom",
    searchValue: (o) => o.templateNama ?? "Kustom",
  },
  {
    id: "progres",
    header: "Progres",
    headerClassName: "text-right",
    cellClassName: "text-right",
    render: (o) => <span>{o.persen}% ({o.wajibSelesai} wajib)</span>,
    sortValue: (o) => o.persen,
    searchable: false,
  },
  {
    id: "status",
    header: "Status",
    render: (o) => <span>{o.status.replaceAll("_", " ")}</span>,
    sortValue: (o) => o.status,
    searchValue: (o) => o.status.replaceAll("_", " "),
  },
  {
    id: "aksi",
    header: "Aksi",
    headerClassName: "text-right",
    cellClassName: "text-right",
    sortable: false,
    searchable: false,
    render: (o) => (
      <Link href={`/account/onboarding/${o.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
        Buka
      </Link>
    ),
  },
];

export default function OnboardingTable({ items }: { items: OnboardingSayaRow[] }) {
  return (
    <DataTable
      data={items}
      columns={kolomOnboarding}
      getRowId={(o) => o.id}
      emptyMessage="Tidak ada onboarding."
    />
  );
}
