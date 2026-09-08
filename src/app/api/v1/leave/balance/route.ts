import { NextRequest } from "next/server";
import { getSaldoCutiList } from "@/src/modules/leave/actions/leave.actions";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";

/**
 * GET /api/v1/leave/balance?tahun=2026 — sisa saldo milik sendiri.
 */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const tahun = Number(request.nextUrl.searchParams.get("tahun") ?? new Date().getFullYear());
	const saldo = await getSaldoCutiList(tahun, ctx.karyawanId);
	return ok({ tahun, saldo });
}
