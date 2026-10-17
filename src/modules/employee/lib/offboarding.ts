/** Offboarding: checklist bawaan + cek kelengkapan murni. */

export type DefaultClearanceItem = {
  kategori: "DOKUMEN" | "AKUN" | "ASET" | "KEUANGAN" | "LAINNYA";
  judul: string;
  picRole: "HR" | "FINANCE" | "IT" | "ATASAN";
  wajib: boolean;
  otomatis: boolean;
};

export const DEFAULT_CLEARANCE: DefaultClearanceItem[] = [
  { kategori: "DOKUMEN", judul: "Serah terima pekerjaan ke pengganti/atasan", picRole: "ATASAN", wajib: true, otomatis: false },
  { kategori: "DOKUMEN", judul: "Dokumen kepegawaian dikembalikan/diarsipkan", picRole: "HR", wajib: true, otomatis: false },
  { kategori: "KEUANGAN", judul: "Kasbon/pinjaman dilunasi", picRole: "FINANCE", wajib: true, otomatis: true },
  { kategori: "ASET", judul: "Perangkat & ID card dikembalikan", picRole: "IT", wajib: true, otomatis: false },
  { kategori: "AKUN", judul: "Akun sistem dinonaktifkan", picRole: "IT", wajib: true, otomatis: false },
];

export function areAllRequiredDone(items: Array<{ wajib: boolean; status: string }>): boolean {
  const required = items.filter((i) => i.wajib);
  return required.length > 0 && required.every((i) => i.status === "SELESAI");
}
