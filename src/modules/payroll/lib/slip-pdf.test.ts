import { buildSlipPdf, formatRp, sanitasiPdf } from "./slip-pdf";

describe("slip PDF", () => {
  test("sanitasi: WinAnsi aman", () => {
    expect(sanitasiPdf("a–b•c…x×y")).toBe("a-b-c...x×y");
    expect(sanitasiPdf("“halo”")).toBe('"halo"');
    expect(sanitasiPdf("café")).toBe("café");
  });

  test("format rupiah", () => {
    expect(formatRp(13550550)).toBe("Rp13.550.550");
  });

  test("PDF terbit dengan header %PDF + QR", async () => {
    const bytes = await buildSlipPdf({
      perusahaanNama: "PT Uji",
      perusahaanAlamat: "Jakarta",
      judul: "Slip Gaji 2026-10",
      subjudul: "Nama (ID) - NOMOR",
      meta: [["Periode", "2026-10"]],
      pendapatan: [{ nama: "Gaji Pokok", jumlah: 15000000 }],
      potongan: [{ nama: "PPh 21 TER", jumlah: 1059450, keterangan: "TER A" }],
      infoPerusahaan: [{ nama: "BPJS Kes CPY", jumlah: 480000 }],
      totalBersihLabel: "Gaji Bersih",
      totalBersih: 13940550,
      ringkasanKaki: "Hadir 20 hari",
      kodeVerifikasi: "ABCDEF123456",
      verifyUrl: "https://contoh.test/verify/slip?kode=ABCDEF123456",
      tanggalTerbit: "2026-10-12",
    });
    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
    expect(bytes.length).toBeGreaterThan(3000);
  }, 20000);
});
