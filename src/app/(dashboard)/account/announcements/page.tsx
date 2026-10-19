import { redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { getMyAnnouncementsCore, getThisWeekEvents } from "@/src/modules/employees/actions/announcements.actions";
import AnnouncementsListClient from "@/src/modules/employees/components/announcements-list-client";

export default async function MyAnnouncementsPage() {
	const session = await getCurrentSession();
	if (!session) redirect("/login");
	const karyawan = await prisma.karyawan.findFirst({
		where: { userId: session.user.id },
		select: { id: true },
	});
	if (!karyawan) redirect("/");

	const [items, peristiwa] = await Promise.all([
		getMyAnnouncementsCore(karyawan.id),
		getThisWeekEvents(),
	]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Pengumuman</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Info perusahaan untuk Anda — global dan unit Anda.
				</p>
			</div>

			{peristiwa.length > 0 && (
				<div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Minggu Ini</h2>
					<ul className="mt-2 space-y-1 text-sm">
						{peristiwa.map((p) => (
							<li key={`${p.kind}-${p.employeeNumber}`}>
								{p.kind === "ULTAH" ? "🎂" : "🏅"} {p.fullName} — {p.info} ({p.date})
							</li>
						))}
					</ul>
				</div>
			)}

			<div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<AnnouncementsListClient items={items} />
			</div>
		</>
	);
}
