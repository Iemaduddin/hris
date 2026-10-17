"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { calculateRecapPeriod } from "../lib/recap-engine";

export type MonthlyRecapItem = {
  id: number;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  date: string;
  status: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  actualCheckIn: string | null;
  actualCheckOut: string | null;
};

export async function getMonthlyRecap(year: number, month: number, employeeId?: string): Promise<MonthlyRecapItem[]> {
  const rows = await prisma.rekapHarian.findMany({
    where: {
      tanggal: {
        gte: toDbDate(new Date(year, month - 1, 1)),
        lt: toDbDate(new Date(year, month, 1)),
      },
      ...(employeeId ? { karyawanId: employeeId } : {}),
    },
    orderBy: [{ tanggal: "asc" }, { karyawan: { namaLengkap: "asc" } }],
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    employeeId: r.karyawanId,
    employeeName: r.karyawan.namaLengkap,
    employeeNumber: r.karyawan.nomorKaryawan,
    date: r.tanggal.toISOString(),
    status: r.status,
    lateMinutes: r.telatMenit,
    earlyLeaveMinutes: r.pulangCepatMenit,
    overtimeMinutes: r.lemburMenit,
    actualCheckIn: r.masukAktual?.toISOString() ?? null,
    actualCheckOut: r.keluarAktual?.toISOString() ?? null,
  }));
}

export async function recalculateRecapAction(
  employeeIds: string[],
  start: string,
  end: string,
): Promise<{ success: boolean; message: string; calculated?: number }> {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    return { success: false, message: "Rentang tanggal tidak valid." };
  }
  if (employeeIds.length === 0) {
    return { success: false, message: "Pilih minimal satu karyawan." };
  }

  try {
    const result = await calculateRecapPeriod(employeeIds, startDate, endDate);
    revalidatePath("/recap");
    return { success: true, message: `Rekap dihitung ulang: ${result.length} hari-karyawan.`, calculated: result.length };
  } catch {
    return { success: false, message: "Gagal menghitung rekap." };
  }
}

export async function getActiveEmployeeOptions(): Promise<Array<{ value: string; label: string }>> {
  const rows = await prisma.karyawan.findMany({
    where: { status: { in: ["AKTIF", "PROBASI"] } },
    orderBy: { namaLengkap: "asc" },
    select: { id: true, namaLengkap: true, nomorKaryawan: true },
  });
  return rows.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` }));
}
