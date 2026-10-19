/** Probation review: hitung sisa hari + validasi penilaian murni. */

export const RESULT_LABELS: Record<string, string> = {
  LULUS: "Lulus",
  PERPANJANG: "Diperpanjang",
  TIDAK_LULUS: "Tidak Lulus",
};

export function getProbationResultLabel(hasil: string): string {
  return RESULT_LABELS[hasil] ?? hasil;
}

/** Sisa hari kalender hingga tanggal selesai (negatif bila lewat). */
export function remainingProbationDays(endDate: Date, now = new Date()): number {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function validateAssessment(input: {
  hasil: string;
  nilai: number | null;
  tanggalSelesai: Date;
  tanggalSelesaiBaru: string;
}): string | null {
  if (!RESULT_LABELS[input.hasil]) return "Hasil penilaian tidak valid.";
  if (input.nilai !== null && (!Number.isInteger(input.nilai) || input.nilai < 1 || input.nilai > 5)) {
    return "Nilai 1–5.";
  }
  if (input.hasil === "PERPANJANG") {
    if (!input.tanggalSelesaiBaru.trim()) return "Tanggal selesai baru wajib diisi untuk perpanjangan.";
    const next = new Date(input.tanggalSelesaiBaru);
    if (Number.isNaN(next.getTime())) return "Tanggal selesai baru tidak valid.";
    if (next.getTime() <= input.tanggalSelesai.getTime()) return "Tanggal baru harus sesudah tanggal selesai.";
  }
  return null;
}
