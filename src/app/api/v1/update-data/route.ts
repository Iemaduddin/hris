import { NextRequest } from "next/server";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";
import {
  cancelDataUpdate,
  createDataUpdate,
  getMyDataUpdates,
  submitDataUpdate,
} from "@/src/modules/employee/actions/updatedata.actions";

import prisma from "@/src/lib/prisma";

/**
 * GET: usulan milik sendiri. `?family=1` → anggota keluarga (untuk targetId).
 * POST: draf {category, targetId?, newData, reason, attachmentUrl}.
 * PUT: {id, action: "submit" | "cancel"}.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  if (request.nextUrl.searchParams.get("family") === "1") {
    const rows = await prisma.keluargaKaryawan.findMany({
      where: { karyawanId: ctx.karyawanId },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, hubungan: true },
    });
    return ok({ items: rows.map((r) => ({ id: r.id, name: r.nama, relation: r.hubungan })) });
  }
  const items = await getMyDataUpdates(ctx.userId);
  return ok({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const body = await readJson(request);
  const raw = body?.["newData"];
  const result = await createDataUpdate(
    {
      category: str(body?.["category"]).toUpperCase(),
      targetId: str(body?.["targetId"]) || undefined,
      newData: (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>,
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
    const result = action === "submit" ? await submitDataUpdate(id, ctx.userId) : await cancelDataUpdate(id, ctx.userId);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  return fail('Aksi tidak valid. Pilihan: "submit", "cancel".', 422);
}
