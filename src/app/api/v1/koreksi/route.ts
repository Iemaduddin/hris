import { NextRequest } from "next/server";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";
import { ajukanKoreksi, batalkanKoreksi, buatKoreksi, getKoreksiSaya } from "@/src/modules/attendance/actions/koreksi.actions";

/**
 * GET: koreksi milik sendiri. POST: draf {tanggal, tipe, jam, alasan, lampiranUrl}.
 * PUT: {id, aksi: "ajukan" | "batal"}.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const items = await getKoreksiSaya(ctx.userId);
  return ok({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const body = await readJson(request);
  const result = await buatKoreksi(
    {
      tanggal: str(body?.["tanggal"]),
      tipe: str(body?.["tipe"]).toUpperCase(),
      jam: str(body?.["jam"]),
      alasan: str(body?.["alasan"]),
      lampiranUrl: str(body?.["lampiranUrl"]),
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
  const aksi = str(body?.["aksi"]);
  if (!id) return fail("id wajib diisi.", 422);

  if (aksi === "ajukan" || aksi === "batal") {
    const result = aksi === "ajukan" ? await ajukanKoreksi(id, ctx.userId) : await batalkanKoreksi(id, ctx.userId);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  return fail('Aksi tidak valid. Pilihan: "ajukan", "batal".', 422);
}
