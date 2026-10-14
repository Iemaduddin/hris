/** Builder slip PDF + QR verifikasi. Font Helvetica (WinAnsi, teks disanitasi). */

import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export type BarisSlipPdf = { nama: string; jumlah: number; keterangan?: string };

export type DataSlipPdf = {
  perusahaanNama: string;
  perusahaanAlamat: string;
  judul: string;
  subjudul: string;
  meta: Array<[string, string]>;
  pendapatan: BarisSlipPdf[];
  potongan: BarisSlipPdf[];
  infoPerusahaan: BarisSlipPdf[];
  totalBersihLabel: string;
  totalBersih: number;
  ringkasanKaki: string;
  kodeVerifikasi: string;
  verifyUrl: string;
  tanggalTerbit: string;
};

const SANITASI: Record<string, string> = {
  "–": "-",
  "—": "-",
  "•": "-",
  "…": "...",
  "“": '"',
  "”": '"',
  "‘": "'",
  "’": "'",
};

export function sanitasiPdf(teks: string): string {
  let out = "";
  for (const ch of teks) {
    if (SANITASI[ch] !== undefined) {
      out += SANITASI[ch];
      continue;
    }
    const code = ch.codePointAt(0) ?? 0;
    out += code <= 0xff ? ch : "?";
  }
  return out;
}

export function formatRp(n: number): string {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

const MARGIN = 48;
const LEBAR = 595.28; // A4 portrait (pt)
const WARNA = {
  teks: rgb(0.13, 0.16, 0.23),
  redup: rgb(0.42, 0.45, 0.53),
  garis: rgb(0.85, 0.87, 0.92),
  aksen: rgb(0.1, 0.32, 0.72),
  hijau: rgb(0.05, 0.45, 0.27),
  merah: rgb(0.75, 0.15, 0.15),
};

type Ctx = { doc: PDFDocument; page: PDFPage; y: number; reg: PDFFont; bold: PDFFont };

function teks(ctx: Ctx, x: number, str: string, size: number, bold = false, warna = WARNA.teks): number {
  const font = bold ? ctx.bold : ctx.reg;
  ctx.page.drawText(sanitasiPdf(str), { x, y: ctx.y, size, font, color: warna });
  return font.heightAtSize(size);
}

function barisKanan(
  ctx: Ctx,
  label: string,
  nilai: string,
  size: number,
  opts?: { bold?: boolean; warnaNilai?: ReturnType<typeof rgb> },
): void {
  const font = opts?.bold ? ctx.bold : ctx.reg;
  const h = font.heightAtSize(size);
  ctx.page.drawText(sanitasiPdf(label), { x: MARGIN, y: ctx.y, size, font, color: WARNA.teks });
  const w = font.widthOfTextAtSize(sanitasiPdf(nilai), size);
  ctx.page.drawText(sanitasiPdf(nilai), {
    x: LEBAR - MARGIN - w,
    y: ctx.y,
    size,
    font,
    color: opts?.warnaNilai ?? WARNA.teks,
  });
  ctx.y -= h + 5;
}

function garis(ctx: Ctx): void {
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: LEBAR - MARGIN, y: ctx.y },
    thickness: 0.75,
    color: WARNA.garis,
  });
  ctx.y -= 10;
}

function seksi(ctx: Ctx, judul: string, baris: BarisSlipPdf[], total?: number): void {
  teks(ctx, MARGIN, judul, 11, true, WARNA.aksen);
  ctx.y -= 16;
  for (const b of baris) {
    const label = b.keterangan ? `${b.nama} (${b.keterangan})` : b.nama;
    barisKanan(ctx, label.length > 62 ? `${label.slice(0, 61)}…` : label, formatRp(b.jumlah), 9.5);
  }
  if (baris.length === 0) {
    teks(ctx, MARGIN, "Tidak ada.", 9.5, false, WARNA.redup);
    ctx.y -= 15;
  }
  if (total !== undefined) {
    garis(ctx);
    barisKanan(ctx, "Total", formatRp(total), 10, { bold: true });
  }
  ctx.y -= 8;
}

export async function buildSlipPdf(data: DataSlipPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(sanitasiPdf(data.judul));
  doc.setAuthor(sanitasiPdf(data.perusahaanNama));
  const page = doc.addPage([LEBAR, 841.89]);
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = { doc, page, y: 800, reg, bold };

  teks(ctx, MARGIN, data.perusahaanNama, 15, true);
  ctx.y -= 20;
  if (data.perusahaanAlamat) {
    teks(ctx, MARGIN, data.perusahaanAlamat, 9, false, WARNA.redup);
    ctx.y -= 14;
  }
  garis(ctx);

  teks(ctx, MARGIN, data.judul, 13, true);
  ctx.y -= 17;
  teks(ctx, MARGIN, data.subjudul, 9.5, false, WARNA.redup);
  ctx.y -= 16;

  for (const [k, v] of data.meta) {
    barisKanan(ctx, k, v, 9.5);
  }
  ctx.y -= 4;
  garis(ctx);

  seksi(ctx, "Pendapatan", data.pendapatan, data.pendapatan.reduce((a, b) => a + b.jumlah, 0));
  seksi(ctx, "Potongan", data.potongan, data.potongan.reduce((a, b) => a + b.jumlah, 0));
  if (data.infoPerusahaan.length > 0) {
    seksi(ctx, "Ditanggung Perusahaan (tidak memotong)", data.infoPerusahaan, data.infoPerusahaan.reduce((a, b) => a + b.jumlah, 0));
  }

  page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 30,
    width: LEBAR - MARGIN * 2,
    height: 34,
    color: rgb(0.92, 0.98, 0.94),
    borderColor: rgb(0.65, 0.85, 0.7),
    borderWidth: 1,
  });
  ctx.y -= 8;
  barisKanan(ctx, data.totalBersihLabel, formatRp(data.totalBersih), 12, { bold: true, warnaNilai: WARNA.hijau });
  ctx.y -= 12;

  if (data.ringkasanKaki) {
    teks(ctx, MARGIN, data.ringkasanKaki, 8.5, false, WARNA.redup);
    ctx.y -= 13;
  }

  // Verifikasi: kode + QR
  garis(ctx);
  teks(ctx, MARGIN, "Verifikasi keaslian", 10, true);
  ctx.y -= 15;
  teks(ctx, MARGIN, `Kode: ${data.kodeVerifikasi}`, 9);
  ctx.y -= 14;
  teks(ctx, MARGIN, `Terbit: ${data.tanggalTerbit}`, 8.5, false, WARNA.redup);
  ctx.y -= 13;
  teks(ctx, MARGIN, "Pindai QR atau cocokkan kode di halaman verifikasi perusahaan.", 8.5, false, WARNA.redup);
  ctx.y -= 14;

  const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, { width: 220, margin: 1 });
  const qrBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
  const qr = await doc.embedPng(qrBytes);
  page.drawImage(qr, { x: MARGIN, y: ctx.y - 120, width: 120, height: 120 });

  return doc.save();
}
