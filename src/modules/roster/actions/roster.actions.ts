"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { addDays, dateOnlyInput, toDbDate } from "@/src/lib/time";

export type RosterListItem = {
  id: number;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  date: string;
  shiftId: string;
  shiftCode: string;
  shiftName: string;
};

export type RosterActionResult = { success: boolean; message: string };

function parseDay(value: string): Date | null {
	if (!value) return null;
	try {
		return toDbDate(value);
	} catch {
		return null;
	}
}

export async function getRosterPeriod(start: string, end: string, employeeId?: string): Promise<RosterListItem[]> {
  const startDate = parseDay(start);
  const endDate = parseDay(end);
  if (!startDate || !endDate) return [];

  const rows = await prisma.rosterShift.findMany({
    where: {
      tanggal: { gte: startDate, lte: endDate },
      ...(employeeId ? { karyawanId: employeeId } : {}),
    },
    orderBy: [{ tanggal: "asc" }, { karyawan: { namaLengkap: "asc" } }],
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
      shift: { select: { kode: true, nama: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    employeeId: r.karyawanId,
    employeeName: r.karyawan.namaLengkap,
    employeeNumber: r.karyawan.nomorKaryawan,
    date: dateOnlyInput(r.tanggal),
    shiftId: r.shiftId,
    shiftCode: r.shift.kode,
    shiftName: r.shift.nama,
  }));
}

export async function saveRosterPattern(input: {
  employeeIds: string[];
  start: string;
  end: string;
  patternShiftIds: string[];
}): Promise<RosterActionResult> {
  const startDate = parseDay(input.start);
  const endDate = parseDay(input.end);
  if (!startDate || !endDate || startDate > endDate) return { success: false, message: "Rentang tanggal tidak valid." };
  if (input.employeeIds.length === 0) return { success: false, message: "Pilih minimal satu karyawan." };
  if (input.patternShiftIds.length === 0) return { success: false, message: "Pilih minimal satu shift untuk pola." };

  const shifts = await prisma.shift.findMany({
    where: { id: { in: input.patternShiftIds }, isActive: true },
    select: { id: true },
  });
  if (shifts.length === 0) return { success: false, message: "Shift tidak valid." };
  const validIds = shifts.map((s) => s.id);

  let cursor = startDate;
  let dayIndex = 0;
  let count = 0;
  while (cursor <= endDate) {
    const shiftId = validIds[dayIndex % validIds.length];
    for (const employeeId of input.employeeIds) {
      await prisma.rosterShift.upsert({
        where: { karyawanId_tanggal: { karyawanId: employeeId, tanggal: cursor } },
        update: { shiftId },
        create: { karyawanId: employeeId, tanggal: cursor, shiftId },
      });
      count++;
    }
    cursor = addDays(cursor, 1);
    dayIndex++;
  }

  revalidatePath("/roster");
  return { success: true, message: `Roster tersimpan: ${count} penugasan.` };
}

export async function deleteRoster(input: {
  employeeIds: string[];
  start: string;
  end: string;
}): Promise<RosterActionResult> {
  const startDate = parseDay(input.start);
  const endDate = parseDay(input.end);
  if (!startDate || !endDate || input.employeeIds.length === 0) {
    return { success: false, message: "Parameter tidak valid." };
  }

  const result = await prisma.rosterShift.deleteMany({
    where: { karyawanId: { in: input.employeeIds }, tanggal: { gte: startDate, lte: endDate } },
  });

  revalidatePath("/roster");
  return { success: true, message: `${result.count} roster dihapus.` };
}

export type CalendarAssignmentItem = {
  id: number;
  employeeId: string;
  employeeName: string;
  calendarId: number;
  calendarName: string;
  startDate: string;
  endDate: string | null;
};

export async function listCalendarAssignments(): Promise<CalendarAssignmentItem[]> {
  const rows = await prisma.penugasanKalender.findMany({
    orderBy: { tanggalMulai: "desc" },
    include: {
      karyawan: { select: { namaLengkap: true } },
      kalenderKerja: { select: { nama: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    employeeId: r.karyawanId,
    employeeName: r.karyawan.namaLengkap,
    calendarId: r.kalenderKerjaId,
    calendarName: r.kalenderKerja.nama,
    startDate: dateOnlyInput(r.tanggalMulai),
    endDate: r.tanggalSelesai ? dateOnlyInput(r.tanggalSelesai) : null,
  }));
}

export async function saveCalendarAssignment(input: {
  employeeId: string;
  calendarId: number;
  startDate: string;
  endDate?: string;
}): Promise<RosterActionResult> {
  const startDate = parseDay(input.startDate);
  const endDate = input.endDate ? parseDay(input.endDate) : null;
  if (!input.employeeId || !startDate || !input.calendarId) {
    return { success: false, message: "Karyawan, kalender, dan tanggal mulai wajib diisi." };
  }
  if (endDate && endDate < startDate) {
    return { success: false, message: "Tanggal selesai tidak boleh sebelum tanggal mulai." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.penugasanKalender.updateMany({
      where: { karyawanId: input.employeeId, tanggalSelesai: null },
      data: { tanggalSelesai: addDays(startDate, -1) },
    });
    await tx.penugasanKalender.create({
      data: {
        karyawanId: input.employeeId,
        kalenderKerjaId: input.calendarId,
        tanggalMulai: startDate,
        tanggalSelesai: endDate,
      },
    });
  });

  revalidatePath("/roster");
  return { success: true, message: "Penugasan kalender tersimpan." };
}

export async function deleteCalendarAssignment(id: number): Promise<RosterActionResult> {
  try {
    await prisma.penugasanKalender.delete({ where: { id } });
    revalidatePath("/roster");
    return { success: true, message: "Penugasan dihapus." };
  } catch {
    return { success: false, message: "Gagal menghapus penugasan." };
  }
}

export async function listCalendarOptions(): Promise<Array<{ value: number; label: string }>> {
	const rows = await prisma.kalenderKerja.findMany({
		where: { isActive: true },
		orderBy: { nama: "asc" },
		select: { id: true, nama: true, isDefault: true },
	});
	return rows.map((k) => ({ value: k.id, label: k.isDefault ? `${k.nama} (Default)` : k.nama }));
}
