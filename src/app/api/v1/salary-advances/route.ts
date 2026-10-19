import { NextRequest } from "next/server";
import { cancelSalaryAdvance, createSalaryAdvance, getMySalaryAdvances, submitSalaryAdvance } from "@/src/modules/payroll/actions/salary-advances.actions";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * GET: kasbon sendiri. POST: draf {amount, tenorMonths, deductionStart, reason}.
 * PUT: {id, action: "submit" | "cancel"}.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const items = await getMySalaryAdvances(ctx.karyawanId);
  return ok({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const body = await readJson(request);
  const result = await createSalaryAdvance({
    employeeId: ctx.karyawanId,
    amount: num(body?.["amount"]),
    tenorMonths: Math.floor(num(body?.["tenorMonths"])),
    deductionStart: str(body?.["deductionStart"]),
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

  if (action === "submit") {
    const result = await submitSalaryAdvance(id, ctx.karyawanId);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  if (action === "cancel") {
    const result = await cancelSalaryAdvance(id, ctx.karyawanId);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  return fail('Aksi tidak valid. Pilihan: "submit", "cancel".', 422);
}
