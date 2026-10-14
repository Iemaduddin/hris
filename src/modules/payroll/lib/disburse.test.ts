import { bagiDisburse, buildDisburseCsv } from "./disburse";

describe("disbursement CSV", () => {
  test("header + baris titik-koma", () => {
    const csv = buildDisburseCsv([
      { bank: "BCA", norek: "123", atasNama: "A", nominal: 1500000.4, berita: "GAJI" },
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("NO;BANK;NOREK;ATAS_NAMA;NOMINAL;BERITA");
    expect(lines[1]).toBe("1;BCA;123;A;1500000;GAJI");
  });

  test("field khusus di-quote", () => {
    const csv = buildDisburseCsv([
      { bank: "BCA", norek: "1", atasNama: 'A;B "C"', nominal: 1, berita: "X" },
    ]);
    expect(csv.split("\n")[1]).toBe('1;BCA;1;"A;B ""C""";1;X');
  });

  test("bagi: lengkap vs belum + nominal nol dilewati", () => {
    const r = bagiDisburse(
      [
        { nama: "Lengkap", bank: "BRI", norek: "1", atasNama: "L", nominal: 100 },
        { nama: "Norek Kosong", bank: "BRI", norek: "", atasNama: "N", nominal: 100 },
        { nama: "Nol", bank: "BRI", norek: "2", atasNama: "Z", nominal: 0 },
      ],
      "GAJI 2026-10",
    );
    expect(r.baris).toHaveLength(1);
    expect(r.belumLengkap).toEqual(["Norek Kosong"]);
    expect(r.total).toBe(100);
  });
});
