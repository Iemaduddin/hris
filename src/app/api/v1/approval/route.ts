import { NextRequest } from "next/server";
import { getMyQueue, processSubmissionAction } from "@/src/modules/approval/actions/approval.actions";
import { TIPE_APPROVAL_MOBILE, type ReferensiType } from "@/src/modules/approval/lib/approval-engine";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";

/**
 * GET: antrean approval untuk user login (atasan/HR) — semua tipe yang
 * bisa diputusnya (otorisasi per tahap di engine).
 * POST: {type, id, decision: "SETUJU"|"TOLAK", note?} — P4-4 mobile.
 * Master/payroll tetap read-only: mobile tak punya layar kelola master.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);

  const queue = await getMyQueue(ctx.userId);
  return ok({ count: queue.length, items: queue });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);

  const body = await readJson(request);
  const type = str(body?.["type"]).toUpperCase();
  const id = str(body?.["id"]);
  const decision = str(body?.["decision"]).toUpperCase();

  if (!TIPE_APPROVAL_MOBILE.includes(type as ReferensiType)) {
    return fail(`type tidak valid (${TIPE_APPROVAL_MOBILE.join("/")}).`, 422);
  }
  if (!id) return fail("id wajib diisi.", 422);
  if (decision !== "SETUJU" && decision !== "TOLAK") {
    return fail('decision tidak valid (SETUJU/TOLAK).', 422);
  }

  const result = await processSubmissionAction(
    ctx.userId,
    type as ReferensiType,
    id,
    decision as "SETUJU" | "TOLAK",
    str(body?.["note"]) || undefined,
  );
  if (!result.success) return fail(result.message, 422);
  return ok({ message: result.message });
}
