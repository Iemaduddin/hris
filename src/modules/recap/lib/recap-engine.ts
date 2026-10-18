import prisma from "@/src/lib/prisma";
import { StatusRekap, type HariDalamMinggu } from "@/generated/prisma/client";
import { addDays, dayName, fromTimeValue, startOfDay, timeToMinutes, toDbDate } from "@/src/lib/time";

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

function diffMinutes(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60000);
}

/** Jam kerja efektif seorang karyawan pada satu hari (roster aktif atau kalender kerja). */
type DayInput = {
  /** Roster hari itu dengan shift aktif — menentukan jam acuan; null = ikut kalender. */
  roster: {
    shiftId: string;
    jamMasuk: Date;
    jamKeluar: Date;
    lintasHari: boolean;
    toleransiTelatMenit: number;
  } | null;
  schedule: { isHariKerja: boolean; jamMasuk: Date | null; jamKeluar: Date | null } | null;
  sumberJadwal: string;
  acuanId: string | null;
  holiday: boolean;
  leave: { nama: string; kategori: string } | null;
  duty: { jenis: string } | null;
  attendance: { checkIn: Date | null; checkOut: Date | null };
};

/** Hasil satu hari seorang karyawan + label sumber status (untuk tampilan tim/direktori). */
export type DailyRecapRow = {
  recap: RecapResult | null;
  shiftName: string | null;
  leaveName: string | null;
  dutyJenis: string | null;
};

/**
 * Perhitungan murni (tanpa I/O) dari input harian yang sudah dimuat.
 * Dipakai jalur tunggal maupun batch agar keduanya tidak bisa menyimpang.
 */
function composeRecap(employeeId: string, day: Date, input: DayInput): RecapResult | null {
  let checkInMin: number | null = null;
  let checkOutMin: number | null = null;
  let checkoutPlusDays = 0;
  let tolerance = 0;

  if (input.roster) {
    checkInMin = timeToMinutes(input.roster.jamMasuk);
    checkOutMin = timeToMinutes(input.roster.jamKeluar);
    if (input.roster.lintasHari) checkoutPlusDays = 1;
    tolerance = input.roster.toleransiTelatMenit;
  } else {
    const schedule = input.schedule;
    if (!schedule || !schedule.isHariKerja || !schedule.jamMasuk || !schedule.jamKeluar) {
      const attendance = input.attendance;
      return {
        karyawanId: employeeId,
        tanggal: day,
        sumberJadwal: input.sumberJadwal,
        acuanId: input.acuanId,
        jamMasukSeharusnya: null,
        jamKeluarSeharusnya: null,
        masukAktual: attendance.checkIn,
        keluarAktual: attendance.checkOut,
        telatMenit: 0,
        pulangCepatMenit: 0,
        lemburMenit:
          attendance.checkIn && attendance.checkOut ? diffMinutes(attendance.checkIn, attendance.checkOut) : 0,
        status: attendance.checkIn ? StatusRekap.HADIR : StatusRekap.LIBUR,
      };
    }
    checkInMin = timeToMinutes(schedule.jamMasuk);
    checkOutMin = timeToMinutes(schedule.jamKeluar);
  }

  if (checkInMin === null || checkOutMin === null) return null;

  const base = {
    karyawanId: employeeId,
    tanggal: day,
    sumberJadwal: input.sumberJadwal,
    acuanId: input.acuanId,
    jamMasukSeharusnya: combineDayTime(day, checkInMin),
    jamKeluarSeharusnya: combineDayTime(day, checkOutMin, checkoutPlusDays),
  };

  if (input.holiday) {
    const attendance = input.attendance;
    return {
      ...base,
      masukAktual: attendance.checkIn,
      keluarAktual: attendance.checkOut,
      telatMenit: 0,
      pulangCepatMenit: 0,
      lemburMenit:
        attendance.checkIn && attendance.checkOut ? diffMinutes(attendance.checkIn, attendance.checkOut) : 0,
      status: attendance.checkIn ? StatusRekap.HADIR : StatusRekap.LIBUR,
    };
  }

  if (input.duty) {
    return {
      ...base,
      masukAktual: null,
      keluarAktual: null,
      telatMenit: 0,
      pulangCepatMenit: 0,
      lemburMenit: 0,
      status: StatusRekap.DINAS,
    };
  }

  if (input.leave) {
    return {
      ...base,
      masukAktual: null,
      keluarAktual: null,
      telatMenit: 0,
      pulangCepatMenit: 0,
      lemburMenit: 0,
      status: input.leave.kategori === "CUTI" ? StatusRekap.CUTI : StatusRekap.IZIN,
    };
  }

  const attendance = input.attendance;

  if (!attendance.checkIn) {
    return {
      ...base,
      masukAktual: null,
      keluarAktual: attendance.checkOut,
      telatMenit: 0,
      pulangCepatMenit: 0,
      lemburMenit: 0,
      status: StatusRekap.ALPA,
    };
  }

  const late = Math.max(0, diffMinutes(base.jamMasukSeharusnya, attendance.checkIn));
  const earlyLeave = attendance.checkOut ? Math.max(0, diffMinutes(attendance.checkOut, base.jamKeluarSeharusnya)) : 0;
  const overtime = attendance.checkOut ? Math.max(0, diffMinutes(base.jamKeluarSeharusnya, attendance.checkOut)) : 0;

  return {
    ...base,
    masukAktual: attendance.checkIn,
    keluarAktual: attendance.checkOut,
    telatMenit: late,
    pulangCepatMenit: earlyLeave,
    lemburMenit: overtime,
    status: late > tolerance ? StatusRekap.TERLAMBAT : StatusRekap.HADIR,
  };
}

