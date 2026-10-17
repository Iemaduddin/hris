/**
 * PPh 21 TER (PP 58/2023 + PMK 168/2023).
 * Bulanan: PPh = bruto × tarif kategori A/B/C. Desember: koreksi tahunan
 * Pasal 17 dikurangi akumulasi Jan–Nov. Bruto = totalPendapatan.
 * Tabel TER_*_BRACKETS = salinan lampiran PP 58/2023 (fallback bila tabel DB kosong).
 */

export type TerCategory = "A" | "B" | "C";
export type StatusPtkpInput =
  | "TK_0"
  | "TK_1"
  | "TK_2"
  | "TK_3"
  | "K_0"
  | "K_1"
  | "K_2"
  | "K_3";

export type TerBracket = { batasAtas: number | null; tarif: number };

export function terCategoryFromPtkp(ptkp: StatusPtkpInput): TerCategory {
  if (ptkp === "K_3") return "C";
  if (ptkp === "TK_2" || ptkp === "TK_3" || ptkp === "K_1" || ptkp === "K_2") return "B";
  return "A";
}

export function getPtkpLabel(ptkp: StatusPtkpInput): string {
  return ptkp.replace("_", "/");
}

export const PTKP_TAHUNAN: Record<StatusPtkpInput, number> = {
  TK_0: 54_000_000,
  TK_1: 58_500_000,
  K_0: 58_500_000,
  TK_2: 63_000_000,
  K_1: 63_000_000,
  TK_3: 67_500_000,
  K_2: 67_500_000,
  K_3: 72_000_000,
};

/** Tarif Pasal 17 ayat (1) huruf a — untuk koreksi Desember. */
const ARTICLE17_BRACKETS: TerBracket[] = [
  { batasAtas: 60_000_000, tarif: 0.05 },
  { batasAtas: 250_000_000, tarif: 0.15 },
  { batasAtas: 500_000_000, tarif: 0.25 },
  { batasAtas: 5_000_000_000, tarif: 0.3 },
  { batasAtas: null, tarif: 0.35 },
];

export function calculateAnnualArticle17Tax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  let remaining = taxableIncome;
  let lower = 0;
  let tax = 0;
  for (const bracket of ARTICLE17_BRACKETS) {
    const upper = bracket.batasAtas ?? Number.POSITIVE_INFINITY;
    const taxable = Math.min(remaining, upper - lower);
    if (taxable <= 0) break;
    tax += taxable * bracket.tarif;
    remaining -= taxable;
    lower = upper;
  }
  return Math.round(tax);
}

// ---------------------------------------------------------------------------
// Tabel TER lampiran PP 58/2023 (fallback bila DB kosong)
// ---------------------------------------------------------------------------

