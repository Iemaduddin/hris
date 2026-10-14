"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { prosesPengajuanAction } from "@/src/modules/approval/actions/approval.actions";
import { ajukanTukar, batalkanTukar, buatTukar, type TukarItem } from "@/src/modules/roster/actions/tukar.actions";

function Tabel({ judul, items, children }: { judul: string; items: TukarItem[]; children: (t: TukarItem) => React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{judul}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-blue-100 dark:border-blue-900/60">
              <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
              <th className="px-4 py-3 text-left font-semibold">Lawan</th>
              <th className="px-4 py-3 text-left font-semibold">Shift</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">Kosong.</td>
              </tr>
            ) : (
              items.map((t) => (
                <tr key={t.id} className="border-b border-blue-100 dark:border-blue-900/60">
                  <td className="px-4 py-3 font-medium">{t.tanggal}</td>
                  <td className="px-4 py-3">{t.lawanNama}</td>
                  <td className="px-4 py-3 text-xs">{t.shiftSaya} → {t.shiftLawan}</td>
                  <td className="px-4 py-3">{t.status.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 text-right">{children(t)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TukarListClient({
  userId,
  keluar,
  masuk,
  pasanganOptions,
}: {
  userId: string;
  keluar: TukarItem[];
  masuk: TukarItem[];
  pasanganOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pasangan, setPasangan] = useState("");
  const [tanggal, setTanggal] = useState("");
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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ajukan Tukar Shift</h2>
        <p className="mt-1 text-xs text-slate-500">
          Tukar shift satu tanggal: disetujui pasangan dulu, lalu HR (roster langsung bertukar).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <FloatingSelect name="pasangan" label="Tukar Dengan" value={pasangan} onValueChange={setPasangan} options={pasanganOptions} placeholder="Pilih karyawan" searchable />
          <FloatingInput name="tanggal" label="Tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.currentTarget.value)} />
          <FloatingInput name="alasan" label="Alasan" value={alasan} onChange={(e) => setAlasan(e.currentTarget.value)} />
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                if (!pasangan || !tanggal || !alasan.trim()) {
                  toast.error("Pasangan, tanggal, dan alasan wajib diisi.");
                  return;
                }
                runAction(buatTukar({ pasanganKaryawanId: pasangan, tanggal, alasan }, userId));
              }}
              disabled={isPending}
              className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
            >
              Buat Draf
            </button>
          </div>
        </div>
      </div>

      <Tabel judul="Masuk Untuk Saya (perlu persetujuan saya)" items={masuk}>
        {(t) => (
          <div className="inline-flex gap-2">
            {t.status === "MENUNGGU_APPROVAL" ? (
              <>
                <button type="button" disabled={isPending} onClick={() => runAction(prosesPengajuanAction(userId, "TUKAR_SHIFT", t.id, "SETUJU"))} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                  Setuju
                </button>
                <button type="button" disabled={isPending} onClick={() => { const note = prompt("Alasan penolakan:") ?? ""; if (!note) return; runAction(prosesPengajuanAction(userId, "TUKAR_SHIFT", t.id, "TOLAK", note)); }} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
                  Tolak
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-400">-</span>
            )}
          </div>
        )}
      </Tabel>

      <Tabel judul="Pengajuan Saya" items={keluar}>
        {(t) => (
          <div className="inline-flex gap-2">
            {t.status === "DRAFT" ? (
              <button type="button" disabled={isPending} onClick={() => runAction(ajukanTukar(t.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
                Ajukan
              </button>
            ) : null}
            {["DRAFT", "DIAJUKAN"].includes(t.status) ? (
              <button type="button" disabled={isPending} onClick={() => runAction(batalkanTukar(t.id, userId))} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                Batal
              </button>
            ) : (
              <span className="text-xs text-slate-400">-</span>
            )}
          </div>
        )}
      </Tabel>
    </div>
  );
}
