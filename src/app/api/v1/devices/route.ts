import { NextRequest } from "next/server";
import prisma from "@/src/lib/prisma";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";

/**
 * Registrasi perangkat mobile (PRD mobile Bag. 7-B5).
 * - POST: daftarkan/segarkan perangkat milik karyawan login (termasuk pushToken, M4).
 * - GET  : daftar perangkat milik karyawan login.
 * - DELETE: unregister perangkat (cabut pushToken, tandai nonaktif — PRD Bag. 6 no.17).
 *
 * Perangkat juga otomatis terdaftar saat clock-in (catatPresensi),
 * endpoint ini dipakai saat aplikasi pertama kali dibuka / ganti device.
 */
export async function POST(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const body = await readJson(request);
	const deviceId = str(body?.["deviceId"]);
	if (!deviceId) return fail("deviceId wajib diisi.", 422);

	// pushToken hanya ditimpa bila ikut dikirim — POST tanpa token
	// (mis. registrasi ulang saat buka app) tidak boleh menghapus token lama.
	const pushToken = str(body?.["pushToken"]);
	const data = {
		namaPerangkat: str(body?.["deviceName"]) || null,
		platform: str(body?.["platform"]) || null,
		...(pushToken ? { pushToken } : {}),
		isActive: true,
		lastSeenAt: new Date(),
	};

	const device = await prisma.perangkatKaryawan.upsert({
		where: { karyawanId_deviceId: { karyawanId: ctx.karyawanId, deviceId } },
		create: { karyawanId: ctx.karyawanId, deviceId, ...data },
		update: data,
		select: { id: true, deviceId: true, namaPerangkat: true, platform: true, isActive: true, lastSeenAt: true },
	});

	return ok({ device }, 201);
}

export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const items = await prisma.perangkatKaryawan.findMany({
		where: { karyawanId: ctx.karyawanId },
		orderBy: { lastSeenAt: { sort: "desc", nulls: "last" } },
		select: {
			id: true,
			deviceId: true,
			namaPerangkat: true,
			platform: true,
			isActive: true,
			lastSeenAt: true,
			createdAt: true,
		},
	});

	return ok({ items });
}

/** Unregister perangkat (dipanggil mobile saat logout): cabut pushToken + nonaktifkan. */
export async function DELETE(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const fromQuery = str(request.nextUrl.searchParams.get("deviceId"));
	let deviceId = fromQuery;
	if (!deviceId) {
		const body = await readJson(request);
		deviceId = str(body?.["deviceId"]);
	}
	if (!deviceId) return fail("deviceId wajib diisi.", 422);

	const result = await prisma.perangkatKaryawan.updateMany({
		where: { karyawanId: ctx.karyawanId, deviceId },
		data: { isActive: false, pushToken: null },
	});

	return ok({ unregistered: result.count > 0 });
}
