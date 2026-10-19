"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { getTerBrackets } from "../lib/calculate";
import { notifyEmployees } from "@/src/modules/notifications/lib/notifications";
import {
  calculateMarginalTerPph,
  terCategoryFromPtkp,
  type StatusPtkpInput,
} from "../lib/pph21-ter";
import { calculateTenureMonths, calculateThrAmount, isThrLate } from "../lib/thr";
import { createVerificationCode } from "../lib/verifikasi";
import { splitDisbursement, buildDisbursementCsv } from "../lib/disburse";
import { fromStoredRincian, type SalaryLineItem } from "../lib/calculate";

export type ThrActionResult = { success: boolean; message: string; id?: string };

export type ThrRunItem = {
  id: string;
  year: number;
  holidayName: string;
  holidayDate: string;
  payDate: string;
  status: string;
  late: boolean;
  employeeCount: number;
  totalNet: string;
};

export async function getThrRuns(): Promise<ThrRunItem[]> {
  const runs = await prisma.thrRun.findMany({
    orderBy: [{ tahun: "desc" }, { tanggalHariRaya: "desc" }],
    include: { detail: { select: { bersih: true } } },
  });
  return runs.map((r) => ({
    id: r.id,
    year: r.tahun,
    holidayName: r.namaHariRaya,
    holidayDate: r.tanggalHariRaya.toISOString().slice(0, 10),
    payDate: r.tanggalBayar.toISOString().slice(0, 10),
    status: r.status,
    late: isThrLate(r.tanggalBayar, r.tanggalHariRaya),
    employeeCount: r.detail.length,
    totalNet: r.detail.reduce((acc, d) => acc + Number(d.bersih), 0).toString(),
  }));
}

export async function createThrRun(
  input: {
    year: number;
    holidayName: string;
    holidayDate: string;
    payDate: string;
    note?: string;
  },
  createdById?: string,
): Promise<ThrActionResult> {
  const year = Math.floor(Number(input.year));
  const holidayName = String(input.holidayName ?? "").trim();
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return { success: false, message: "Tahun tidak valid." };
  }
  if (!holidayName) return { success: false, message: "Nama hari raya wajib diisi." };
  const holidayDay = toDbDate(input.holidayDate);
  const payDay = toDbDate(input.payDate);
  if (Number.isNaN(holidayDay.getTime()) || Number.isNaN(payDay.getTime())) {
    return { success: false, message: "Tanggal hari raya / bayar tidak valid." };
  }
  if (holidayDay.getUTCFullYear() !== year) {
    return { success: false, message: "Tanggal hari raya harus di tahun yang sama." };
  }

  try {
    const created = await prisma.thrRun.create({
      data: {
        tahun: year,
        namaHariRaya: holidayName,
        tanggalHariRaya: holidayDay,
        tanggalBayar: payDay,
        catatan: input.note?.trim() ? input.note.trim() : null,
        createdById,
      },
    });
    revalidatePath("/payroll/thr");
    const lateWarning = isThrLate(payDay, holidayDay)
      ? " Perhatian: tanggal bayar melewati H-7 (denda 5% bila terlambat bayar)."
      : "";
    return { success: true, message: `THR ${holidayName} ${year} dibuat.${lateWarning}`, id: created.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, message: "THR hari raya ini di tahun tersebut sudah ada." };
    }
    return { success: false, message: "Gagal membuat THR run." };
  }
}

