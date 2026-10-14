/**
 * PPh 21 TER (PP 58/2023 + PMK 168/2023).
 * Bulanan: PPh = bruto × tarif kategori A/B/C. Desember: koreksi tahunan
 * Pasal 17 dikurangi akumulasi Jan–Nov. Bruto = totalPendapatan.
 * Tabel TER_*_LAPIS = salinan lampiran PP 58/2023 (fallback bila tabel DB kosong).
 */

export type KategoriTer = "A" | "B" | "C";
export type StatusPtkpInput =
  | "TK_0"
  | "TK_1"
  | "TK_2"
  | "TK_3"
  | "K_0"
  | "K_1"
  | "K_2"
  | "K_3";

export type LapisTer = { batasAtas: number | null; tarif: number };

export function kategoriTerDariPtkp(ptkp: StatusPtkpInput): KategoriTer {
  if (ptkp === "K_3") return "C";
  if (ptkp === "TK_2" || ptkp === "TK_3" || ptkp === "K_1" || ptkp === "K_2") return "B";
  return "A";
}

export function labelPtkp(ptkp: StatusPtkpInput): string {
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
const PASAL17_LAPIS: Array<{ batasAtas: number | null; tarif: number }> = [
  { batasAtas: 60_000_000, tarif: 0.05 },
  { batasAtas: 250_000_000, tarif: 0.15 },
  { batasAtas: 500_000_000, tarif: 0.25 },
  { batasAtas: 5_000_000_000, tarif: 0.3 },
  { batasAtas: null, tarif: 0.35 },
];

export function hitungPPhPasal17Setahun(pkp: number): number {
  if (pkp <= 0) return 0;
  let sisa = pkp;
  let bawah = 0;
  let pajak = 0;
  for (const lapis of PASAL17_LAPIS) {
    const atas = lapis.batasAtas ?? Number.POSITIVE_INFINITY;
    const kena = Math.min(sisa, atas - bawah);
    if (kena <= 0) break;
    pajak += kena * lapis.tarif;
    sisa -= kena;
    bawah = atas;
  }
  return Math.round(pajak);
}

// ---------------------------------------------------------------------------
// Tabel TER lampiran PP 58/2023 (fallback bila DB kosong)
// ---------------------------------------------------------------------------

export const TER_A_LAPIS: LapisTer[] = [
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

export const TER_B_LAPIS: LapisTer[] = [
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

export const TER_C_LAPIS: LapisTer[] = [
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

export const TER_FALLBACK: Record<KategoriTer, LapisTer[]> = {
  A: TER_A_LAPIS,
  B: TER_B_LAPIS,
  C: TER_C_LAPIS,
};

// ---------------------------------------------------------------------------

export function cariTarifTer(lapis: LapisTer[], bruto: number): number {
  for (const l of lapis) {
    if (l.batasAtas === null || bruto <= l.batasAtas) return l.tarif;
  }
  return lapis[lapis.length - 1]?.tarif ?? 0;
}

export type HasilPPhTer = {
  kategori: KategoriTer;
  tarif: number;
  pph: number;
  keterangan: string;
};

/** Hitung PPh bulanan TER dari bruto + status PTKP. Pure, tanpa DB. */
export function hitungPPhTerBulanan(
  bruto: number,
  ptkp: StatusPtkpInput,
  lapisOverride?: LapisTer[],
): HasilPPhTer {
  const kategori = kategoriTerDariPtkp(ptkp);
  const lapis = lapisOverride ?? TER_FALLBACK[kategori];
  const tarif = cariTarifTer(lapis, Math.max(0, Math.round(bruto)));
  const pph = Math.round(Math.max(0, bruto) * tarif);
  return {
    kategori,
    tarif,
    pph,
    keterangan: `TER ${kategori} ${labelPtkp(ptkp)} ${(tarif * 100).toLocaleString("id-ID")}% x ${Math.round(bruto).toLocaleString("id-ID")}`,
  };
}

/**
 * PPh marginal TER untuk penghasilan tak-teratur (mis. THR) yang dibayar
 * bersamaan dengan gaji bulan berjalan (PMK 168/2023):
 * PPh = TER(brutoAcuan + tambahan) − TER(brutoAcuan).
 * Bila tidak ada acuan gaji (0) hasilnya = TER atas tambahan saja.
 */
export function hitungPPhMarginalTer(
  brutoAcuan: number,
  tambahan: number,
  ptkp: StatusPtkpInput,
  lapisOverride?: LapisTer[],
): HasilPPhTer & { brutoGabungan: number } {
  const acuan = Math.max(0, Math.round(brutoAcuan));
  const tmb = Math.max(0, Math.round(tambahan));
  const gabungan = acuan + tmb;
  const kategori = kategoriTerDariPtkp(ptkp);
  const lapis = lapisOverride ?? TER_FALLBACK[kategori];
  const pphGabungan = Math.round(gabungan * cariTarifTer(lapis, gabungan));
  const pphAcuan = Math.round(acuan * cariTarifTer(lapis, acuan));
  const tarif = cariTarifTer(lapis, gabungan);
  return {
    kategori,
    tarif,
    pph: Math.max(0, pphGabungan - pphAcuan),
    brutoGabungan: gabungan,
    keterangan:
      acuan > 0
        ? `Marginal TER ${kategori}: (${gabungan.toLocaleString("id-ID")} − ${acuan.toLocaleString("id-ID")})`
        : `TER ${kategori} ${labelPtkp(ptkp)} atas THR saja (tanpa acuan gaji bulan bayar)`,
  };
}

export type KoreksiDesemberInput = {
  ptkp: StatusPtkpInput;
  /** Total bruto Jan–Des (termasuk bulan Des berjalan). */
  brutoSetahun: number;
  /** Total iuran setahun yang menjadi pengurang (JHT+JP karyawan). */
  iuranSetahun: number;
  /** Jumlah bulan bekerja dalam tahun berjalan (1–12, untuk prorata biaya jabatan). */
  bulanKerja: number;
  /** Akumulasi PPh TER Jan–Nov yang sudah dipotong. */
  pphJanNov: number;
  /** Tanpa NPWP → tarif Pasal 17 × 120% (UU HPP). Berlaku untuk koreksi tahunan. */
  punyaNpwp: boolean;
};

/**
 * Koreksi Desember (PMK 168/2023): PPh setahun progresif − akumulasi Jan–Nov.
 * Biaya jabatan 5% bruto, max 500rb/bulan × bulanKerja. Tidak pernah negatif.
 */
export function hitungPPhDesemberKoreksi(input: KoreksiDesemberInput): {
  pphDesember: number;
  pphSetahun: number;
  pkp: number;
  keterangan: string;
} {
  const bruto = Math.max(0, Math.round(input.brutoSetahun));
  const bulan = Math.min(12, Math.max(1, Math.round(input.bulanKerja)));
  const biayaJabatan = Math.min(Math.round(bruto * 0.05), 500_000 * bulan);
  const neto = Math.max(0, bruto - biayaJabatan - Math.max(0, Math.round(input.iuranSetahun)));
  const pkp = Math.max(0, Math.floor((neto - PTKP_TAHUNAN[input.ptkp]) / 1000) * 1000);
  let pphSetahun = hitungPPhPasal17Setahun(pkp);
  if (!input.punyaNpwp) pphSetahun = Math.round(pphSetahun * 1.2);
  const pphDesember = Math.max(0, pphSetahun - Math.max(0, Math.round(input.pphJanNov)));
  return {
    pphDesember,
    pphSetahun,
    pkp,
    keterangan: `Koreksi Des: setahun ${pphSetahun.toLocaleString("id-ID")} − Jan–Nov ${Math.round(input.pphJanNov).toLocaleString("id-ID")}`,
  };
}
