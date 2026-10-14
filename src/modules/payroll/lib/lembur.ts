/**
 * Upah lembur tiered (KEP.102/MEN/VI/2004). Fungsi murni, tanpa DB.
 * Sejam = upah sebulan / 173. Kerja: ×1,5 jam-1 lalu ×2.
 * Libur 6-hari: ×2×7j + ×3 + ×4; 5-hari: ×2×8j + ×3 + ×4.
 */

export const KUNCI_LEMBUR_TIERED = "LEMBUR_TIERED";
export const KUNCI_LEMBUR_DIVISOR = "LEMBUR_DIVISOR";
export const KUNCI_LEMBUR_MAX_JAM = "LEMBUR_MAX_JAM_PER_BULAN";

export const LEMBUR_SETTING_DEFAULT: Record<string, string> = {
  [KUNCI_LEMBUR_TIERED]: "1",
  [KUNCI_LEMBUR_DIVISOR]: "173",
  [KUNCI_LEMBUR_MAX_JAM]: "",
};

export const LEMBUR_SETTING_DESKRIPSI: Record<string, string> = {
  [KUNCI_LEMBUR_TIERED]: "1 = upah lembur tiered Kepmen 102/2004 (abaikan nilai komponen UPAH_LEMBUR); 0 = flat nilai komponen × jam.",
  [KUNCI_LEMBUR_DIVISOR]: "Pembagi upah sejam (regulasi 173).",
  [KUNCI_LEMBUR_MAX_JAM]: "Batas jam lembur per bulan per karyawan saat pengajuan (kosong = tanpa batas).",
};

export type KategoriLembur = "KERJA" | "LIBUR_5" | "LIBUR_6";

type LapisLembur = { jam: number | null; pengali: number };

const TIER: Record<KategoriLembur, LapisLembur[]> = {
  KERJA: [
    { jam: 1, pengali: 1.5 },
    { jam: null, pengali: 2 },
  ],
  LIBUR_6: [
    { jam: 7, pengali: 2 },
    { jam: 1, pengali: 3 },
    { jam: null, pengali: 4 },
  ],
  LIBUR_5: [
    { jam: 8, pengali: 2 },
    { jam: 1, pengali: 3 },
    { jam: null, pengali: 4 },
  ],
};

export function hitungUpahSejam(upahSebulan: number, divisor: number): number {
  if (upahSebulan <= 0 || divisor <= 0) return 0;
  return upahSebulan / divisor;
}

export type RincianTier = { pengali: number; jam: number; jumlah: number };

/** Upah lembur untuk satu tanggal: jam dipecah per lapis pengali. */
export function hitungUpahLemburSehari(
  jumlahJam: number,
  upahSejam: number,
  kategori: KategoriLembur,
): { jumlah: number; tiers: RincianTier[] } {
  let sisa = Math.max(0, jumlahJam);
  const tiers: RincianTier[] = [];
  for (const lapis of TIER[kategori]) {
    if (sisa <= 0) break;
    const ambil = lapis.jam === null ? sisa : Math.min(sisa, lapis.jam);
    if (ambil > 0) {
      tiers.push({ pengali: lapis.pengali, jam: Math.round(ambil * 100) / 100, jumlah: ambil * lapis.pengali * upahSejam });
    }
    sisa -= ambil;
  }
  const jumlah = Math.round(tiers.reduce((acc, t) => acc + t.jumlah, 0));
  return { jumlah, tiers };
}

/** Akumulasi jam per pengali untuk keterangan slip gabungan. */
export function ringkasTier(tiers: RincianTier[], acc: Map<number, number>): void {
  for (const t of tiers) acc.set(t.pengali, (acc.get(t.pengali) ?? 0) + t.jam);
}

export function keteranganTier(acc: Map<number, number>): string {
  const parts = [...acc.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([pengali, jam]) => `×${pengali.toLocaleString("id-ID")} ${Math.round(jam * 100) / 100}j`);
  return parts.join(" + ");
}

/** Validasi cap jam/bulan saat pengajuan (murni). */
export function cekCapLembur(jamBerjalan: number, jamBaru: number, maxJam: number | null): boolean {
  if (maxJam === null || maxJam < 0) return true;
  return jamBerjalan + jamBaru <= maxJam + 1e-9;
}

export function parseMaxJam(value: string | null | undefined): number | null {
  const s = (value ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
