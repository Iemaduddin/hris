import prisma from "@/src/lib/prisma";
import { StatusRekap, type HariDalamMinggu } from "@/generated/prisma/client";
import { addDays, dayName, startOfDay, timeToMinutes, toDbDate } from "@/src/lib/time";

export type RecapResult = {
  karyawanId: string;
  tanggal: Date;
  sumberJadwal: string;
  acuanId: string | null;
  jamMasukSeharusnya: Date | null;
  jamKeluarSeharusnya: Date | null;
  masukAktual: Date | null;
  keluarAktual: Date | null;
  telatMenit: number;
  pulangCepatMenit: number;
  lemburMenit: number;
  status: StatusRekap;
};

function combineDayTime(day: Date, minutes: number, plusDays = 0): Date {
  const d = new Date(day);
  if (plusDays) d.setDate(d.getDate() + plusDays);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

function endOfDay(day: Date): Date {
  const d = new Date(day);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function calculateDailyRecap(employeeId: string, tanggal: Date): Promise<RecapResult | null> {
  const day = toDbDate(tanggal);

  const roster = await prisma.rosterShift.findUnique({
    where: { karyawanId_tanggal: { karyawanId: employeeId, tanggal: day } },
    include: { shift: true },
  });

  let checkInMin: number | null = null;
  let checkOutMin: number | null = null;
  let checkoutPlusDays = 0;
  let tolerance = 0;
  let sumberJadwal = "";
  let acuanId: string | null = null;
  let calendarId: number | null = null;

  if (roster && roster.shift.isActive) {
    checkInMin = timeToMinutes(roster.shift.jamMasuk);
    checkOutMin = timeToMinutes(roster.shift.jamKeluar);
    if (roster.shift.lintasHari) checkoutPlusDays = 1;
    tolerance = roster.shift.toleransiTelatMenit;
    sumberJadwal = "ROSTER";
    acuanId = roster.shiftId;
  } else {
    const assignment = await prisma.penugasanKalender.findFirst({
      where: {
        karyawanId: employeeId,
        tanggalMulai: { lte: day },
        OR: [{ tanggalSelesai: null }, { tanggalSelesai: { gte: day } }],
      },
      orderBy: { tanggalMulai: "desc" },
    });

    if (assignment) {
      calendarId = assignment.kalenderKerjaId;
      sumberJadwal = "KALENDER";
      acuanId = String(assignment.kalenderKerjaId);
    } else {
      const def = await prisma.kalenderKerja.findFirst({
        where: { isDefault: true, isActive: true },
      });
      if (!def) return null;
      calendarId = def.id;
      sumberJadwal = "KALENDER_DEFAULT";
      acuanId = String(def.id);
    }

    const schedule = await prisma.jadwalKerja.findUnique({
      where: { kalenderKerjaId_hari: { kalenderKerjaId: calendarId, hari: dayName(day) as HariDalamMinggu } },
    });

    if (!schedule || !schedule.isHariKerja || !schedule.jamMasuk || !schedule.jamKeluar) {
      const attendance = await hasAttendance(employeeId, day, false);
      return saveRecap({
        karyawanId: employeeId,
        tanggal: day,
        sumberJadwal,
        acuanId,
        jamMasukSeharusnya: null,
        jamKeluarSeharusnya: null,
        masukAktual: attendance.checkIn,
        keluarAktual: attendance.checkOut,
        telatMenit: 0,
        pulangCepatMenit: 0,
        lemburMenit: attendance.checkIn && attendance.checkOut ? diffMinutes(attendance.checkIn, attendance.checkOut) : 0,
        status: attendance.checkIn ? StatusRekap.HADIR : StatusRekap.LIBUR,
      });
    }

    checkInMin = timeToMinutes(schedule.jamMasuk);
    checkOutMin = timeToMinutes(schedule.jamKeluar);
  }

  if (checkInMin === null || checkOutMin === null) return null;

  const holiday = await prisma.hariLibur.findFirst({
    where: {
      tanggal: day,
      ...(calendarId ? { kalenderKerjaId: calendarId } : {}),
    },
    select: { id: true },
  });

  if (holiday) {
    const attendance = await hasAttendance(employeeId, day, checkoutPlusDays > 0);
    return saveRecap({
      karyawanId: employeeId,
      tanggal: day,
      sumberJadwal,
      acuanId,
      jamMasukSeharusnya: combineDayTime(day, checkInMin),
      jamKeluarSeharusnya: combineDayTime(day, checkOutMin, checkoutPlusDays),
      masukAktual: attendance.checkIn,
      keluarAktual: attendance.checkOut,
      telatMenit: 0,
      pulangCepatMenit: 0,
      lemburMenit: attendance.checkIn && attendance.checkOut ? diffMinutes(attendance.checkIn, attendance.checkOut) : 0,
      status: attendance.checkIn ? StatusRekap.HADIR : StatusRekap.LIBUR,
    });
  }

  const leave = await prisma.pengajuanKetidakhadiran.findFirst({
    where: {
      karyawanId: employeeId,
      status: "DISETUJUI",
      tanggalMulai: { lte: endOfDay(day) },
      tanggalSelesai: { gte: day },
    },
    include: { jenisKetidakhadiran: { select: { kategori: true } } },
  });

  const duty = leave
    ? null
    : await prisma.dinasWFH.findFirst({
        where: {
          karyawanId: employeeId,
          status: "DISETUJUI",
          tanggalMulai: { lte: day },
          tanggalSelesai: { gte: day },
        },
        select: { id: true },
      });

  if (duty) {
    return saveRecap({
      karyawanId: employeeId,
      tanggal: day,
      sumberJadwal,
      acuanId,
      jamMasukSeharusnya: combineDayTime(day, checkInMin),
      jamKeluarSeharusnya: combineDayTime(day, checkOutMin, checkoutPlusDays),
      masukAktual: null,
      keluarAktual: null,
      telatMenit: 0,
      pulangCepatMenit: 0,
      lemburMenit: 0,
      status: StatusRekap.DINAS,
    });
  }

  if (leave) {
    return saveRecap({
      karyawanId: employeeId,
      tanggal: day,
      sumberJadwal,
      acuanId,
      jamMasukSeharusnya: combineDayTime(day, checkInMin),
      jamKeluarSeharusnya: combineDayTime(day, checkOutMin, checkoutPlusDays),
      masukAktual: null,
      keluarAktual: null,
      telatMenit: 0,
      pulangCepatMenit: 0,
      lemburMenit: 0,
      status: leave.jenisKetidakhadiran.kategori === "CUTI" ? StatusRekap.CUTI : StatusRekap.IZIN,
    });
  }

  const attendance = await hasAttendance(employeeId, day, checkoutPlusDays > 0);
  const expectedCheckIn = combineDayTime(day, checkInMin);
  const expectedCheckOut = combineDayTime(day, checkOutMin, checkoutPlusDays);

  if (!attendance.checkIn) {
    return saveRecap({
      karyawanId: employeeId,
      tanggal: day,
      sumberJadwal,
      acuanId,
      jamMasukSeharusnya: expectedCheckIn,
      jamKeluarSeharusnya: expectedCheckOut,
      masukAktual: null,
      keluarAktual: attendance.checkOut,
      telatMenit: 0,
      pulangCepatMenit: 0,
      lemburMenit: 0,
      status: StatusRekap.ALPA,
    });
  }

  const late = Math.max(0, diffMinutes(expectedCheckIn, attendance.checkIn));
  const earlyLeave = attendance.checkOut ? Math.max(0, diffMinutes(attendance.checkOut, expectedCheckOut)) : 0;
  const overtime = attendance.checkOut ? Math.max(0, diffMinutes(expectedCheckOut, attendance.checkOut)) : 0;

  return saveRecap({
    karyawanId: employeeId,
    tanggal: day,
    sumberJadwal,
    acuanId,
    jamMasukSeharusnya: expectedCheckIn,
    jamKeluarSeharusnya: expectedCheckOut,
    masukAktual: attendance.checkIn,
    keluarAktual: attendance.checkOut,
    telatMenit: late,
    pulangCepatMenit: earlyLeave,
    lemburMenit: overtime,
    status: late > tolerance ? StatusRekap.TERLAMBAT : StatusRekap.HADIR,
  });
}

async function hasAttendance(
  karyawanId: string,
  day: Date,
  pastMidnight: boolean,
): Promise<{ checkIn: Date | null; checkOut: Date | null }> {
  const from = startOfDay(day);
  const to = pastMidnight ? combineDayTime(addDays(day, 1), 12 * 60) : endOfDay(day);

  const events = await prisma.absensi.findMany({
    where: {
      karyawanId,
      waktu: { gte: from, lte: to },
      status: { in: ["VALID", "DIKOREKSI"] },
    },
    orderBy: { waktu: "asc" },
    select: { waktu: true, tipe: true },
  });

  const checkIns = events.filter((e) => e.tipe === "MASUK").map((e) => e.waktu);
  const checkOuts = events.filter((e) => e.tipe === "KELUAR").map((e) => e.waktu);

  return {
    checkIn: checkIns.length ? checkIns[0] : null,
    checkOut: checkOuts.length ? checkOuts[checkOuts.length - 1] : null,
  };
}

function diffMinutes(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60000);
}

async function saveRecap(result: RecapResult): Promise<RecapResult> {
  await prisma.rekapHarian.upsert({
    where: { karyawanId_tanggal: { karyawanId: result.karyawanId, tanggal: result.tanggal } },
    update: {
      sumberJadwal: result.sumberJadwal,
      acuanId: result.acuanId,
      jamMasukSeharusnya: result.jamMasukSeharusnya,
      jamKeluarSeharusnya: result.jamKeluarSeharusnya,
      masukAktual: result.masukAktual,
      keluarAktual: result.keluarAktual,
      telatMenit: result.telatMenit,
      pulangCepatMenit: result.pulangCepatMenit,
      lemburMenit: result.lemburMenit,
      status: result.status,
    },
    create: {
      karyawanId: result.karyawanId,
      tanggal: result.tanggal,
      sumberJadwal: result.sumberJadwal,
      acuanId: result.acuanId,
      jamMasukSeharusnya: result.jamMasukSeharusnya,
      jamKeluarSeharusnya: result.jamKeluarSeharusnya,
      masukAktual: result.masukAktual,
      keluarAktual: result.keluarAktual,
      telatMenit: result.telatMenit,
      pulangCepatMenit: result.pulangCepatMenit,
      lemburMenit: result.lemburMenit,
      status: result.status,
    },
  });
  return result;
}

export async function calculateRecapPeriod(employeeIds: string[], start: Date, end: Date): Promise<RecapResult[]> {
  const results: RecapResult[] = [];
  let cursor = toDbDate(start);
  const periodEnd = toDbDate(end);
  while (cursor <= periodEnd) {
    for (const employeeId of employeeIds) {
      const r = await calculateDailyRecap(employeeId, cursor);
      if (r) results.push(r);
    }
    cursor = addDays(cursor, 1);
  }
  return results;
}
