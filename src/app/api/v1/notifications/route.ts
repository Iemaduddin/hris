import { NextRequest } from "next/server";
import prisma from "@/src/lib/prisma";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";

/**
 * GET: daftar notifikasi milik sendiri (?belumDibaca=1 untuk badge).
 * PUT: {id | "semua"} tandai dibaca.
 * POST: preferensi {pushAktif, emailAktif} atau ambil preferensi bila kosong.
 */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);

	const hanyaBaru = request.nextUrl.searchParams.get("belumDibaca") === "1";
	const [belumDibaca, items, pref] = await Promise.all([
		prisma.notifikasi.count({ where: { userId: ctx.userId, dibacaPada: null } }),
		prisma.notifikasi.findMany({
			where: { userId: ctx.userId, ...(hanyaBaru ? { dibacaPada: null } : {}) },
			orderBy: { createdAt: "desc" },
			take: 50,
		}),
		prisma.preferensiNotifikasi.findUnique({ where: { userId: ctx.userId } }),
	]);
	return ok({
		belumDibaca,
		preferensi: { pushAktif: pref?.pushAktif ?? true, emailAktif: pref?.emailAktif ?? true },
		items: items.map((n) => ({
			id: n.id,
			judul: n.judul,
			isi: n.isi,
			jenis: n.jenis,
			referensiType: n.referensiType,
			referensiId: n.referensiId,
			url: n.url,
			dibaca: n.dibacaPada !== null,
			waktu: n.createdAt,
		})),
	});
}

export async function PUT(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);

	const body = await readJson(request);
	const id = str(body?.["id"]);
	if (!id) return fail("id wajib diisi (atau \"semua\").", 422);
	if (id === "semua") {
		await prisma.notifikasi.updateMany({
			where: { userId: ctx.userId, dibacaPada: null },
			data: { dibacaPada: new Date() },
		});
	} else {
		await prisma.notifikasi.updateMany({
			where: { id, userId: ctx.userId },
			data: { dibacaPada: new Date() },
		});
	}
	return ok({ message: "Ditandai dibaca." });
}

export async function POST(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);

	const body = await readJson(request);
	const pushAktif = body?.["pushAktif"];
	const emailAktif = body?.["emailAktif"];
	if (typeof pushAktif !== "boolean" || typeof emailAktif !== "boolean") {
		return fail("pushAktif dan emailAktif (boolean) wajib diisi.", 422);
	}
	await prisma.preferensiNotifikasi.upsert({
		where: { userId: ctx.userId },
		create: { userId: ctx.userId, pushAktif, emailAktif },
		update: { pushAktif, emailAktif },
	});
	return ok({ message: "Preferensi tersimpan." });
}
