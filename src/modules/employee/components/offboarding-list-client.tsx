"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
  ajukanOffboarding,
  batalkanOffboarding,
  buatOffboarding,
  hapusOffboarding,
} from "../actions/offboarding.actions";

export default function OffboardingListClient({
  userId,
  items,
  karyawanOptions,
}: {
  userId: string;
  items: Array<{
    id: string;
    karyawanNama: string;
    tanggalRencana: string;
    status: string;
    clearanceSelesai: string;
  }>;
  karyawanOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [karyawanId, setKaryawanId] = useState("");
  const [rencana, setRencana] = useState("");
  const [alasan, setAlasan] = useState("");

  function runAction(action: Promise<{ success: boolean; message: string; id?: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  function handleBuat() {
    if (!karyawanId || !rencana || !alasan.trim()) {
      toast.error("Karyawan, tanggal rencana, dan alasan wajib diisi.");
      return;
    }
    runAction(buatOffboarding({ karyawanId, tanggalRencana: rencana, alasan }, userId));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Buatkan Pengajuan (HR)</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingSelect name="karyawan" label="Karyawan" value={karyawanId} onValueChange={setKaryawanId} options={karyawanOptions} placeholder="Pilih karyawan" searchable />
          <FloatingInput name="rencana" label="Rencana Resign" type="date" value={rencana} onChange={(e) => setRencana(e.currentTarget.value)} />
          <FloatingInput name="alasan" label="Alasan" value={alasan} onChange={(e) => setAlasan(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={handleBuat} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
            Buat Draf
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 dark:border-blue-900/60">
                <th className="px-4 py-3 text-left font-semibold">Karyawan</th>
                <th className="px-4 py-3 text-left font-semibold">Rencana</th>
                <th className="px-4 py-3 text-right font-semibold">Clearance</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">Belum ada pengajuan.</td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr key={o.id} className="border-b border-blue-100 dark:border-blue-900/60">
                    <td className="px-4 py-3">{o.karyawanNama}</td>
                    <td className="px-4 py-3">{o.tanggalRencana}</td>
                    <td className="px-4 py-3 text-right">{o.clearanceSelesai}</td>
                    <td className="px-4 py-3">{o.status.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <Link href={`/employees/offboarding/${o.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
                          Buka
                        </Link>
                        {o.status === "DIAJUKAN" ? (
                          <button type="button" disabled={isPending} onClick={() => runAction(ajukanOffboarding(o.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
                            Ajukan
                          </button>
                        ) : null}
                        {["DIAJUKAN", "MENUNGGU_APPROVAL"].includes(o.status) ? (
                          <button type="button" disabled={isPending} onClick={() => runAction(batalkanOffboarding(o.id, userId))} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                            Batal
                          </button>
                        ) : null}
                        {["DITOLAK", "DIBATALKAN"].includes(o.status) ? (
                          <button type="button" disabled={isPending} onClick={() => { if (!confirm("Hapus data ini?")) return; runAction(hapusOffboarding(o.id, userId)); }} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
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