export async function calculateThrRun(runId: string): Promise<ThrActionResult> {
  const run = await prisma.thrRun.findUnique({ where: { id: runId } });
  if (!run) return { success: false, message: "THR run tidak ditemukan." };
  if (run.status === "FINAL" || run.status === "DITERBITKAN") {
    return { success: false, message: "THR run sudah final, tidak bisa dihitung ulang." };
  }

  const employees = await prisma.karyawan.findMany({
    where: { status: { in: ["AKTIF", "PROBASI"] } },
    select: { id: true, tanggalMasuk: true, statusPtkp: true },
  });

  // Acuan gaji bulan pembayaran untuk PPh marginal TER (PMK 168/2023).
  const payPeriod = `${run.tanggalBayar.getUTCFullYear()}-${String(run.tanggalBayar.getUTCMonth() + 1).padStart(2, "0")}`;
  const referenceSalaries = await prisma.salaryRunDetail.findMany({
    where: { run: { periode: payPeriod } },
    select: { karyawanId: true, totalPendapatan: true },
  });
  const referenceMap = new Map(referenceSalaries.map((g) => [g.karyawanId, Number(g.totalPendapatan)]));

  await prisma.$transaction(async (tx) => {
    await tx.thrDetail.deleteMany({ where: { runId } });
    for (const k of employees) {
      const contract = await tx.kontrakKerja.findFirst({
        where: { karyawanId: k.id, status: "AKTIF" },
        orderBy: { tanggalMulai: "desc" },
        select: { gajiPokok: true },
      });
      const basePay = contract?.gajiPokok ? Number(contract.gajiPokok) : 0;

      const fixedAgg = await tx.gajiKaryawan.findMany({
        where: {
          karyawanId: k.id,
          isActive: true,
          komponen: { isActive: true, kelompok: "TUNJANGAN", tipe: "NOMINAL" },
        },
        select: { komponen: { select: { nilai: true } } },
      });
      const fixedAllowanceTotal = fixedAgg.reduce((acc, a) => acc + Number(a.komponen.nilai), 0);

      const ptkp = (k.statusPtkp ?? "TK_0") as StatusPtkpInput;
      const monthlyWage = basePay + fixedAllowanceTotal;
      const tenure = calculateTenureMonths(k.tanggalMasuk, run.tanggalHariRaya);
      const gross = calculateThrAmount(monthlyWage, tenure);

      const brackets = await getTerBrackets(terCategoryFromPtkp(ptkp));
      const reference = referenceMap.get(k.id) ?? 0;
      const pphResult = calculateMarginalTerPph(reference, gross, ptkp, brackets);
      const pph = gross > 0 ? pphResult.pph : 0;

      await tx.thrDetail.create({
        data: {
          nomor: `THR-${run.tahun}-${k.id.slice(-6).toUpperCase()}`,
          runId,
          karyawanId: k.id,
          masaKerjaBulan: tenure,
          upahSebulan: monthlyWage,
          bruto: gross,
          pph21: pph,
          bersih: gross - pph,
          rincian: [
            { kode: "GAJI_POKOK", nama: "Gaji Pokok (kontrak aktif)", kelompok: "PENDAPATAN", jumlah: basePay, keterangan: "" },
            { kode: "TJ_TETAP", nama: "Tunjangan Tetap (nominal)", kelompok: "TUNJANGAN", jumlah: fixedAllowanceTotal, keterangan: "" },
            {
              kode: "THR_BRUTO",
              nama: "THR Bruto",
              kelompok: "PENDAPATAN",
              jumlah: gross,
              keterangan: tenure >= 12 ? "1x upah (>=12 bln)" : tenure >= 1 ? `Prorata ${tenure}/12 x upah` : "Masa kerja < 1 bulan",
            },
            { kode: "POT_PPH21", nama: "PPh 21 TER (marginal)", kelompok: "POTONGAN", jumlah: pph, keterangan: pphResult.note },
          ] as never,
        },
      });
    }
    await tx.thrRun.update({ where: { id: runId }, data: { status: "DIHITUNG" } });
  });

  revalidatePath("/payroll/thr");
  return { success: true, message: `THR dihitung untuk ${employees.length} karyawan.` };
}

