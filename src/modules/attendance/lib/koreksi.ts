/** Self-service attendance correction: pure validation. */

export const CORRECTION_TYPES = [
  "MASUK",
  "KELUAR",
  "MULAI_ISTIRAHAT",
  "SELESAI_ISTIRAHAT",
  "KELUAR_KANTOR",
  "KEMBALI_KANTOR",
] as const;

export function validateCorrection(input: { date: string; eventType: string; time: string; reason: string }): string | null {
  if (!input.date.trim()) return "Tanggal wajib diisi.";
  const date = new Date(`${input.date}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Tanggal tidak valid.";
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (date.getTime() > endOfToday.getTime()) return "Tidak bisa koreksi tanggal masa depan.";
  if (!(CORRECTION_TYPES as readonly string[]).includes(input.eventType)) return "Tipe presensi tidak valid.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return "Jam tidak valid (HH:MM).";
  if (!input.reason.trim()) return "Alasan wajib diisi.";
  return null;
}

/** Gabung tanggal + jam menjadi waktu koreksi. */
export function correctionTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}
