/** Koreksi presensi mandiri: validasi murni. */

export const TIPE_KOREKSI = [
  "MASUK",
  "KELUAR",
  "MULAI_ISTIRAHAT",
  "SELESAI_ISTIRAHAT",
  "KELUAR_KANTOR",
  "KEMBALI_KANTOR",
] as const;

export function validasiKoreksi(input: { tanggal: string; tipe: string; jam: string; alasan: string }): string | null {
  if (!input.tanggal.trim()) return "Tanggal wajib diisi.";
  const tgl = new Date(`${input.tanggal}T00:00:00`);
  if (Number.isNaN(tgl.getTime())) return "Tanggal tidak valid.";
  const kini = new Date();
  const batas = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate(), 23, 59, 59, 999);
  if (tgl.getTime() > batas.getTime()) return "Tidak bisa koreksi tanggal masa depan.";
  if (!(TIPE_KOREKSI as readonly string[]).includes(input.tipe)) return "Tipe presensi tidak valid.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.jam)) return "Jam tidak valid (HH:MM).";
  if (!input.alasan.trim()) return "Alasan wajib diisi.";
  return null;
}

/** Gabung tanggal + jam menjadi waktu koreksi. */
export function waktuKoreksi(tanggal: string, jam: string): Date {
  return new Date(`${tanggal}T${jam}:00`);
}
