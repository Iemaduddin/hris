import { NextRequest } from "next/server";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";
import {
  ajukanReimburse,
  batalkanReimburse,
  buatReimburse,
  getReimburseSaya,
} from "@/src/modules/payroll/actions/reimbursement.actions";

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * GET: klaim sendiri. POST: draf {kategori, tanggalKwitansi, nominal, keterangan, lampiranUrl}.
 * PUT: {id, aksi: "ajukan" | "batal"}.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const items = await getReimburseSaya(ctx.karyawanId);
  return ok({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const body = await readJson(request);
  const result = await buatReimburse(
    {
      karyawanId: ctx.karyawanId,
      kategori: str(body?.["kategori"]).toUpperCase(),
      tanggalKwitansi: str(body?.["tanggalKwitansi"]),
      nominal: num(body?.["nominal"]),
      keterangan: str(body?.["keterangan"]),
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
    const result = aksi === "ajukan" ? await ajukanReimburse(id, ctx.userId) : await batalkanReimburse(id, ctx.userId);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  return fail('Aksi tidak valid. Pilihan: "ajukan", "batal".', 422);
}
