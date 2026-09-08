import { NextRequest } from "next/server";
import { catatPresensi } from "@/src/modules/attendance/actions/attendance.actions";
import { hitungRekapHarian } from "@/src/modules/recap/lib/recap-engine";
import { fail, isHr, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";
import prisma from "@/src/lib/prisma";

const TIPE_VALID = ["MASUK", "KELUAR", "MULAI_ISTIRAHAT", "SELESAI_ISTIRAHAT", "KELUAR_KANTOR", "KEMBALI_KANTOR"];

function num(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
	return undefined;
}

/**
 * Clock-in / clock-out mandiri (mobile).
 * Non-HR hanya bisa mencatat untuk dirinya sendiri.
 */
export async function POST(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);

	const body = await readJson(request);
	const tipe = str(body?.["tipe"]).toUpperCase();
	if (!TIPE_VALID.includes(tipe)) {
		return fail("Tipe tidak valid. Pilihan: " + TIPE_VALID.join(", "), 422);
	}

	let karyawanId = str(body?.["karyawanId"]);
	if (!isHr(ctx)) {
		if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);
		karyawanId = ctx.karyawanId;
	}
	if (!karyawanId) return fail("karyawanId wajib diisi.", 422);

	const result = await catatPresensi({
		karyawanId,
		tipe,
		sumber: "MOBILE",
		deviceId: str(body?.["deviceId"]) || undefined,
		lokasiKerjaId: str(body?.["lokasiKerjaId"]) || undefined,
		catatan: str(body?.["catatan"]) || undefined,
		latitude: num(body?.["latitude"]),
		longitude: num(body?.["longitude"]),
		// PRD mobile Bag. 5.4 — deteksi GPS simulasi dilaporkan perangkat,
		// server tetap mencatat presensinya hanya dengan flag.
		isMocked: body?.["isMocked"] === true,
		namaPerangkat: str(body?.["deviceName"]) || undefined,
		platform: str(body?.["platform"]) || undefined,
	});

	if (!result.success) return fail(result.message, 422);
	return ok(
		{
			message: result.message,
			tipe,
			waktu: new Date().toISOString(),
			// Hasil validasi lokasi (null = tidak dinilai: tanpa GPS / tanpa radius).
			diLuarRadius: result.diLuarRadius ?? null,
			isMocked: result.isMocked ?? false,
			jarakMeter: result.jarakMeter ?? null,
		},
		201,
	);
}

/**
 * Status presensi hari ini untuk karyawan login.
 */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const rekap = await hitungRekapHarian(ctx.karyawanId, new Date());
	if (!rekap) return ok({ status: "TANPA_JADWAL", rekap: null });

	const events = await prisma.absensi.findMany({
		where: {
			karyawanId: ctx.karyawanId,
			waktu: {
				gte: new Date(new Date().setHours(0, 0, 0, 0)),
				lte: new Date(new Date().setHours(23, 59, 59, 999)),
			},
			status: { in: ["VALID", "DIKOREKSI"] },
		},
		orderBy: { waktu: "asc" },
		select: { tipe: true, waktu: true, sumber: true, diLuarRadius: true, isMocked: true },
	});

	return ok({
		status: rekap.status,
		telatMenit: rekap.telatMenit,
		masukAktual: rekap.masukAktual?.toISOString() ?? null,
		keluarAktual: rekap.keluarAktual?.toISOString() ?? null,
		events: events.map((e) => ({
			tipe: e.tipe,
			waktu: e.waktu.toISOString(),
			sumber: e.sumber,
			diLuarRadius: e.diLuarRadius,
			isMocked: e.isMocked,
		})),
	});
}
