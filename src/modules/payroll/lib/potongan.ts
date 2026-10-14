/**
 * Aturan potongan payroll (murni, teruji).
 * Alpa: hari × gapok / pembagi (25/26/AKTUAL). Telat: menit TERLAMBAT
 * × tarif, dibatasi cap; toleransi shift dihormati via status rekap.
 */

export const KUNCI_PEMBAGI_ALPA = "POTONGAN_ALPA_PEMBAGI";
export const KUNCI_TELAT_PER_MENIT = "POTONGAN_TELAT_PER_MENIT";
export const KUNCI_TELAT_MAX = "POTONGAN_TELAT_MAX_PER_BULAN";

export const PAYROLL_SETTING_DEFAULT: Record<string, string> = {
  [KUNCI_PEMBAGI_ALPA]: "26",
  [KUNCI_TELAT_PER_MENIT]: "0",
  [KUNCI_TELAT_MAX]: "",
};

export const PAYROLL_SETTING_DESKRIPSI: Record<string, string> = {
  [KUNCI_PEMBAGI_ALPA]: "Pembagi upah harian untuk potongan alpa: 25, 26, atau AKTUAL (hari kalender bulan periode).",
  [KUNCI_TELAT_PER_MENIT]: "Tarif denda keterlambatan per menit (Rp). 0 = nonaktif.",
  [KUNCI_TELAT_MAX]: "Batas atas denda telat per bulan (Rp). Kosong = tanpa batas.",
};

export function resolvePembagiAlpa(setting: string | null | undefined, hariDalamBulan: number): number {
  const s = (setting ?? "").trim().toUpperCase();
  if (s === "25") return 25;
  if (s === "AKTUAL") return hariDalamBulan > 0 ? Math.floor(hariDalamBulan) : 26;
  return 26;
}

export function hitungPotonganAlpa(gajiPokok: number, hariAlpa: number, pembagi: number): number {
  if (gajiPokok <= 0 || hariAlpa <= 0 || pembagi <= 0) return 0;
  return Math.round((Math.floor(hariAlpa) * Math.round(gajiPokok)) / pembagi);
}

export function hitungPotonganTelat(
  totalTelatMenit: number,
  tarifPerMenit: number,
  maxPerBulan: number | null,
): { jumlah: number; kenaCap: boolean } {
  const menit = Math.max(0, Math.floor(totalTelatMenit));
  const tarif = Math.max(0, Math.floor(tarifPerMenit));
  if (menit === 0 || tarif === 0) return { jumlah: 0, kenaCap: false };
  const kotor = menit * tarif;
  if (maxPerBulan !== null && maxPerBulan >= 0 && kotor > maxPerBulan) {
    return { jumlah: Math.floor(maxPerBulan), kenaCap: true };
  }
  return { jumlah: kotor, kenaCap: false };
}

export function parseRupiahSetting(value: string | null | undefined): number | null {
  const s = (value ?? "").trim();
  if (!s) return null;
  const n = Math.floor(Number(s));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