export const TER_A_BRACKETS: TerBracket[] = [
  { batasAtas: 5_400_000, tarif: 0 },
  { batasAtas: 5_650_000, tarif: 0.0025 },
  { batasAtas: 5_950_000, tarif: 0.005 },
  { batasAtas: 6_300_000, tarif: 0.0075 },
  { batasAtas: 6_750_000, tarif: 0.01 },
  { batasAtas: 7_500_000, tarif: 0.0125 },
  { batasAtas: 8_550_000, tarif: 0.015 },
  { batasAtas: 9_650_000, tarif: 0.0175 },
  { batasAtas: 10_050_000, tarif: 0.02 },
  { batasAtas: 10_350_000, tarif: 0.0225 },
  { batasAtas: 10_700_000, tarif: 0.025 },
  { batasAtas: 11_050_000, tarif: 0.03 },
  { batasAtas: 11_600_000, tarif: 0.035 },
  { batasAtas: 12_500_000, tarif: 0.04 },
  { batasAtas: 13_750_000, tarif: 0.05 },
  { batasAtas: 15_100_000, tarif: 0.06 },
  { batasAtas: 16_950_000, tarif: 0.07 },
  { batasAtas: 19_750_000, tarif: 0.08 },
  { batasAtas: 24_150_000, tarif: 0.09 },
  { batasAtas: 26_450_000, tarif: 0.1 },
  { batasAtas: 28_000_000, tarif: 0.11 },
  { batasAtas: 30_050_000, tarif: 0.12 },
  { batasAtas: 32_400_000, tarif: 0.13 },
  { batasAtas: 35_400_000, tarif: 0.14 },
  { batasAtas: 39_100_000, tarif: 0.15 },
  { batasAtas: 43_850_000, tarif: 0.16 },
  { batasAtas: 47_800_000, tarif: 0.17 },
  { batasAtas: 51_400_000, tarif: 0.18 },
  { batasAtas: 56_300_000, tarif: 0.19 },
  { batasAtas: 62_200_000, tarif: 0.2 },
  { batasAtas: 68_600_000, tarif: 0.21 },
  { batasAtas: 77_500_000, tarif: 0.22 },
  { batasAtas: 89_000_000, tarif: 0.23 },
  { batasAtas: 103_000_000, tarif: 0.24 },
  { batasAtas: 125_000_000, tarif: 0.25 },
  { batasAtas: 157_000_000, tarif: 0.26 },
  { batasAtas: 206_000_000, tarif: 0.27 },
  { batasAtas: 337_000_000, tarif: 0.28 },
  { batasAtas: 454_000_000, tarif: 0.29 },
  { batasAtas: 550_000_000, tarif: 0.3 },
  { batasAtas: 695_000_000, tarif: 0.31 },
  { batasAtas: 910_000_000, tarif: 0.32 },
  { batasAtas: 1_400_000_000, tarif: 0.33 },
  { batasAtas: null, tarif: 0.34 },
];

export const TER_B_BRACKETS: TerBracket[] = [
  { batasAtas: 6_200_000, tarif: 0 },
  { batasAtas: 6_500_000, tarif: 0.0025 },
  { batasAtas: 6_850_000, tarif: 0.005 },
  { batasAtas: 7_300_000, tarif: 0.0075 },
  { batasAtas: 9_200_000, tarif: 0.01 },
  { batasAtas: 10_750_000, tarif: 0.015 },
  { batasAtas: 11_250_000, tarif: 0.02 },
  { batasAtas: 11_600_000, tarif: 0.025 },
  { batasAtas: 12_600_000, tarif: 0.03 },
  { batasAtas: 13_600_000, tarif: 0.04 },
  { batasAtas: 14_950_000, tarif: 0.05 },
  { batasAtas: 16_400_000, tarif: 0.06 },
  { batasAtas: 18_450_000, tarif: 0.07 },
  { batasAtas: 21_850_000, tarif: 0.08 },
  { batasAtas: 26_000_000, tarif: 0.09 },
  { batasAtas: 27_700_000, tarif: 0.1 },
  { batasAtas: 29_350_000, tarif: 0.11 },
  { batasAtas: 31_450_000, tarif: 0.12 },
  { batasAtas: 33_950_000, tarif: 0.13 },
  { batasAtas: 37_100_000, tarif: 0.14 },
  { batasAtas: 41_100_000, tarif: 0.15 },
  { batasAtas: 45_800_000, tarif: 0.16 },
  { batasAtas: 49_500_000, tarif: 0.17 },
  { batasAtas: 53_800_000, tarif: 0.18 },
  { batasAtas: 58_500_000, tarif: 0.19 },
  { batasAtas: 64_000_000, tarif: 0.2 },
  { batasAtas: 71_000_000, tarif: 0.21 },
  { batasAtas: 80_000_000, tarif: 0.22 },
  { batasAtas: 93_000_000, tarif: 0.23 },
  { batasAtas: 109_000_000, tarif: 0.24 },
  { batasAtas: 129_000_000, tarif: 0.25 },
  { batasAtas: 163_000_000, tarif: 0.26 },
  { batasAtas: 211_000_000, tarif: 0.27 },
  { batasAtas: 374_000_000, tarif: 0.28 },
  { batasAtas: 459_000_000, tarif: 0.29 },
  { batasAtas: 555_000_000, tarif: 0.3 },
  { batasAtas: 704_000_000, tarif: 0.31 },
  { batasAtas: 957_000_000, tarif: 0.32 },
  { batasAtas: 1_405_000_000, tarif: 0.33 },
  { batasAtas: null, tarif: 0.34 },
];

