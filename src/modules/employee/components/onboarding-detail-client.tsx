"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
  batalkanOnboarding,
  centangItem,
  hapusOnboarding,
  tambahItem,
  tutupOnboarding,
  verifikasiItem,
  type OnboardingDetail,
} from "../actions/onboarding.actions";

const KATEGORI_OPTIONS = [
  { value: "DOKUMEN", label: "Dokumen" },
  { value: "AKUN", label: "Akun" },
  { value: "ASET", label: "Aset" },
  { value: "ORIENTASI", label: "Orientasi" },
  { value: "LAINNYA", label: "Lainnya" },
];

const STATUS_WARNA: Record<string, string> = {
  BELUM: "bg-slate-100 text-slate-600",
  SELESAI: "bg-amber-100 text-amber-700",
  TERVERIFIKASI: "bg-emerald-100 text-emerald-700",
};

export default function OnboardingDetailClient({
  userId,
  detail,
  bolehVerifikasi,
  bolehKelolaHr,
}: {
  userId: string;
  detail: OnboardingDetail;
  bolehVerifikasi: boolean;
  bolehKelolaHr: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [judul, setJudul] = useState("");
  const [kategori, setKategori] = useState("LAINNYA");
  const [wajib, setWajib] = useState(true);

  function runAction(action: Promise<{ success: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  const berjalan = detail.status === "BERJALAN";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {detail.karyawanNama} • {detail.persen}%
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {detail.templateNama ?? "Kustom"} • {detail.status.replaceAll("_", " ")}
              {detail.targetSelesai ? ` • target ${detail.targetSelesai}` : ""}
            </p>
          </div>
          {bolehKelolaHr && berjalan ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => runAction(tutupOnboarding(detail.id, userId))} disabled={isPending || !detail.bisaSelesai} title={detail.bisaSelesai ? "" : "Semua item wajib harus terverifikasi"} className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                Tutup
              </button>
              <button type="button" onClick={() => runAction(batalkanOnboarding(detail.id, userId))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg border border-amber-200 px-3 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                Batalkan
              </button>
            </div>
          ) : null}
          {bolehKelolaHr && detail.status === "DIBATALKAN" ? (
            <button type="button" onClick={() => { if (!confirm("Hapus onboarding ini?")) return; runAction(hapusOnboarding(detail.id, userId)); }} disabled={isPending} className="inline-flex h-9 items-center rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
              Hapus
            </button>
          ) : null}
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${detail.persen}%` }} />
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <ul className="divide-y divide-blue-100 dark:divide-blue-900/60">
          {detail.items.map((it) => (
            <li key={it.id} className="flex flex-wrap items-center gap-3 py-3">
              <input
                type="checkbox"
                checked={it.status !== "BELUM"}
                disabled={isPending || !berjalan || (it.status === "TERVERIFIKASI" && !bolehKelolaHr)}
                onChange={(e) => runAction(centangItem(it.id, e.currentTarget.checked, userId))}
                className="h-5 w-5"
                title={it.status === "TERVERIFIKASI" && !bolehKelolaHr ? "Sudah terverifikasi" : it.judul}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{it.judul} {it.wajib ? <span className="text-red-500">*</span> : null}</p>
                <p className="text-xs text-slate-500">{it.kategori}{it.catatan ? ` • ${it.catatan}` : ""}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_WARNA[it.status] ?? STATUS_WARNA.BELUM}`}>
                {it.status}
              </span>
              {bolehVerifikasi && berjalan && it.status === "SELESAI" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(verifikasiItem(it.id, userId))}
                  className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                >
                  Verifikasi
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {bolehKelolaHr && berjalan ? (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-blue-100 pt-4 md:grid-cols-4 dark:border-blue-900/60">
            <FloatingInput name="judul" label="Item tambahan" value={judul} onChange={(e) => setJudul(e.currentTarget.value)} />
            <FloatingSelect name="kategori" label="Kategori" value={kategori} onValueChange={setKategori} options={KATEGORI_OPTIONS} searchable={false} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={wajib} onChange={() => setWajib((v) => !v)} className="h-4 w-4" />
              Wajib
            </label>
            <div className="flex items-end">
              <button
                type="button"
                disabled={isPending || !judul.trim()}
                onClick={() => runAction(tambahItem(detail.id, { judul, kategori, wajib }, userId).then((r) => { if (r.success) { setJudul(""); } return r; }))}
                className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Tambah
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
