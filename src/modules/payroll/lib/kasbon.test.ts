import { hitungAngsuranKasbon, hitungPotonganKasbon, validasiKasbon } from "./kasbon";

describe("kasbon", () => {
  test("angsuran = nominal / tenor dibulatkan", () => {
    expect(hitungAngsuranKasbon(10_000_000, 10)).toBe(1_000_000);
    expect(hitungAngsuranKasbon(10_000_000, 3)).toBe(3_333_333);
    expect(hitungAngsuranKasbon(0, 10)).toBe(0);
    expect(hitungAngsuranKasbon(10_000_000, 0)).toBe(0);
  });

  test("potongan tak melebihi sisa (cicilan terakhir menyesuaikan)", () => {
    expect(hitungPotonganKasbon(1_000_000, 1_000_000)).toBe(1_000_000);
    expect(hitungPotonganKasbon(333_334, 3_333_333)).toBe(333_334);
    expect(hitungPotonganKasbon(0, 1_000_000)).toBe(0);
  });

  test("validasi: nominal, tenor, plafon", () => {
    expect(validasiKasbon({ nominal: 0, tenorBulan: 10, maxNominal: null, maxTenor: 24 })).toBeTruthy();
    expect(validasiKasbon({ nominal: 5_000_000, tenorBulan: 0, maxNominal: null, maxTenor: 24 })).toBeTruthy();
    expect(validasiKasbon({ nominal: 50_000_000, tenorBulan: 10, maxNominal: 20_000_000, maxTenor: 24 })).toContain("plafon");
    expect(validasiKasbon({ nominal: 5_000_000, tenorBulan: 30, maxNominal: null, maxTenor: 24 })).toContain("Tenor");
    expect(validasiKasbon({ nominal: 5_000_000, tenorBulan: 12, maxNominal: null, maxTenor: 24 })).toBeNull();
  });
});
