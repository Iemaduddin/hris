import { NextRequest } from "next/server";
import { getPayslip, getSlipSaya } from "@/src/modules/payroll/actions/payroll.actions";
import { fail, ok, requireApiSession, str } from "@/src/lib/api-v1";

/**
 * GET: daftar slip milik sendiri (hanya yang DITERBITKAN).
 * GET ?nomor=SLIP-... : detail slip milik sendiri.
 */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const nomor = str(request.nextUrl.searchParams.get("nomor"));
	if (nomor) {
		const slip = await getPayslip(nomor, ctx.karyawanId);
		if (!slip) return fail("Slip tidak ditemukan.", 404);
		return ok({ slip });
	}

	const slips = await getSlipSaya(ctx.karyawanId);
	return ok({ items: slips });
}
