"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import { buatThrRun, hapusThrRun, type ThrRunItem } from "../actions/thr.actions";

const rupiah = new Intl.NumberFormat("id-ID");

const HARI_RAYA_OPSI = ["Idul Fitri", "Idul Adha", "Natal", "Nyepi", "Waisak", "Imlek"];

export default function ThrListClient({ runs }: { runs: ThrRunItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const [nama, setNama] = useState(HARI_RAYA_OPSI[0]);
  const [tglRaya, setTglRaya] = useState("");
  const [tglBayar, setTglBayar] = useState("");

  function handleBuat() {
    if (!tglRaya || !tglBayar) {
      toast.error("Tanggal hari raya dan tanggal bayar wajib diisi.");
      return;
    }
    startTransition(async () => {
      const result = await buatThrRun({
        tahun: Number(tahun),
        namaHariRaya: nama,
        tanggalHariRaya: tglRaya,
        tanggalBayar: tglBayar,
      });
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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Buat THR Baru</h2>
        <p className="mt-1 text-xs text-slate-500">
          Nominal: ≥12 bulan masa kerja → 1x upah (gapok + tunjangan tetap); &lt;12 bulan → prorata. Bayar paling lambat H-7 (denda 5% bila telat).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <FloatingInput name="tahun" label="Tahun" value={tahun} onChange={(e) => setTahun(e.currentTarget.value)} />
          <div className="flex flex-col gap-1">
            <label htmlFor="thr-nama" className="text-xs font-medium text-slate-500">Hari Raya</label>
            <select
              id="thr-nama"
              value={nama}
              onChange={(e) => setNama(e.currentTarget.value)}
              className="h-10 rounded-lg border border-blue-200 bg-white px-3 text-sm dark:border-blue-900/60 dark:bg-slate-900"
            >
              {HARI_RAYA_OPSI.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <FloatingInput name="tglRaya" label="Tanggal Hari Raya" type="date" value={tglRaya} onChange={(e) => setTglRaya(e.currentTarget.value)} />
          <FloatingInput name="tglBayar" label="Tanggal Bayar" type="date" value={tglBayar} onChange={(e) => setTglBayar(e.currentTarget.value)} />
          <button type="button" onClick={handleBuat} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
            Buat THR
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 dark:border-blue-900/60">
                <th className="px-4 py-3 text-left font-semibold">THR</th>
                <th className="px-4 py-3 text-left font-semibold">Hari Raya</th>
                <th className="px-4 py-3 text-left font-semibold">Bayar</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Karyawan</th>
                <th className="px-4 py-3 text-right font-semibold">Total Bersih</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    Belum ada THR run.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.id} className="border-b border-blue-100 dark:border-blue-900/60">
                    <td className="px-4 py-3 font-medium">{r.namaHariRaya} {r.tahun}</td>
                    <td className="px-4 py-3">{r.tanggalHariRaya}</td>
                    <td className="px-4 py-3">
                      {r.tanggalBayar}
                      {r.terlambat ? (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">lewat H-7</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{r.status.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3 text-right">{r.jumlahKaryawan}</td>
                    <td className="px-4 py-3 text-right">{rupiah.format(Number(r.totalBersih))}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Link href={`/payroll/thr/${r.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
                          Buka
                        </Link>
                        {["DRAF", "DIHITUNG"].includes(r.status) ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              if (!confirm("Hapus THR run ini?")) return;
                              startTransition(async () => {
                                const result = await hapusThrRun(r.id);
                                if (!result.success) {
                                  toast.error(result.message);
                                  return;
                                }
                                toast.success(result.message);
                                router.refresh();
                              });
                            }}
                            className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            Hapus
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
