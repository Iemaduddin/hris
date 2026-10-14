/**
 * Kasbon / pinjaman karyawan (murni, teruji).
 * Angsuran = nominal / tenor; potongan periode = min(angsuran, sisa).
 */

export const KUNCI_KASBON_MAX_NOMINAL = "KASBON_MAX_NOMINAL";
export const KUNCI_KASBON_MAX_TENOR = "KASBON_MAX_TENOR";

export const KASBON_SETTING_DEFAULT: Record<string, string> = {
  [KUNCI_KASBON_MAX_NOMINAL]: "",
  [KUNCI_KASBON_MAX_TENOR]: "24",
};

export const KASBON_SETTING_DESKRIPSI: Record<string, string> = {
  [KUNCI_KASBON_MAX_NOMINAL]: "Plafon nominal kasbon per pengajuan (Rp). Kosong = tanpa batas.",
  [KUNCI_KASBON_MAX_TENOR]: "Tenor maksimum (bulan).",
};

export function hitungAngsuranKasbon(nominal: number, tenorBulan: number): number {
  if (nominal <= 0 || tenorBulan <= 0) return 0;
  return Math.round(Math.round(nominal) / Math.floor(tenorBulan));
}

/** Plafon kosong → null (tanpa batas); negatif/tak valid → null. */
export function parseMaxNominalKasbon(value: string | null | undefined): number | null {
  const s = (value ?? "").trim();
  if (!s) return null;
  const n = Math.floor(Number(s));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Potongan satu periode: tidak melebihi sisa hutang. */
export function hitungPotonganKasbon(sisaHutang: number, angsuranPerBulan: number): number {
  const sisa = Math.max(0, Math.round(sisaHutang));
  if (sisa === 0) return 0;
  return Math.min(sisa, Math.max(0, Math.round(angsuranPerBulan)));
}

export type ValidasiKasbonInput = {
  nominal: number;
  tenorBulan: number;
  maxNominal: number | null;
  maxTenor: number;
};

/** Validasi pengajuan; return pesan error atau null bila valid. */
export function validasiKasbon(input: ValidasiKasbonInput): string | null {
  if (!Number.isFinite(input.nominal) || input.nominal <= 0) {
    return "Nominal harus lebih dari 0.";
  }
  if (!Number.isInteger(input.tenorBulan) || input.tenorBulan < 1) {
    return "Tenor minimal 1 bulan.";
  }
  if (input.maxNominal !== null && Math.round(input.nominal) > input.maxNominal) {
    return `Nominal melebihi plafon Rp${input.maxNominal.toLocaleString("id-ID")}.`;
  }
  if (input.tenorBulan > input.maxTenor) {
    return `Tenor melebihi maksimum ${input.maxTenor} bulan.`;
  }
  return null;
}
