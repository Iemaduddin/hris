"use client";

import Link from "next/link";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import type { getMySlip } from "@/src/modules/payroll/actions/payroll.actions";
import type { getMyThr } from "@/src/modules/payroll/actions/thr.actions";

const rupiah = new Intl.NumberFormat("id-ID");

type SlipRow = Awaited<ReturnType<typeof getMySlip>>[number];
type ThrSlipRow = Awaited<ReturnType<typeof getMyThr>>[number];

const kolomSlip: DataTableColumn<SlipRow>[] = [
  {
    id: "periode",
    header: "Periode",
    render: (s) => <span className="font-medium">{s.periode}</span>,
    sortValue: (s) => s.periode,
    searchValue: (s) => `${s.periode} ${s.number}`,
  },
  { id: "number", header: "Nomor", accessor: "number" },
  {
    id: "net",
    header: "Gaji net",
    headerClassName: "text-right",
    cellClassName: "text-right font-semibold",
    render: (s) => <span>{rupiah.format(Number(s.netPay))}</span>,
    sortValue: (s) => Number(s.netPay),
    searchable: false,
  },
  {
    id: "aksi",
    header: "Aksi",
    headerClassName: "text-right",
    cellClassName: "text-right",
    sortable: false,
    searchable: false,
    render: (s) => (
      <Link href={`/account/payslip/${encodeURIComponent(s.number)}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
        Lihat
      </Link>
    ),
  },
];

const kolomThr: DataTableColumn<ThrSlipRow>[] = [
  {
    id: "thr",
    header: "THR",
    render: (s) => <span className="font-medium">{s.holidayName} {s.year}</span>,
    sortValue: (s) => `${s.year} ${s.holidayName}`,
    searchValue: (s) => `${s.holidayName} ${s.year} ${s.number}`,
  },
  { id: "number", header: "Nomor", accessor: "number" },
  {
    id: "net",
    header: "net",
    headerClassName: "text-right",
    cellClassName: "text-right font-semibold",
    render: (s) => <span>{rupiah.format(Number(s.net))}</span>,
    sortValue: (s) => Number(s.net),
    searchable: false,
  },
  {
    id: "aksi",
    header: "Aksi",
    headerClassName: "text-right",
    cellClassName: "text-right",
    sortable: false,
    searchable: false,
    render: (s) => (
      <Link href={`/account/thr/${encodeURIComponent(s.number)}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
        Lihat
      </Link>
    ),
  },
];

export function SlipTable({ slips }: { slips: SlipRow[] }) {
  return (
    <DataTable
      data={slips}
      columns={kolomSlip}
      getRowId={(s) => s.number}
      emptyMessage="Belum ada slip gaji yang diterbitkan."
    />
  );
}

export function ThrSlipTable({ slips }: { slips: ThrSlipRow[] }) {
  return (
    <DataTable
      data={slips}
      columns={kolomThr}
      getRowId={(s) => s.number}
      emptyMessage="Belum ada slip THR yang diterbitkan."
    />
  );
}
