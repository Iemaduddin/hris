import { NextRequest } from "next/server";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";
import { calculateDailyRecap } from "@/src/modules/recap/lib/recap-engine";
import { getMyRemainingBalance } from "@/src/modules/leave/actions/leave.actions";
import { getMySlip } from "@/src/modules/payroll/actions/payroll.actions";

/** Agregat beranda ESS (opsional, hemat round-trip; komposisi manual tetap bisa). */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const employeeId = ctx.karyawanId;
  const now = new Date();
  const year = now.getFullYear();

  const [recap, balance, slips, shift] = await Promise.all([
    calculateDailyRecap(employeeId, now),
    getMyRemainingBalance(employeeId, year),
    getMySlip(employeeId),
    prisma.rosterShift.findUnique({
      where: { karyawanId_tanggal: { karyawanId: employeeId, tanggal: toDbDate(now) } },
      select: { shift: { select: { kode: true, nama: true, jamMasuk: true, jamKeluar: true, lintasHari: true } } },
    }),
  ]);

  const [leave, overtime, duty] = await Promise.all([
    prisma.pengajuanKetidakhadiran.count({
      where: { karyawanId: employeeId, status: { in: ["DIAJUKAN", "MENUNGGU_APPROVAL"] } },
    }),
    prisma.lembur.count({ where: { karyawanId: employeeId, status: "DIAJUKAN" } }),
    prisma.dinasWFH.count({ where: { karyawanId: employeeId, status: { in: ["DIAJUKAN", "MENUNGGU_APPROVAL"] } } }),
  ]);

  return ok({
    presensi: recap
      ? {
          status: recap.status,
          lateMinutes: recap.telatMenit,
          actualCheckIn: recap.masukAktual?.toISOString() ?? null,
          actualCheckOut: recap.keluarAktual?.toISOString() ?? null,
        }
      : { status: "TANPA_JADWAL" },
    leaveBalance: balance,
    pendingRequests: { leave, overtime, duty, total: leave + overtime + duty },
    latestSlip: slips[0] ?? null,
    todayShift: shift?.shift
      ? {
          code: shift.shift.kode,
          name: shift.shift.nama,
          checkInTime: shift.shift.jamMasuk,
          checkOutTime: shift.shift.jamKeluar,
          overnight: shift.shift.lintasHari,
        }
      : null,
  });
}
