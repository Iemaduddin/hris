/** Uang keluar: plafon reimbursement + selisih LPJ murni. */

export const KATEGORI_REIMBURSE = [
  "TRANSPORT",
  "KONSUMSI",
  "PARKIR",
  "TOL",
  "PENGINAPAN",
  "KESEHATAN",
  "DINAS",
  "LAINNYA",
] as const;

export const kunciPlafon = (kategori: string) => `REIMBURSE_MAX_${kategori}`;

export function cekPlafon(nominal: number, plafon: number | null): string | null {
  if (!Number.isFinite(nominal) || nominal <= 0) return "Nominal harus lebih dari 0.";
  if (plafon !== null && Math.round(nominal) > plafon) {
    return `Melebihi plafon Rp${plafon.toLocaleString("id-ID")}.`;
  }
  return null;
}

export function parsePlafon(value: string | null | undefined): number | null {
  const s = (value ?? "").trim();
  if (!s) return null;
  const n = Math.floor(Number(s));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** selisih = muka − realisasi. Positif = sisa (kembali/potong gaji), negatif = kurang (reimburse). */
export function hitungSelisihLpj(nominalMuka: number, totalRealisasi: number): number {
  return Math.round(nominalMuka) - Math.round(totalRealisasi);
}
