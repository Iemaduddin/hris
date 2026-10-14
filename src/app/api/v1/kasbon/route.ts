import { NextRequest } from "next/server";
import { ajukanKasbon, batalkanKasbon, buatKasbon, getKasbonSaya } from "@/src/modules/payroll/actions/kasbon.actions";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * GET: kasbon sendiri. POST: draf {nominal, tenorBulan, mulaiPotong, alasan}.
 * PUT: {id, aksi: "ajukan" | "batal"}.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const items = await getKasbonSaya(ctx.karyawanId);
  return ok({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const body = await readJson(request);
  const result = await buatKasbon({
    karyawanId: ctx.karyawanId,
    nominal: num(body?.["nominal"]),
    tenorBulan: Math.floor(num(body?.["tenorBulan"])),
    mulaiPotong: str(body?.["mulaiPotong"]),
    alasan: str(body?.["alasan"]),
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
  const aksi = str(body?.["aksi"]);
  if (!id) return fail("id wajib diisi.", 422);

  if (aksi === "ajukan") {
    const result = await ajukanKasbon(id, ctx.karyawanId);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  if (aksi === "batal") {
    const result = await batalkanKasbon(id, ctx.karyawanId);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  return fail('Aksi tidak valid. Pilihan: "ajukan", "batal".', 422);
}
