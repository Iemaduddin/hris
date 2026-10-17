import { NextRequest } from "next/server";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";
import { getMyAnnouncementsCore, getThisWeekEvents } from "@/src/modules/employee/actions/pengumuman.actions";

/** GET: pengumuman tayang milik sendiri + peristiwa minggu ini (ultah/anniv). */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const [items, peristiwa] = await Promise.all([
		getMyAnnouncementsCore(ctx.karyawanId),
		getThisWeekEvents(),
	]);
	return ok({
		items: items.map((p) => ({
			id: p.id,
			title: p.title,
			body: p.body,
			unitName: p.unitName,
			startsAt: p.startsAt,
			endsAt: p.endsAt,
		})),
		peristiwa,
	});
}
