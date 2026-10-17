import { NextRequest } from "next/server";
import { getMySlip, getPayslip } from "@/src/modules/payroll/actions/payroll.actions";
import { fail, ok, requireApiSession, str } from "@/src/lib/api-v1";

/**
 * GET: daftar slip milik sendiri (hanya yang DITERBITKAN).
 * GET ?number=SLIP-... : detail slip milik sendiri.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const number = str(request.nextUrl.searchParams.get("number"));
  if (number) {
    const slip = await getPayslip(number, ctx.karyawanId);
    if (!slip) return fail("Slip tidak ditemukan.", 404);
    const { periode, ...rest } = slip;
    return ok({ slip: { ...rest, period: periode } });
  }

  const slips = await getMySlip(ctx.karyawanId);
  return ok({
    items: slips.map(({ number, periode, netPay }) => ({ number, period: periode, netPay })),
  });
}
