"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
  submitReview,
  cancelReview,
  finalizeReview,
  deleteReview,
  gradeReview,
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
    employeeName: string;
    startDate: string;
    endDate: string;
    remainingDays: number;
    status: string;
    result: string | null;
    resultLabel: string | null;
    score: number | null;
    note: string | null;
    newEndDate: string | null;
    steps: Array<{ stage: number; status: string; note: string | null; processedAt: string | null }>;
  };
  bolehNilai: boolean;
  bolehFinalisasi: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hasil, setHasil] = useState(detail.result ?? "LULUS");
  const [nilai, setNilai] = useState(detail.score !== null && detail.score !== undefined ? String(detail.score) : "");
  const [catatan, setCatatan] = useState(detail.note ?? "");
  const [tglBaru, setTglBaru] = useState(detail.newEndDate ?? "");

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
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{detail.employeeName}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {detail.startDate} – {detail.endDate} • {detail.status.replaceAll("_", " ")}
              {detail.resultLabel ? ` • ${detail.resultLabel}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {detail.status === "DRAFT" ? (
              <button type="button" onClick={() => runAction(submitReview(detail.id, userId))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
                Ajukan
              </button>
            ) : null}
            {detail.status === "DISETUJUI" && bolehFinalisasi ? (
              <button type="button" onClick={() => { if (!confirm("Finalisasi? Efek (AKTIF/perpanjang/berhenti) langsung berlaku.")) return; runAction(finalizeReview(detail.id, userId)); }} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70">
                Finalisasi
              </button>
            ) : null}
            {["DRAFT", "DIAJUKAN"].includes(detail.status) ? (
              <button type="button" onClick={() => runAction(cancelReview(detail.id, userId))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg border border-amber-200 px-3 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                Batalkan
              </button>
            ) : null}
            {["DRAFT", "DITOLAK", "DIBATALKAN"].includes(detail.status) ? (
              <button type="button" onClick={() => { if (!confirm("Hapus review ini?")) return; runAction(deleteReview(detail.id, userId)); }} disabled={isPending} className="inline-flex h-9 items-center rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
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
              {detail.resultLabel ? `Hasil: ${detail.resultLabel}${detail.score ? ` (nilai ${detail.score}/5)` : ""}` : "Belum dinilai."}
              {detail.note ? ` — ${detail.note}` : ""}
            </p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <FloatingSelect name="result" label="Hasil" value={hasil} onValueChange={setHasil} options={HASIL_OPTIONS} searchable={false} />
                <FloatingInput name="nilai" label="Nilai 1–5 (opsional)" type="number" value={nilai} onChange={(e) => setNilai(e.currentTarget.value)} />
                <FloatingInput name="note" label="Catatan" value={catatan} onChange={(e) => setCatatan(e.currentTarget.value)} />
                {hasil === "PERPANJANG" ? (
                  <FloatingInput name="tglBaru" label="Selesai Baru" type="date" value={tglBaru} onChange={(e) => setTglBaru(e.currentTarget.value)} />
                ) : null}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => runAction(gradeReview(detail.id, { result: hasil, score: nilai === "" ? null : Number(nilai), note: catatan, newEndDate: tglBaru }, userId))}
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
                <li key={s.stage} className="flex justify-between gap-4 py-1 text-sm">
                  <span className="text-slate-500">Tahap {s.stage}{s.note ? ` — ${s.note}` : ""}</span>
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
