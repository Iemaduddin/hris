"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { nextSerialNumber } from "@/src/lib/numbering";
import { startApprovalFlow } from "@/src/modules/approval/lib/approval-engine";
import { REIMBURSE_CATEGORIES, checkLimit, limitKey, parseLimit } from "@/src/modules/payroll/lib/uang-keluar";

export type ReimbursementActionResult = { success: boolean; message: string; id?: string };

/** Revalidate best-effort: di luar konteks request (E2E/CLI) Next melempar — abaikan. */
function revalidateBestEffort(path: string): void {
	try {
		revalidatePath(path);
	} catch {
		// abaikan — hygiene cache, bukan logika inti
	}
}

export type ReimbursementItem = {
  id: string;
  number: string;
  employeeId: string;
  employeeName: string;
  category: string;
  amount: string;
  description: string;
  status: string;
};

function isFinance(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN_HR" || role === "FINANCE";
}

async function resolveActor(userId: string): Promise<{ role: string; employeeId: string | null }> {
  if (!userId) return { role: "EMPLOYEE", employeeId: null };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const employee = await prisma.karyawan.findFirst({ where: { userId }, select: { id: true } });
  return { role: user?.role ?? "EMPLOYEE", employeeId: employee?.id ?? null };
}

export async function listLimits(): Promise<Array<{ category: string; value: string }>> {
  const rows = await prisma.payrollSetting.findMany({
    where: { kunci: { in: REIMBURSE_CATEGORIES.map(limitKey) } },
    select: { kunci: true, nilai: true },
  });
  const map = new Map(rows.map((r) => [r.kunci, r.nilai]));
  return REIMBURSE_CATEGORIES.map((k) => ({ category: k, value: map.get(limitKey(k)) ?? "" }));
}

export async function saveLimits(input: Record<string, string>, userId: string): Promise<ReimbursementActionResult> {
  const actor = await resolveActor(userId);
  if (!isFinance(actor.role)) return { success: false, message: "Hanya HR/Finance." };
  for (const k of REIMBURSE_CATEGORIES) {
    const raw = (input[k] ?? "").trim();
    if (raw !== "" && parseLimit(raw) === null) {
      return { success: false, message: `Plafon ${k} tidak valid.` };
    }
  }
  await prisma.$transaction(
    REIMBURSE_CATEGORIES.map((k) =>
      prisma.payrollSetting.upsert({
        where: { kunci: limitKey(k) },
        create: { kunci: limitKey(k), nilai: (input[k] ?? "").trim(), deskripsi: `Plafon reimbursement ${k} (Rp). Kosong = tanpa batas.` },
        update: { nilai: (input[k] ?? "").trim() },
      }),
    ),
  );
  revalidateBestEffort("/payroll/reimbursements");
  return { success: true, message: "Plafon tersimpan." };
}

async function limitFor(category: string): Promise<number | null> {
  const row = await prisma.payrollSetting.findUnique({
    where: { kunci: limitKey(category) },
    select: { nilai: true },
  });
  return parseLimit(row?.nilai ?? "");
}

export async function listReimbursements(): Promise<ReimbursementItem[]> {
  const rows = await prisma.expenseClaim.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows.map(toItem);
}

