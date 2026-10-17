import { NextRequest } from "next/server";
import prisma from "@/src/lib/prisma";
import { decimalKeNumber } from "@/src/lib/decimal";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";

export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);

  const [user, karyawan] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { id: true, name: true, email: true, role: true, emailVerified: true },
    }),
    ctx.karyawanId
      ? prisma.karyawan.findUnique({
          where: { id: ctx.karyawanId },
          select: {
            id: true,
            nomorKaryawan: true,
            namaLengkap: true,
            status: true,
            dokumenKaryawan: {
              where: { jenisDokumen: "FOTO" },
              orderBy: { tanggalUnggah: "desc" },
              take: 1,
              select: { urlFile: true },
            },
            posisiKaryawan: {
              where: { isCurrent: true },
              take: 1,
              select: {
                posisi: { select: { nama: true } },
                unitOrganisasi: { select: { nama: true } },
                // Koordinat & radius dipakai app untuk pratinjau
                // validasi lokasi sebelum clock-in (PRD mobile Bag. 5.4).
                lokasiKerja: {
                  select: {
                    id: true,
                    nama: true,
                    latitude: true,
                    longitude: true,
                    radiusMeter: true,
                  },
                },
              },
            },
          },
        })
      : null,
  ]);

  return ok({
    user,
    employee: karyawan
      ? {
          id: karyawan.id,
          employeeNumber: karyawan.nomorKaryawan,
          fullName: karyawan.namaLengkap,
          status: karyawan.status,
          photoUrl: karyawan.dokumenKaryawan[0]?.urlFile ?? null,
          placements: karyawan.posisiKaryawan.map((p) => ({
            position: p.posisi ? { name: p.posisi.nama } : null,
            orgUnit: p.unitOrganisasi ? { name: p.unitOrganisasi.nama } : null,
            workLocation: p.lokasiKerja
              ? {
                  id: p.lokasiKerja.id,
                  name: p.lokasiKerja.nama,
                  latitude: decimalKeNumber(p.lokasiKerja.latitude),
                  longitude: decimalKeNumber(p.lokasiKerja.longitude),
                  radiusMeters: p.lokasiKerja.radiusMeter,
                }
              : null,
          })),
        }
      : null,
  });
}
