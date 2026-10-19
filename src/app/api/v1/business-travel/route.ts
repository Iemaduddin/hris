import { NextRequest } from "next/server";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";
import {
  cancelBusinessTravel,
  createBusinessTravel,
  getApprovedDutyOptions,
  getMyBusinessTravel,
  submitLpj,
  submitBusinessTravel,
} from "@/src/modules/payroll/actions/business-travel.actions";

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * GET: uang muka dinas sendiri. `?duty=1` → opsi dinas DISETUJUI tanpa uang muka.
 * POST: draf {dutyId, advanceAmount, purpose}.
 * PUT: {id, action: "submit" | "cancel" | "report", actualTotal?, attachmentUrl?}.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  if (request.nextUrl.searchParams.get("duty") === "1") {
    return ok({ items: await getApprovedDutyOptions(ctx.karyawanId) });
  }
  const items = await getMyBusinessTravel(ctx.karyawanId);
  return ok({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const body = await readJson(request);
  const result = await createBusinessTravel(
    {
      dutyId: str(body?.["dutyId"]),
      employeeId: ctx.karyawanId,
      advanceAmount: num(body?.["advanceAmount"]),
      purpose: str(body?.["purpose"]),
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

  if (action === "submit") {
    const result = await submitBusinessTravel(id, ctx.userId);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  if (action === "cancel") {
    const result = await cancelBusinessTravel(id, ctx.userId);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  if (action === "report") {
    const result = await submitLpj(
      id,
      { actualTotal: num(body?.["actualTotal"]), attachmentUrl: str(body?.["attachmentUrl"]) },
      ctx.userId,
    );
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  return fail('Aksi tidak valid. Pilihan: "submit", "cancel", "report".', 422);
}
