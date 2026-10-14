"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import {
  ajukanOffboarding,
  batalkanOffboarding,
  hapusOffboarding,
  selesaikanClearance,
  selesaikanOffboarding,
  type OffboardingDetail,
} from "../actions/offboarding.actions";

const PIC_LABEL: Record<string, string> = { HR: "HR", FINANCE: "Finance", IT: "IT", ATASAN: "Atasan" };

export default function OffboardingDetailClient({
  userId,
  detail,
  bolehSelesaikan,
}: {
  userId: string;
  detail: OffboardingDetail;
  bolehSelesaikan: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [efektif, setEfektif] = useState(detail.tanggalRencana);
  const [catatan, setCatatan] = useState("");

  function runAction(action: Promise<{ success: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  const clearance = detail.status === "CLEARANCE";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{detail.karyawanNama}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Rencana {detail.tanggalRencana} • {detail.status.replaceAll("_", " ")}
              {detail.nomorPaklaring ? ` • ${detail.nomorPaklaring}` : ""}
            </p>
            <p className="mt-1 text-sm text-slate-500">Alasan: {detail.alasan}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {detail.status === "DIAJUKAN" ? (
              <button type="button" onClick={() => runAction(ajukanOffboarding(detail.id, userId))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
                Ajukan
              </button>
            ) : null}
            {["DIAJUKAN", "MENUNGGU_APPROVAL"].includes(detail.status) ? (
              <button type="button" onClick={() => runAction(batalkanOffboarding(detail.id, userId))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg border border-amber-200 px-3 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                Batalkan
              </button>
            ) : null}
            {["DITOLAK", "DIBATALKAN"].includes(detail.status) && bolehSelesaikan ? (
              <button type="button" onClick={() => { if (!confirm("Hapus data ini?")) return; runAction(hapusOffboarding(detail.id, userId)); }} disabled={isPending} className="inline-flex h-9 items-center rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
                Hapus
              </button>
            ) : null}
            {detail.status === "SELESAI" ? (
              <Link href={`/employees/offboarding/${detail.id}/paklaring`} className="inline-flex h-9 items-center rounded-lg border border-blue-200 px-3 text-sm hover:bg-blue-50">
                Paklaring
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h3 className="font-semibold">Clearance</h3>
        {detail.clearance.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            {detail.status === "DISETUJUI" ? "Menyiapkan checklist…" : "Checklist dibuat setelah disetujui final."}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-blue-100 dark:divide-blue-900/60">
            {detail.clearance.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.judul} {c.wajib ? <span className="text-red-500">*</span> : null}</p>
                  <p className="text-xs text-slate-500">{c.kategori} • PIC {PIC_LABEL[c.picRole] ?? c.picRole}{c.catatan ? ` • ${c.catatan}` : ""}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status === "SELESAI" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {c.status}
                </span>
                {clearance && c.bolehAksi ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runAction(selesaikanClearance(c.id, c.status !== "SELESAI", c.status !== "SELESAI" ? catatan : "", userId))}
                    className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50 disabled:opacity-60"
                  >
                    {c.status === "SELESAI" ? "Buka lagi" : "Selesai"}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {clearance && bolehSelesaikan ? (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-blue-100 pt-4 md:grid-cols-3 dark:border-blue-900/60">
            <FloatingInput name="catatan" label="Catatan penyelesaian (opsional)" value={catatan} onChange={(e) => setCatatan(e.currentTarget.value)} />
            <FloatingInput name="efektif" label="Tanggal Efektif Resign" type="date" value={efektif} onChange={(e) => setEfektif(e.currentTarget.value)} />
            <div className="flex items-end">
              <button
                type="button"
                disabled={isPending || !efektif}
                onClick={() => { if (!confirm("Selesaikan? Status jadi RESIGN, paklaring terbit, akun dinonaktifkan.")) return; runAction(selesaikanOffboarding(detail.id, efektif, userId)); }}
                className="inline-flex h-10 items-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Selesaikan
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
