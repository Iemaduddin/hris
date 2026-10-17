"use server";

import { getPayslip } from "../actions/payroll.actions";
import { getThrSlip } from "../actions/thr.actions";
import { getCompanyData } from "@/src/modules/company-data/actions/company-data.actions";
import { ensurePayslipCode, ensureThrCode } from "./verifikasi";
import { buildSlipPdf } from "./slip-pdf";

function alamatPerusahaan(c: { address: string | null; cityName: string | null; postalCode: string | null } | null): string {
  if (!c) return "";
  return [c.address, c.cityName, c.postalCode ? `(${c.postalCode})` : null].filter(Boolean).join(", ");
}

const IDR = (n: string | number) => Number(n);

/** PDF slip gaji; onlyKaryawanId membatasi ke milik sendiri (ESS). */
export async function unduhPdfSlipGaji(
  number: string,
  opts: { onlyKaryawanId?: string; baseUrl: string },
): Promise<{ filename: string; bytes: Uint8Array } | null> {
  const slip = await getPayslip(number, opts.onlyKaryawanId);
  if (!slip) return null;
  const kode = await ensurePayslipCode(number);
  if (!kode) return null;
  const company = await getCompanyData();
  const bytes = await buildSlipPdf({
    perusahaanNama: company?.name ?? "Perusahaan",
    perusahaanAlamat: alamatPerusahaan(company),
    judul: `Slip Gaji ${slip.periode}`,
    subjudul: `${slip.employeeName} (${slip.employeeNumber}) - ${slip.number}`,
    meta: [
      ["Periode", slip.periode],
      ["Nomor", slip.number],
      ["Hari hadir / alpa", `${slip.presentDays} / ${slip.absentDays} hari`],
    ],
    pendapatan: slip.lines
      .filter((r) => r.group === "PENDAPATAN" || r.group === "TUNJANGAN")
      .map((r) => ({ name: r.name, amount: IDR(r.amount), description: r.description || undefined })),
    potongan: slip.lines
      .filter((r) => r.group === "POTONGAN" || r.group === "IURAN")
      .map((r) => ({ name: r.name, amount: IDR(r.amount), description: r.description || undefined })),
    infoPerusahaan: slip.lines
      .filter((r) => r.group === "BIAYA_PERUSAHAAN")
      .map((r) => ({ name: r.name, amount: IDR(r.amount), description: r.description || undefined })),
    totalNetLabel: "Gaji net",
    totalNet: IDR(slip.netPay),
    ringkasanKaki: `Hadir ${slip.presentDays} hari - Alpa ${slip.absentDays} hari.`,
    kodeVerifikasi: kode,
    verifyUrl: `${opts.baseUrl}/verify/slip?kode=${kode}`,
    publishedAt: new Date().toISOString().slice(0, 10),
  });
  return { filename: `${number}.pdf`, bytes };
}

export async function unduhPdfSlipThr(
  number: string,
  opts: { onlyKaryawanId?: string; baseUrl: string },
): Promise<{ filename: string; bytes: Uint8Array } | null> {
  const slip = await getThrSlip(number, opts.onlyKaryawanId);
  if (!slip) return null;
  const kode = await ensureThrCode(number);
  if (!kode) return null;
  const company = await getCompanyData();
  const bytes = await buildSlipPdf({
    perusahaanNama: company?.name ?? "Perusahaan",
    perusahaanAlamat: alamatPerusahaan(company),
    judul: `Slip THR ${slip.holidayName} ${slip.year}`,
    subjudul: `${slip.employeeName} (${slip.employeeNumber}) - ${slip.number}`,
    meta: [
      ["Hari raya", slip.holidayDate],
      ["Dibayar", slip.payDate],
      ["Masa kerja", `${slip.tenureMonths} bulan`],
    ],
    pendapatan: slip.lines
      .filter((r) => r.group === "PENDAPATAN" || r.group === "TUNJANGAN")
      .map((r) => ({ name: r.name, amount: IDR(r.amount), description: r.description || undefined })),
    potongan: slip.lines
      .filter((r) => r.group === "POTONGAN" || r.group === "IURAN")
      .map((r) => ({ name: r.name, amount: IDR(r.amount), description: r.description || undefined })),
    infoPerusahaan: [],
    totalNetLabel: "THR net",
    totalNet: IDR(slip.net),
    ringkasanKaki: `Upah sebulan ${IDR(slip.monthlyWage).toLocaleString("id-ID")} - gross ${IDR(slip.gross).toLocaleString("id-ID")}.`,
    kodeVerifikasi: kode,
    verifyUrl: `${opts.baseUrl}/verify/slip?kode=${kode}`,
    publishedAt: new Date().toISOString().slice(0, 10),
  });
  return { filename: `${number}.pdf`, bytes };
}
