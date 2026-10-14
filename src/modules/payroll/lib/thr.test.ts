import { hitungPPhMarginalTer } from "./pph21-ter";
import { batasBayarHMin7, hitungMasaKerjaBulan, hitungNominalThr, terlambatBayarThr } from "./thr";

describe("THR", () => {
  const raya = new Date(2026, 2, 20); // 20 Mar 2026

  test("masa kerja inklusif bulan kalender", () => {
    expect(hitungMasaKerjaBulan(new Date(2026, 2, 1), raya)).toBe(1);
    expect(hitungMasaKerjaBulan(new Date(2025, 3, 15), raya)).toBe(12);
    expect(hitungMasaKerjaBulan(new Date(2025, 2, 1), raya)).toBe(13);
    expect(hitungMasaKerjaBulan(new Date(2024, 0, 10), raya)).toBe(27);
  });

  test("masuk sesudah hari raya → 0", () => {
    expect(hitungMasaKerjaBulan(new Date(2026, 2, 21), raya)).toBe(0);
    expect(hitungMasaKerjaBulan(new Date(2026, 5, 1), raya)).toBe(0);
  });

  test("nominal: >=12 bulan penuh, <12 prorata", () => {
    expect(hitungNominalThr(10_000_000, 12)).toBe(10_000_000);
    expect(hitungNominalThr(10_000_000, 24)).toBe(10_000_000);
    expect(hitungNominalThr(12_000_000, 6)).toBe(6_000_000);
    expect(hitungNominalThr(12_000_000, 1)).toBe(1_000_000);
    expect(hitungNominalThr(12_000_000, 0)).toBe(0);
    expect(hitungNominalThr(0, 12)).toBe(0);
  });

  test("batas bayar H-7 dan flag terlambat", () => {
    expect(batasBayarHMin7(raya)).toEqual(new Date(2026, 2, 13));
    expect(terlambatBayarThr(new Date(2026, 2, 13), raya)).toBe(false);
    expect(terlambatBayarThr(new Date(2026, 2, 14), raya)).toBe(true);
  });

  test("PPh marginal: tanpa acuan = TER atas THR saja", () => {
    // THR 6jt, TK/0 → lapis 5.950.001–6.300.000 = 0.75%
    const h = hitungPPhMarginalTer(0, 6_000_000, "TK_0");
    expect(h.pph).toBe(45_000);
  });

  test("PPh marginal: acuan 6jt + THR 6jt = TER(12jt) − TER(6jt)", () => {
    // TER A: 12jt → 4% = 480.000; 6jt → 0.75% = 45.000 → marginal 435.000
    const h = hitungPPhMarginalTer(6_000_000, 6_000_000, "TK_0");
    expect(h.pph).toBe(435_000);
  });

  test("PPh marginal tidak negatif bila tambahan 0", () => {
    expect(hitungPPhMarginalTer(6_000_000, 0, "TK_0").pph).toBe(0);
  });
});
