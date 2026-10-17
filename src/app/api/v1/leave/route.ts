import { NextRequest } from "next/server";
import {
  cancelLeave,
  createLeaveRequest,
  listLeaveRequests,
  submitLeave,
} from "@/src/modules/leave/actions/leave.actions";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";

/**
 * GET: daftar pengajuan sendiri (+ ?status=).
 * POST: buat draf {leaveTypeId, startDate, endDate, reason?, address?, emergencyPhone?, attachment?}.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const items = await listLeaveRequests({ employeeId: ctx.karyawanId, status });
  return ok({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const body = await readJson(request);
  const leaveTypeId = Number(body?.["leaveTypeId"]);
  if (!leaveTypeId) return fail("leaveTypeId wajib diisi.", 422);

  const result = await createLeaveRequest({
    employeeId: ctx.karyawanId,
    leaveTypeId,
    startDate: str(body?.["startDate"]),
    endDate: str(body?.["endDate"]),
    reason: str(body?.["reason"]) || undefined,
    address: str(body?.["address"]) || undefined,
    emergencyPhone: str(body?.["emergencyPhone"]) || undefined,
    attachment: str(body?.["attachment"]) || undefined,
  });

  if (!result.success) return fail(result.message, 422);
  return ok({ id: result.id, message: result.message }, 201);
}

/**
 * PUT /api/v1/leave {id, action: "submit" | "cancel"}.
 */
export async function PUT(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const body = await readJson(request);
  const id = str(body?.["id"]);
  const action = str(body?.["action"]);
  if (!id) return fail("id wajib diisi.", 422);

  const own = await listLeaveRequests({ employeeId: ctx.karyawanId });
  if (!own.some((x) => x.id === id)) return fail("Pengajuan bukan milik Anda.", 403);

  if (action === "submit") {
    const result = await submitLeave(id);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  if (action === "cancel") {
    const result = await cancelLeave(id, false);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  return fail('Aksi tidak valid. Pilihan: "submit", "cancel".', 422);
}
