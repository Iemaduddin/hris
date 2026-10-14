import { bulanRomawi, daftarPlaceholder, formatNomorSurat, renderSurat } from "./surat";

describe("surat", () => {
  test("romawi + format nomor", () => {
    expect(bulanRomawi(1)).toBe("I");
    expect(bulanRomawi(10)).toBe("X");
    expect(bulanRomawi(12)).toBe("XII");
    expect(formatNomorSurat(7, "MUT", new Date(2026, 9, 14))).toBe("007/MUT/X/2026");
  });

  test("render variabel", () => {
    expect(renderSurat("Halo {{nama}}, {{tak_ada}}.", { nama: "Budi" })).toBe("Halo Budi, {{tak_ada}}.");
  });

  test("daftar placeholder unik", () => {
    expect(daftarPlaceholder("{{a}} dan {{b}} {{a}}")).toEqual(["a", "b"]);
  });
});
