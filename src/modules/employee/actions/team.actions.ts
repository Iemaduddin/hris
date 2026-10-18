"use server";

import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { calculateDailyRecap } from "@/src/modules/recap/lib/recap-engine";

export type TeamDayMember = {
  employeeId: string;
  name: string;
  employeeNumber: string;
  status: string;
  shift: string | null;
  info: string | null;
};

/** Status tim pada tanggal: rekap + shift + cuti/dinas disetujui yang mencakup tanggal. */
export async function getTodayTeam(userId: string, dateIso: string): Promise<TeamDayMember[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const me = await prisma.karyawan.findFirst({ where: { userId }, select: { id: true } });
  const isHr = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_HR";
  if (!isHr && user?.role !== "MANAJER") return [];
  if (!isHr && !me) return [];

  const date = toDbDate(dateIso);
  if (Number.isNaN(date.getTime())) return [];

  const members = await prisma.karyawan.findMany({
    where: {
      status: { in: ["AKTIF", "PROBASI"] },
      ...(!isHr && me ? { atasanLangsungId: me.id } : {}),
    },
    orderBy: { namaLengkap: "asc" },
    select: { id: true, namaLengkap: true, nomorKaryawan: true },
  });

  const result: TeamDayMember[] = [];
  for (const m of members) {
    const [recap, roster, leave, duty] = await Promise.all([
      calculateDailyRecap(m.id, date),
      prisma.rosterShift.findUnique({
        where: { karyawanId_tanggal: { karyawanId: m.id, tanggal: date } },
        select: { shift: { select: { nama: true } } },
      }),
      prisma.pengajuanKetidakhadiran.findFirst({
        where: {
          karyawanId: m.id,
          status: "DISETUJUI",
          tanggalMulai: { lte: new Date(date.getTime() + 86_400_000 - 1) },
          tanggalSelesai: { gte: date },
        },
        select: { jenisKetidakhadiran: { select: { nama: true } } },
      }),
      prisma.dinasWFH.findFirst({
        where: {
          karyawanId: m.id,
          status: "DISETUJUI",
          tanggalMulai: { lte: date },
          tanggalSelesai: { gte: date },
        },
        select: { jenis: true },
      }),
    ]);
    result.push({
      employeeId: m.id,
      name: m.namaLengkap,
      employeeNumber: m.nomorKaryawan,
      status: recap?.status.replaceAll("_", " ") ?? "-",
      shift: roster?.shift.nama ?? null,
      info: leave?.jenisKetidakhadiran.nama ?? (duty ? (duty.jenis === "DINAS_LUAR" ? "Dinas Luar" : "WFH") : null),
    });
  }
  return result;
}

export type TeamOverviewMember = TeamDayMember & {
  phone: string | null;
  email: string | null;
  positionName: string | null;
  unitName: string | null;
};

/** Direktori tim: status hari ini + kontak & penempatan (non-sensitif). */
export async function getTeamOverview(userId: string, dateIso: string): Promise<TeamOverviewMember[]> {
  const day = await getTodayTeam(userId, dateIso);
  if (day.length === 0) return [];

  const rows = await prisma.karyawan.findMany({
    where: { id: { in: day.map((m) => m.employeeId) } },
    select: {
      id: true,
      telepon: true,
      email: true,
      posisiKaryawan: {
        where: { isCurrent: true },
        take: 1,
        select: {
          posisi: { select: { nama: true } },
          unitOrganisasi: { select: { nama: true } },
        },
      },
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return day.map((m) => {
    const row = byId.get(m.employeeId);
    const placement = row?.posisiKaryawan[0] ?? null;
    return {
      ...m,
      phone: row?.telepon ?? null,
      email: row?.email ?? null,
      positionName: placement?.posisi?.nama ?? null,
      unitName: placement?.unitOrganisasi?.nama ?? null,
    };
  });
}
