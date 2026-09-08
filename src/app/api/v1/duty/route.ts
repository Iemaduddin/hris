import { NextRequest } from "next/server";
import { ajukanDinas, batalDinas, buatDinas, getDinasList } from "@/src/modules/duty/actions/duty.actions";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";

/**
 * GET: dinas/WFH sendiri. POST: draf {jenis, mulai, selesai, lokasi?, keperluan}.
 * PUT: {id, aksi: "ajukan" | "batal"}.
 */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const items = await getDinasList({ karyawanId: ctx.karyawanId });
	return ok({ items });
}

export async function POST(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const body = await readJson(request);
	const result = await buatDinas({
		karyawanId: ctx.karyawanId,
		jenis: str(body?.["jenis"]),
		mulai: str(body?.["mulai"]),
		selesai: str(body?.["selesai"]),
		lokasi: str(body?.["lokasi"]) || undefined,
		keperluan: str(body?.["keperluan"]) || undefined,
		lampiran: str(body?.["lampiran"]) || undefined,
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

	const own = await getDinasList({ karyawanId: ctx.karyawanId });
	if (!own.some((x) => x.id === id)) return fail("Pengajuan bukan milik Anda.", 403);

	if (aksi === "ajukan") {
		const result = await ajukanDinas(id);
		if (!result.success) return fail(result.message, 422);
		return ok({ message: result.message });
	}
	if (aksi === "batal") {
		const result = await batalDinas(id, false);
		if (!result.success) return fail(result.message, 422);
		return ok({ message: result.message });
	}
	return fail('Aksi tidak valid. Pilihan: "ajukan", "batal".', 422);
}
