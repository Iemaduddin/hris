/** Onboarding: progres + validasi murni. */

export const KATEGORI_LABEL: Record<string, string> = {
  DOKUMEN: "Dokumen",
  AKUN: "Akun",
  ASET: "Aset",
  ORIENTASI: "Orientasi",
  LAINNYA: "Lainnya",
};

export type ItemProgres = { wajib: boolean; status: string };

export function hitungProgres(items: ItemProgres[]): {
  total: number;
  wajib: number;
  terverifikasiWajib: number;
  selesaiSemua: number;
  persen: number;
  bisaSelesai: boolean;
} {
  const total = items.length;
  const wajib = items.filter((i) => i.wajib);
  const terverifikasiWajib = wajib.filter((i) => i.status === "TERVERIFIKASI").length;
  const selesaiSemua = items.filter((i) => i.status !== "BELUM").length;
  const persen = total === 0 ? 100 : Math.round((selesaiSemua / total) * 100);
  return { total, wajib: wajib.length, terverifikasiWajib, selesaiSemua, persen, bisaSelesai: wajib.length > 0 && terverifikasiWajib === wajib.length };
}

export function validasiTemplate(input: { nama: string; items: Array<{ judul: string }> }): string | null {
  if (!input.nama.trim()) return "Nama template wajib diisi.";
  if (input.items.length === 0) return "Template minimal punya 1 item.";
  if (input.items.some((i) => !i.judul.trim())) return "Semua item wajib berjudul.";
  return null;
}
