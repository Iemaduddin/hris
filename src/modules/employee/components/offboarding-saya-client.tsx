"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import { ajukanOffboarding, batalkanOffboarding, buatOffboarding } from "@/src/modules/employee/actions/offboarding.actions";

export default function OffboardingSayaClient({
  userId,
  karyawanId,
  items,
}: {
  userId: string;
  karyawanId: string;
  items: Array<{ id: string; tanggalRencana: string; status: string; nomorPaklaring: string | null }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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
    if (!rencana || !alasan.trim()) {
      toast.error("Tanggal rencana dan alasan wajib diisi.");
      return;
    }
    startTransition(async () => {
      const buat = await buatOffboarding({ karyawanId, tanggalRencana: rencana, alasan }, userId);
      if (!buat.success) {
        toast.error(buat.message);
        return;
      }
      toast.success(buat.message);
      setAlasan("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ajukan Resign</h2>
        <p className="mt-1 text-xs text-slate-500">
          Diajukan ke atasan langsung lalu HR. Setelah disetujui ada tahap clearance sebelum efektif.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <FloatingInput name="rencana" label="Rencana Tanggal Resign" type="date" value={rencana} onChange={(e) => setRencana(e.currentTarget.value)} />
          <FloatingInput name="alasan" label="Alasan" value={alasan} onChange={(e) => setAlasan(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
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
                <th className="px-4 py-3 text-left font-semibold">Rencana</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Paklaring</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">Belum ada pengajuan.</td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr key={o.id} className="border-b border-blue-100 dark:border-blue-900/60">
                    <td className="px-4 py-3 font-medium">{o.tanggalRencana}</td>
                    <td className="px-4 py-3">{o.status.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3">{o.nomorPaklaring ?? "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        {o.status === "DIAJUKAN" ? (
                          <button type="button" disabled={isPending} onClick={() => runAction(ajukanOffboarding(o.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
                            Ajukan
                          </button>
                        ) : null}
                        {["DIAJUKAN", "MENUNGGU_APPROVAL"].includes(o.status) ? (
                          <button type="button" disabled={isPending} onClick={() => runAction(batalkanOffboarding(o.id, userId))} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                            Batalkan
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
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
