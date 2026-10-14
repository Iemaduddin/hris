import { hitungProgres, validasiTemplate } from "./onboarding";

describe("onboarding", () => {
  test("progres + syarat selesai", () => {
    const r = hitungProgres([
      { wajib: true, status: "TERVERIFIKASI" },
      { wajib: true, status: "SELESAI" },
      { wajib: false, status: "BELUM" },
    ]);
    expect(r).toMatchObject({ total: 3, wajib: 2, terverifikasiWajib: 1, selesaiSemua: 2, persen: 67, bisaSelesai: false });
  });

  test("bisa selesai bila semua wajib terverifikasi", () => {
    expect(hitungProgres([{ wajib: true, status: "TERVERIFIKASI" }]).bisaSelesai).toBe(true);
    expect(hitungProgres([])).toMatchObject({ persen: 100, bisaSelesai: false });
  });

  test("validasi template", () => {
    expect(validasiTemplate({ nama: "", items: [{ judul: "x" }] })).toBeTruthy();
    expect(validasiTemplate({ nama: "A", items: [] })).toBeTruthy();
    expect(validasiTemplate({ nama: "A", items: [{ judul: "  " }] })).toBeTruthy();
    expect(validasiTemplate({ nama: "A", items: [{ judul: "x" }] })).toBeNull();
  });
});
