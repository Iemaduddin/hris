import {
  cariTarifTer,
  hitungPPhDesemberKoreksi,
  hitungPPhPasal17Setahun,
  hitungPPhTerBulanan,
  kategoriTerDariPtkp,
  TER_A_LAPIS,
  TER_B_LAPIS,
  TER_C_LAPIS,
} from "./pph21-ter";

describe("PPh21 TER", () => {
  test("kategori PTKP → A/B/C sesuai PP 58/2023", () => {
    expect(kategoriTerDariPtkp("TK_0")).toBe("A");
    expect(kategoriTerDariPtkp("TK_1")).toBe("A");
    expect(kategoriTerDariPtkp("K_0")).toBe("A");
    expect(kategoriTerDariPtkp("TK_2")).toBe("B");
    expect(kategoriTerDariPtkp("TK_3")).toBe("B");
    expect(kategoriTerDariPtkp("K_1")).toBe("B");
    expect(kategoriTerDariPtkp("K_2")).toBe("B");
    expect(kategoriTerDariPtkp("K_3")).toBe("C");
  });

  test("jumlah lapis sesuai lampiran (A=44, B=40, C=41)", () => {
    expect(TER_A_LAPIS).toHaveLength(44);
    expect(TER_B_LAPIS).toHaveLength(40);
    expect(TER_C_LAPIS).toHaveLength(41);
  });

  test("contoh DJP: bruto 6jt kategori A (K/0) → 0.75% = 45.000", () => {
    const h = hitungPPhTerBulanan(6_000_000, "K_0");
    expect(h.kategori).toBe("A");
    expect(h.tarif).toBeCloseTo(0.0075, 4);
    expect(h.pph).toBe(45_000);
  });

  test("bruto di bawah batas pertama → 0", () => {
    expect(hitungPPhTerBulanan(5_400_000, "TK_0").pph).toBe(0);
    expect(hitungPPhTerBulanan(6_200_000, "K_1").pph).toBe(0);
    expect(hitungPPhTerBulanan(6_600_000, "K_3").pph).toBe(0);
  });

  test("batas lapis inklusif (bruto == batasAtas pakai tarif lapis itu)", () => {
    expect(cariTarifTer(TER_A_LAPIS, 5_650_000)).toBeCloseTo(0.0025, 4);
    expect(cariTarifTer(TER_A_LAPIS, 5_650_001)).toBeCloseTo(0.005, 4);
  });

  test("Pasal 17 progresif: PKP 50jt → 5% = 2.5jt", () => {
    expect(hitungPPhPasal17Setahun(50_000_000)).toBe(2_500_000);
  });

  test("Pasal 17 progresif: PKP 100jt → 5%×60jt + 15%×40jt = 9jt", () => {
    expect(hitungPPhPasal17Setahun(100_000_000)).toBe(9_000_000);
  });

  test("koreksi Desember tidak pernah negatif", () => {
    const k = hitungPPhDesemberKoreksi({
      ptkp: "TK_0",
      brutoSetahun: 60_000_000,
      iuranSetahun: 0,
      bulanKerja: 12,
      pphJanNov: 99_999_999,
      punyaNpwp: true,
    });
    expect(k.pphDesember).toBe(0);
    expect(k.pphSetahun).toBeGreaterThanOrEqual(0);
  });

  test("koreksi Desember: bruto kecil TK/0 → PPh setahun 0", () => {
    const k = hitungPPhDesemberKoreksi({
      ptkp: "TK_0",
      brutoSetahun: 50_000_000,
      iuranSetahun: 0,
      bulanKerja: 12,
      pphJanNov: 0,
      punyaNpwp: true,
    });
    expect(k.pphSetahun).toBe(0);
    expect(k.pphDesember).toBe(0);
  });
});
