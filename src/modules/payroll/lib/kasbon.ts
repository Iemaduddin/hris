/**
 * Salary advances / employee loans (pure, tested).
 * Installment = amount / tenor; period deduction = min(installment, remainder).
 */

export const SALARY_ADVANCE_MAX_AMOUNT_KEY = "KASBON_MAX_NOMINAL";
export const SALARY_ADVANCE_MAX_TENOR_KEY = "KASBON_MAX_TENOR";

export const SALARY_ADVANCE_DEFAULT_SETTINGS: Record<string, string> = {
  [SALARY_ADVANCE_MAX_AMOUNT_KEY]: "",
  [SALARY_ADVANCE_MAX_TENOR_KEY]: "24",
};

export const SALARY_ADVANCE_SETTING_DESCRIPTIONS: Record<string, string> = {
  [SALARY_ADVANCE_MAX_AMOUNT_KEY]: "Plafon nominal kasbon per pengajuan (Rp). Kosong = tanpa batas.",
  [SALARY_ADVANCE_MAX_TENOR_KEY]: "Tenor maksimum (bulan).",
};

export function calculateSalaryAdvanceInstallment(amount: number, tenorMonths: number): number {
  if (amount <= 0 || tenorMonths <= 0) return 0;
  return Math.round(Math.round(amount) / Math.floor(tenorMonths));
}

/** Empty cap → null (unlimited); negative/invalid → null. */
export function parseMaxSalaryAdvanceAmount(value: string | null | undefined): number | null {
  const s = (value ?? "").trim();
  if (!s) return null;
  const n = Math.floor(Number(s));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** One period's deduction: never exceeds the remaining debt. */
export function calculateSalaryAdvanceDeduction(remainingDebt: number, monthlyInstallment: number): number {
  const rest = Math.max(0, Math.round(remainingDebt));
  if (rest === 0) return 0;
  return Math.min(rest, Math.max(0, Math.round(monthlyInstallment)));
}

export type ValidateSalaryAdvanceInput = {
  amount: number;
  tenorMonths: number;
  maxAmount: number | null;
  maxTenor: number;
};

/** Validate a submission; returns the error message or null when valid. */
export function validateSalaryAdvance(input: ValidateSalaryAdvanceInput): string | null {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "Nominal harus lebih dari 0.";
  }
  if (!Number.isInteger(input.tenorMonths) || input.tenorMonths < 1) {
    return "Tenor minimal 1 bulan.";
  }
  if (input.maxAmount !== null && Math.round(input.amount) > input.maxAmount) {
    return `Nominal melebihi plafon Rp${input.maxAmount.toLocaleString("id-ID")}.`;
  }
  if (input.tenorMonths > input.maxTenor) {
    return `Tenor melebihi maksimum ${input.maxTenor} bulan.`;
  }
  return null;
}
