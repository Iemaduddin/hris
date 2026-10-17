import prisma from "@/src/lib/prisma";
import type { HariDalamMinggu } from "@/generated/prisma/client";
import { toDbDate } from "@/src/lib/time";

/**
 * Count request days: inclusive, minus non-working days
 * + holidays (including joint leave — auto-excluded from balance).
 * calendarId optional: the employee's assignment calendar; without it the
 * default calendar is used, with no default calendar falls back to calendar days.
 */
export async function countRequestDays(start: Date, end: Date, calendarId?: number | null): Promise<number> {
  const rangeStart = toDbDate(start);
  const rangeEnd = toDbDate(end);
  if (rangeEnd < rangeStart) return 0;

  const calendar = calendarId
    ? await prisma.kalenderKerja.findUnique({
        where: { id: calendarId },
        include: {
          jadwalKerja: { select: { hari: true, isHariKerja: true } },
          hariLibur: { select: { tanggal: true } },
        },
      })
    : await prisma.kalenderKerja.findFirst({
        where: { isDefault: true, isActive: true },
        include: {
          jadwalKerja: { select: { hari: true, isHariKerja: true } },
          hariLibur: { select: { tanggal: true } },
        },
      });

  const WEEKDAYS = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"] as HariDalamMinggu[];
  const holidaySet = new Set((calendar?.hariLibur ?? []).map((h) => toDbDate(h.tanggal).getTime()));
  const workMap = new Map((calendar?.jadwalKerja ?? []).map((j) => [j.hari, j.isHariKerja]));

  let count = 0;
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    const key = toDbDate(cursor).getTime();
    if (!holidaySet.has(key)) {
      if (!calendar) {
        count++;
      } else {
        const weekday = WEEKDAYS[cursor.getUTCDay()];
        if (workMap.get(weekday) !== false) count++;
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

export async function getBalance(employeeId: string, leaveTypeId: number, year: number) {
  return prisma.saldoCuti.findUnique({
    where: { karyawanId_jenisKetidakhadiranId_tahun: { karyawanId: employeeId, jenisKetidakhadiranId: leaveTypeId, tahun: year } },
  });
}

export async function generateAnnualBalances(year: number): Promise<{ created: number; skipped: number }> {
  const [employees, leaveTypes] = await Promise.all([
    prisma.karyawan.findMany({
      where: { status: { in: ["AKTIF", "PROBASI"] } },
      select: { id: true },
    }),
    prisma.jenisKetidakhadiran.findMany({
      where: { menggunakanSaldo: true, isActive: true },
      select: { id: true, jatahTahunan: true },
    }),
  ]);

  let created = 0;
  let skipped = 0;
  for (const e of employees) {
    for (const t of leaveTypes) {
      const existing = await prisma.saldoCuti.findUnique({
        where: { karyawanId_jenisKetidakhadiranId_tahun: { karyawanId: e.id, jenisKetidakhadiranId: t.id, tahun: year } },
      });
      if (existing) {
        skipped++;
        continue;
      }
      const quota = t.jatahTahunan ?? 0;
      const balance = await prisma.saldoCuti.create({
        data: { karyawanId: e.id, jenisKetidakhadiranId: t.id, tahun: year, saldoAwal: quota, saldoAkhir: quota },
      });
      await prisma.mutasiSaldoCuti.create({
        data: { saldoCutiId: balance.id, tipe: "PENAMBAHAN", jumlah: quota, keterangan: `Jatah tahunan ${year}` },
      });
      created++;
    }
  }
  return { created, skipped };
}

export async function deductBalance(
  employeeId: string,
  leaveTypeId: number,
  year: number,
  amount: number,
  referenceId: string,
  note: string,
): Promise<{ success: boolean; message: string }> {
  const balance = await getBalance(employeeId, leaveTypeId, year);
  if (!balance) return { success: false, message: "Saldo cuti tahun berjalan belum dibuat. Minta HR generate saldo." };
  if (Number(balance.saldoAkhir) < amount) {
    return { success: false, message: `Saldo tidak cukup (sisa ${balance.saldoAkhir}, butuh ${amount}).` };
  }
  await prisma.$transaction(async (tx) => {
    await tx.mutasiSaldoCuti.create({
      data: { saldoCutiId: balance.id, tipe: "PENGURANGAN", jumlah: amount, referensiId: referenceId, keterangan: note },
    });
    await tx.saldoCuti.update({
      where: { id: balance.id },
      data: { saldoAkhir: Number(balance.saldoAkhir) - amount },
    });
  });
  return { success: true, message: "Saldo terpotong." };
}

export async function refundBalance(
  employeeId: string,
  leaveTypeId: number,
  year: number,
  amount: number,
  referenceId: string,
  note: string,
): Promise<void> {
  const balance = await getBalance(employeeId, leaveTypeId, year);
  if (!balance) return;
  await prisma.$transaction(async (tx) => {
    await tx.mutasiSaldoCuti.create({
      data: { saldoCutiId: balance.id, tipe: "PENAMBAHAN", jumlah: amount, referensiId: referenceId, keterangan: note },
    });
    await tx.saldoCuti.update({
      where: { id: balance.id },
      data: { saldoAkhir: Number(balance.saldoAkhir) + amount },
    });
  });
}
