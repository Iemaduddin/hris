import { adaPerubahan, labelJenisMutasi, validasiMutasi } from "./mutasi";

describe("mutasi", () => {
  test("label jenis", () => {
    expect(labelJenisMutasi("PROMOSI")).toBe("Promosi");
    expect(labelJenisMutasi("X")).toBe("X");
  });

  test("deteksi perubahan (kosong dianggap sama)", () => {
    const a = { unitId: "u1", posisiId: "", lokasiId: "" };
    expect(adaPerubahan(a, { ...a })).toBe(false);
    expect(adaPerubahan(a, { unitId: "u2", posisiId: "", lokasiId: "" })).toBe(true);
    expect(adaPerubahan(a, { unitId: "u1", posisiId: "p1", lokasiId: "" })).toBe(true);
  });

  test("validasi menolak tanpa perubahan / alasan / tanggal", () => {
    const base = {
      jenis: "MUTASI",
      dari: { unitId: "u1", posisiId: "p1", lokasiId: "l1" },
      ke: { unitId: "u1", posisiId: "p1", lokasiId: "l1" },
      tanggalEfektif: "2026-11-01",
      alasan: "Rotasi",
    };
    expect(validasiMutasi(base)).toContain("tidak ada perubahan");
    expect(validasiMutasi({ ...base, ke: { unitId: "u2", posisiId: "p1", lokasiId: "l1" } })).toBeNull();
    expect(validasiMutasi({ ...base, alasan: "  " })).toBeTruthy();
    expect(validasiMutasi({ ...base, tanggalEfektif: "" })).toBeTruthy();
    expect(validasiMutasi({ ...base, jenis: "X" })).toBeTruthy();
  });
});
