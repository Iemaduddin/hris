"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { savePayrollSettings, type PayrollSettingItem } from "../actions/payroll.actions";
import {
  ALPHA_DIVISOR_KEY,
  LATE_MONTHLY_CAP_KEY,
  LATE_PER_MINUTE_KEY,
} from "../lib/potongan";
import {
  OVERTIME_DIVISOR_KEY,
  OVERTIME_MAX_HOURS_KEY,
  OVERTIME_TIERED_KEY,
} from "../lib/lembur";
import {
  SALARY_ADVANCE_MAX_AMOUNT_KEY,
  SALARY_ADVANCE_MAX_TENOR_KEY,
} from "../lib/kasbon";
import { UNPAID_SUSPENSION_KEY } from "@/src/modules/employee/lib/disiplin";

const SKORSING_OPTIONS = [
  { value: "0", label: "Tetap dibayar" },
  { value: "1", label: "Tanpa upah (potong seperti alpa)" },
];

const PEMBAGI_OPTIONS = [
  { value: "25", label: "25 (UU lama / harian)" },
  { value: "26", label: "26 (umum)" },
  { value: "AKTUAL", label: "AKTUAL (hari kalender bulan periode)" },
];

const TIERED_OPTIONS = [
  { value: "1", label: "Tiered Kepmen 102/2004 (1,5x + 2x dst)" },
  { value: "0", label: "Flat (score komponen × jam)" },
];

export default function PayrollSettingsClient({ items }: { items: PayrollSettingItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const byKunci = Object.fromEntries(items.map((i) => [i.key, i.value]));
  const [pembagi, setPembagi] = useState(byKunci[ALPHA_DIVISOR_KEY] ?? "26");
  const [tarif, setTarif] = useState(byKunci[LATE_PER_MINUTE_KEY] ?? "0");
  const [max, setMax] = useState(byKunci[LATE_MONTHLY_CAP_KEY] ?? "");
  const [tiered, setTiered] = useState(byKunci[OVERTIME_TIERED_KEY] ?? "1");
  const [divisor, setDivisor] = useState(byKunci[OVERTIME_DIVISOR_KEY] ?? "173");
  const [maxJam, setMaxJam] = useState(byKunci[OVERTIME_MAX_HOURS_KEY] ?? "");
  const [plafon, setPlafon] = useState(byKunci[SALARY_ADVANCE_MAX_AMOUNT_KEY] ?? "");
  const [maxTenor, setMaxTenor] = useState(byKunci[SALARY_ADVANCE_MAX_TENOR_KEY] ?? "24");
  const [skorsing, setSkorsing] = useState(byKunci[UNPAID_SUSPENSION_KEY] ?? "0");

  function handleSave() {
    startTransition(async () => {
      const result = await savePayrollSettings({
        alphaDivisor: pembagi,
        lateRatePerMinute: tarif || "0",
        lateMonthlyCap: max,
        overtimeTiered: tiered,
        overtimeDivisor: divisor || "173",
        overtimeMaxHours: maxJam,
        advanceMaxAmount: plafon,
        advanceMaxTenor: maxTenor || "24",
        unpaidSuspension: skorsing,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Aturan Potongan</h2>
      <p className="mt-1 text-xs text-slate-500">
        Berlaku untuk perhitungan berikutnya (run yang sudah FINAL tidak berubah). Denda telat hanya menghitung
        rekap berstatus TERLAMBAT — toleransi keterlambatan shift tetap dihormati.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <FloatingSelect
          name="pembagi"
          label="Pembagi Alpa (GP / pembagi per hari)"
          value={pembagi}
          onValueChange={setPembagi}
          options={PEMBAGI_OPTIONS}
        />
        <FloatingInput
          name="tarif"
          label="Denda Telat per Menit (Rp, 0 = mati)"
          type="number"
          value={tarif}
          onChange={(e) => setTarif(e.currentTarget.value)}
        />
        <FloatingInput
          name="max"
          label="Batas Denda Telat / Bulan (Rp, kosong = tanpa batas)"
          type="number"
          value={max}
          onChange={(e) => setMax(e.currentTarget.value)}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <button type="button" onClick={handleSave} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
          Simpan Aturan
        </button>
      </div>

      <h2 className="mt-6 text-lg font-semibold text-slate-900 dark:text-slate-100">Aturan Lembur (Kepmen 102/2004)</h2>
      <p className="mt-1 text-xs text-slate-500">
        Upah sejam = (gapok + tunjangan tetap) / pembagi. Hari kerja: jam-1 ×1,5, berikutnya ×2.
        Istirahat/libur 6-hari: 7j ×2 + 1j ×3 + ×4; 5-hari: 8j ×2 + 1j ×3 + ×4. Kategori hari dari
        roster/kalender + hari libur. Batas jam dicek saat pengajuan lembur.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <FloatingSelect
          name="tiered"
          label="Mode Hitung"
          value={tiered}
          onValueChange={setTiered}
          options={TIERED_OPTIONS}
        />
        <FloatingInput
          name="divisor"
          label="Pembagi Upah Sejam (173)"
          type="number"
          value={divisor}
          onChange={(e) => setDivisor(e.currentTarget.value)}
        />
        <FloatingInput
          name="maxJam"
          label="Batas Jam / Bulan (kosong = tanpa batas)"
          type="number"
          value={maxJam}
          onChange={(e) => setMaxJam(e.currentTarget.value)}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <button type="button" onClick={handleSave} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
          Simpan Aturan
        </button>
      </div>

      <h2 className="mt-6 text-lg font-semibold text-slate-900 dark:text-slate-100">Aturan Kasbon</h2>
      <p className="mt-1 text-xs text-slate-500">
        Plafon per pengajuan dan tenor maksimum. Kasbon yang disetujui dipotong otomatis
        tiap salary run (angsuran = nominal / tenor, terakhir menyesuaikan sisa).
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <FloatingInput
          name="plafon"
          label="Plafon per Pengajuan (Rp, kosong = tanpa batas)"
          type="number"
          value={plafon}
          onChange={(e) => setPlafon(e.currentTarget.value)}
        />
        <FloatingInput
          name="maxTenor"
          label="Tenor Maksimum (bulan)"
          type="number"
          value={maxTenor}
          onChange={(e) => setMaxTenor(e.currentTarget.value)}
        />
        <FloatingSelect
          name="skorsing"
          label="Upah Saat Skorsing"
          value={skorsing}
          onValueChange={setSkorsing}
          options={SKORSING_OPTIONS}
          searchable={false}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <button type="button" onClick={handleSave} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
          Simpan Aturan
        </button>
      </div>
      <div className="mt-4 space-y-1 text-xs text-slate-500">
        {items.map((i) => (
          <p key={i.key}>
            <span className="font-medium">{i.key}</span> = {i.value === "" ? "(kosong)" : i.value} • {i.description}
          </p>
        ))}
        <p>
          Komponen terkait: <span className="font-medium">POTONGAN_ALPA</span> (tugaskan per karyawan agar
          dipotong) dan <span className="font-medium">POTONGAN_TELAT</span> (sama; value komponen diabaikan,
          tarif dari aturan ini).
        </p>
      </div>
    </div>
  );
}
