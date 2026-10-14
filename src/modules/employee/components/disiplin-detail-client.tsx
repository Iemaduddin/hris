"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import {
  cabutDisiplin,
  hapusDisiplin,
  terbitkanDisiplin,
  type DisiplinDetail,
} from "../actions/disiplin.actions";

export default function DisiplinDetailClient({
  userId,
  detail,
  bolehTerbit,
}: {
  userId: string;
  detail: DisiplinDetail;
  bolehTerbit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [alasan, setAlasan] = useState("");

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
              {detail.tingkatLabel} • {detail.nomor}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {detail.karyawanNama} • {detail.status.replaceAll("_", " ")}
              {detail.aktif ? " • masih berlaku" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {detail.status === "DRAFT" && bolehTerbit ? (
              <button type="button" onClick={() => runAction(terbitkanDisiplin(detail.id, userId))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70">
                Terbitkan
              </button>
            ) : null}
            {detail.status === "DRAFT" ? (
              <button type="button" onClick={() => { if (!confirm("Hapus draf ini?")) return; runAction(hapusDisiplin(detail.id, userId)); }} disabled={isPending} className="inline-flex h-9 items-center rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
                Hapus
              </button>
            ) : null}
            {detail.status !== "DRAFT" ? (
              <Link href={`/employees/disiplin/${detail.id}/surat`} className="inline-flex h-9 items-center rounded-lg border border-blue-200 px-3 text-sm hover:bg-blue-50">
                Surat
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <ul className="space-y-1 text-sm">
          <li className="flex justify-between gap-4"><span className="text-slate-500">Judul</span><span className="text-right font-medium">{detail.judul}</span></li>
          <li className="flex justify-between gap-4"><span className="text-slate-500">Pelanggaran</span><span className="text-right font-medium">{detail.pelanggaran}{detail.pelanggaranBerat ? " (berat)" : ""}</span></li>
          <li className="flex justify-between gap-4"><span className="text-slate-500">Terbit</span><span className="font-medium">{detail.tanggalTerbit}</span></li>
          <li className="flex justify-between gap-4"><span className="text-slate-500">Berlaku s/d</span><span className="font-medium">{detail.berlakuSampai ?? "-"}</span></li>
          {detail.tanggalSkorsingMulai ? (
            <li className="flex justify-between gap-4"><span className="text-slate-500">Skorsing</span><span className="font-medium">{detail.tanggalSkorsingMulai} s/d {detail.tanggalSkorsingSelesai}</span></li>
          ) : null}
          <li className="flex justify-between gap-4"><span className="text-slate-500">Ditandatangani karyawan</span><span className="font-medium">{detail.ttdKaryawanPada ? `${detail.ttdKaryawanNama} • ${new Date(detail.ttdKaryawanPada).toLocaleString("id-ID")}` : "-"}</span></li>
          {detail.dokumenUrl ? (
            <li className="flex justify-between gap-4"><span className="text-slate-500">Dokumen</span><a href={`/api/files/${detail.dokumenUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Buka</a></li>
          ) : null}
          {detail.alasanCabut ? (
            <li className="flex justify-between gap-4"><span className="text-slate-500">Alasan cabut</span><span className="font-medium">{detail.alasanCabut}</span></li>
          ) : null}
          {detail.catatan ? (
            <li className="flex justify-between gap-4"><span className="text-slate-500">Catatan</span><span className="font-medium">{detail.catatan}</span></li>
          ) : null}
        </ul>

        {detail.status === "DITERBITKAN" && bolehTerbit ? (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-blue-100 pt-4 md:grid-cols-2 dark:border-blue-900/60">
            <FloatingInput name="alasan" label="Alasan pencabutan" value={alasan} onChange={(e) => setAlasan(e.currentTarget.value)} />
            <div className="flex items-end">
              <button
                type="button"
                disabled={isPending || !alasan.trim()}
                onClick={() => runAction(cabutDisiplin(detail.id, alasan, userId))}
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
