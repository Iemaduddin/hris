import { NextRequest } from "next/server";
import { getJenisCutiList } from "@/src/modules/leave/actions/leave.actions";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";

/**
 * GET /api/v1/leave/types — daftar jenis aktif untuk form pengajuan.
 */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);

	const items = (await getJenisCutiList()).filter((j) => j.isActive);
	return ok({ items });
}
