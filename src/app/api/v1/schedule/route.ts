import { NextRequest } from "next/server";
import prisma from "@/src/lib/prisma";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";
import { dateOnlyInput } from "@/src/lib/time";

/**
 * GET: jadwal saya — roster + penugasan kalender + shift hari ini.
 * Query: ?mulai=YYYY-MM-DD&selesai=YYYY-MM-DD (default 7 hari ke depan).
 */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const params = request.nextUrl.searchParams;
	const today = new Date();
	const defSelesai = new Date(today);
	defSelesai.setDate(defSelesai.getDate() + 7);

	const mulai = new Date(params.get("mulai") ?? today.toISOString().slice(0, 10));
	const selesai = new Date(params.get("selesai") ?? defSelesai.toISOString().slice(0, 10));
	if (Number.isNaN(mulai.getTime()) || Number.isNaN(selesai.getTime())) {
		return fail("Parameter tanggal tidak valid.", 422);
	}

	const [roster, penugasan] = await Promise.all([
		prisma.rosterShift.findMany({
			where: { karyawanId: ctx.karyawanId, tanggal: { gte: mulai, lte: selesai } },
			orderBy: { tanggal: "asc" },
			include: { shift: { select: { kode: true, nama: true, jamMasuk: true, jamKeluar: true, lintasHari: true } } },
		}),
		prisma.penugasanKalender.findMany({
			where: { karyawanId: ctx.karyawanId },
			orderBy: { tanggalMulai: "desc" },
			take: 5,
			include: { kalenderKerja: { select: { nama: true } } },
		}),
	]);

	const fmtTime = (d: Date | null) => {
		if (!d) return null;
		const p = (n: number) => String(n).padStart(2, "0");
		return `${p(d.getHours())}:${p(d.getMinutes())}`;
	};

	return ok({
		roster: roster.map((r) => ({
			tanggal: dateOnlyInput(r.tanggal),
			kode: r.shift.kode,
			nama: r.shift.nama,
			jamMasuk: fmtTime(r.shift.jamMasuk),
			jamKeluar: fmtTime(r.shift.jamKeluar),
			lintasHari: r.shift.lintasHari,
		})),
		penugasan: penugasan.map((p) => ({
			kalender: p.kalenderKerja.nama,
			mulai: dateOnlyInput(p.tanggalMulai),
			selesai: p.tanggalSelesai ? dateOnlyInput(p.tanggalSelesai) : null,
		})),
	});
}
