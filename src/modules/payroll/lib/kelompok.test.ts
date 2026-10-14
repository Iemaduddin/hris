import { akumulasiKelompok } from "./kelompok";

describe("akumulasi kelompok", () => {
  function hitung(steps: Array<[string, number]>) {
    const acc = { pendapatan: 0, potongan: 0, biayaPerusahaan: 0 };
    for (const [kelompok, jumlah] of steps) akumulasiKelompok(kelompok, jumlah, acc);
    return acc;
  }

  test("pendapatan/tunjangan menambah bruto", () => {
    expect(hitung([["PENDAPATAN", 100], ["TUNJANGAN", 50]])).toEqual({
      pendapatan: 150,
      potongan: 0,
      biayaPerusahaan: 0,
    });
  });

  test("potongan/iuran mengurangi (akumulasi potongan)", () => {
    expect(hitung([["POTONGAN", 100], ["IURAN", 50]])).toEqual({
      pendapatan: 0,
      potongan: 150,
      biayaPerusahaan: 0,
    });
  });

  test("biaya perusahaan terpisah, bersih tak berubah", () => {
    const acc = hitung([
      ["PENDAPATAN", 10_000_000],
      ["IURAN", 100_000],
      ["BIAYA_PERUSAHAAN", 400_000],
    ]);
    expect(acc.biayaPerusahaan).toBe(400_000);
    expect(acc.pendapatan - acc.potongan).toBe(9_900_000);
  });

  test("kelompok tak dikenal diperlakukan sebagai potongan (aman)", () => {
    expect(hitung([["X", 10]]).potongan).toBe(10);
  });
});
