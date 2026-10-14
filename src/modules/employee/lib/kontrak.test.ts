import { awalKontrakLanjutan, validasiPerpanjangan } from "./kontrak";

describe("kontrak", () => {
  test("validasi perpanjangan", () => {
    expect(validasiPerpanjangan({ tanggalSelesaiLama: null, tanggalSelesaiBaru: "" })).toBeTruthy();
    expect(validasiPerpanjangan({ tanggalSelesaiLama: null, tanggalSelesaiBaru: "x" })).toBeTruthy();
    expect(
      validasiPerpanjangan({ tanggalSelesaiLama: new Date(2026, 10, 30), tanggalSelesaiBaru: "2026-10-30" }),
    ).toContain("sesudah");
    expect(
      validasiPerpanjangan({ tanggalSelesaiLama: new Date(2026, 10, 30), tanggalSelesaiBaru: "2026-12-31" }),
    ).toBeNull();
    expect(validasiPerpanjangan({ tanggalSelesaiLama: null, tanggalSelesaiBaru: "2026-12-31" })).toBeNull();
  });

  test("awal lanjutan = sehari sesudah selesai lama", () => {
    expect(awalKontrakLanjutan(new Date(2026, 10, 30))).toEqual(new Date(2026, 11, 1));
    expect(awalKontrakLanjutan(null, new Date(2026, 9, 14))).toEqual(new Date(2026, 9, 14));
  });
});