/**
 * Muat semua input satu hari untuk banyak karyawan sekaligus (~8 query, bukan 8xN).
 * Urutan pemilihan dokumen mengikuti `calculateDailyRecap` lama:
 * roster aktif > penugasan kalender terbaru > kalender default.
 */
async function loadDayRows(employeeIds: string[], tanggal: Date): Promise<Map<string, DailyRecapRow>> {
  const day = toDbDate(tanggal);
  const rows = new Map<string, DailyRecapRow>();
  if (employeeIds.length === 0) return rows;

  const rosters = await prisma.rosterShift.findMany({
    where: { karyawanId: { in: employeeIds }, tanggal: day },
    select: {
      karyawanId: true,
      shiftId: true,
      shift: {
        select: {
          isActive: true,
          nama: true,
          jamMasuk: true,
          jamKeluar: true,
          lintasHari: true,
          toleransiTelatMenit: true,
        },
      },
    },
  });
  const rosterByEmployee = new Map(rosters.map((r) => [r.karyawanId, r]));

  const tanpaRoster = employeeIds.filter((id) => {
    const roster = rosterByEmployee.get(id);
    return !(roster && roster.shift.isActive);
  });

  const assignments = tanpaRoster.length
    ? await prisma.penugasanKalender.findMany({
        where: {
          karyawanId: { in: tanpaRoster },
          tanggalMulai: { lte: day },
          OR: [{ tanggalSelesai: null }, { tanggalSelesai: { gte: day } }],
        },
        orderBy: { tanggalMulai: "desc" },
        select: { karyawanId: true, kalenderKerjaId: true },
      })
    : [];
  const assignmentByEmployee = new Map<string, number>();
  for (const a of assignments) {
    if (!assignmentByEmployee.has(a.karyawanId)) assignmentByEmployee.set(a.karyawanId, a.kalenderKerjaId);
  }

  const butuhDefault = tanpaRoster.some((id) => !assignmentByEmployee.has(id));
  const defaultCalendar = butuhDefault
    ? await prisma.kalenderKerja.findFirst({ where: { isDefault: true, isActive: true }, select: { id: true } })
    : null;

  const calendarIds = new Set<number>(assignmentByEmployee.values());
  if (defaultCalendar) calendarIds.add(defaultCalendar.id);
  const schedules = calendarIds.size
    ? await prisma.jadwalKerja.findMany({
        where: { kalenderKerjaId: { in: [...calendarIds] }, hari: dayName(day) as HariDalamMinggu },
        select: { kalenderKerjaId: true, isHariKerja: true, jamMasuk: true, jamKeluar: true },
      })
    : [];
  const scheduleByCalendar = new Map(schedules.map((s) => [s.kalenderKerjaId, s]));

  const holidays = await prisma.hariLibur.findMany({ where: { tanggal: day }, select: { kalenderKerjaId: true } });
  const hariLiburSemua = holidays.length > 0;
  const hariLiburKalender = new Set(holidays.map((h) => h.kalenderKerjaId));

  const leaves = await prisma.pengajuanKetidakhadiran.findMany({
    where: {
      karyawanId: { in: employeeIds },
      status: "DISETUJUI",
      tanggalMulai: { lte: endOfDay(day) },
      tanggalSelesai: { gte: day },
    },
    orderBy: { tanggalMulai: "asc" },
    select: { karyawanId: true, jenisKetidakhadiran: { select: { nama: true, kategori: true } } },
  });
  const leaveByEmployee = new Map<string, { nama: string; kategori: string }>();
  for (const leave of leaves) {
    if (!leaveByEmployee.has(leave.karyawanId)) leaveByEmployee.set(leave.karyawanId, leave.jenisKetidakhadiran);
  }

  const tanpaCuti = employeeIds.filter((id) => !leaveByEmployee.has(id));
  const duties = tanpaCuti.length
    ? await prisma.dinasWFH.findMany({
        where: {
          karyawanId: { in: tanpaCuti },
          status: "DISETUJUI",
          tanggalMulai: { lte: day },
          tanggalSelesai: { gte: day },
        },
        orderBy: { tanggalMulai: "asc" },
        select: { karyawanId: true, jenis: true },
      })
    : [];
  const dutyByEmployee = new Map<string, string>();
  for (const duty of duties) {
    if (!dutyByEmployee.has(duty.karyawanId)) dutyByEmployee.set(duty.karyawanId, duty.jenis);
  }

  const attendanceEvents = await prisma.absensi.findMany({
    where: {
      karyawanId: { in: employeeIds },
      waktu: { gte: startOfDay(day), lte: combineDayTime(addDays(day, 1), 12 * 60) },
      status: { in: ["VALID", "DIKOREKSI"] },
    },
    orderBy: [{ karyawanId: "asc" }, { waktu: "asc" }],
    select: { karyawanId: true, waktu: true, tipe: true },
  });
  const eventsByEmployee = new Map<string, { waktu: Date; tipe: string }[]>();
  for (const event of attendanceEvents) {
    const list = eventsByEmployee.get(event.karyawanId);
    if (list) list.push(event);
    else eventsByEmployee.set(event.karyawanId, [event]);
  }

  const attendanceOf = (employeeId: string, pastMidnight: boolean) => {
    const to = pastMidnight ? combineDayTime(addDays(day, 1), 12 * 60) : endOfDay(day);
    const events = (eventsByEmployee.get(employeeId) ?? []).filter((e) => e.waktu.getTime() <= to.getTime());
    const checkIns = events.filter((e) => e.tipe === "MASUK").map((e) => e.waktu);
    const checkOuts = events.filter((e) => e.tipe === "KELUAR").map((e) => e.waktu);
    return {
      checkIn: checkIns.length ? checkIns[0] : null,
      checkOut: checkOuts.length ? checkOuts[checkOuts.length - 1] : null,
    };
  };

  for (const employeeId of employeeIds) {
    const roster = rosterByEmployee.get(employeeId);
    const shiftName = roster?.shift.nama ?? null;
    const leave = leaveByEmployee.get(employeeId) ?? null;
    const dutyJenis = dutyByEmployee.get(employeeId) ?? null;
    const activeRoster =
      roster && roster.shift.isActive
        ? {
            shiftId: roster.shiftId,
            jamMasuk: roster.shift.jamMasuk,
            jamKeluar: roster.shift.jamKeluar,
            lintasHari: roster.shift.lintasHari,
            toleransiTelatMenit: roster.shift.toleransiTelatMenit,
          }
        : null;

    let calendarId: number | null = null;
    let sumberJadwal: string;
    let acuanId: string | null;
    if (activeRoster) {
      sumberJadwal = "ROSTER";
      acuanId = activeRoster.shiftId;
    } else {
      const assigned = assignmentByEmployee.get(employeeId);
      if (assigned !== undefined) {
        calendarId = assigned;
        sumberJadwal = "KALENDER";
        acuanId = String(assigned);
      } else if (defaultCalendar) {
        calendarId = defaultCalendar.id;
        sumberJadwal = "KALENDER_DEFAULT";
        acuanId = String(defaultCalendar.id);
      } else {
        rows.set(employeeId, { recap: null, shiftName, leaveName: leave?.nama ?? null, dutyJenis });
        continue;
      }
    }

    const recap = composeRecap(employeeId, day, {
      roster: activeRoster,
      schedule: calendarId !== null ? (scheduleByCalendar.get(calendarId) ?? null) : null,
      sumberJadwal,
      acuanId,
      holiday: calendarId !== null ? hariLiburKalender.has(calendarId) : hariLiburSemua,
      leave,
      duty: dutyJenis !== null ? { jenis: dutyJenis } : null,
      attendance: attendanceOf(employeeId, activeRoster?.lintasHari ?? false),
    });
    rows.set(employeeId, { recap, shiftName, leaveName: leave?.nama ?? null, dutyJenis });
  }

  return rows;
}

