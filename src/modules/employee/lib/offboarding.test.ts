import { CLEARANCE_BAWAAN, semuaWajibSelesai } from "./offboarding";

describe("offboarding", () => {
  test("checklist bawaan mencakup 4 PIC", () => {
    const pics = new Set(CLEARANCE_BAWAAN.map((i) => i.picRole));
    expect(pics).toEqual(new Set(["ATASAN", "HR", "FINANCE", "IT"]));
    expect(CLEARANCE_BAWAAN.every((i) => i.wajib)).toBe(true);
  });

  test("selesai bila semua wajib SELESAI", () => {
    expect(semuaWajibSelesai([{ wajib: true, status: "SELESAI" }])).toBe(true);
    expect(semuaWajibSelesai([{ wajib: true, status: "SELESAI" }, { wajib: true, status: "BELUM" }])).toBe(false);
    expect(semuaWajibSelesai([{ wajib: false, status: "BELUM" }])).toBe(false);
    expect(semuaWajibSelesai([])).toBe(false);
  });
});
