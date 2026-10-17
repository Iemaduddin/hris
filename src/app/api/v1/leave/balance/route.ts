import { NextRequest } from "next/server";
import { listLeaveBalances } from "@/src/modules/leave/actions/leave.actions";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";

/**
 * GET /api/v1/leave/balance?year=2026 — sisa saldo milik sendiri.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const year = Number(request.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  const balance = await listLeaveBalances(year, ctx.karyawanId);
  return ok({ year, balance });
}
