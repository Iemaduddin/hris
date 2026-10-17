"use server";

import { revalidatePath } from "next/cache";
import type { StatusProbation } from "@/generated/prisma/client";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { startApprovalFlow } from "@/src/modules/approval/lib/approval-engine";
import { getProbationResultLabel, remainingProbationDays, validateAssessment } from "@/src/modules/employee/lib/probation";

export type ProbationActionResult = { success: boolean; message: string; id?: string };

export type ProbationItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  remainingDays: number;
  status: string;
  result: string | null;
};

export type ProbationDetail = ProbationItem & {
  resultLabel: string | null;
  score: number | null;
  note: string | null;
  newEndDate: string | null;
  submittedAt: string | null;
  steps: Array<{ stage: number; status: string; note: string | null; processedAt: string | null }>;
};

type Actor = { role: string; employeeId: string | null };

async function resolveActor(userId: string): Promise<Actor> {
  if (!userId) return { role: "EMPLOYEE", employeeId: null };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const employee = await prisma.karyawan.findFirst({ where: { userId }, select: { id: true } });
  return { role: user?.role ?? "EMPLOYEE", employeeId: employee?.id ?? null };
}

function isHr(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN_HR";
}

async function canManage(p: Actor, employeeId: string): Promise<boolean> {
  if (isHr(p.role)) return true;
  if (p.role !== "MANAJER" || !p.employeeId) return false;
  const subordinate = await prisma.karyawan.findFirst({
    where: { id: employeeId, atasanLangsungId: p.employeeId },
    select: { id: true },
  });
  return !!subordinate;
}

const STATUS_TERBUKA: StatusProbation[] = ["DRAFT", "DIAJUKAN", "MENUNGGU_APPROVAL", "DISETUJUI"];

function toItem(r: {
  id: string;
  karyawanId: string;
  karyawan: { namaLengkap: string; nomorKaryawan: string };
  tanggalMulai: Date;
  tanggalSelesai: Date;
  status: string;
  hasil: string | null;
}): ProbationItem {
  return {
    id: r.id,
    employeeId: r.karyawanId,
    employeeName: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    startDate: r.tanggalMulai.toISOString().slice(0, 10),
    endDate: r.tanggalSelesai.toISOString().slice(0, 10),
    remainingDays: remainingProbationDays(r.tanggalSelesai),
    status: r.status,
    result: r.hasil,
  };
}

export async function getProbationList(userId: string): Promise<ProbationItem[]> {
  const p = await resolveActor(userId);
  const rows = await prisma.probationReview.findMany({
    where: !isHr(p.role) && p.employeeId ? { karyawan: { atasanLangsungId: p.employeeId } } : {},
    orderBy: { tanggalSelesai: "asc" },
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows.map(toItem);
}

export async function getProbationDetail(id: string, userId: string): Promise<ProbationDetail | null> {
  const p = await resolveActor(userId);
  const r = await prisma.probationReview.findUnique({
    where: { id },
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true, atasanLangsungId: true } } },
  });
  if (!r) return null;
  if (!isHr(p.role) && r.karyawan.atasanLangsungId !== p.employeeId) return null;
  const steps = await prisma.approvalStep.findMany({
    where: { referensiType: "PROBATION", referensiId: id },
    orderBy: { tahap: "asc" },
  });
  return {
    ...toItem(r),
    resultLabel: r.hasil ? getProbationResultLabel(r.hasil) : null,
    score: r.nilai,
    note: r.catatan,
    newEndDate: r.tanggalSelesaiBaru?.toISOString().slice(0, 10) ?? null,
    submittedAt: r.diajukanPada?.toISOString() ?? null,
    steps: steps.map((s) => ({
      stage: s.tahap,
      status: s.status,
      note: s.catatan,
      processedAt: s.diprosesPada?.toISOString() ?? null,
    })),
  };
}

