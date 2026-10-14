"use server";

import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { hitungRekapHarian } from "@/src/modules/recap/lib/recap-engine";

export type AnggotaTimHari = {
  karyawanId: string;
  nama: string;
  nomorKaryawan: string;
  status: string;
  shift: string | null;
  info: string | null;
};

/** Status tim pada tanggal: rekap + shift + cuti/dinas disetujui yang mencakup tanggal. */
export async function getTimHariIni(userId: string, tanggalIso: string): Promise<AnggotaTimHari[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const saya = await prisma.karyawan.findFirst({ where: { userId }, select: { id: true } });
  const isHr = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_HR";
  if (!isHr && user?.role !== "MANAJER") return [];
  if (!isHr && !saya) return [];

  const tgl = toDbDate(tanggalIso);
  if (Number.isNaN(tgl.getTime())) return [];

  const anggota = await prisma.karyawan.findMany({
    where: {
      status: { in: ["AKTIF", "PROBASI"] },
      ...(!isHr && saya ? { atasanLangsungId: saya.id } : {}),
    },
    orderBy: { namaLengkap: "asc" },
    select: { id: true, namaLengkap: true, nomorKaryawan: true },
  });

  const hasil: AnggotaTimHari[] = [];
  for (const a of anggota) {
    const [rekap, roster, cuti, dinas] = await Promise.all([
      hitungRekapHarian(a.id, tgl),
      prisma.rosterShift.findUnique({
        where: { karyawanId_tanggal: { karyawanId: a.id, tanggal: tgl } },
        select: { shift: { select: { nama: true } } },
      }),
      prisma.pengajuanKetidakhadiran.findFirst({
        where: {
          karyawanId: a.id,
          status: "DISETUJUI",
          tanggalMulai: { lte: new Date(tgl.getTime() + 86_400_000 - 1) },
          tanggalSelesai: { gte: tgl },
        },
        select: { jenisKetidakhadiran: { select: { nama: true } } },
      }),
      prisma.dinasWFH.findFirst({
        where: {
          karyawanId: a.id,
          status: "DISETUJUI",
          tanggalMulai: { lte: tgl },
          tanggalSelesai: { gte: tgl },
        },
        select: { jenis: true },
      }),
    ]);
    hasil.push({
      karyawanId: a.id,
      nama: a.namaLengkap,
      nomorKaryawan: a.nomorKaryawan,
      status: rekap?.status.replaceAll("_", " ") ?? "-",
      shift: roster?.shift.nama ?? null,
      info: cuti?.jenisKetidakhadiran.nama ?? (dinas ? (dinas.jenis === "DINAS_LUAR" ? "Dinas Luar" : "WFH") : null),
    });
  }
  return hasil;
}
