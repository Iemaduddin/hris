import { NextRequest } from "next/server";
import prisma from "@/src/lib/prisma";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";
import { calculateDailyRecap } from "@/src/modules/recap/lib/recap-engine";

/**
 * Detail presensi satu hari untuk karyawan login (PRD mobile Bag. 5.3.C).
 * Query: ?date=YYYY-MM-DD (default hari ini).
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const raw = request.nextUrl.searchParams.get("date");
  const date = raw ? new Date(`${raw}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return fail("Parameter tanggal tidak valid.", 422);

  const rangeStart = new Date(date);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(date);
  rangeEnd.setHours(23, 59, 59, 999);

  const [recap, events] = await Promise.all([
    calculateDailyRecap(ctx.karyawanId, date),
    prisma.absensi.findMany({
      where: { karyawanId: ctx.karyawanId, waktu: { gte: rangeStart, lte: rangeEnd } },
      orderBy: { waktu: "asc" },
      select: {
        tipe: true,
        waktu: true,
        sumber: true,
        status: true,
        diLuarRadius: true,
        isMocked: true,
        catatan: true,
      },
    }),
  ]);

  return ok({
    // Ambil dari komponen lokal — `toISOString()` bisa mundur/semundur
    // satu hari karena local-midnight dikonversi ke UTC.
    date: `${rangeStart.getFullYear()}-${String(rangeStart.getMonth() + 1).padStart(2, "0")}-${String(
      rangeStart.getDate(),
    ).padStart(2, "0")}`,
    status: recap?.status ?? "TANPA_JADWAL",
    lateMinutes: recap?.telatMenit ?? null,
    earlyLeaveMinutes: recap?.pulangCepatMenit ?? null,
    overtimeMinutes: recap?.lemburMenit ?? null,
    actualCheckIn: recap?.masukAktual?.toISOString() ?? null,
    actualCheckOut: recap?.keluarAktual?.toISOString() ?? null,
    events: events.map((e) => ({
      eventType: e.tipe,
      time: e.waktu.toISOString(),
      source: e.sumber,
      status: e.status,
      isOutsideRadius: e.diLuarRadius,
      isMocked: e.isMocked,
      note: e.catatan,
    })),
  });
}
