import { NextRequest } from "next/server";
import { fail, isHr, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";
import {
	createAnnouncementCore,
	getMyAnnouncementsCore,
	getThisWeekEvents,
	publishAnnouncementCore,
} from "@/src/modules/employees/actions/announcements.actions";

/** GET: pengumuman tayang milik sendiri + peristiwa minggu ini (ultah/anniv). */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const [items, events] = await Promise.all([
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
		events,
	});
}

/** POST: terbitkan pengumuman teks (HR/admin) — langsung publish. */
export async function POST(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!isHr(ctx)) return fail("Khusus HR/admin.", 403);

	const body = await readJson(request);
	const created = await createAnnouncementCore(
		{ title: str(body?.["title"]), body: str(body?.["body"]) },
		ctx.userId,
	);
	if (!created.success || !created.id) return fail(created.message, 422);

	const published = await publishAnnouncementCore(created.id, ctx.userId);
	if (!published.success) return fail(published.message, 422);
	return ok({ id: created.id, message: published.message }, 201);
}
