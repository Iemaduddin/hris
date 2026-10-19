"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import {
  revokeDisciplinaryAction,
  deleteDisciplinaryAction,
  publishDisiplin,
  type DisciplinaryActionDetail,
} from "../actions/disciplinary.actions";

export default function DisciplinaryActionDetailClient({
  userId,
  detail,
  bolehTerbit,
}: {
  userId: string;
  detail: DisciplinaryActionDetail;
  bolehTerbit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setAlasan] = useState("");

  function runAction(action: Promise<{ success: boolean; message: string }>) {
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
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {detail.levelLabel} • {detail.number}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {detail.employeeName} • {detail.status.replaceAll("_", " ")}
              {detail.active ? " • masih berlaku" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {detail.status === "DRAFT" && bolehTerbit ? (
              <button type="button" onClick={() => runAction(publishDisiplin(detail.id, userId))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70">
                Terbitkan
              </button>
            ) : null}
            {detail.status === "DRAFT" ? (
              <button type="button" onClick={() => { if (!confirm("Hapus draf ini?")) return; runAction(deleteDisciplinaryAction(detail.id, userId)); }} disabled={isPending} className="inline-flex h-9 items-center rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
                Hapus
              </button>
            ) : null}
            {detail.status !== "DRAFT" ? (
              <Link href={`/employees/disciplinary-actions/${detail.id}/letters`} className="inline-flex h-9 items-center rounded-lg border border-blue-200 px-3 text-sm hover:bg-blue-50">
                Surat
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <ul className="space-y-1 text-sm">
          <li className="flex justify-between gap-4"><span className="text-slate-500">Judul</span><span className="text-right font-medium">{detail.title}</span></li>
          <li className="flex justify-between gap-4"><span className="text-slate-500">Pelanggaran</span><span className="text-right font-medium">{detail.violation}{detail.seriousViolation ? " (berat)" : ""}</span></li>
          <li className="flex justify-between gap-4"><span className="text-slate-500">Terbit</span><span className="font-medium">{detail.publishedAt}</span></li>
          <li className="flex justify-between gap-4"><span className="text-slate-500">Berlaku s/d</span><span className="font-medium">{detail.validUntil ?? "-"}</span></li>
          {detail.suspensionStart ? (
            <li className="flex justify-between gap-4"><span className="text-slate-500">Skorsing</span><span className="font-medium">{detail.suspensionStart} s/d {detail.suspensionEnd}</span></li>
          ) : null}
          <li className="flex justify-between gap-4"><span className="text-slate-500">Ditandatangani karyawan</span><span className="font-medium">{detail.employeeSignedAt ? `${detail.employeeSignedName} • ${new Date(detail.employeeSignedAt).toLocaleString("id-ID")}` : "-"}</span></li>
          {detail.documentUrl ? (
            <li className="flex justify-between gap-4"><span className="text-slate-500">Dokumen</span><a href={`/api/files/${detail.documentUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Buka</a></li>
          ) : null}
          {detail.revokeReason ? (
            <li className="flex justify-between gap-4"><span className="text-slate-500">Alasan cabut</span><span className="font-medium">{detail.revokeReason}</span></li>
          ) : null}
          {detail.note ? (
            <li className="flex justify-between gap-4"><span className="text-slate-500">Catatan</span><span className="font-medium">{detail.note}</span></li>
          ) : null}
        </ul>

        {detail.status === "DITERBITKAN" && bolehTerbit ? (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-blue-100 pt-4 md:grid-cols-2 dark:border-blue-900/60">
            <FloatingInput name="reason" label="Alasan pencabutan" value={reason} onChange={(e) => setAlasan(e.currentTarget.value)} />
            <div className="flex items-end">
              <button
                type="button"
                disabled={isPending || !reason.trim()}
                onClick={() => runAction(revokeDisciplinaryAction(detail.id, reason, userId))}
                className="inline-flex h-10 items-center rounded-lg border border-red-200 px-4 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Cabut Surat
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
