import { NextRequest } from "next/server";
import { ajukanLembur, batalLembur, buatLembur, getLemburList } from "@/src/modules/overtime/actions/overtime.actions";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";

/**
 * GET: lembur sendiri. POST: draf {tanggal, jamMulai, jamSelesai, alasan}.
 * PUT: {id, aksi: "ajukan" | "batal"}.
 */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const items = await getLemburList({ karyawanId: ctx.karyawanId });
	return ok({ items });
}

export async function POST(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const body = await readJson(request);
	const result = await buatLembur({
		karyawanId: ctx.karyawanId,
		tanggal: str(body?.["tanggal"]),
		jamMulai: str(body?.["jamMulai"]),
		jamSelesai: str(body?.["jamSelesai"]),
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

	const own = await getLemburList({ karyawanId: ctx.karyawanId });
	if (!own.some((x) => x.id === id)) return fail("Pengajuan bukan milik Anda.", 403);

	if (aksi === "ajukan") {
		const result = await ajukanLembur(id);
		if (!result.success) return fail(result.message, 422);
		return ok({ message: result.message });
	}
	if (aksi === "batal") {
		const result = await batalLembur(id);
		if (!result.success) return fail(result.message, 422);
		return ok({ message: result.message });
	}
	return fail('Aksi tidak valid. Pilihan: "ajukan", "batal".', 422);
}
