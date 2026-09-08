import { NextRequest } from "next/server";
import { getAntrianSaya, prosesPengajuanAction } from "@/src/modules/approval/actions/approval.actions";
import type { ReferensiType } from "@/src/modules/approval/lib/approval-engine";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";

const TIPE_VALID = ["CUTI", "LEMBUR", "DINAS"];

/**
 * GET: antrean approval untuk user login (atasan/HR).
 * POST: {type, id, keputusan: "SETUJU"|"TOLAK", catatan?}.
 */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);

	const antrian = await getAntrianSaya(ctx.userId);
	return ok({ count: antrian.length, items: antrian });
}

export async function POST(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);

	const body = await readJson(request);
	const type = str(body?.["type"]).toUpperCase();
	const id = str(body?.["id"]);
	const keputusan = str(body?.["keputusan"]).toUpperCase();

	if (!TIPE_VALID.includes(type)) return fail("type tidak valid (CUTI/LEMBUR/DINAS).", 422);
	if (!id) return fail("id wajib diisi.", 422);
	if (keputusan !== "SETUJU" && keputusan !== "TOLAK") {
		return fail('keputusan tidak valid (SETUJU/TOLAK).', 422);
	}

	const result = await prosesPengajuanAction(
		ctx.userId,
		type as ReferensiType,
		id,
		keputusan as "SETUJU" | "TOLAK",
		str(body?.["catatan"]) || undefined,
	);
	if (!result.success) return fail(result.message, 422);
	return ok({ message: result.message });
}
