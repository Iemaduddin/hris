/** Tukar shift: validasi murni. */

export function validasiTanggalTukar(tanggal: string, kini = new Date()): string | null {
  if (!tanggal.trim()) return "Tanggal wajib diisi.";
  const t = new Date(`${tanggal}T00:00:00`);
  if (Number.isNaN(t.getTime())) return "Tanggal tidak valid.";
  const hariIni = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate());
  if (t.getTime() < hariIni.getTime()) return "Tidak bisa tukar untuk tanggal lampau.";
  return null;
}

/** Syarat swap: kedua roster ada dan shift-nya berbeda. */
export function validasiPasanganRoster(
  shiftPemohonId: string | null,
  shiftPasanganId: string | null,
): string | null {
  if (!shiftPemohonId || !shiftPasanganId) return "Kedua karyawan harus punya roster di tanggal itu.";
  if (shiftPemohonId === shiftPasanganId) return "Shift sudah sama, tidak perlu tukar.";
  return null;
}
