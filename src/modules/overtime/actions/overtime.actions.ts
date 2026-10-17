"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toTimeValue } from "@/src/lib/time";
import { startApprovalFlow } from "@/src/modules/approval/lib/approval-engine";
import { getPayrollSettingMap } from "@/src/modules/payroll/lib/calculate";
import {
  OVERTIME_MAX_HOURS_KEY,
  checkOvertimeCap,
  parseMaxHours,
} from "@/src/modules/payroll/lib/lembur";

export type OvertimeActionResult = { success: boolean; message: string; id?: string };

export type OvertimeItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: string;
  reason: string;
  status: string;
};

export async function listOvertime(filter?: { employeeId?: string; status?: string }): Promise<OvertimeItem[]> {
  const rows = await prisma.lembur.findMany({
    where: {
      ...(filter?.employeeId ? { karyawanId: filter.employeeId } : {}),
      ...(filter?.status ? { status: filter.status as never } : {}),
    },
    orderBy: { tanggal: "desc" },
    include: { karyawan: { select: { namaLengkap: true } } },
  });
  const fmt = (d: Date | null) => {
    if (!d) return "-";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  return rows.map((r) => ({
    id: r.id,
    employeeId: r.karyawanId,
    employeeName: r.karyawan.namaLengkap,
    date: r.tanggal.toISOString().slice(0, 10),
    startTime: fmt(r.jamMulai),
    endTime: fmt(r.jamSelesai),
    totalHours: r.jumlahJam.toString(),
    reason: r.alasan,
    status: r.status,
  }));
}

function calculateHours(start: string, end: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(start);
  const s = /^(\d{1,2}):(\d{2})$/.exec(end);
  if (!m || !s) return null;
  const startMin = Number(m[1]) * 60 + Number(m[2]);
  const endRaw = Number(s[1]) * 60 + Number(s[2]);
  const endMin = endRaw <= startMin ? endRaw + 24 * 60 : endRaw;
  const diff = (endMin - startMin) / 60;
  if (diff <= 0 || diff > 12) return null;
  return Math.round(diff * 100) / 100;
}

export async function createOvertime(input: {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}): Promise<OvertimeActionResult> {
  const total = calculateHours(input.startTime, input.endTime);
  if (total === null) return { success: false, message: "Rentang jam tidak valid (maks 12 jam)." };
  if (!input.reason.trim()) return { success: false, message: "Alasan wajib diisi." };

  // Cap jam lembur per bulan (pengajuan + berjalan + disetujui).
  const date = new Date(`${input.date}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { success: false, message: "Tanggal tidak valid." };
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  const settings = await getPayrollSettingMap();
  const maxHours = parseMaxHours(settings[OVERTIME_MAX_HOURS_KEY]);
  if (maxHours !== null) {
    const agg = await prisma.lembur.aggregate({
      where: {
        karyawanId: input.employeeId,
        tanggal: { gte: monthStart, lte: monthEnd },
        status: { in: ["DRAFT", "DIAJUKAN", "DISETUJUI"] as never },
      },
      _sum: { jumlahJam: true },
    });
    const running = Number(agg._sum.jumlahJam ?? 0);
    if (!checkOvertimeCap(running, total, maxHours)) {
      return {
        success: false,
        message: `Melebihi batas ${maxHours} jam/bulan (berjalan ${running} jam + ${total} jam).`,
      };
    }
  }

  const created = await prisma.lembur.create({
    data: {
      karyawanId: input.employeeId,
      tanggal: new Date(input.date),
      jamMulai: toTimeValue(input.startTime),
      jamSelesai: toTimeValue(input.endTime),
      jumlahJam: total,
      alasan: input.reason.trim(),
      status: "DRAFT",
    },
  });
  revalidatePath("/overtime");
  return { success: true, message: `Draf lembur ${total} jam tersimpan.`, id: created.id };
}

export async function submitOvertime(id: string): Promise<OvertimeActionResult> {
  const row = await prisma.lembur.findUnique({ where: { id } });
  if (!row || row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
  await prisma.lembur.update({ where: { id }, data: { status: "DIAJUKAN" } });
  await startApprovalFlow("LEMBUR", id);
  revalidatePath("/overtime");
  return { success: true, message: "Lembur dikirim ke atasan." };
}

export async function cancelOvertime(id: string): Promise<OvertimeActionResult> {
  const row = await prisma.lembur.findUnique({ where: { id } });
  if (!row || !["DRAFT", "DIAJUKAN"].includes(row.status as string)) {
    return { success: false, message: "Status ini tidak bisa dibatalkan." };
  }
  await prisma.lembur.delete({ where: { id } });
  await prisma.approvalStep.deleteMany({ where: { referensiType: "LEMBUR", referensiId: id } });
  revalidatePath("/overtime");
  return { success: true, message: "Pengajuan lembur dibatalkan." };
}