export async function finalizeThrRun(runId: string): Promise<ThrActionResult> {
  const run = await prisma.thrRun.findUnique({ where: { id: runId }, include: { _count: { select: { detail: true } } } });
  if (!run) return { success: false, message: "THR run tidak ditemukan." };
  if (run.status !== "DIHITUNG") return { success: false, message: "Hitung dulu sebelum finalisasi." };
  if (run._count.detail === 0) return { success: false, message: "Belum ada detail." };
  await prisma.thrRun.update({ where: { id: runId }, data: { status: "FINAL" } });
  revalidatePath("/payroll/thr");
  return { success: true, message: "THR run dikunci (FINAL)." };
}

export async function publishThrRun(runId: string): Promise<ThrActionResult> {
  const run = await prisma.thrRun.findUnique({
    where: { id: runId },
    select: { status: true, detail: { select: { id: true, kodeVerifikasi: true, karyawanId: true } } },
  });
  if (!run) return { success: false, message: "THR run tidak ditemukan." };
  if (run.status !== "FINAL") return { success: false, message: "Finalisasi dulu sebelum terbit." };
  await prisma.$transaction(async (tx) => {
    for (const d of run.detail) {
      if (!d.kodeVerifikasi) {
        await tx.thrDetail.update({ where: { id: d.id }, data: { kodeVerifikasi: createVerificationCode() } });
      }
    }
    await tx.thrRun.update({ where: { id: runId }, data: { status: "DITERBITKAN" } });
  });
  revalidatePath("/payroll/thr");
  await notifyEmployees(
    run.detail.map((d) => d.karyawanId),
    {
      title: "Slip THR terbit",
      body: "Slip THR Anda sudah terbit. Buka Keuangan Saya > Slip Gaji untuk mengunduhnya.",
      kind: "INFO",
      referenceType: "THR",
      referenceId: runId,
      url: "/account/payslips#slip-thr",
    },
  );
  return { success: true, message: "Slip THR diterbitkan." };
}

export async function deleteThrRun(runId: string): Promise<ThrActionResult> {
  const run = await prisma.thrRun.findUnique({ where: { id: runId }, select: { status: true } });
  if (!run) return { success: false, message: "THR run tidak ditemukan." };
  if (run.status === "FINAL" || run.status === "DITERBITKAN") {
    return { success: false, message: "THR run final tidak bisa dihapus." };
  }
  await prisma.thrRun.delete({ where: { id: runId } });
  revalidatePath("/payroll/thr");
  return { success: true, message: "THR run dihapus." };
}

export type ThrDetailItem = {
  id: string;
  number: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  tenureMonths: number;
  monthlyWage: string;
  gross: string;
  pph: string;
  net: string;
  lines: SalaryLineItem[];
};

export async function getThrDetail(runId: string): Promise<{ run: ThrRunItem | null; detail: ThrDetailItem[] }> {
  const run = await prisma.thrRun.findUnique({
    where: { id: runId },
    include: {
      detail: {
        orderBy: { karyawan: { namaLengkap: "asc" } },
        include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
      },
    },
  });
  if (!run) return { run: null, detail: [] };
  return {
    run: {
      id: run.id,
      year: run.tahun,
      holidayName: run.namaHariRaya,
      holidayDate: run.tanggalHariRaya.toISOString().slice(0, 10),
      payDate: run.tanggalBayar.toISOString().slice(0, 10),
      status: run.status,
      late: isThrLate(run.tanggalBayar, run.tanggalHariRaya),
      employeeCount: run.detail.length,
      totalNet: run.detail.reduce((acc, d) => acc + Number(d.bersih), 0).toString(),
    },
    detail: run.detail.map((d) => ({
      id: d.id,
      number: d.nomor,
      employeeId: d.karyawanId,
      employeeName: d.karyawan.namaLengkap,
      employeeNumber: d.karyawan.nomorKaryawan,
      tenureMonths: d.masaKerjaBulan,
      monthlyWage: d.upahSebulan.toString(),
      gross: d.bruto.toString(),
      pph: d.pph21.toString(),
      net: d.bersih.toString(),
      lines: fromStoredRincian(d.rincian),
    })),
  };
}

