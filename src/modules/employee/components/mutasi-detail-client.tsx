"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import { ajukanMutasi, batalkanMutasi, hapusMutasi, terapkanMutasi, type MutasiDetail } from "../actions/mutasi.actions";

function Baris({ kiri, kanan }: { kiri: string; kanan: string }) {
  return (
    <li className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-slate-500">{kiri}</span>
      <span className="text-right font-medium">{kanan}</span>
    </li>
  );
}

export default function MutasiDetailClient({
  userId,
  bolehTerapkan,
  detail,
}: {
  userId: string;
  bolehTerapkan: boolean;
  detail: MutasiDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
              {detail.jenisLabel} • {detail.nomor}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {detail.karyawanNama} • Efektif {detail.tanggalEfektif} • {detail.status.replaceAll("_", " ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {detail.status === "DRAFT" ? (
              <button type="button" onClick={() => runAction(ajukanMutasi(detail.id, userId))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
                Ajukan
              </button>
            ) : null}
            {detail.status === "DISETUJUI" && bolehTerapkan ? (
              <button type="button" onClick={() => { if (!confirm("Terapkan ke penempatan sekarang?")) return; runAction(terapkanMutasi(detail.id, userId)); }} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70">
                Terapkan
              </button>
            ) : null}
            {["DRAFT", "DIAJUKAN"].includes(detail.status) ? (
              <button type="button" onClick={() => runAction(batalkanMutasi(detail.id, userId))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg border border-amber-200 px-3 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                Batalkan
              </button>
            ) : null}
            {["DRAFT", "DITOLAK", "DIBATALKAN"].includes(detail.status) ? (
              <button type="button" onClick={() => { if (!confirm("Hapus usulan ini?")) return; runAction(hapusMutasi(detail.id, userId)); }} disabled={isPending} className="inline-flex h-9 items-center rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
                Hapus
              </button>
            ) : null}
            {["DISETUJUI", "DITERAPKAN"].includes(detail.status) ? (
              <Link href={`/employees/mutasi/${detail.id}/surat`} className="inline-flex h-9 items-center rounded-lg border border-blue-200 px-3 text-sm hover:bg-blue-50">
                Surat
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
          <h3 className="font-semibold">Dari → Ke</h3>
          <ul className="mt-2">
            <Baris kiri="Dari" kanan={detail.dari} />
            <Baris kiri="Ke" kanan={detail.ke} />
            <Baris kiri="Atasan baru" kanan={detail.keAtasanNama ?? "(tetap)"} />
            <Baris kiri="Alasan" kanan={detail.alasan} />
            <Baris kiri="Diajukan" kanan={detail.diajukanPada ?? "-"} />
            <Baris kiri="Diterapkan" kanan={detail.diterapkanPada ?? "-"} />
          </ul>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
          <h3 className="font-semibold">Jejak Persetujuan</h3>
          {detail.steps.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Belum diajukan.</p>
          ) : (
            <ul className="mt-2">
              {detail.steps.map((s) => (
                <Baris
                  key={s.tahap}
                  kiri={`Tahap ${s.tahap}${s.catatan ? ` — ${s.catatan}` : ""}`}
                  kanan={`${s.status}${s.diprosesPada ? ` • ${new Date(s.diprosesPada).toLocaleString("id-ID")}` : ""}`}
                />
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Persetujuan atasan → HR diproses lewat Approval Center; keputusan final diteruskan otomatis ke sini.
          </p>
        </div>
      </div>
    </div>
  );
}
