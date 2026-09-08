import { NextRequest } from "next/server";
import { getRekapBulanan } from "@/src/modules/recap/actions/recap.actions";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";

/**
 * Riwayat rekap kehadiran bulanan milik sendiri. Query: ?tahun=2026&bulan=10
 */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const params = request.nextUrl.searchParams;
	const now = new Date();
	const tahun = Number(params.get("tahun") ?? now.getFullYear());
	const bulan = Number(params.get("bulan") ?? now.getMonth() + 1);
	if (!tahun || bulan < 1 || bulan > 12) return fail("Parameter tahun/bulan tidak valid.", 422);

	const items = await getRekapBulanan(tahun, bulan, ctx.karyawanId);
	return ok({ tahun, bulan, items });
}