export async function getMyReimbursements(employeeId: string): Promise<ReimbursementItem[]> {
  const rows = await prisma.expenseClaim.findMany({
    where: { karyawanId: employeeId },
    orderBy: { createdAt: "desc" },
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows.map(toItem);
}

function toItem(r: {
  id: string;
  nomor: string;
  karyawanId: string;
  karyawan: { namaLengkap: string; nomorKaryawan: string };
  kategori: string;
  nominal: unknown;
  keterangan: string;
  status: string;
}): ReimbursementItem {
  return {
    id: r.id,
    number: r.nomor,
    employeeId: r.karyawanId,
    employeeName: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    category: r.kategori,
    amount: String(r.nominal),
    description: r.keterangan,
    status: r.status,
  };
}

export async function createReimbursement(
  input: {
    employeeId: string;
    category: string;
    receiptDate: string;
    amount: number;
    description: string;
    attachmentUrl: string;
  },
  userId: string,
): Promise<ReimbursementActionResult> {
  const actor = await resolveActor(userId);
  const employeeId = isFinance(actor.role) && input.employeeId ? input.employeeId : actor.employeeId;
  if (!employeeId) return { success: false, message: "Employee tidak ditemukan." };
  if (!(REIMBURSE_CATEGORIES as readonly string[]).includes(input.category)) {
    return { success: false, message: "Kategori tidak valid." };
  }
  if (!input.attachmentUrl.trim()) return { success: false, message: "Foto/struk wajib dilampirkan." };
  if (!input.description.trim()) return { success: false, message: "Keterangan wajib diisi." };
  const employee = await prisma.karyawan.findUnique({ where: { id: employeeId }, select: { status: true } });
  if (!employee || !["AKTIF", "PROBASI"].includes(employee.status)) {
    return { success: false, message: "Employee tidak aktif." };
  }
  const err = checkLimit(input.amount, await limitFor(input.category));
  if (err) return { success: false, message: err };

  const now = new Date();
  const created = await prisma.expenseClaim.create({
    data: {
      nomor: await nextSerialNumber("RMB", now.getFullYear()),
      karyawanId: employeeId,
      kategori: input.category as never,
      tanggalKwitansi: input.receiptDate ? toDbDate(input.receiptDate) : null,
      nominal: Math.round(input.amount),
      keterangan: input.description.trim(),
      lampiranUrl: input.attachmentUrl.trim(),
      createdById: userId,
    },
    select: { id: true },
  });
  revalidateBestEffort("/payroll/reimbursements");
  revalidateBestEffort("/account/reimbursements");
  return { success: true, message: "Draf klaim tersimpan.", id: created.id };
}

export async function submitReimbursement(id: string, userId: string): Promise<ReimbursementActionResult> {
  const actor = await resolveActor(userId);
  const row = await prisma.expenseClaim.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!isFinance(actor.role) && actor.employeeId !== row.karyawanId) {
    return { success: false, message: "Akses ditolak." };
  }
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
  await startApprovalFlow("REIMBURSE", id);
  revalidateBestEffort("/payroll/reimbursements");
  revalidateBestEffort("/approval");
  return { success: true, message: "Dikirim ke atasan → HR." };
}

export async function cancelReimbursement(id: string, userId: string): Promise<ReimbursementActionResult> {
  const actor = await resolveActor(userId);
  const row = await prisma.expenseClaim.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!isFinance(actor.role) && actor.employeeId !== row.karyawanId) {
    return { success: false, message: "Akses ditolak." };
  }
  if (!["DRAFT", "DIAJUKAN"].includes(row.status)) {
    return { success: false, message: "Status ini tidak bisa dibatalkan." };
  }
  await prisma.$transaction([
    prisma.expenseClaim.update({ where: { id }, data: { status: "DIBATALKAN" } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "REIMBURSE", referensiId: id } }),
  ]);
  revalidateBestEffort("/payroll/reimbursements");
  return { success: true, message: "Klaim dibatalkan." };
}

export async function deleteReimbursement(id: string, userId: string): Promise<ReimbursementActionResult> {
  const actor = await resolveActor(userId);
  if (!isFinance(actor.role)) return { success: false, message: "Hanya HR/Finance." };
  const row = await prisma.expenseClaim.findUnique({
    where: { id },
    select: { status: true, pembayaran: { select: { id: true } } },
  });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.pembayaran.length > 0) return { success: false, message: "Sudah ada pembayaran." };
  if (!["DRAFT", "DITOLAK", "DIBATALKAN"].includes(row.status)) {
    return { success: false, message: "Hanya draf/ditolak/dibatalkan yang bisa dihapus." };
  }
  await prisma.$transaction([
    prisma.expenseClaim.delete({ where: { id } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "REIMBURSE", referensiId: id } }),
  ]);
  revalidateBestEffort("/payroll/reimbursements");
  return { success: true, message: "Klaim dihapus." };
}

/** Bayar tunai/transfer manual (di luar payroll). */
export async function payCash(
  id: string,
  input: { receipt: string },
  userId: string,
): Promise<ReimbursementActionResult> {
  const actor = await resolveActor(userId);
  if (!isFinance(actor.role)) return { success: false, message: "Hanya HR/Finance." };
  const row = await prisma.expenseClaim.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.status !== "DISETUJUI") return { success: false, message: "Hanya yang DISETUJUI yang bisa dibayar." };
  await prisma.$transaction([
    prisma.expensePembayaran.create({
      data: { claimId: id, runId: null, metode: "TUNAI", jumlah: row.nominal, bukti: input.receipt.trim() || null, createdById: userId },
    }),
    prisma.expenseClaim.update({
      where: { id },
      data: { status: "DIBAYAR", dibayarPada: new Date(), dibayarVia: "TUNAI" },
    }),
  ]);
  revalidateBestEffort("/payroll/reimbursements");
  return { success: true, message: "Dibayar tunai." };
}
