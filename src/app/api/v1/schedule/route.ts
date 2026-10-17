import { NextRequest } from "next/server";
import prisma from "@/src/lib/prisma";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";
import { dateOnlyInput } from "@/src/lib/time";

/**
 * GET: jadwal saya — roster + penugasan kalender + shift hari ini.
 * Query: ?start=YYYY-MM-DD&end=YYYY-MM-DD (default 7 hari ke depan).
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const params = request.nextUrl.searchParams;
  const today = new Date();
  const defaultEnd = new Date(today);
  defaultEnd.setDate(defaultEnd.getDate() + 7);

  const start = new Date(params.get("start") ?? today.toISOString().slice(0, 10));
  const end = new Date(params.get("end") ?? defaultEnd.toISOString().slice(0, 10));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return fail("Parameter tanggal tidak valid.", 422);
  }

  const [roster, assignments] = await Promise.all([
    prisma.rosterShift.findMany({
      where: { karyawanId: ctx.karyawanId, tanggal: { gte: start, lte: end } },
      orderBy: { tanggal: "asc" },
      include: { shift: { select: { kode: true, nama: true, jamMasuk: true, jamKeluar: true, lintasHari: true } } },
    }),
    prisma.penugasanKalender.findMany({
      where: { karyawanId: ctx.karyawanId },
      orderBy: { tanggalMulai: "desc" },
      take: 5,
      include: { kalenderKerja: { select: { nama: true } } },
    }),
  ]);

  const fmtTime = (d: Date | null) => {
    if (!d) return null;
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  return ok({
    roster: roster.map((r) => ({
      date: dateOnlyInput(r.tanggal),
      code: r.shift.kode,
      name: r.shift.nama,
      checkInTime: fmtTime(r.shift.jamMasuk),
      checkOutTime: fmtTime(r.shift.jamKeluar),
      overnight: r.shift.lintasHari,
    })),
    assignments: assignments.map((p) => ({
      calendar: p.kalenderKerja.nama,
      start: dateOnlyInput(p.tanggalMulai),
      end: p.tanggalSelesai ? dateOnlyInput(p.tanggalSelesai) : null,
    })),
  });
}
