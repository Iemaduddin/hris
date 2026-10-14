import { defaultBerlakuSampai, hariSkorsingDalamPeriode, validasiEskalasi } from "./disiplin";

describe("disiplin", () => {
  test("eskalasi berjenjang", () => {
    expect(validasiEskalasi("SP1", [], false)).toBeNull();
    expect(validasiEskalasi("SP2", [], false)).toContain("SP 1");
    expect(validasiEskalasi("SP2", ["SP1"], false)).toBeNull();
    expect(validasiEskalasi("SP3", ["SP1"], false)).toContain("SP 2");
    expect(validasiEskalasi("SKORSING", ["SP3"], false)).toBeNull();
    expect(validasiEskalasi("PHK", ["SP3"], false)).toContain("Skorsing");
    expect(validasiEskalasi("PHK", ["SKORSING"], false)).toBeNull();
    expect(validasiEskalasi("PHK", [], true)).toBeNull();
    expect(validasiEskalasi("X", [], false)).toBeTruthy();
  });

  test("irisan hari skorsing", () => {
    const okt = { a: new Date(Date.UTC(2026, 9, 1)), b: new Date(Date.UTC(2026, 9, 31)) };
    expect(hariSkorsingDalamPeriode(new Date(Date.UTC(2026, 9, 5)), new Date(Date.UTC(2026, 9, 7)), okt.a, okt.b)).toBe(3);
    expect(hariSkorsingDalamPeriode(new Date(Date.UTC(2026, 8, 28)), new Date(Date.UTC(2026, 9, 2)), okt.a, okt.b)).toBe(2);
    expect(hariSkorsingDalamPeriode(new Date(Date.UTC(2026, 7, 1)), new Date(Date.UTC(2026, 7, 5)), okt.a, okt.b)).toBe(0);
    expect(hariSkorsingDalamPeriode(null, null, okt.a, okt.b)).toBe(0);
  });

  test("berlaku default 6 bulan", () => {
    expect(defaultBerlakuSampai(new Date(2026, 9, 14))).toEqual(new Date(2027, 3, 14));
  });
});
