"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
  ajukanReview,
  batalkanReview,
  finalisasiReview,
  hapusReview,
  nilaiReview,
} from "../actions/probation.actions";

const HASIL_OPTIONS = [
  { value: "LULUS", label: "Lulus — menjadi AKTIF" },
  { value: "PERPANJANG", label: "Diperpanjang" },
  { value: "TIDAK_LULUS", label: "Tidak Lulus — DIHENTIKAN" },
];

export default function ProbationDetailClient({
  userId,
  detail,
  bolehNilai,
  bolehFinalisasi,
}: {
  userId: string;
  detail: {
    id: string;
    karyawanNama: string;
    tanggalMulai: string;
    tanggalSelesai: string;
    sisaHari: number;
    status: string;
    hasil: string | null;
    hasilLabel: string | null;
    nilai: number | null;
    catatan: string | null;
    tanggalSelesaiBaru: string | null;
    steps: Array<{ tahap: number; status: string; catatan: string | null; diprosesPada: string | null }>;
  };
  bolehNilai: boolean;
  bolehFinalisasi: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hasil, setHasil] = useState(detail.hasil ?? "LULUS");
  const [nilai, setNilai] = useState(detail.nilai !== null && detail.nilai !== undefined ? String(detail.nilai) : "");
  const [catatan, setCatatan] = useState(detail.catatan ?? "");
  const [tglBaru, setTglBaru] = useState(detail.tanggalSelesaiBaru ?? "");

  function runAction(action: Promise<{ success: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  const bisaDinilai = bolehNilai && ["DIAJUKAN", "MENUNGGU_APPROVAL"].includes(detail.status);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{detail.karyawanNama}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {detail.tanggalMulai} – {detail.tanggalSelesai} • {detail.status.replaceAll("_", " ")}
              {detail.hasilLabel ? ` • ${detail.hasilLabel}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {detail.status === "DRAFT" ? (
              <button type="button" onClick={() => runAction(ajukanReview(detail.id, userId))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
                Ajukan
              </button>
            ) : null}
            {detail.status === "DISETUJUI" && bolehFinalisasi ? (
              <button type="button" onClick={() => { if (!confirm("Finalisasi? Efek (AKTIF/perpanjang/berhenti) langsung berlaku.")) return; runAction(finalisasiReview(detail.id, userId)); }} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70">
                Finalisasi
              </button>
            ) : null}
            {["DRAFT", "DIAJUKAN"].includes(detail.status) ? (
              <button type="button" onClick={() => runAction(batalkanReview(detail.id, userId))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg border border-amber-200 px-3 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                Batalkan
              </button>
            ) : null}
            {["DRAFT", "DITOLAK", "DIBATALKAN"].includes(detail.status) ? (
              <button type="button" onClick={() => { if (!confirm("Hapus review ini?")) return; runAction(hapusReview(detail.id, userId)); }} disabled={isPending} className="inline-flex h-9 items-center rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
                Hapus
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
          <h3 className="font-semibold">Penilaian Atasan</h3>
          {!bisaDinilai ? (
            <p className="mt-2 text-sm text-slate-500">
              {detail.hasilLabel ? `Hasil: ${detail.hasilLabel}${detail.nilai ? ` (nilai ${detail.nilai}/5)` : ""}` : "Belum dinilai."}
              {detail.catatan ? ` — ${detail.catatan}` : ""}
            </p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <FloatingSelect name="hasil" label="Hasil" value={hasil} onValueChange={setHasil} options={HASIL_OPTIONS} searchable={false} />
                <FloatingInput name="nilai" label="Nilai 1–5 (opsional)" type="number" value={nilai} onChange={(e) => setNilai(e.currentTarget.value)} />
                <FloatingInput name="catatan" label="Catatan" value={catatan} onChange={(e) => setCatatan(e.currentTarget.value)} />
                {hasil === "PERPANJANG" ? (
                  <FloatingInput name="tglBaru" label="Selesai Baru" type="date" value={tglBaru} onChange={(e) => setTglBaru(e.currentTarget.value)} />
                ) : null}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => runAction(nilaiReview(detail.id, { hasil, nilai: nilai === "" ? null : Number(nilai), catatan, tanggalSelesaiBaru: tglBaru }, userId))}
                  disabled={isPending}
                  className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
                >
                  Simpan Penilaian
                </button>
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
          <h3 className="font-semibold">Jejak Persetujuan</h3>
          {detail.steps.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Belum diajukan.</p>
          ) : (
            <ul className="mt-2">
              {detail.steps.map((s) => (
                <li key={s.tahap} className="flex justify-between gap-4 py-1 text-sm">
                  <span className="text-slate-500">Tahap {s.tahap}{s.catatan ? ` — ${s.catatan}` : ""}</span>
                  <span className="font-medium">{s.status}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Persetujuan lewat Approval Center; finalisasi oleh HR memicu efek status.
          </p>
        </div>
      </div>
    </div>
  );
}
