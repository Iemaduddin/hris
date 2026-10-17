/** Mutasi / promosi / demosi: label + validasi murni. */

export const TRANSFER_TYPE_LABELS: Record<string, string> = {
  MUTASI: "Mutasi",
  PROMOSI: "Promosi",
  DEMOSI: "Demosi",
};

export function getTransferTypeLabel(jenis: string): string {
  return TRANSFER_TYPE_LABELS[jenis] ?? jenis;
}

export type PlacementSide = { unitId: string; posisiId: string; lokasiId: string };

const norm = (v: string | null | undefined) => (v ?? "").trim();

export function hasChanges(dari: PlacementSide, ke: PlacementSide): boolean {
  return norm(dari.unitId) !== norm(ke.unitId) || norm(dari.posisiId) !== norm(ke.posisiId) || norm(dari.lokasiId) !== norm(ke.lokasiId);
}

export function validateTransfer(input: {
  jenis: string;
  dari: PlacementSide;
  ke: PlacementSide;
  tanggalEfektif: string;
  alasan: string;
}): string | null {
  if (!TRANSFER_TYPE_LABELS[input.jenis]) return "Jenis mutasi tidak valid.";
  if (!input.tanggalEfektif.trim()) return "Tanggal efektif wajib diisi.";
  if (Number.isNaN(new Date(input.tanggalEfektif).getTime())) return "Tanggal efektif tidak valid.";
  if (!input.alasan.trim()) return "Alasan wajib diisi.";
  if (!hasChanges(input.dari, input.ke)) return "Tujuan sama dengan penempatan aktif (tidak ada perubahan).";
  return null;
}
