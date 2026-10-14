"use client";

import Link from "next/link";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import type { getSlipSaya } from "@/src/modules/payroll/actions/payroll.actions";
import type { getThrSaya } from "@/src/modules/payroll/actions/thr.actions";

const rupiah = new Intl.NumberFormat("id-ID");

type SlipRow = Awaited<ReturnType<typeof getSlipSaya>>[number];
type ThrSlipRow = Awaited<ReturnType<typeof getThrSaya>>[number];

const kolomSlip: DataTableColumn<SlipRow>[] = [
  {
    id: "periode",
    header: "Periode",
    render: (s) => <span className="font-medium">{s.periode}</span>,
    sortValue: (s) => s.periode,
    searchValue: (s) => `${s.periode} ${s.nomor}`,
  },
  { id: "nomor", header: "Nomor", accessor: "nomor" },
  {
    id: "bersih",
    header: "Gaji Bersih",
    headerClassName: "text-right",
    cellClassName: "text-right font-semibold",
    render: (s) => <span>{rupiah.format(Number(s.gajiBersih))}</span>,
    sortValue: (s) => Number(s.gajiBersih),
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
      <Link href={`/account/payslip/${encodeURIComponent(s.nomor)}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
        Lihat
      </Link>
    ),
  },
];

const kolomThr: DataTableColumn<ThrSlipRow>[] = [
  {
    id: "thr",
    header: "THR",
    render: (s) => <span className="font-medium">{s.namaHariRaya} {s.tahun}</span>,
    sortValue: (s) => `${s.tahun} ${s.namaHariRaya}`,
    searchValue: (s) => `${s.namaHariRaya} ${s.tahun} ${s.nomor}`,
  },
  { id: "nomor", header: "Nomor", accessor: "nomor" },
  {
    id: "bersih",
    header: "Bersih",
    headerClassName: "text-right",
    cellClassName: "text-right font-semibold",
    render: (s) => <span>{rupiah.format(Number(s.bersih))}</span>,
    sortValue: (s) => Number(s.bersih),
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
      <Link href={`/account/thr/${encodeURIComponent(s.nomor)}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
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
      getRowId={(s) => s.nomor}
      emptyMessage="Belum ada slip gaji yang diterbitkan."
    />
  );
}

export function ThrSlipTable({ slips }: { slips: ThrSlipRow[] }) {
  return (
    <DataTable
      data={slips}
      columns={kolomThr}
      getRowId={(s) => s.nomor}
      emptyMessage="Belum ada slip THR yang diterbitkan."
    />
  );
}
