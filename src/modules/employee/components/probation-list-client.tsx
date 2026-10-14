"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
  ajukanReview,
  batalkanReview,
  buatManual,
  generateDariProbasi,
  hapusReview,
} from "../actions/probation.actions";

export default function ProbationListClient({
  userId,
  items,
  karyawanOptions,
}: {
  userId: string;
  items: Array<{
    id: string;
    karyawanNama: string;
    tanggalMulai: string;
    tanggalSelesai: string;
    sisaHari: number;
    status: string;
    hasil: string | null;
  }>;
  karyawanOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [karyawanId, setKaryawanId] = useState("");
  const [mulai, setMulai] = useState("");
  const [selesai, setSelesai] = useState("");

  function runAction(action: Promise<{ success: boolean; message: string; id?: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Review Baru</h2>
          <button
            type="button"
            onClick={() => runAction(generateDariProbasi(userId))}
            disabled={isPending}
            className="inline-flex h-9 items-center rounded-lg border border-emerald-200 px-3 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            Generate dari Karyawan Probasi
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <FloatingSelect name="karyawan" label="Karyawan Probasi" value={karyawanId} onValueChange={setKaryawanId} options={karyawanOptions} placeholder="Pilih karyawan" searchable />
          <FloatingInput name="mulai" label="Tanggal Mulai" type="date" value={mulai} onChange={(e) => setMulai(e.currentTarget.value)} />
          <FloatingInput name="selesai" label="Tanggal Selesai" type="date" value={selesai} onChange={(e) => setSelesai(e.currentTarget.value)} />
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                if (!karyawanId || !mulai || !selesai) {
                  toast.error("Karyawan dan rentang tanggal wajib diisi.");
                  return;
                }
                runAction(buatManual({ karyawanId, tanggalMulai: mulai, tanggalSelesai: selesai }, userId));
              }}
              disabled={isPending}
              className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
            >
              Buat Draf
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 dark:border-blue-900/60">
                <th className="px-4 py-3 text-left font-semibold">Karyawan</th>
                <th className="px-4 py-3 text-left font-semibold">Periode</th>
                <th className="px-4 py-3 text-right font-semibold">Sisa</th>
                <th className="px-4 py-3 text-left font-semibold">Hasil</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Belum ada review.</td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id} className="border-b border-blue-100 dark:border-blue-900/60">
                    <td className="px-4 py-3">{r.karyawanNama}</td>
                    <td className="px-4 py-3">{r.tanggalMulai} – {r.tanggalSelesai}</td>
                    <td className={`px-4 py-3 text-right font-medium ${r.sisaHari < 0 ? "text-red-600" : r.sisaHari <= 7 ? "text-amber-600" : ""}`}>
                      {r.sisaHari < 0 ? `lewat ${-r.sisaHari} hari` : `${r.sisaHari} hari`}
                    </td>
                    <td className="px-4 py-3">{r.hasil?.replaceAll("_", " ") ?? "-"}</td>
                    <td className="px-4 py-3">{r.status.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <Link href={`/employees/probation/${r.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
                          Buka
                        </Link>
                        {r.status === "DRAFT" ? (
                          <button type="button" disabled={isPending} onClick={() => runAction(ajukanReview(r.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
                            Ajukan
                          </button>
                        ) : null}
                        {["DRAFT", "DIAJUKAN"].includes(r.status) ? (
                          <button type="button" disabled={isPending} onClick={() => runAction(batalkanReview(r.id, userId))} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                            Batal
                          </button>
                        ) : null}
                        {["DRAFT", "DITOLAK", "DIBATALKAN"].includes(r.status) ? (
                          <button type="button" disabled={isPending} onClick={() => { if (!confirm("Hapus review ini?")) return; runAction(hapusReview(r.id, userId)); }} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
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
