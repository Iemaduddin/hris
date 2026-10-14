/** Mutasi / promosi / demosi: label + validasi murni. */

export const JENIS_MUTASI_LABEL: Record<string, string> = {
  MUTASI: "Mutasi",
  PROMOSI: "Promosi",
  DEMOSI: "Demosi",
};

export function labelJenisMutasi(jenis: string): string {
  return JENIS_MUTASI_LABEL[jenis] ?? jenis;
}

export type SisiPenempatan = { unitId: string; posisiId: string; lokasiId: string };

const norm = (v: string | null | undefined) => (v ?? "").trim();

export function adaPerubahan(dari: SisiPenempatan, ke: SisiPenempatan): boolean {
  return norm(dari.unitId) !== norm(ke.unitId) || norm(dari.posisiId) !== norm(ke.posisiId) || norm(dari.lokasiId) !== norm(ke.lokasiId);
}

export function validasiMutasi(input: {
  jenis: string;
  dari: SisiPenempatan;
  ke: SisiPenempatan;
  tanggalEfektif: string;
  alasan: string;
}): string | null {
  if (!JENIS_MUTASI_LABEL[input.jenis]) return "Jenis mutasi tidak valid.";
  if (!input.tanggalEfektif.trim()) return "Tanggal efektif wajib diisi.";
  if (Number.isNaN(new Date(input.tanggalEfektif).getTime())) return "Tanggal efektif tidak valid.";
  if (!input.alasan.trim()) return "Alasan wajib diisi.";
  if (!adaPerubahan(input.dari, input.ke)) return "Tujuan sama dengan penempatan aktif (tidak ada perubahan).";
  return null;
}
