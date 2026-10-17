import { NextRequest } from "next/server";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";
import { getMyOnboarding, getOnboardingDetail, toggleChecklistItem } from "@/src/modules/employee/actions/onboarding.actions";

/**
 * GET: checklist onboarding milik sendiri (opsional ?id= untuk detail).
 * PUT: {itemId, action: "done" | "undo"} — centang mandiri.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const id = str(request.nextUrl.searchParams.get("id"));
  if (id) {
    const detail = await getOnboardingDetail(id, ctx.userId);
    if (!detail || detail.employeeId !== ctx.karyawanId) return fail("Data tidak ditemukan.", 404);
    return ok({ onboarding: detail });
  }

  const items = await getMyOnboarding(ctx.karyawanId);
  return ok({ items });
}

export async function PUT(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const body = await readJson(request);
  const itemId = str(body?.["itemId"]);
  const action = str(body?.["action"]);
  if (!itemId) return fail("itemId wajib diisi.", 422);

  if (action === "done" || action === "undo") {
    const result = await toggleChecklistItem(itemId, action === "done", ctx.userId);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  return fail('Aksi tidak valid. Pilihan: "done", "undo".', 422);
}
