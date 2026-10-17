/** Uang keluar: plafon reimbursement + selisih LPJ murni. */

export const REIMBURSE_CATEGORIES = [
  "TRANSPORT",
  "KONSUMSI",
  "PARKIR",
  "TOL",
  "PENGINAPAN",
  "KESEHATAN",
  "DINAS",
  "LAINNYA",
] as const;

export const limitKey = (category: string) => `REIMBURSE_MAX_${category}`;

export function checkLimit(amount: number, limit: number | null): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "Nominal harus lebih dari 0.";
  if (limit !== null && Math.round(amount) > limit) {
    return `Melebihi plafon Rp${limit.toLocaleString("id-ID")}.`;
  }
  return null;
}

export function parseLimit(value: string | null | undefined): number | null {
  const s = (value ?? "").trim();
  if (!s) return null;
  const n = Math.floor(Number(s));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** selisih = muka − realisasi. Positif = sisa (kembali/potong gaji), negatif = kurang (reimburse). */
export function calculateLpjDifference(advanceAmount: number, actualTotal: number): number {
  return Math.round(advanceAmount) - Math.round(actualTotal);
}
