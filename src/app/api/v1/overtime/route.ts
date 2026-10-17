import { NextRequest } from "next/server";
import { cancelOvertime, createOvertime, listOvertime, submitOvertime } from "@/src/modules/overtime/actions/overtime.actions";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";

/**
 * GET: lembur sendiri. POST: draf {date, startTime, endTime, reason}.
 * PUT: {id, action: "submit" | "cancel"}.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const items = await listOvertime({ employeeId: ctx.karyawanId });
  return ok({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const body = await readJson(request);
  const result = await createOvertime({
    employeeId: ctx.karyawanId,
    date: str(body?.["date"]),
    startTime: str(body?.["startTime"]),
    endTime: str(body?.["endTime"]),
    reason: str(body?.["reason"]),
  });

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

  const own = await listOvertime({ employeeId: ctx.karyawanId });
  if (!own.some((x) => x.id === id)) return fail("Pengajuan bukan milik Anda.", 403);

  if (action === "submit") {
    const result = await submitOvertime(id);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  if (action === "cancel") {
    const result = await cancelOvertime(id);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  return fail('Aksi tidak valid. Pilihan: "submit", "cancel".', 422);
}
