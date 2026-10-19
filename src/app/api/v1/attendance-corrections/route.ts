import { NextRequest } from "next/server";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";
import { cancelCorrection, createCorrection, getMyCorrections, submitCorrection } from "@/src/modules/attendance/actions/corrections.actions";

/**
 * GET: koreksi milik sendiri. POST: draf {date, eventType, time, reason, attachmentUrl}.
 * PUT: {id, action: "submit" | "cancel"}.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const items = await getMyCorrections(ctx.userId);
  return ok({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const body = await readJson(request);
  const result = await createCorrection(
    {
      date: str(body?.["date"]),
      eventType: str(body?.["eventType"]).toUpperCase(),
      time: str(body?.["time"]),
      reason: str(body?.["reason"]),
      attachmentUrl: str(body?.["attachmentUrl"]),
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
    const result = action === "submit" ? await submitCorrection(id, ctx.userId) : await cancelCorrection(id, ctx.userId);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  return fail('Aksi tidak valid. Pilihan: "submit", "cancel".', 422);
}
