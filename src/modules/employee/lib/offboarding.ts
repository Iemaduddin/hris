/** Offboarding: checklist bawaan + cek kelengkapan murni. */

export type ItemClearanceBawaan = {
  kategori: "DOKUMEN" | "AKUN" | "ASET" | "KEUANGAN" | "LAINNYA";
  judul: string;
  picRole: "HR" | "FINANCE" | "IT" | "ATASAN";
  wajib: boolean;
  otomatis: boolean;
};

export const CLEARANCE_BAWAAN: ItemClearanceBawaan[] = [
  { kategori: "DOKUMEN", judul: "Serah terima pekerjaan ke pengganti/atasan", picRole: "ATASAN", wajib: true, otomatis: false },
  { kategori: "DOKUMEN", judul: "Dokumen kepegawaian dikembalikan/diarsipkan", picRole: "HR", wajib: true, otomatis: false },
  { kategori: "KEUANGAN", judul: "Kasbon/pinjaman dilunasi", picRole: "FINANCE", wajib: true, otomatis: true },
  { kategori: "ASET", judul: "Perangkat & ID card dikembalikan", picRole: "IT", wajib: true, otomatis: false },
  { kategori: "AKUN", judul: "Akun sistem dinonaktifkan", picRole: "IT", wajib: true, otomatis: false },
];

export function semuaWajibSelesai(items: Array<{ wajib: boolean; status: string }>): boolean {
  const wajib = items.filter((i) => i.wajib);
  return wajib.length > 0 && wajib.every((i) => i.status === "SELESAI");
}
