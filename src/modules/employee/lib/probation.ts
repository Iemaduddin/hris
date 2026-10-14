/** Probation review: hitung sisa hari + validasi penilaian murni. */

export const HASIL_LABEL: Record<string, string> = {
  LULUS: "Lulus",
  PERPANJANG: "Diperpanjang",
  TIDAK_LULUS: "Tidak Lulus",
};

export function labelHasilProbation(hasil: string): string {
  return HASIL_LABEL[hasil] ?? hasil;
}

/** Sisa hari kalender hingga tanggal selesai (negatif bila lewat). */
export function sisaHariProbation(tanggalSelesai: Date, kini = new Date()): number {
  const a = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate()).getTime();
  const b = new Date(tanggalSelesai.getFullYear(), tanggalSelesai.getMonth(), tanggalSelesai.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function validasiPenilaian(input: {
  hasil: string;
  nilai: number | null;
  tanggalSelesai: Date;
  tanggalSelesaiBaru: string;
}): string | null {
  if (!HASIL_LABEL[input.hasil]) return "Hasil penilaian tidak valid.";
  if (input.nilai !== null && (!Number.isInteger(input.nilai) || input.nilai < 1 || input.nilai > 5)) {
    return "Nilai 1–5.";
  }
  if (input.hasil === "PERPANJANG") {
    if (!input.tanggalSelesaiBaru.trim()) return "Tanggal selesai baru wajib diisi untuk perpanjangan.";
    const baru = new Date(input.tanggalSelesaiBaru);
    if (Number.isNaN(baru.getTime())) return "Tanggal selesai baru tidak valid.";
    if (baru.getTime() <= input.tanggalSelesai.getTime()) return "Tanggal baru harus sesudah tanggal selesai.";
  }
  return null;
}
