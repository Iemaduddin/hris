/**
 * THR Keagamaan (Permenaker No. 6/2016). Fungsi murni, tanpa DB.
 * ≥12 bulan → 1x upah; <12 bulan → prorata; <1 bulan → 0.
 * Masa kerja = bulan kalender inklusif masuk s.d. hari raya.
 */

/** Bulan kalender inklusif masuk→raya; 0 bila masuk sesudah hari raya. */
export function calculateTenureMonths(joinDate: Date, holidayDate: Date): number {
  const joinYear = joinDate.getFullYear();
  const joinMonth = joinDate.getMonth();
  const holidayYear = holidayDate.getFullYear();
  const holidayMonth = holidayDate.getMonth();
  const diff = (holidayYear - joinYear) * 12 + (holidayMonth - joinMonth) + 1;
  if (diff <= 0) return 0;
  // Masuk setelah tanggal hari raya di bulan yang sama → belum 1 bulan.
  if (diff === 1 && joinDate.getDate() > holidayDate.getDate()) return 0;
  return diff;
}

/** Nominal THR bruto dari upah sebulan + masa kerja (bulan). */
export function calculateThrAmount(monthlyWage: number, tenureMonths: number): number {
  const wage = Math.max(0, Math.round(monthlyWage));
  const tenure = Math.max(0, Math.floor(tenureMonths));
  if (wage === 0 || tenure < 1) return 0;
  if (tenure >= 12) return wage;
  return Math.round((wage * tenure) / 12);
}

/** Batas bayar normatif H-7 sebelum hari raya (untuk badge peringatan). */
export function hMinus7Deadline(holidayDate: Date): Date {
  const deadline = new Date(holidayDate);
  deadline.setDate(deadline.getDate() - 7);
  return deadline;
}

export function isThrLate(payDate: Date, holidayDate: Date): boolean {
  return payDate.getTime() > hMinus7Deadline(holidayDate).getTime();
}
