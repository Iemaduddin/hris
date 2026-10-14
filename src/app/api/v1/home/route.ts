import { NextRequest } from "next/server";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";
import { hitungRekapHarian } from "@/src/modules/recap/lib/recap-engine";
import { getSisaSaldoSaya } from "@/src/modules/leave/actions/leave.actions";
import { getSlipSaya } from "@/src/modules/payroll/actions/payroll.actions";

/** Agregat beranda ESS (opsional, hemat round-trip; komposisi manual tetap bisa). */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const karyawanId = ctx.karyawanId;
  const kini = new Date();
  const tahun = kini.getFullYear();

  const [rekap, saldo, slips, shift] = await Promise.all([
    hitungRekapHarian(karyawanId, kini),
    getSisaSaldoSaya(karyawanId, tahun),
    getSlipSaya(karyawanId),
    prisma.rosterShift.findUnique({
      where: { karyawanId_tanggal: { karyawanId, tanggal: toDbDate(kini) } },
      select: { shift: { select: { kode: true, nama: true, jamMasuk: true, jamKeluar: true, lintasHari: true } } },
    }),
  ]);

  const [cuti, lembur, dinas] = await Promise.all([
    prisma.pengajuanKetidakhadiran.count({
      where: { karyawanId, status: { in: ["DIAJUKAN", "MENUNGGU_APPROVAL"] } },
    }),
    prisma.lembur.count({ where: { karyawanId, status: "DIAJUKAN" } }),
    prisma.dinasWFH.count({ where: { karyawanId, status: { in: ["DIAJUKAN", "MENUNGGU_APPROVAL"] } } }),
  ]);

  return ok({
    presensi: rekap
      ? {
          status: rekap.status,
          telatMenit: rekap.telatMenit,
          masukAktual: rekap.masukAktual?.toISOString() ?? null,
          keluarAktual: rekap.keluarAktual?.toISOString() ?? null,
        }
      : { status: "TANPA_JADWAL" },
    saldoCuti: saldo,
    pengajuanBerjalan: { cuti, lembur, dinas, total: cuti + lembur + dinas },
    slipTerakhir: slips[0] ?? null,
    shiftHariIni: shift?.shift
      ? {
          kode: shift.shift.kode,
          nama: shift.shift.nama,
          jamMasuk: shift.shift.jamMasuk,
          jamKeluar: shift.shift.jamKeluar,
          lintasHari: shift.shift.lintasHari,
        }
      : null,
  });
}