export const TER_C_BRACKETS: TerBracket[] = [
  { batasAtas: 6_600_000, tarif: 0 },
  { batasAtas: 6_950_000, tarif: 0.0025 },
  { batasAtas: 7_350_000, tarif: 0.005 },
  { batasAtas: 7_800_000, tarif: 0.0075 },
  { batasAtas: 8_850_000, tarif: 0.01 },
  { batasAtas: 9_800_000, tarif: 0.0125 },
  { batasAtas: 10_950_000, tarif: 0.015 },
  { batasAtas: 11_200_000, tarif: 0.0175 },
  { batasAtas: 12_050_000, tarif: 0.02 },
  { batasAtas: 12_950_000, tarif: 0.03 },
  { batasAtas: 14_150_000, tarif: 0.04 },
  { batasAtas: 15_550_000, tarif: 0.05 },
  { batasAtas: 17_050_000, tarif: 0.06 },
  { batasAtas: 19_500_000, tarif: 0.07 },
  { batasAtas: 22_700_000, tarif: 0.08 },
  { batasAtas: 26_600_000, tarif: 0.09 },
  { batasAtas: 28_100_000, tarif: 0.1 },
  { batasAtas: 30_100_000, tarif: 0.11 },
  { batasAtas: 32_600_000, tarif: 0.12 },
  { batasAtas: 35_400_000, tarif: 0.13 },
  { batasAtas: 38_900_000, tarif: 0.14 },
  { batasAtas: 43_000_000, tarif: 0.15 },
  { batasAtas: 47_400_000, tarif: 0.16 },
  { batasAtas: 51_200_000, tarif: 0.17 },
  { batasAtas: 55_800_000, tarif: 0.18 },
  { batasAtas: 60_400_000, tarif: 0.19 },
  { batasAtas: 66_700_000, tarif: 0.2 },
  { batasAtas: 74_500_000, tarif: 0.21 },
  { batasAtas: 83_200_000, tarif: 0.22 },
  { batasAtas: 95_600_000, tarif: 0.23 },
  { batasAtas: 110_000_000, tarif: 0.24 },
  { batasAtas: 134_000_000, tarif: 0.25 },
  { batasAtas: 169_000_000, tarif: 0.26 },
  { batasAtas: 221_000_000, tarif: 0.27 },
  { batasAtas: 390_000_000, tarif: 0.28 },
  { batasAtas: 463_000_000, tarif: 0.29 },
  { batasAtas: 561_000_000, tarif: 0.3 },
  { batasAtas: 709_000_000, tarif: 0.31 },
  { batasAtas: 965_000_000, tarif: 0.32 },
  { batasAtas: 1_419_000_000, tarif: 0.33 },
  { batasAtas: null, tarif: 0.34 },
];

export const TER_FALLBACK: Record<TerCategory, TerBracket[]> = {
  A: TER_A_BRACKETS,
  B: TER_B_BRACKETS,
  C: TER_C_BRACKETS,
};

// ---------------------------------------------------------------------------

export function findTerRate(brackets: TerBracket[], gross: number): number {
  for (const b of brackets) {
    if (b.batasAtas === null || gross <= b.batasAtas) return b.tarif;
  }
  return brackets[brackets.length - 1]?.tarif ?? 0;
}

export type TerPphResult = {
  category: TerCategory;
  rate: number;
  pph: number;
  note: string;
};

/** Hitung PPh bulanan TER dari bruto + status PTKP. Pure, tanpa DB. */
export function calculateMonthlyTerPph(
  gross: number,
  ptkp: StatusPtkpInput,
  bracketOverride?: TerBracket[],
): TerPphResult {
  const category = terCategoryFromPtkp(ptkp);
  const brackets = bracketOverride ?? TER_FALLBACK[category];
  const rate = findTerRate(brackets, Math.max(0, Math.round(gross)));
  const pph = Math.round(Math.max(0, gross) * rate);
  return {
    category,
    rate,
    pph,
    note: `TER ${category} ${getPtkpLabel(ptkp)} ${(rate * 100).toLocaleString("id-ID")}% x ${Math.round(gross).toLocaleString("id-ID")}`,
  };
}

