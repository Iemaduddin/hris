/** Onboarding: progres + validasi murni. */

export const CATEGORY_LABELS: Record<string, string> = {
  DOKUMEN: "Dokumen",
  AKUN: "Akun",
  ASET: "Aset",
  ORIENTASI: "Orientasi",
  LAINNYA: "Lainnya",
};

export type ProgressItem = { required: boolean; status: string };

export function calculateProgress(items: ProgressItem[]): {
  total: number;
  required: number;
  verifiedRequired: number;
  completedAll: number;
  percent: number;
  canComplete: boolean;
} {
  const total = items.length;
  const required = items.filter((i) => i.required);
  const verifiedRequired = required.filter((i) => i.status === "TERVERIFIKASI").length;
  const completedAll = items.filter((i) => i.status !== "BELUM").length;
  const percent = total === 0 ? 100 : Math.round((completedAll / total) * 100);
  return { total, required: required.length, verifiedRequired, completedAll, percent, canComplete: required.length > 0 && verifiedRequired === required.length };
}

export function validateTemplate(input: { name: string; items: Array<{ title: string }> }): string | null {
  if (!input.name.trim()) return "Nama template wajib diisi.";
  if (input.items.length === 0) return "Template minimal punya 1 item.";
  if (input.items.some((i) => !i.title.trim())) return "Semua item wajib berjudul.";
  return null;
}
