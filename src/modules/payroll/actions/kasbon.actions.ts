"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { getPayrollSettingMap } from "../lib/calculate";
import {
  SALARY_ADVANCE_DEFAULT_SETTINGS,
  SALARY_ADVANCE_MAX_AMOUNT_KEY,
  SALARY_ADVANCE_MAX_TENOR_KEY,
  SALARY_ADVANCE_SETTING_DESCRIPTIONS,
  calculateSalaryAdvanceInstallment,
  parseMaxSalaryAdvanceAmount,
  validateSalaryAdvance,
} from "../lib/kasbon";

export type SalaryAdvanceActionResult = { success: boolean; message: string; id?: string };

/** Revalidate best-effort: di luar konteks request (E2E/CLI) Next melempar — abaikan. */
function revalidateBestEffort(path: string): void {
	try {
		revalidatePath(path);
	} catch {
		// abaikan — hygiene cache, bukan logika inti
	}
}

export type SalaryAdvanceItem = {
  id: string;
  number: string;
  employeeId: string;
  employeeName: string;
  amount: string;
  tenorMonths: number;
  monthlyInstallment: string;
  remainingDebt: string;
  deductionStart: string;
  reason: string;
  status: string;
  installmentNo: number;
  note: string | null;
};

function toItem(r: {
  id: string;
  nomor: string;
  karyawanId: string;
  karyawan: { namaLengkap: string; nomorKaryawan: string };
  nominal: unknown;
  tenorBulan: number;
  angsuranPerBulan: unknown;
  sisaHutang: unknown;
  mulaiPotong: Date;
  alasan: string;
  status: string;
  catatan: string | null;
  _count: { angsuran: number };
}): SalaryAdvanceItem {
  return {
    id: r.id,
    number: r.nomor,
    employeeId: r.karyawanId,
    employeeName: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    amount: String(r.nominal),
    tenorMonths: r.tenorBulan,
    monthlyInstallment: String(r.angsuranPerBulan),
    remainingDebt: String(r.sisaHutang),
    deductionStart: r.mulaiPotong.toISOString().slice(0, 10),
    reason: r.alasan,
    status: r.status,
    installmentNo: r._count.angsuran,
    note: r.catatan,
  };
}

const salaryAdvanceInclude = {
  karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
  _count: { select: { angsuran: true } },
} as const;

export async function listSalaryAdvances(): Promise<SalaryAdvanceItem[]> {
  const rows = await prisma.kasbon.findMany({
    orderBy: { createdAt: "desc" },
    include: salaryAdvanceInclude,
  });
  return rows.map(toItem);
}

export async function getMySalaryAdvances(employeeId: string): Promise<SalaryAdvanceItem[]> {
  const rows = await prisma.kasbon.findMany({
    where: { karyawanId: employeeId },
    orderBy: { createdAt: "desc" },
    include: salaryAdvanceInclude,
  });
  return rows.map(toItem);
}

async function advanceLimits(): Promise<{ maxAmount: number | null; maxTenor: number }> {
  const map = await getPayrollSettingMap();
  return {
    maxAmount: parseMaxSalaryAdvanceAmount(map[SALARY_ADVANCE_MAX_AMOUNT_KEY] ?? SALARY_ADVANCE_DEFAULT_SETTINGS[SALARY_ADVANCE_MAX_AMOUNT_KEY]),
    maxTenor: Math.floor(Number(map[SALARY_ADVANCE_MAX_TENOR_KEY] ?? SALARY_ADVANCE_DEFAULT_SETTINGS[SALARY_ADVANCE_MAX_TENOR_KEY])) || 24,
  };
}

