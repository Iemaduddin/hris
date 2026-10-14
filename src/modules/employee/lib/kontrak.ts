/** Kontrak batch + e-sign: validasi murni. */

export function validasiPerpanjangan(input: {
  tanggalSelesaiLama: Date | null;
  tanggalSelesaiBaru: string;
}): string | null {
  if (!input.tanggalSelesaiBaru.trim()) return "Tanggal selesai baru wajib diisi.";
  const baru = new Date(input.tanggalSelesaiBaru);
  if (Number.isNaN(baru.getTime())) return "Tanggal selesai baru tidak valid.";
  if (input.tanggalSelesaiLama && baru.getTime() <= input.tanggalSelesaiLama.getTime()) {
    return "Tanggal baru harus sesudah tanggal selesai kontrak lama.";
  }
  return null;
}

/** Awal kontrak lanjutan = sehari setelah selesai lama (atau hari ini bila tak ada). */
export function awalKontrakLanjutan(tanggalSelesaiLama: Date | null, kini = new Date()): Date {
  if (!tanggalSelesaiLama) {
    return new Date(kini.getFullYear(), kini.getMonth(), kini.getDate());
  }
  return new Date(tanggalSelesaiLama.getTime() + 86_400_000);
}
