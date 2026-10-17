import { NextRequest } from "next/server";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";
import {
  cancelReimbursement,
  createReimbursement,
  getMyReimbursements,
  submitReimbursement,
} from "@/src/modules/payroll/actions/reimbursement.actions";

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * GET: klaim sendiri. POST: draf {category, receiptDate, amount, description, attachmentUrl}.
 * PUT: {id, action: "submit" | "cancel"}.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const items = await getMyReimbursements(ctx.karyawanId);
  return ok({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const body = await readJson(request);
  const result = await createReimbursement(
    {
      employeeId: ctx.karyawanId,
      category: str(body?.["category"]).toUpperCase(),
      receiptDate: str(body?.["receiptDate"]),
      amount: num(body?.["amount"]),
      description: str(body?.["description"]),
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
    const result = action === "submit" ? await submitReimbursement(id, ctx.userId) : await cancelReimbursement(id, ctx.userId);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  return fail('Aksi tidak valid. Pilihan: "submit", "cancel".', 422);
}
