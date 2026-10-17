"use client";

import Link from "next/link";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import type { getMyOnboarding } from "@/src/modules/employee/actions/onboarding.actions";

type OnboardingSayaRow = Awaited<ReturnType<typeof getMyOnboarding>>[number];

const kolomOnboarding: DataTableColumn<OnboardingSayaRow>[] = [
  {
    id: "checklist",
    header: "Checklist",
    render: (o) => <span className="font-medium">{o.templateName ?? "Kustom"}</span>,
    sortValue: (o) => o.templateName ?? "Kustom",
    searchValue: (o) => o.templateName ?? "Kustom",
  },
  {
    id: "progres",
    header: "Progres",
    headerClassName: "text-right",
    cellClassName: "text-right",
    render: (o) => <span>{o.percent}% ({o.requiredDone} wajib)</span>,
    sortValue: (o) => o.percent,
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