export async function createSalaryAdvance(
  input: {
    employeeId: string;
    amount: number;
    tenorMonths: number;
    deductionStart: string;
    reason: string;
  },
  createdById?: string,
): Promise<SalaryAdvanceActionResult> {
  const employee = await prisma.karyawan.findUnique({
    where: { id: input.employeeId },
    select: { id: true, status: true },
  });
  if (!employee) return { success: false, message: "Karyawan tidak ditemukan." };
  if (!["AKTIF", "PROBASI"].includes(employee.status)) {
    return { success: false, message: "Hanya karyawan aktif/probasi yang bisa berkasbon." };
  }
  const { maxAmount, maxTenor } = await advanceLimits();
  const err = validateSalaryAdvance({ amount: input.amount, tenorMonths: Math.floor(input.tenorMonths), maxAmount, maxTenor });
  if (err) return { success: false, message: err };
  if (!input.reason.trim()) return { success: false, message: "Alasan wajib diisi." };
  const date = toDbDate(input.deductionStart);
  if (Number.isNaN(date.getTime())) return { success: false, message: "Tanggal mulai potong tidak valid." };

  const amount = Math.round(input.amount);
  const tenor = Math.floor(input.tenorMonths);
  const created = await prisma.kasbon.create({
    data: {
      nomor: `KSB-${date.getUTCFullYear()}-${input.employeeId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      karyawanId: input.employeeId,
      nominal: amount,
      tenorBulan: tenor,
      angsuranPerBulan: calculateSalaryAdvanceInstallment(amount, tenor),
      sisaHutang: amount,
      mulaiPotong: date,
      alasan: input.reason.trim(),
      createdById,
    },
  });
  revalidateBestEffort("/payroll/kasbon");
  return { success: true, message: `Draf kasbon ${created.nomor} tersimpan.`, id: created.id };
}

export async function submitSalaryAdvance(id: string, employeeId?: string): Promise<SalaryAdvanceActionResult> {
  const row = await prisma.kasbon.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Kasbon tidak ditemukan." };
  if (employeeId && row.karyawanId !== employeeId) return { success: false, message: "Bukan milik Anda." };
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
  const { startApprovalFlow, REFERENSI_KASBON } = await import("@/src/modules/approval/lib/approval-engine");
  await startApprovalFlow(REFERENSI_KASBON, id);
  revalidateBestEffort("/payroll/kasbon");
  return { success: true, message: "Kasbon diajukan untuk persetujuan." };
}

export async function approveSalaryAdvance(id: string, approverId?: string): Promise<SalaryAdvanceActionResult> {
  const row = await prisma.kasbon.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Kasbon tidak ditemukan." };
  if (row.status !== "DIAJUKAN") return { success: false, message: "Hanya pengajuan DIAJUKAN yang bisa disetujui." };
  await prisma.kasbon.update({
    where: { id },
    data: { status: "DISETUJUI", approvedById: approverId ?? null, approvedAt: new Date() },
  });
  revalidateBestEffort("/payroll/kasbon");
  return { success: true, message: `Kasbon ${row.nomor} disetujui, dicicil otomatis tiap salary run.` };
}

export async function rejectSalaryAdvance(id: string, note: string, approverId?: string): Promise<SalaryAdvanceActionResult> {
  const row = await prisma.kasbon.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Kasbon tidak ditemukan." };
  if (row.status !== "DIAJUKAN") return { success: false, message: "Hanya pengajuan DIAJUKAN yang bisa ditolak." };
  await prisma.kasbon.update({
    where: { id },
    data: { status: "DITOLAK", catatan: note.trim() || null, approvedById: approverId ?? null, approvedAt: new Date() },
  });
  revalidateBestEffort("/payroll/kasbon");
  return { success: true, message: "Kasbon ditolak." };
}

export async function cancelSalaryAdvance(id: string, employeeId?: string): Promise<SalaryAdvanceActionResult> {
  const row = await prisma.kasbon.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Kasbon tidak ditemukan." };
  if (employeeId && row.karyawanId !== employeeId) return { success: false, message: "Bukan milik Anda." };
  if (!["DRAFT", "DIAJUKAN"].includes(row.status)) {
    return { success: false, message: "Kasbon yang sudah disetujui tidak bisa dibatalkan." };
  }
  await prisma.kasbon.update({ where: { id }, data: { status: "DIBATALKAN" } });
  revalidateBestEffort("/payroll/kasbon");
  return { success: true, message: "Kasbon dibatalkan." };
}

export async function deleteSalaryAdvance(id: string): Promise<SalaryAdvanceActionResult> {
  const row = await prisma.kasbon.findUnique({ where: { id }, include: { _count: { select: { angsuran: true } } } });
  if (!row) return { success: false, message: "Kasbon tidak ditemukan." };
  if (row._count.angsuran > 0 || row.status === "DISETUJUI" || row.status === "LUNAS") {
    return { success: false, message: "Kasbon yang sudah berjalan tidak bisa dihapus." };
  }
  await prisma.kasbon.delete({ where: { id } });
  revalidateBestEffort("/payroll/kasbon");
  return { success: true, message: "Kasbon dihapus." };
}