function recapData(result: RecapResult) {
	return {
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
	};
}

/** Kolom TIME PostgreSQL (@db.Time) dibaca sebagai epoch 1970 — bandingkan jamnya saja. */
function sameTime(stored: Date | null, computed: Date | null): boolean {
	if (!stored || !computed) return stored === computed;
	return fromTimeValue(stored) === fromTimeValue(computed);
}

function sameInstant(stored: Date | null, computed: Date | null): boolean {
	if (!stored || !computed) return stored === computed;
	return stored.getTime() === computed.getTime();
}

/** Baris `rekap_harian` yang sudah tersimpan (tanpa kolom metadata). */
type StoredRecap = {
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

function isSameRecap(stored: StoredRecap, computed: RecapResult): boolean {
	return (
		stored.sumberJadwal === computed.sumberJadwal &&
		stored.acuanId === computed.acuanId &&
		sameTime(stored.jamMasukSeharusnya, computed.jamMasukSeharusnya) &&
		sameTime(stored.jamKeluarSeharusnya, computed.jamKeluarSeharusnya) &&
		sameInstant(stored.masukAktual, computed.masukAktual) &&
		sameInstant(stored.keluarAktual, computed.keluarAktual) &&
		stored.telatMenit === computed.telatMenit &&
		stored.pulangCepatMenit === computed.pulangCepatMenit &&
		stored.lemburMenit === computed.lemburMenit &&
		stored.status === computed.status
	);
}

/**
 * Jalur tunggal: satu karyawan, satu hari. Memakai upsert atomik karena bisa
 * dipanggil bersamaan (endpoint absensi/home mobile).
 */
export async function calculateDailyRecap(employeeId: string, tanggal: Date): Promise<RecapResult | null> {
  const rows = await loadDayRows([employeeId], tanggal);
  const recap = rows.get(employeeId)?.recap ?? null;
  if (!recap) return null;
  await prisma.rekapHarian.upsert({
    where: { karyawanId_tanggal: { karyawanId: recap.karyawanId, tanggal: recap.tanggal } },
    update: recapData(recap),
    create: recapData(recap),
  });
  return recap;
}

/**
 * Jalur massal: satu hari untuk banyak karyawan. Dipakai tampilan tim/direktori
 * (300 karyawan) dan generator rekap per periode — dari ~8xN query menjadi ~8
 * query + satu operasi tulis, sehingga halaman tidak lagi berpuluh detik.
 */
export async function calculateDailyRecapBatch(
  employeeIds: string[],
  tanggal: Date,
): Promise<Map<string, DailyRecapRow>> {
  const rows = await loadDayRows(employeeIds, tanggal);
  const recaps = [...rows.values()].flatMap((row) => (row.recap ? [row.recap] : []));
  if (recaps.length === 0) return rows;

  const tanggalDb = recaps[0].tanggal;
  const existing = await prisma.rekapHarian.findMany({
    where: { tanggal: tanggalDb, karyawanId: { in: recaps.map((r) => r.karyawanId) } },
    select: {
      karyawanId: true,
      sumberJadwal: true,
      acuanId: true,
      jamMasukSeharusnya: true,
      jamKeluarSeharusnya: true,
      masukAktual: true,
      keluarAktual: true,
      telatMenit: true,
      pulangCepatMenit: true,
      lemburMenit: true,
      status: true,
    },
  });
  const stored = new Map(existing.map((e) => [e.karyawanId, e]));
  const baru = recaps.filter((r) => !stored.has(r.karyawanId));
  const berubah = recaps.filter((r) => {
    const current = stored.get(r.karyawanId);
    return current ? !isSameRecap(current, r) : false;
  });

  if (baru.length) await prisma.rekapHarian.createMany({ data: baru.map(recapData) });
  if (berubah.length) {
    await prisma.$transaction(
      berubah.map((r) => {
        const { karyawanId, tanggal: day, ...data } = recapData(r);
        return prisma.rekapHarian.update({ where: { karyawanId_tanggal: { karyawanId, tanggal: day } }, data });
      }),
    );
  }
  return rows;
}

export async function calculateRecapPeriod(employeeIds: string[], start: Date, end: Date): Promise<RecapResult[]> {
  const results: RecapResult[] = [];
  let cursor = toDbDate(start);
  const periodEnd = toDbDate(end);
  while (cursor <= periodEnd) {
    const rows = await calculateDailyRecapBatch(employeeIds, cursor);
    for (const employeeId of employeeIds) {
      const recap = rows.get(employeeId)?.recap;
      if (recap) results.push(recap);
    }
    cursor = addDays(cursor, 1);
  }
  return results;
}
