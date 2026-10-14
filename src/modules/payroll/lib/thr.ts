/**
 * THR Keagamaan (Permenaker No. 6/2016). Fungsi murni, tanpa DB.
 * ≥12 bulan → 1x upah; <12 bulan → prorata; <1 bulan → 0.
 * Masa kerja = bulan kalender inklusif masuk s.d. hari raya.
 */

/** Bulan kalender inklusif masuk→raya; 0 bila masuk sesudah hari raya. */
export function hitungMasaKerjaBulan(tanggalMasuk: Date, tanggalHariRaya: Date): number {
  const mY = tanggalMasuk.getFullYear();
  const mM = tanggalMasuk.getMonth();
  const rY = tanggalHariRaya.getFullYear();
  const rM = tanggalHariRaya.getMonth();
  const diff = (rY - mY) * 12 + (rM - mM) + 1;
  if (diff <= 0) return 0;
  // Masuk setelah tanggal hari raya di bulan yang sama → belum 1 bulan.
  if (diff === 1 && tanggalMasuk.getDate() > tanggalHariRaya.getDate()) return 0;
  return diff;
}

/** Nominal THR bruto dari upah sebulan + masa kerja (bulan). */
export function hitungNominalThr(upahSebulan: number, masaKerjaBulan: number): number {
  const upah = Math.max(0, Math.round(upahSebulan));
  const masa = Math.max(0, Math.floor(masaKerjaBulan));
  if (upah === 0 || masa < 1) return 0;
  if (masa >= 12) return upah;
  return Math.round((upah * masa) / 12);
}

/** Batas bayar normatif H-7 sebelum hari raya (untuk badge peringatan). */
export function batasBayarHMin7(tanggalHariRaya: Date): Date {
  const b = new Date(tanggalHariRaya);
  b.setDate(b.getDate() - 7);
  return b;
}

export function terlambatBayarThr(tanggalBayar: Date, tanggalHariRaya: Date): boolean {
  return tanggalBayar.getTime() > batasBayarHMin7(tanggalHariRaya).getTime();
}
