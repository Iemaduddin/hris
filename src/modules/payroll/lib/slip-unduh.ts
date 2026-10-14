"use server";

import { getPayslip } from "../actions/payroll.actions";
import { getThrSlip } from "../actions/thr.actions";
import { getCompanyData } from "@/src/modules/company-data/actions/company-data.actions";
import { pastikanKodePayslip, pastikanKodeThr } from "./verifikasi";
import { buildSlipPdf } from "./slip-pdf";

function alamatPerusahaan(c: { address: string | null; cityName: string | null; postalCode: string | null } | null): string {
  if (!c) return "";
  return [c.address, c.cityName, c.postalCode ? `(${c.postalCode})` : null].filter(Boolean).join(", ");
}

const IDR = (n: string | number) => Number(n);

/** PDF slip gaji; onlyKaryawanId membatasi ke milik sendiri (ESS). */
export async function unduhPdfSlipGaji(
  nomor: string,
  opts: { onlyKaryawanId?: string; baseUrl: string },
): Promise<{ filename: string; bytes: Uint8Array } | null> {
  const slip = await getPayslip(nomor, opts.onlyKaryawanId);
  if (!slip) return null;
  const kode = await pastikanKodePayslip(nomor);
  if (!kode) return null;
  const company = await getCompanyData();
  const bytes = await buildSlipPdf({
    perusahaanNama: company?.name ?? "Perusahaan",
    perusahaanAlamat: alamatPerusahaan(company),
    judul: `Slip Gaji ${slip.periode}`,
    subjudul: `${slip.karyawanNama} (${slip.nomorKaryawan}) - ${slip.nomor}`,
    meta: [
      ["Periode", slip.periode],
      ["Nomor", slip.nomor],
      ["Hari hadir / alpa", `${slip.hariHadir} / ${slip.hariAlpa} hari`],
    ],
    pendapatan: slip.rincian
      .filter((r) => r.kelompok === "PENDAPATAN" || r.kelompok === "TUNJANGAN")
      .map((r) => ({ nama: r.nama, jumlah: IDR(r.jumlah), keterangan: r.keterangan || undefined })),
    potongan: slip.rincian
      .filter((r) => r.kelompok === "POTONGAN" || r.kelompok === "IURAN")
      .map((r) => ({ nama: r.nama, jumlah: IDR(r.jumlah), keterangan: r.keterangan || undefined })),
    infoPerusahaan: slip.rincian
      .filter((r) => r.kelompok === "BIAYA_PERUSAHAAN")
      .map((r) => ({ nama: r.nama, jumlah: IDR(r.jumlah), keterangan: r.keterangan || undefined })),
    totalBersihLabel: "Gaji Bersih",
    totalBersih: IDR(slip.gajiBersih),
    ringkasanKaki: `Hadir ${slip.hariHadir} hari - Alpa ${slip.hariAlpa} hari.`,
    kodeVerifikasi: kode,
    verifyUrl: `${opts.baseUrl}/verify/slip?kode=${kode}`,
    tanggalTerbit: new Date().toISOString().slice(0, 10),
  });
  return { filename: `${nomor}.pdf`, bytes };
}

export async function unduhPdfSlipThr(
  nomor: string,
  opts: { onlyKaryawanId?: string; baseUrl: string },
): Promise<{ filename: string; bytes: Uint8Array } | null> {
  const slip = await getThrSlip(nomor, opts.onlyKaryawanId);
  if (!slip) return null;
  const kode = await pastikanKodeThr(nomor);
  if (!kode) return null;
  const company = await getCompanyData();
  const bytes = await buildSlipPdf({
    perusahaanNama: company?.name ?? "Perusahaan",
    perusahaanAlamat: alamatPerusahaan(company),
    judul: `Slip THR ${slip.namaHariRaya} ${slip.tahun}`,
    subjudul: `${slip.karyawanNama} (${slip.nomorKaryawan}) - ${slip.nomor}`,
    meta: [
      ["Hari raya", slip.tanggalHariRaya],
      ["Dibayar", slip.tanggalBayar],
      ["Masa kerja", `${slip.masaKerjaBulan} bulan`],
    ],
    pendapatan: slip.rincian
      .filter((r) => r.kelompok === "PENDAPATAN" || r.kelompok === "TUNJANGAN")
      .map((r) => ({ nama: r.nama, jumlah: IDR(r.jumlah), keterangan: r.keterangan || undefined })),
    potongan: slip.rincian
      .filter((r) => r.kelompok === "POTONGAN" || r.kelompok === "IURAN")
      .map((r) => ({ nama: r.nama, jumlah: IDR(r.jumlah), keterangan: r.keterangan || undefined })),
    infoPerusahaan: [],
    totalBersihLabel: "THR Bersih",
    totalBersih: IDR(slip.bersih),
    ringkasanKaki: `Upah sebulan ${IDR(slip.upahSebulan).toLocaleString("id-ID")} - Bruto ${IDR(slip.bruto).toLocaleString("id-ID")}.`,
    kodeVerifikasi: kode,
    verifyUrl: `${opts.baseUrl}/verify/slip?kode=${kode}`,
    tanggalTerbit: new Date().toISOString().slice(0, 10),
  });
  return { filename: `${nomor}.pdf`, bytes };
}
