/** Disiplin: eskalasi SP + hitung hari skorsing murni. */

export const LEVEL_ORDER = ["SP1", "SP2", "SP3", "SKORSING", "PHK"] as const;
export type WarningLevel = (typeof LEVEL_ORDER)[number];

export const LEVEL_LABELS: Record<string, string> = {
  SP1: "SP 1",
  SP2: "SP 2",
  SP3: "SP 3",
  SKORSING: "Skorsing",
  PHK: "PHK",
};

export const UNPAID_SUSPENSION_KEY = "SKORSING_TANPA_UPAH";

export const SUSPENSION_DEFAULT_SETTINGS: Record<string, string> = {
  [UNPAID_SUSPENSION_KEY]: "0",
};

export const SUSPENSION_SETTING_DESCRIPTIONS: Record<string, string> = {
  [UNPAID_SUSPENSION_KEY]: "1 = hari skorsing dipotong seperti alpa; 0 = tetap dibayar.",
};

/** Tingkat boleh diterbitkan bila tingkat sebelumnya masih aktif, kecuali pelanggaran berat langsung PHK. */
export function validateEscalation(level: string, active: string[], severeViolation: boolean): string | null {
  if (!(LEVEL_ORDER as readonly string[]).includes(level)) return "Tingkat tidak valid.";
  if (level === "SP1") return null;
  if (level === "PHK" && severeViolation) return null;
  const required = LEVEL_ORDER[LEVEL_ORDER.indexOf(level as WarningLevel) - 1];
  if (!active.includes(required)) return `Butuh ${LEVEL_LABELS[required]} aktif terlebih dahulu.`;
  return null;
}

/** Irisan hari skorsing dengan periode (inklusif, UTC). */
export function suspensionDaysInPeriod(
  start: Date | null,
  end: Date | null,
  periodStart: Date,
  periodEnd: Date,
): number {
  if (!start || !end) return 0;
  const a = Math.max(start.getTime(), periodStart.getTime());
  const b = Math.min(end.getTime(), periodEnd.getTime());
  if (b < a) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}

/** Default masa berlaku 6 bulan dari terbit. */
export function defaultExpiryDate(issueDate: Date): Date {
  const d = new Date(issueDate);
  d.setMonth(d.getMonth() + 6);
  return d;
}
