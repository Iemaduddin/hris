import { NextRequest } from "next/server";
import { getMonthlyRecap } from "@/src/modules/recap/actions/recap.actions";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";

/**
 * Riwayat rekap kehadiran bulanan milik sendiri. Query: ?year=2026&month=10
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const params = request.nextUrl.searchParams;
  const now = new Date();
  const year = Number(params.get("year") ?? now.getFullYear());
  const month = Number(params.get("month") ?? now.getMonth() + 1);
  if (!year || month < 1 || month > 12) return fail("Parameter year/month tidak valid.", 422);

  const items = await getMonthlyRecap(year, month, ctx.karyawanId);
  return ok({ year, month, items });
}
