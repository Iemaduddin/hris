import { NextRequest } from "next/server";
import prisma from "@/src/lib/prisma";
import { fail, isHr, ok, requireApiSession, str } from "@/src/lib/api-v1";

/**
 * GET ?query=: direktori karyawan read-only (HR/admin), cari nama/nomor.
 * Hanya field non-sensitif — NIK/NPWP/bank/gaji tidak pernah ikut.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!isHr(ctx)) return fail("Khusus HR/admin.", 403);

  const query = str(request.nextUrl.searchParams.get("query")).trim();
  const rows = await prisma.karyawan.findMany({
    where: {
      status: { in: ["AKTIF", "PROBASI"] },
      ...(query
        ? {
            OR: [
              { namaLengkap: { contains: query, mode: "insensitive" as const } },
              { nomorKaryawan: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { namaLengkap: "asc" },
    take: 50,
    select: {
      id: true,
      nomorKaryawan: true,
      namaLengkap: true,
      telepon: true,
      email: true,
      status: true,
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

  return ok({
    query,
    count: rows.length,
    items: rows.map((r) => {
      const placement = r.posisiKaryawan[0] ?? null;
      return {
        id: r.id,
        employeeNumber: r.nomorKaryawan,
        fullName: r.namaLengkap,
        status: r.status,
        phone: r.telepon,
        email: r.email,
        positionName: placement?.posisi?.nama ?? null,
        unitName: placement?.unitOrganisasi?.nama ?? null,
      };
    }),
  });
}
