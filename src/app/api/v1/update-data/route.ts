import { NextRequest } from "next/server";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";
import {
	ajukanUpdateData,
	batalkanUpdateData,
	buatUpdateData,
	getUpdateDataSaya,
} from "@/src/modules/employee/actions/updatedata.actions";

import prisma from "@/src/lib/prisma";

/**
 * GET: usulan milik sendiri. `?keluarga=1` → anggota keluarga (untuk targetId).
 * POST: draf {kategori, targetId?, dataBaru, alasan, lampiranUrl}.
 * PUT: {id, aksi: "ajukan" | "batal"}.
 */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	if (request.nextUrl.searchParams.get("keluarga") === "1") {
		const rows = await prisma.keluargaKaryawan.findMany({
			where: { karyawanId: ctx.karyawanId },
			orderBy: { nama: "asc" },
			select: { id: true, nama: true, hubungan: true },
		});
		return ok({ items: rows });
	}
	const items = await getUpdateDataSaya(ctx.userId);
	return ok({ items });
}

export async function POST(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const body = await readJson(request);
	const raw = body?.["dataBaru"];
	const result = await buatUpdateData(
		{
			kategori: str(body?.["kategori"]).toUpperCase(),
			targetId: str(body?.["targetId"]) || undefined,
			dataBaru: (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>,
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
		const result = aksi === "ajukan" ? await ajukanUpdateData(id, ctx.userId) : await batalkanUpdateData(id, ctx.userId);
		if (!result.success) return fail(result.message, 422);
		return ok({ message: result.message });
	}
	return fail('Aksi tidak valid. Pilihan: "ajukan", "batal".', 422);
}