export type ThrSlipView = {
  number: string;
  year: number;
  holidayName: string;
  holidayDate: string;
  payDate: string;
  employeeName: string;
  employeeNumber: string;
  tenureMonths: number;
  monthlyWage: string;
  gross: string;
  pph: string;
  net: string;
  lines: SalaryLineItem[];
};

export async function getThrSlip(number: string, onlyEmployeeId?: string): Promise<ThrSlipView | null> {
  const d = await prisma.thrDetail.findUnique({
    where: { nomor: number },
    include: {
      run: { select: { tahun: true, namaHariRaya: true, tanggalHariRaya: true, tanggalBayar: true, status: true } },
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
    },
  });
  if (!d) return null;
  if (onlyEmployeeId && d.karyawanId !== onlyEmployeeId) return null;
  // Slip THR hanya terlihat setelah diterbitkan; Finance boleh pratinjau saat FINAL.
  if (d.run.status !== "DITERBITKAN" && (onlyEmployeeId || d.run.status !== "FINAL")) return null;
  return {
    number: d.nomor,
    year: d.run.tahun,
    holidayName: d.run.namaHariRaya,
    holidayDate: d.run.tanggalHariRaya.toISOString().slice(0, 10),
    payDate: d.run.tanggalBayar.toISOString().slice(0, 10),
    employeeName: d.karyawan.namaLengkap,
    employeeNumber: d.karyawan.nomorKaryawan,
    tenureMonths: d.masaKerjaBulan,
    monthlyWage: d.upahSebulan.toString(),
    gross: d.bruto.toString(),
    pph: d.pph21.toString(),
    net: d.bersih.toString(),
    lines: fromStoredRincian(d.rincian),
  };
}

export type MyThrItem = { number: string; year: number; holidayName: string; net: string };

export type DisburseThrInfo = {
  filename: string;
  remark: string;
  total: string;
  ready: number;
  incomplete: string[];
  csv: string;
};

/** Info + CSV disbursement THR run. */
export async function getDisburseThrRun(runId: string): Promise<DisburseThrInfo | null> {
  const { run, detail } = await getThrDetail(runId);
  if (!run) return null;
  const employees = await prisma.karyawan.findMany({
    where: { id: { in: detail.map((d) => d.employeeId) } },
    select: { id: true, bankNama: true, bankNorek: true, bankAtasNama: true },
  });
  const bank = new Map(employees.map((k) => [k.id, k]));
  const remark = `THR ${run.holidayName} ${run.year}`.toUpperCase();
  const { rows, incomplete, total } = splitDisbursement(
    detail.map((d) => ({
      name: `${d.employeeName} (${d.employeeNumber})`,
      bank: bank.get(d.employeeId)?.bankNama ?? null,
      accountNumber: bank.get(d.employeeId)?.bankNorek ?? null,
      accountName: bank.get(d.employeeId)?.bankAtasNama ?? null,
      amount: Number(d.net),
    })),
    remark,
  );
  return {
    filename: `disburse-thr-${run.year}-${run.holidayName.toLowerCase().replace(/\s+/g, "-")}.csv`,
    remark,
    total: String(total),
    ready: rows.length,
    incomplete,
    csv: buildDisbursementCsv(rows),
  };
}

export async function getMyThr(employeeId: string): Promise<MyThrItem[]> {
  const rows = await prisma.thrDetail.findMany({
    where: { karyawanId: employeeId, run: { status: "DITERBITKAN" } },
    orderBy: [{ run: { tahun: "desc" } }, { run: { tanggalHariRaya: "desc" } }],
    include: { run: { select: { tahun: true, namaHariRaya: true } } },
  });
  return rows.map((r) => ({ number: r.nomor, year: r.run.tahun, holidayName: r.run.namaHariRaya, net: r.bersih.toString() }));
}
