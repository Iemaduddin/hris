/** Disiplin: eskalasi SP + hitung hari skorsing murni. */

export const TINGKAT_ORDER = ["SP1", "SP2", "SP3", "SKORSING", "PHK"] as const;
export type TingkatSPInput = (typeof TINGKAT_ORDER)[number];

export const TINGKAT_LABEL: Record<string, string> = {
  SP1: "SP 1",
  SP2: "SP 2",
  SP3: "SP 3",
  SKORSING: "Skorsing",
  PHK: "PHK",
};

export const KUNCI_SKORSING_TANPA_UPAH = "SKORSING_TANPA_UPAH";

export const SKORSING_SETTING_DEFAULT: Record<string, string> = {
  [KUNCI_SKORSING_TANPA_UPAH]: "0",
};

export const SKORSING_SETTING_DESKRIPSI: Record<string, string> = {
  [KUNCI_SKORSING_TANPA_UPAH]: "1 = hari skorsing dipotong seperti alpa; 0 = tetap dibayar.",
};

/** Tingkat boleh diterbitkan bila tingkat sebelumnya masih aktif, kecuali pelanggaran berat langsung PHK. */
export function validasiEskalasi(tingkat: string, aktif: string[], pelanggaranBerat: boolean): string | null {
  if (!(TINGKAT_ORDER as readonly string[]).includes(tingkat)) return "Tingkat tidak valid.";
  if (tingkat === "SP1") return null;
  if (tingkat === "PHK" && pelanggaranBerat) return null;
  const butuh = TINGKAT_ORDER[TINGKAT_ORDER.indexOf(tingkat as TingkatSPInput) - 1];
  if (!aktif.includes(butuh)) return `Butuh ${TINGKAT_LABEL[butuh]} aktif terlebih dahulu.`;
  return null;
}

/** Irisan hari skorsing dengan periode (inklusif, UTC). */
export function hariSkorsingDalamPeriode(
  mulai: Date | null,
  selesai: Date | null,
  periodMulai: Date,
  periodSelesai: Date,
): number {
  if (!mulai || !selesai) return 0;
  const a = Math.max(mulai.getTime(), periodMulai.getTime());
  const b = Math.min(selesai.getTime(), periodSelesai.getTime());
  if (b < a) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}

/** Default masa berlaku 6 bulan dari terbit. */
export function defaultBerlakuSampai(tanggalTerbit: Date): Date {
  const d = new Date(tanggalTerbit);
  d.setMonth(d.getMonth() + 6);
  return d;
}
