/**
 * Aturan potongan payroll (murni, teruji).
 * Alpa: hari × gapok / pembagi (25/26/AKTUAL). Telat: menit TERLAMBAT
 * × tarif, dibatasi cap; toleransi shift dihormati via status rekap.
 */

export const ALPHA_DIVISOR_KEY = "POTONGAN_ALPA_PEMBAGI";
export const LATE_PER_MINUTE_KEY = "POTONGAN_TELAT_PER_MENIT";
export const LATE_MONTHLY_CAP_KEY = "POTONGAN_TELAT_MAX_PER_BULAN";

export const PAYROLL_SETTING_DEFAULT: Record<string, string> = {
  [ALPHA_DIVISOR_KEY]: "26",
  [LATE_PER_MINUTE_KEY]: "0",
  [LATE_MONTHLY_CAP_KEY]: "",
};

export const PAYROLL_SETTING_DESCRIPTIONS: Record<string, string> = {
  [ALPHA_DIVISOR_KEY]: "Pembagi upah harian untuk potongan alpa: 25, 26, atau AKTUAL (hari kalender bulan periode).",
  [LATE_PER_MINUTE_KEY]: "Tarif denda keterlambatan per menit (Rp). 0 = nonaktif.",
  [LATE_MONTHLY_CAP_KEY]: "Batas atas denda telat per bulan (Rp). Kosong = tanpa batas.",
};

export function resolveAlphaDivisor(setting: string | null | undefined, daysInMonth: number): number {
  const s = (setting ?? "").trim().toUpperCase();
  if (s === "25") return 25;
  if (s === "AKTUAL") return daysInMonth > 0 ? Math.floor(daysInMonth) : 26;
  return 26;
}

export function calculateAlphaDeduction(baseSalary: number, absentDays: number, divisor: number): number {
  if (baseSalary <= 0 || absentDays <= 0 || divisor <= 0) return 0;
  return Math.round((Math.floor(absentDays) * Math.round(baseSalary)) / divisor);
}

export function calculateLateDeduction(
  totalLateMinutes: number,
  ratePerMinute: number,
  monthlyCap: number | null,
): { amount: number; capped: boolean } {
  const minutes = Math.max(0, Math.floor(totalLateMinutes));
  const rate = Math.max(0, Math.floor(ratePerMinute));
  if (minutes === 0 || rate === 0) return { amount: 0, capped: false };
  const gross = minutes * rate;
  if (monthlyCap !== null && monthlyCap >= 0 && gross > monthlyCap) {
    return { amount: Math.floor(monthlyCap), capped: true };
  }
  return { amount: gross, capped: false };
}

export function parseCurrencySetting(value: string | null | undefined): number | null {
  const s = (value ?? "").trim();
  if (!s) return null;
  const n = Math.floor(Number(s));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
