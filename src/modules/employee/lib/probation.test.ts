import { labelHasilProbation, sisaHariProbation, validasiPenilaian } from "./probation";

describe("probation", () => {
  test("label hasil", () => {
    expect(labelHasilProbation("LULUS")).toBe("Lulus");
    expect(labelHasilProbation("X")).toBe("X");
  });

  test("sisa hari", () => {
    const kini = new Date(2026, 9, 14);
    expect(sisaHariProbation(new Date(2026, 9, 20), kini)).toBe(6);
    expect(sisaHariProbation(new Date(2026, 9, 14), kini)).toBe(0);
    expect(sisaHariProbation(new Date(2026, 9, 10), kini)).toBe(-4);
  });

  test("validasi penilaian", () => {
    const base = { hasil: "LULUS", nilai: 4, tanggalSelesai: new Date(2026, 10, 1), tanggalSelesaiBaru: "" };
    expect(validasiPenilaian(base)).toBeNull();
    expect(validasiPenilaian({ ...base, hasil: "X" })).toBeTruthy();
    expect(validasiPenilaian({ ...base, nilai: 6 })).toBeTruthy();
    expect(validasiPenilaian({ ...base, nilai: null })).toBeNull();
    expect(validasiPenilaian({ ...base, hasil: "PERPANJANG" })).toContain("baru wajib");
    expect(validasiPenilaian({ ...base, hasil: "PERPANJANG", tanggalSelesaiBaru: "2026-10-01" })).toContain("sesudah");
    expect(validasiPenilaian({ ...base, hasil: "PERPANJANG", tanggalSelesaiBaru: "2026-12-01" })).toBeNull();
  });
});
