import { requireUserRole, getCurrentSession } from "@/src/lib/auth-guard";
import { redirect } from "next/navigation";
import { listHrAnnouncements, getUnitOptions } from "@/src/modules/employees/actions/announcements.actions";
import HrAnnouncementsClient from "@/src/modules/employees/components/announcement-hr-client";

export default async function HrAnnouncementsPage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
	const session = await getCurrentSession();
	if (!session) redirect("/login");
	const [rows, units] = await Promise.all([listHrAnnouncements(), getUnitOptions()]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Pengumuman</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Broadcast ke seluruh karyawan atau satu unit — terkirim via in-app, push, dan email.
				</p>
			</div>

			<div className="mt-5">
				<HrAnnouncementsClient userId={session.user.id} initial={rows} unitOptions={units} />
			</div>
		</>
	);
}
