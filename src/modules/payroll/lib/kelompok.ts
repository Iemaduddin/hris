/**
 * Efek kelompok komponen ke akumulasi gaji (murni, teruji).
 * PENDAPATAN/TUNJANGAN → bruto; POTONGAN/IURAN → potongan;
 * BIAYA_PERUSAHAAN → info slip saja (tak pengaruhi bersih);
 * tak dikenal → potongan (aman).
 */
export function accumulateGroups(
  group: string,
  amount: number,
  acc: { earnings: number; deductions: number; companyCost: number },
): void {
  if (group === "PENDAPATAN" || group === "TUNJANGAN") {
    acc.earnings += amount;
  } else if (group === "BIAYA_PERUSAHAAN") {
    acc.companyCost += amount;
  } else {
    acc.deductions += amount;
  }
}
