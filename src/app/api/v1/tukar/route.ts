import { NextRequest } from "next/server";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";
import { prosesPengajuanAction } from "@/src/modules/approval/actions/approval.actions";
import { ajukanTukar, batalkanTukar, buatTukar, getPasanganOptions, getTukarSaya } from "@/src/modules/roster/actions/tukar.actions";

/**
 * GET: tukar milik + masuk untuk saya. `?pasangan=1` → opsi pasangan.
 * POST: draf {pasanganKaryawanId, tanggal, alasan}.
 * PUT: {id, aksi: "ajukan" | "batal" | "setuju" | "tolak"}.
 */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	if (request.nextUrl.searchParams.get("pasangan") === "1") {
		return ok({ items: await getPasanganOptions(ctx.karyawanId) });
	}
	const data = await getTukarSaya(ctx.userId);
	return ok(data);
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const body = await readJson(request);
  const result = await buatTukar(
    {
      pasanganKaryawanId: str(body?.["pasanganKaryawanId"]),
      tanggal: str(body?.["tanggal"]),
      alasan: str(body?.["alasan"]),
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
    const result = aksi === "ajukan" ? await ajukanTukar(id, ctx.userId) : await batalkanTukar(id, ctx.userId);
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  if (aksi === "setuju" || aksi === "tolak") {
    const catatan = aksi === "tolak" ? str(body?.["catatan"]) : undefined;
    if (aksi === "tolak" && !catatan) return fail("Alasan penolakan wajib diisi.", 422);
    const result = await prosesPengajuanAction(
      ctx.userId,
      "TUKAR_SHIFT",
      id,
      aksi === "setuju" ? "SETUJU" : "TOLAK",
      catatan,
    );
    if (!result.success) return fail(result.message, 422);
    return ok({ message: result.message });
  }
  return fail('Aksi tidak valid. Pilihan: "ajukan", "batal", "setuju", "tolak".', 422);
}
