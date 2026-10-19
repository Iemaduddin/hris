/** Kontrak batch + e-sign: validasi murni. */

export function validateExtension(input: {
  oldEndDate: Date | null;
  newEndDate: string;
}): string | null {
  if (!input.newEndDate.trim()) return "Tanggal selesai baru wajib diisi.";
  const next = new Date(input.newEndDate);
  if (Number.isNaN(next.getTime())) return "Tanggal selesai baru tidak valid.";
  if (input.oldEndDate && next.getTime() <= input.oldEndDate.getTime()) {
    return "Tanggal baru harus sesudah tanggal selesai kontrak lama.";
  }
  return null;
}

/** Awal kontrak lanjutan = sehari setelah selesai lama (atau hari ini bila tak ada). */
export function nextContractStart(oldEndDate: Date | null, now = new Date()): Date {
  if (!oldEndDate) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  return new Date(oldEndDate.getTime() + 86_400_000);
}
