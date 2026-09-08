import { NextRequest } from "next/server";
import prisma from "@/src/lib/prisma";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";
import { hitungRekapHarian } from "@/src/modules/recap/lib/recap-engine";

/**
 * Detail presensi satu hari untuk karyawan login (PRD mobile Bag. 5.3.C).
 * Query: ?tanggal=YYYY-MM-DD (default hari ini).
 */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const raw = request.nextUrl.searchParams.get("tanggal");
	const tanggal = raw ? new Date(`${raw}T00:00:00`) : new Date();
	if (Number.isNaN(tanggal.getTime())) return fail("Parameter tanggal tidak valid.", 422);

	const batasAwal = new Date(tanggal);
	batasAwal.setHours(0, 0, 0, 0);
	const batasAkhir = new Date(tanggal);
	batasAkhir.setHours(23, 59, 59, 999);

	const [rekap, events] = await Promise.all([
		hitungRekapHarian(ctx.karyawanId, tanggal),
		prisma.absensi.findMany({
			where: { karyawanId: ctx.karyawanId, waktu: { gte: batasAwal, lte: batasAkhir } },
			orderBy: { waktu: "asc" },
			select: {
				tipe: true,
				waktu: true,
				sumber: true,
				status: true,
				diLuarRadius: true,
				isMocked: true,
				catatan: true,
			},
		}),
	]);

	return ok({
		// Ambil dari komponen lokal — `toISOString()` bisa mundur/semundur
		// satu hari karena local-midnight dikonversi ke UTC.
		tanggal: `${batasAwal.getFullYear()}-${String(batasAwal.getMonth() + 1).padStart(2, "0")}-${String(
			batasAwal.getDate(),
		).padStart(2, "0")}`,
		status: rekap?.status ?? "TANPA_JADWAL",
		telatMenit: rekap?.telatMenit ?? null,
		pulangCepatMenit: rekap?.pulangCepatMenit ?? null,
		lemburMenit: rekap?.lemburMenit ?? null,
		masukAktual: rekap?.masukAktual?.toISOString() ?? null,
		keluarAktual: rekap?.keluarAktual?.toISOString() ?? null,
		events: events.map((e) => ({
			tipe: e.tipe,
			waktu: e.waktu.toISOString(),
			sumber: e.sumber,
			status: e.status,
			diLuarRadius: e.diLuarRadius,
			isMocked: e.isMocked,
			catatan: e.catatan,
		})),
	});
}
