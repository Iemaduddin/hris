/**
 * Upah lembur tiered (KEP.102/MEN/VI/2004). Fungsi murni, tanpa DB.
 * Sejam = upah sebulan / 173. Kerja: ×1,5 jam-1 lalu ×2.
 * Libur 6-hari: ×2×7j + ×3 + ×4; 5-hari: ×2×8j + ×3 + ×4.
 */

export const OVERTIME_TIERED_KEY = "LEMBUR_TIERED";
export const OVERTIME_DIVISOR_KEY = "LEMBUR_DIVISOR";
export const OVERTIME_MAX_HOURS_KEY = "LEMBUR_MAX_JAM_PER_BULAN";

export const OVERTIME_DEFAULT_SETTINGS: Record<string, string> = {
  [OVERTIME_TIERED_KEY]: "1",
  [OVERTIME_DIVISOR_KEY]: "173",
  [OVERTIME_MAX_HOURS_KEY]: "",
};

export const OVERTIME_SETTING_DESCRIPTIONS: Record<string, string> = {
  [OVERTIME_TIERED_KEY]: "1 = upah lembur tiered Kepmen 102/2004 (abaikan nilai komponen UPAH_LEMBUR); 0 = flat nilai komponen × jam.",
  [OVERTIME_DIVISOR_KEY]: "Pembagi upah sejam (regulasi 173).",
  [OVERTIME_MAX_HOURS_KEY]: "Batas jam lembur per bulan per karyawan saat pengajuan (kosong = tanpa batas).",
};

export type OvertimeCategory = "KERJA" | "LIBUR_5" | "LIBUR_6";

type OvertimeTierRow = { hours: number | null; multiplier: number };

const TIERS: Record<OvertimeCategory, OvertimeTierRow[]> = {
  KERJA: [
    { hours: 1, multiplier: 1.5 },
    { hours: null, multiplier: 2 },
  ],
  LIBUR_6: [
    { hours: 7, multiplier: 2 },
    { hours: 1, multiplier: 3 },
    { hours: null, multiplier: 4 },
  ],
  LIBUR_5: [
    { hours: 8, multiplier: 2 },
    { hours: 1, multiplier: 3 },
    { hours: null, multiplier: 4 },
  ],
};

export function calculateHourlyRate(monthlyWage: number, divisor: number): number {
  if (monthlyWage <= 0 || divisor <= 0) return 0;
  return monthlyWage / divisor;
}

export type TierBreakdown = { multiplier: number; hours: number; amount: number };

/** Upah lembur untuk satu tanggal: jam dipecah per lapis pengali. */
export function calculateDailyOvertime(
  totalHours: number,
  hourlyRate: number,
  category: OvertimeCategory,
): { amount: number; tiers: TierBreakdown[] } {
  let remaining = Math.max(0, totalHours);
  const tiers: TierBreakdown[] = [];
  for (const tier of TIERS[category]) {
    if (remaining <= 0) break;
    const take = tier.hours === null ? remaining : Math.min(remaining, tier.hours);
    if (take > 0) {
      tiers.push({ multiplier: tier.multiplier, hours: Math.round(take * 100) / 100, amount: take * tier.multiplier * hourlyRate });
    }
    remaining -= take;
  }
  const amount = Math.round(tiers.reduce((acc, t) => acc + t.amount, 0));
  return { amount, tiers };
}

/** Akumulasi jam per pengali untuk keterangan slip gabungan. */
export function summarizeTiers(tiers: TierBreakdown[], acc: Map<number, number>): void {
  for (const t of tiers) acc.set(t.multiplier, (acc.get(t.multiplier) ?? 0) + t.hours);
}

export function describeTiers(acc: Map<number, number>): string {
  const parts = [...acc.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([multiplier, hours]) => `×${multiplier.toLocaleString("id-ID")} ${Math.round(hours * 100) / 100}j`);
  return parts.join(" + ");
}

/** Validasi cap jam/bulan saat pengajuan (murni). */
export function checkOvertimeCap(runningHours: number, newHours: number, maxHours: number | null): boolean {
  if (maxHours === null || maxHours < 0) return true;
  return runningHours + newHours <= maxHours + 1e-9;
}

export function parseMaxHours(value: string | null | undefined): number | null {
  const s = (value ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
