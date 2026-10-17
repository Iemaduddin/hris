/**
 * Disbursement bank (murni, teruji). CSV titik-koma untuk upload bulk
 * transfer: NO;BANK;NOREK;ATAS_NAMA;NOMINAL;BERITA.
 */

export type DisbursementRow = {
  bank: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  remark: string;
};

function cellCsv(value: string): string {
  if (/[;"\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildDisbursementCsv(rows: DisbursementRow[]): string {
  const head = "NO;BANK;NOREK;ATAS_NAMA;NOMINAL;BERITA";
  const lines = rows.map((b, i) =>
    [
      String(i + 1),
      cellCsv(b.bank.trim()),
      cellCsv(b.accountNumber.trim()),
      cellCsv(b.accountName.trim()),
      String(Math.max(0, Math.round(b.amount))),
      cellCsv(b.remark.trim()),
    ].join(";"),
  );
  return [head, ...lines].join("\n");
}

export type DisbursementCandidate = {
  name: string;
  bank: string | null;
  accountNumber: string | null;
  accountName: string | null;
  amount: number;
};

/** Pisahkan yang siap transfer vs yang data banknya belum lengkap. */
export function splitDisbursement(
  candidates: DisbursementCandidate[],
  remark: string,
): { rows: DisbursementRow[]; incomplete: string[]; total: number } {
  const rows: DisbursementRow[] = [];
  const incomplete: string[] = [];
  let total = 0;
  for (const k of candidates) {
    if (!k.bank?.trim() || !k.accountNumber?.trim() || !k.accountName?.trim()) {
      incomplete.push(k.name);
      continue;
    }
    if (k.amount <= 0) continue;
    rows.push({ bank: k.bank, accountNumber: k.accountNumber, accountName: k.accountName, amount: k.amount, remark });
    total += Math.round(k.amount);
  }
  return { rows, incomplete, total };
}
