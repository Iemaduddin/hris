import { NextRequest } from "next/server";
import { cancelDuty, createDuty, listDuties, submitDuty } from "@/src/modules/duty/actions/duty.actions";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";

/**
 * GET: dinas/WFH sendiri. POST: draf {dutyType, startDate, endDate, location?, purpose?}.
 * PUT: {id, action: "submit" | "cancel"}.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const items = await listDuties({ employeeId: ctx.karyawanId });
  return ok({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const body = await readJson(request);
  const result = await createDuty({
    employeeId: ctx.karyawanId,
    dutyType: str(body?.["dutyType"]),
    startDate: str(body?.["startDate"]),
    endDate: str(body?.["endDate"]),
    location: str(body?.["location"]) || undefined,
    purpose: str(body?.["purpose"]) || undefined,
    attachment: str(body?.["attachment"]) || undefined,
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

  const own = await listDuties({ employeeId: ctx.karyawanId });
  if (!own.some((x) => x.id === id)) return fail("Pengajuan bukan milik Anda.", 403);

  if (action === "submit") {
    const result = await submitDuty(id);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  if (action === "cancel") {
    const result = await cancelDuty(id, false);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  return fail('Aksi tidak valid. Pilihan: "submit", "cancel".', 422);
}
