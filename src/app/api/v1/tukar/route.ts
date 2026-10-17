import { NextRequest } from "next/server";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";
import { processSubmissionAction } from "@/src/modules/approval/actions/approval.actions";
import { cancelSwap, createSwap, getMySwaps, getPartnerOptions, submitSwap } from "@/src/modules/roster/actions/tukar.actions";

/**
 * GET: tukar milik + masuk untuk saya. `?partner=1` → opsi pasangan.
 * POST: draf {partnerEmployeeId, date, reason}.
 * PUT: {id, action: "submit" | "cancel" | "approve" | "reject"}.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  if (request.nextUrl.searchParams.get("partner") === "1") {
    return ok({ items: await getPartnerOptions(ctx.karyawanId) });
  }
  const data = await getMySwaps(ctx.userId);
  return ok(data);
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const body = await readJson(request);
  const result = await createSwap(
    {
      partnerEmployeeId: str(body?.["partnerEmployeeId"]),
      date: str(body?.["date"]),
      reason: str(body?.["reason"]),
    },
    ctx.userId,
  );

  if (!result.success) return fail(result.message, 422);
  return ok({ id: result.id, message: result.message }, 201);
}

export async function PUT(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const body = await readJson(request);
  const id = str(body?.["id"]);
  const action = str(body?.["action"]);
  if (!id) return fail("id wajib diisi.", 422);

  if (action === "submit" || action === "cancel") {
    const result = action === "submit" ? await submitSwap(id, ctx.userId) : await cancelSwap(id, ctx.userId);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  if (action === "approve" || action === "reject") {
    const note = action === "reject" ? str(body?.["note"]) : undefined;
    if (action === "reject" && !note) return fail("Alasan penolakan wajib diisi.", 422);
    const result = await processSubmissionAction(
      ctx.userId,
      "TUKAR_SHIFT",
      id,
      action === "approve" ? "SETUJU" : "TOLAK",
      note,
    );
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  return fail('Aksi tidak valid. Pilihan: "submit", "cancel", "approve", "reject".', 422);
}
