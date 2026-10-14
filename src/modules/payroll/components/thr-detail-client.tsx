"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import {
  finalisasiThrRun,
  hitungThrRun,
  terbitkanThrRun,
  type ThrDetailItem,
  type ThrRunItem,
} from "../actions/thr.actions";

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

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">THR {run.namaHariRaya} {run.tahun}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Raya {run.tanggalHariRaya} • Bayar {run.tanggalBayar}
              {run.terlambat ? <span className="ml-2 font-medium text-red-600"> (lewat H-7, denda 5% bila terlambat bayar)</span> : null}
              {" • "}{run.status.replaceAll("_", " ")} • {run.jumlahKaryawan} karyawan • Total {rupiah.format(Number(run.totalBersih))}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["DRAF", "DIHITUNG"].includes(run.status) ? (
              <button type="button" onClick={() => runAction(hitungThrRun(run.id))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
                Hitung
              </button>
            ) : null}
            {run.status === "DIHITUNG" ? (
              <button type="button" onClick={() => runAction(finalisasiThrRun(run.id))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-amber-600 px-3 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-70">
                Finalisasi (Kunci)
              </button>
            ) : null}
            {run.status === "FINAL" ? (
              <button type="button" onClick={() => runAction(terbitkanThrRun(run.id))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70">
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 dark:border-blue-900/60">
                <th className="px-4 py-3 text-left font-semibold">Karyawan</th>
                <th className="px-4 py-3 text-right font-semibold">Masa</th>
                <th className="px-4 py-3 text-right font-semibold">Upah/Bln</th>
                <th className="px-4 py-3 text-right font-semibold">Bruto</th>
                <th className="px-4 py-3 text-right font-semibold">PPh 21</th>
                <th className="px-4 py-3 text-right font-semibold">Bersih</th>
                <th className="px-4 py-3 text-right font-semibold">Slip</th>
              </tr>
            </thead>
            <tbody>
              {detail.map((d) => (
                <tr key={d.id} className="border-b border-blue-100 dark:border-blue-900/60">
                  <td className="px-4 py-3">
                    {d.karyawanNama} <span className="text-xs text-slate-500">({d.nomorKaryawan})</span>
                    <details className="mt-1 text-xs text-slate-500">
                      <summary className="cursor-pointer">Rincian</summary>
                      <ul className="mt-1 space-y-1">
                        {d.rincian.map((r) => (
                          <li key={r.kode} className="flex justify-between gap-4">
                            <span>
                              {r.nama} {r.keterangan ? `(${r.keterangan})` : ""}
                            </span>
                            <span className={r.kelompok === "POTONGAN" || r.kelompok === "IURAN" ? "text-red-600" : "text-emerald-700"}>
                              {rupiah.format(r.jumlah)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                  <td className="px-4 py-3 text-right">{d.masaKerjaBulan} bln</td>
                  <td className="px-4 py-3 text-right">{rupiah.format(Number(d.upahSebulan))}</td>
                  <td className="px-4 py-3 text-right">{rupiah.format(Number(d.bruto))}</td>
                  <td className="px-4 py-3 text-right text-red-600">{rupiah.format(Number(d.pph21))}</td>
                  <td className="px-4 py-3 text-right font-semibold">{rupiah.format(Number(d.bersih))}</td>
                  <td className="px-4 py-3 text-right">
                    {["FINAL", "DITERBITKAN"].includes(run.status) ? (
                      <Link href={`/payroll/thr/slip/${encodeURIComponent(d.nomor)}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
                        Slip
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
