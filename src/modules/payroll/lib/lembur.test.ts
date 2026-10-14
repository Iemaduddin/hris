import {
  cekCapLembur,
  hitungUpahLemburSehari,
  hitungUpahSejam,
  keteranganTier,
  parseMaxJam,
  ringkasTier,
} from "./lembur";

describe("lembur tiered Kepmen 102/2004", () => {
  const rate = 100_000; // upah sejam langsung agar mudah diverifikasi

  test("hari kerja 1 jam → 1,5x", () => {
    expect(hitungUpahLemburSehari(1, rate, "KERJA").jumlah).toBe(150_000);
  });

  test("hari kerja 3 jam → 1,5 + 2 + 2", () => {
    expect(hitungUpahLemburSehari(3, rate, "KERJA").jumlah).toBe(550_000);
  });

  test("hari kerja fraksional 1,5 jam → 1,5 + 0,5×2", () => {
    expect(hitungUpahLemburSehari(1.5, rate, "KERJA").jumlah).toBe(250_000);
  });

  test("libur 6-hari 10 jam → 7×2 + 1×3 + 2×4", () => {
    expect(hitungUpahLemburSehari(10, rate, "LIBUR_6").jumlah).toBe(2_500_000);
  });

  test("libur 5-hari 11 jam → 8×2 + 1×3 + 2×4", () => {
    expect(hitungUpahLemburSehari(11, rate, "LIBUR_5").jumlah).toBe(2_700_000);
  });

  test("libur 5-hari 9 jam → 8×2 + 1×3", () => {
    expect(hitungUpahLemburSehari(9, rate, "LIBUR_5").jumlah).toBe(1_900_000);
  });

  test("jam berlebih pakai pengali terakhir", () => {
    expect(hitungUpahLemburSehari(15, rate, "LIBUR_5").jumlah).toBe(4_300_000);
  });

  test("nol aman", () => {
    expect(hitungUpahLemburSehari(0, rate, "KERJA").jumlah).toBe(0);
    expect(hitungUpahLemburSehari(2, 0, "KERJA").jumlah).toBe(0);
    expect(hitungUpahSejam(0, 173)).toBe(0);
    expect(hitungUpahSejam(8_650_000, 173)).toBeCloseTo(50_000, 6);
  });

  test("ringkas + keterangan gabungan", () => {
    const acc = new Map<number, number>();
    ringkasTier(hitungUpahLemburSehari(2, rate, "KERJA").tiers, acc);
    ringkasTier(hitungUpahLemburSehari(1, rate, "KERJA").tiers, acc);
    expect(keteranganTier(acc)).toContain("×1,5");
    expect(keteranganTier(acc)).toContain("×2");
  });

  test("cap jam bulanan", () => {
    expect(cekCapLembur(38, 2, 40)).toBe(true);
    expect(cekCapLembur(39, 2, 40)).toBe(false);
    expect(cekCapLembur(100, 5, null)).toBe(true);
    expect(parseMaxJam("")).toBeNull();
    expect(parseMaxJam("40")).toBe(40);
    expect(parseMaxJam("-1")).toBeNull();
    expect(parseMaxJam("x")).toBeNull();
  });
});
