/** Tukar shift: validasi murni. */

export function validateShiftSwapDate(date: string, now = new Date()): string | null {
  if (!date.trim()) return "Tanggal wajib diisi.";
  const t = new Date(`${date}T00:00:00`);
  if (Number.isNaN(t.getTime())) return "Tanggal tidak valid.";
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (t.getTime() < today.getTime()) return "Tidak bisa tukar untuk tanggal lampau.";
  return null;
}

/** Syarat swap: kedua roster ada dan shift-nya berbeda. */
export function validateShiftPair(
  requesterShiftId: string | null,
  partnerShiftId: string | null,
): string | null {
  if (!requesterShiftId || !partnerShiftId) return "Kedua karyawan harus punya roster di tanggal itu.";
  if (requesterShiftId === partnerShiftId) return "Shift sudah sama, tidak perlu tukar.";
  return null;
}