/**
 * PPh marginal TER untuk penghasilan tak-teratur (mis. THR) yang dibayar
 * bersamaan dengan gaji bulan berjalan (PMK 168/2023):
 * PPh = TER(brutoAcuan + tambahan) − TER(brutoAcuan).
 * Bila tidak ada acuan gaji (0) hasilnya = TER atas tambahan saja.
 */
export function calculateMarginalTerPph(
  referenceGross: number,
  extra: number,
  ptkp: StatusPtkpInput,
  bracketOverride?: TerBracket[],
): TerPphResult & { combinedGross: number } {
  const reference = Math.max(0, Math.round(referenceGross));
  const extraAmount = Math.max(0, Math.round(extra));
  const combined = reference + extraAmount;
  const category = terCategoryFromPtkp(ptkp);
  const brackets = bracketOverride ?? TER_FALLBACK[category];
  const combinedPph = Math.round(combined * findTerRate(brackets, combined));
  const referencePph = Math.round(reference * findTerRate(brackets, reference));
  const rate = findTerRate(brackets, combined);
  return {
    category,
    rate,
    pph: Math.max(0, combinedPph - referencePph),
    combinedGross: combined,
    note:
      reference > 0
        ? `Marginal TER ${category}: (${combined.toLocaleString("id-ID")} − ${reference.toLocaleString("id-ID")})`
        : `TER ${category} ${getPtkpLabel(ptkp)} atas THR saja (tanpa acuan gaji bulan bayar)`,
  };
}

export type DecemberCorrectionInput = {
  ptkp: StatusPtkpInput;
  /** Total bruto Jan–Des (termasuk bulan Des berjalan). */
  annualGross: number;
  /** Total iuran setahun yang menjadi pengurang (JHT+JP karyawan). */
  annualDeductions: number;
  /** Jumlah bulan bekerja dalam tahun berjalan (1–12, untuk prorata biaya jabatan). */
  monthsWorked: number;
  /** Akumulasi PPh TER Jan–Nov yang sudah dipotong. */
  pphPaidJanNov: number;
  /** Tanpa NPWP → tarif Pasal 17 × 120% (UU HPP). Berlaku untuk koreksi tahunan. */
  hasNpwp: boolean;
};

/**
 * Koreksi Desember (PMK 168/2023): PPh setahun progresif − akumulasi Jan–Nov.
 * Biaya jabatan 5% bruto, max 500rb/bulan × bulanKerja. Tidak pernah negatif.
 */
export function calculateDecemberPphCorrection(input: DecemberCorrectionInput): {
  decemberPph: number;
  annualPph: number;
  taxableIncome: number;
  note: string;
} {
  const gross = Math.max(0, Math.round(input.annualGross));
  const months = Math.min(12, Math.max(1, Math.round(input.monthsWorked)));
  const occupationalExpense = Math.min(Math.round(gross * 0.05), 500_000 * months);
  const net = Math.max(0, gross - occupationalExpense - Math.max(0, Math.round(input.annualDeductions)));
  const taxableIncome = Math.max(0, Math.floor((net - PTKP_TAHUNAN[input.ptkp]) / 1000) * 1000);
  let annualPph = calculateAnnualArticle17Tax(taxableIncome);
  if (!input.hasNpwp) annualPph = Math.round(annualPph * 1.2);
  const decemberPph = Math.max(0, annualPph - Math.max(0, Math.round(input.pphPaidJanNov)));
  return {
    decemberPph,
    annualPph,
    taxableIncome,
    note: `Koreksi Des: setahun ${annualPph.toLocaleString("id-ID")} − Jan–Nov ${Math.round(input.pphPaidJanNov).toLocaleString("id-ID")}`,
  };
}
