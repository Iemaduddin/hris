"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import {
  finalizeThrRun,
  calculateThrRun,
  publishThrRun,
  type ThrDetailItem,
  type ThrRunItem,
} from "../actions/thr.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

const rupiah = new Intl.NumberFormat("id-ID");

export default function ThrDetailClient({ run, detail }: { run: ThrRunItem; detail: ThrDetailItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function runAction(action: Promise<{ success: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  const kolomThrDetail: DataTableColumn<ThrDetailItem>[] = [
    {
      id: "karyawan",
      header: "Employee",
      render: (d) => (
        <span>
          {d.employeeName} <span className="text-xs text-slate-500">({d.employeeNumber})</span>
          <details className="mt-1 text-xs text-slate-500">
            <summary className="cursor-pointer">lines</summary>
            <ul className="mt-1 space-y-1">
              {d.lines.map((r) => (
                <li key={r.code} className="flex justify-between gap-4">
                  <span>
                    {r.name} {r.description ? `(${r.description})` : ""}
                  </span>
                  <span className={r.group === "POTONGAN" || r.group === "IURAN" ? "text-red-600" : "text-emerald-700"}>
                    {rupiah.format(r.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </span>
      ),
      sortValue: (d) => d.employeeName,
      searchValue: (d) => `${d.employeeName} ${d.employeeNumber}`,
    },
    {
      id: "masa",
      header: "Masa",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (d) => <span>{d.tenureMonths} bln</span>,
      sortValue: (d) => d.tenureMonths,
      searchable: false,
    },
    {
      id: "upah",
      header: "Upah/Bln",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (d) => <span>{rupiah.format(Number(d.monthlyWage))}</span>,
      sortValue: (d) => Number(d.monthlyWage),
      searchable: false,
    },
    {
      id: "gross",
      header: "Bruto",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (d) => <span>{rupiah.format(Number(d.gross))}</span>,
      sortValue: (d) => Number(d.gross),
      searchable: false,
    },
    {
      id: "pph",
      header: "PPh 21",
      headerClassName: "text-right",
      cellClassName: "text-right text-red-600",
      render: (d) => <span>{rupiah.format(Number(d.pph))}</span>,
      sortValue: (d) => Number(d.pph),
      searchable: false,
    },
    {
      id: "net",
      header: "Bersih",
      headerClassName: "text-right",
      cellClassName: "text-right font-semibold",
      render: (d) => <span>{rupiah.format(Number(d.net))}</span>,
      sortValue: (d) => Number(d.net),
      searchable: false,
    },
    {
      id: "slip",
      header: "Slip",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (d) =>
        ["FINAL", "DITERBITKAN"].includes(run.status) ? (
          <Link href={`/payroll/thr/slip/${encodeURIComponent(d.number)}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
            Slip
          </Link>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">THR {run.holidayName} {run.year}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Raya {run.holidayDate} • Bayar {run.payDate}
              {run.late ? <span className="ml-2 font-medium text-red-600"> (lewat H-7, denda 5% bila terlambat bayar)</span> : null}
              {" • "}{run.status.replaceAll("_", " ")} • {run.employeeCount} karyawan • Total {rupiah.format(Number(run.totalNet))}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["DRAF", "DIHITUNG"].includes(run.status) ? (
              <button type="button" onClick={() => runAction(calculateThrRun(run.id))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
                Hitung
              </button>
            ) : null}
            {run.status === "DIHITUNG" ? (
              <button type="button" onClick={() => runAction(finalizeThrRun(run.id))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-amber-600 px-3 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-70">
                Finalisasi (Kunci)
              </button>
            ) : null}
            {run.status === "FINAL" ? (
              <button type="button" onClick={() => runAction(publishThrRun(run.id))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70">
                Terbitkan Slip THR
              </button>
            ) : null}
            {["DIHITUNG", "FINAL", "DITERBITKAN"].includes(run.status) ? (
              <a href={`/api/payroll/disburse?thrId=${run.id}`} className="inline-flex h-9 items-center rounded-lg border border-blue-200 px-3 text-sm hover:bg-blue-50">
                Unduh CSV Bank
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="mt-2">
          <DataTable
            data={detail}
            columns={kolomThrDetail}
            getRowId={(d) => d.id}
            emptyMessage="Belum ada detail. Klik “Hitung”."
          />
        </div>
      </div>
    </div>
  );
}
