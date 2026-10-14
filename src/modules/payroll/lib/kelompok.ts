/**
 * Efek kelompok komponen ke akumulasi gaji (murni, teruji).
 * PENDAPATAN/TUNJANGAN → bruto; POTONGAN/IURAN → potongan;
 * BIAYA_PERUSAHAAN → info slip saja (tak pengaruhi bersih);
 * tak dikenal → potongan (aman).
 */
export function akumulasiKelompok(
  kelompok: string,
  jumlah: number,
  acc: { pendapatan: number; potongan: number; biayaPerusahaan: number },
): void {
  if (kelompok === "PENDAPATAN" || kelompok === "TUNJANGAN") {
    acc.pendapatan += jumlah;
  } else if (kelompok === "BIAYA_PERUSAHAAN") {
    acc.biayaPerusahaan += jumlah;
  } else {
    acc.potongan += jumlah;
  }
}
