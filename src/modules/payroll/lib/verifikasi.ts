import { randomBytes } from "crypto";
import prisma from "@/src/lib/prisma";

/** Kode verifikasi 24-hex untuk slip PDF + halaman verify publik. */
export function createVerificationCode(): string {
  return randomBytes(12).toString("hex").toUpperCase();
}

/** Pastikan payslip punya kode (backfill untuk slip terbitan lama). */
export async function ensurePayslipCode(number: string): Promise<string | null> {
  const s = await prisma.payslip.findUnique({
    where: { nomor: number },
    select: { id: true, kodeVerifikasi: true, run: { select: { status: true } } },
  });
  if (!s || (s.run.status !== "DITERBITKAN" && s.run.status !== "FINAL")) return null;
  if (s.kodeVerifikasi) return s.kodeVerifikasi;
  for (let i = 0; i < 3; i++) {
    try {
      const updated = await prisma.payslip.update({
        where: { id: s.id },
        data: { kodeVerifikasi: createVerificationCode() },
        select: { kodeVerifikasi: true },
      });
      return updated.kodeVerifikasi;
    } catch {
      // Kemungkinan tabrakan kode (sangat jarang) → coba lagi.
    }
  }
  return null;
}

export async function ensureThrCode(number: string): Promise<string | null> {
  const d = await prisma.thrDetail.findUnique({
    where: { nomor: number },
    select: { id: true, kodeVerifikasi: true, run: { select: { status: true } } },
  });
  if (!d || (d.run.status !== "DITERBITKAN" && d.run.status !== "FINAL")) return null;
  if (d.kodeVerifikasi) return d.kodeVerifikasi;
  for (let i = 0; i < 3; i++) {
    try {
      const updated = await prisma.thrDetail.update({
        where: { id: d.id },
        data: { kodeVerifikasi: createVerificationCode() },
        select: { kodeVerifikasi: true },
      });
      return updated.kodeVerifikasi;
    } catch {
      // Tabrakan → coba lagi.
    }
  }
  return null;
}

export type VerificationResult =
  | {
      valid: true;
      kind: "GAJI" | "THR";
      number: string;
      employeeName: string;
      period: string;
      net: string;
      runStatus: string;
    }
  | { valid: false };

/** Lookup publik via kode (tanpa auth; kode hanya ada di slip pemegang). */
export async function verifySlip(code: string): Promise<VerificationResult> {
  const k = code.trim().toUpperCase();
  if (!k) return { valid: false };

  const p = await prisma.payslip.findUnique({
    where: { kodeVerifikasi: k },
    include: {
      run: { select: { periode: true, status: true } },
      karyawan: { select: { namaLengkap: true } },
    },
  });
  if (p) {
    if (p.run.status !== "DITERBITKAN") return { valid: false };
    const detail = await prisma.salaryRunDetail.findUnique({
      where: { runId_karyawanId: { runId: p.runId, karyawanId: p.karyawanId } },
      select: { gajiBersih: true },
    });
    if (!detail) return { valid: false };
    return {
      valid: true,
      kind: "GAJI",
      number: p.nomor,
      employeeName: p.karyawan.namaLengkap,
      period: p.run.periode,
      net: detail.gajiBersih.toString(),
      runStatus: p.run.status,
    };
  }

  const t = await prisma.thrDetail.findUnique({
    where: { kodeVerifikasi: k },
    include: {
      run: { select: { tahun: true, namaHariRaya: true, status: true } },
      karyawan: { select: { namaLengkap: true } },
    },
  });
  if (t) {
    if (t.run.status !== "DITERBITKAN") return { valid: false };
    return {
      valid: true,
      kind: "THR",
      number: t.nomor,
      employeeName: t.karyawan.namaLengkap,
      period: `${t.run.namaHariRaya} ${t.run.tahun}`,
      net: t.bersih.toString(),
      runStatus: t.run.status,
    };
  }

  return { valid: false };
}
