import { NextRequest } from "next/server";
import {
	ajukanCuti,
	batalCuti,
	buatPengajuanCuti,
	getPengajuanCuti,
} from "@/src/modules/leave/actions/leave.actions";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";

/**
 * GET: daftar pengajuan sendiri (+ ?status=).
 * POST: buat draf {jenisId, mulai, selesai, alasan?, alamat?, telpDarurat?, lampiran?}.
 */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const status = request.nextUrl.searchParams.get("status") ?? undefined;
	const items = await getPengajuanCuti({ karyawanId: ctx.karyawanId, status });
	return ok({ items });
}

export async function POST(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const body = await readJson(request);
	const jenisId = Number(body?.["jenisId"]);
	if (!jenisId) return fail("jenisId wajib diisi.", 422);

	const result = await buatPengajuanCuti({
		karyawanId: ctx.karyawanId,
		jenisId,
		mulai: str(body?.["mulai"]),
		selesai: str(body?.["selesai"]),
		alasan: str(body?.["alasan"]) || undefined,
		alamat: str(body?.["alamat"]) || undefined,
		telpDarurat: str(body?.["telpDarurat"]) || undefined,
		lampiran: str(body?.["lampiran"]) || undefined,
	});

	if (!result.success) return fail(result.message, 422);
	return ok({ id: result.id, message: result.message }, 201);
}

/**
 * PUT /api/v1/leave {id, aksi: "ajukan" | "batal"}.
 */
export async function PUT(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const body = await readJson(request);
	const id = str(body?.["id"]);
	const aksi = str(body?.["aksi"]);
	if (!id) return fail("id wajib diisi.", 422);

	const own = await getPengajuanCuti({ karyawanId: ctx.karyawanId });
	if (!own.some((x) => x.id === id)) return fail("Pengajuan bukan milik Anda.", 403);

	if (aksi === "ajukan") {
		const result = await ajukanCuti(id);
		if (!result.success) return fail(result.message, 422);
		return ok({ message: result.message });
	}
	if (aksi === "batal") {
		const result = await batalCuti(id, false);
		if (!result.success) return fail(result.message, 422);
		return ok({ message: result.message });
	}
	return fail('Aksi tidak valid. Pilihan: "ajukan", "batal".', 422);
}
