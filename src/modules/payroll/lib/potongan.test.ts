import {
  hitungPotonganAlpa,
  hitungPotonganTelat,
  parseRupiahSetting,
  resolvePembagiAlpa,
} from "./potongan";

describe("aturan potongan", () => {
  test("pembagi: 25/26/AKTUAL, default 26", () => {
    expect(resolvePembagiAlpa("25", 31)).toBe(25);
    expect(resolvePembagiAlpa("26", 31)).toBe(26);
    expect(resolvePembagiAlpa("AKTUAL", 30)).toBe(30);
    expect(resolvePembagiAlpa("AKTUAL", 0)).toBe(26);
    expect(resolvePembagiAlpa("", 31)).toBe(26);
    expect(resolvePembagiAlpa("ngawur", 31)).toBe(26);
  });

  test("alpa: GP 5,2jt, 2 hari, pembagi 26 → 400.000", () => {
    expect(hitungPotonganAlpa(5_200_000, 2, 26)).toBe(400_000);
  });

  test("alpa: pembagi 25 lebih besar dari 26", () => {
    expect(hitungPotonganAlpa(5_200_000, 2, 25)).toBe(416_000);
  });

  test("alpa nol bila tidak ada gapok/hari", () => {
    expect(hitungPotonganAlpa(0, 2, 26)).toBe(0);
    expect(hitungPotonganAlpa(5_200_000, 0, 26)).toBe(0);
  });

  test("telat: 90 mnt x Rp5.000 = 450.000", () => {
    expect(hitungPotonganTelat(90, 5_000, null)).toEqual({ jumlah: 450_000, kenaCap: false });
  });

  test("telat: tarif 0 = nonaktif", () => {
    expect(hitungPotonganTelat(90, 0, null)).toEqual({ jumlah: 0, kenaCap: false });
  });

  test("telat: kena cap", () => {
    expect(hitungPotonganTelat(90, 5_000, 100_000)).toEqual({ jumlah: 100_000, kenaCap: true });
    expect(hitungPotonganTelat(10, 5_000, 100_000)).toEqual({ jumlah: 50_000, kenaCap: false });
  });

  test("parse rupiah: kosong → null, negatif → null", () => {
    expect(parseRupiahSetting("")).toBeNull();
    expect(parseRupiahSetting("  ")).toBeNull();
    expect(parseRupiahSetting("-5")).toBeNull();
    expect(parseRupiahSetting("abc")).toBeNull();
    expect(parseRupiahSetting("10000")).toBe(10_000);
  });
});