export async function getUpcomingProbation(days = 30): Promise<ProbationItem[]> {
  const batas = new Date();
  batas.setDate(batas.getDate() + days);
  const rows = await prisma.probationReview.findMany({
    where: { status: { in: STATUS_TERBUKA }, tanggalSelesai: { lte: batas } },
    orderBy: { tanggalSelesai: "asc" },
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows.map(toItem);
}

export async function getProbationOptions(userId: string): Promise<Array<{ value: string; label: string }>> {
  const p = await resolveActor(userId);
  const rows = await prisma.karyawan.findMany({
    where: {
      status: "PROBASI",
      ...(!isHr(p.role) && p.employeeId ? { atasanLangsungId: p.employeeId } : {}),
    },
    orderBy: { namaLengkap: "asc" },
    select: { id: true, namaLengkap: true, nomorKaryawan: true },
  });
  return rows.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` }));
}

async function hasOpenReview(karyawanId: string): Promise<boolean> {
  const exists = await prisma.probationReview.findFirst({
    where: { karyawanId, status: { in: STATUS_TERBUKA } },
    select: { id: true },
  });
  return !!exists;
}

export async function generateFromProbation(userId: string): Promise<ProbationActionResult> {
  const p = await resolveActor(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa generate." };
  const probationers = await prisma.karyawan.findMany({
    where: { status: "PROBASI" },
    select: {
      id: true,
      tanggalMasuk: true,
      kontrakKerja: {
        where: { status: "AKTIF" },
        orderBy: { tanggalMulai: "desc" },
        take: 1,
        select: { tanggalMulai: true, tanggalSelesai: true },
      },
    },
  });
  let created = 0;
  for (const k of probationers) {
    if (await hasOpenReview(k.id)) continue;
    const contract = k.kontrakKerja[0];
    const start = contract?.tanggalMulai ?? k.tanggalMasuk;
    const end = contract?.tanggalSelesai ?? new Date(k.tanggalMasuk.getTime() + 90 * 86_400_000);
    await prisma.probationReview.create({
      data: { karyawanId: k.id, tanggalMulai: start, tanggalSelesai: end, createdById: userId },
    });
    created++;
  }
  revalidatePath("/employees/probation");
  return { success: true, message: created > 0 ? `${created} review dibuat.` : "Semua karyawan probasi sudah punya review." };
}

export async function createManualReview(
  input: { employeeId: string; startDate: string; endDate: string },
  userId: string,
): Promise<ProbationActionResult> {
  const p = await resolveActor(userId);
  if (!(await canManage(p, input.employeeId))) {
    return { success: false, message: "Anda hanya bisa membuat untuk bawahan langsung." };
  }
  const employee = await prisma.karyawan.findUnique({ where: { id: input.employeeId }, select: { status: true } });
  if (!employee || employee.status !== "PROBASI") {
    return { success: false, message: "Hanya karyawan PROBASI yang bisa direview." };
  }
  if (await hasOpenReview(input.employeeId)) {
    return { success: false, message: "Sudah ada review terbuka." };
  }
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { success: false, message: "Rentang tanggal tidak valid." };
  }
  const created = await prisma.probationReview.create({
    data: { karyawanId: input.employeeId, tanggalMulai: start, tanggalSelesai: end, createdById: userId },
  });
  revalidatePath("/employees/probation");
  return { success: true, message: "Review dibuat.", id: created.id };
}

export async function submitReview(id: string, userId: string): Promise<ProbationActionResult> {
  const p = await resolveActor(userId);
  const row = await prisma.probationReview.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!(await canManage(p, row.karyawanId))) return { success: false, message: "Akses ditolak." };
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
  await startApprovalFlow("PROBATION", id);
  revalidatePath("/employees/probation");
  revalidatePath("/approval");
  return { success: true, message: "Dikirim ke atasan → HR." };
}

export async function cancelReview(id: string, userId: string): Promise<ProbationActionResult> {
  const p = await resolveActor(userId);
  const row = await prisma.probationReview.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!(await canManage(p, row.karyawanId))) return { success: false, message: "Akses ditolak." };
  if (!["DRAFT", "DIAJUKAN"].includes(row.status)) {
    return { success: false, message: "Status ini tidak bisa dibatalkan." };
  }
  await prisma.$transaction([
    prisma.probationReview.update({ where: { id }, data: { status: "DIBATALKAN" } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "PROBATION", referensiId: id } }),
  ]);
  revalidatePath("/employees/probation");
  return { success: true, message: "Review dibatalkan." };
}

export async function gradeReview(
  id: string,
  input: { result: string; score: number | null; note: string; newEndDate: string },
  userId: string,
): Promise<ProbationActionResult> {
  const p = await resolveActor(userId);
  const row = await prisma.probationReview.findUnique({
    where: { id },
    include: { karyawan: { select: { atasanLangsungId: true } } },
  });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  const manager = row.karyawan.atasanLangsungId === p.employeeId;
  if (!isHr(p.role) && !manager) return { success: false, message: "Hanya atasan/HR yang bisa menilai." };
  if (!["DIAJUKAN", "MENUNGGU_APPROVAL"].includes(row.status)) {
    return { success: false, message: "Hanya yang sedang berjalan yang bisa dinilai." };
  }
  const err = validateAssessment({
    hasil: input.result,
    nilai: input.score,
    tanggalSelesai: row.tanggalSelesai,
    tanggalSelesaiBaru: input.newEndDate,
  });
  if (err) return { success: false, message: err };
  await prisma.probationReview.update({
    where: { id },
    data: {
      hasil: input.result as never,
      nilai: input.score,
      catatan: input.note.trim() || null,
      tanggalSelesaiBaru: input.result === "PERPANJANG" ? toDbDate(input.newEndDate) : null,
      diputuskanOlehId: userId,
      diputuskanPada: new Date(),
    },
  });
  revalidatePath("/employees/probation");
  return { success: true, message: `Penilaian tersimpan: ${getProbationResultLabel(input.result)}.` };
}

export async function finalizeReview(id: string, userId: string): Promise<ProbationActionResult> {
  const p = await resolveActor(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa finalisasi." };
  const row = await prisma.probationReview.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.status !== "DISETUJUI") return { success: false, message: "Hanya yang DISETUJUI yang bisa difinalisasi." };
  if (!row.hasil) return { success: false, message: "Belum ada hasil penilaian." };

  if (row.hasil === "LULUS") {
    await prisma.$transaction([
      prisma.karyawan.update({ where: { id: row.karyawanId }, data: { status: "AKTIF" } }),
      prisma.probationReview.update({ where: { id }, data: { status: "SELESAI" } }),
    ]);
  } else if (row.hasil === "PERPANJANG") {
    if (!row.tanggalSelesaiBaru) return { success: false, message: "Tanggal perpanjangan belum diisi." };
    await prisma.$transaction([
      prisma.probationReview.update({ where: { id }, data: { status: "SELESAI" } }),
      prisma.probationReview.create({
        data: {
          karyawanId: row.karyawanId,
          tanggalMulai: new Date(row.tanggalSelesai.getTime() + 86_400_000),
          tanggalSelesai: row.tanggalSelesaiBaru,
          createdById: userId,
        },
      }),
    ]);
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.karyawan.update({
        where: { id: row.karyawanId },
        data: { status: "DIHENTIKAN", tanggalResign: row.tanggalSelesai },
      });
      const account = await tx.karyawan.findUnique({ where: { id: row.karyawanId }, select: { userId: true } });
      if (account?.userId) {
        await tx.user.update({ where: { id: account.userId }, data: { isActive: false } });
        await tx.session.deleteMany({ where: { userId: account.userId } });
      }
      await tx.probationReview.update({ where: { id }, data: { status: "SELESAI" } });
    });
  }

  revalidatePath("/employees/probation");
  revalidatePath("/employees");
  const message =
    row.hasil === "LULUS"
      ? "Lulus — status menjadi AKTIF."
      : row.hasil === "PERPANJANG"
        ? "Diperpanjang — review lanjutan dibuat."
        : "Tidak lulus — status DIHENTIKAN, akun dinonaktifkan.";
  return { success: true, message };
}

export async function deleteReview(id: string, userId: string): Promise<ProbationActionResult> {
  const p = await resolveActor(userId);
  const row = await prisma.probationReview.findUnique({ where: { id }, select: { karyawanId: true, status: true } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!(await canManage(p, row.karyawanId))) return { success: false, message: "Akses ditolak." };
  if (!["DRAFT", "DITOLAK", "DIBATALKAN"].includes(row.status)) {
    return { success: false, message: "Hanya draf/ditolak/dibatalkan yang bisa dihapus." };
  }
  await prisma.$transaction([
    prisma.probationReview.delete({ where: { id } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "PROBATION", referensiId: id } }),
  ]);
  revalidatePath("/employees/probation");
  return { success: true, message: "Review dihapus." };
}
