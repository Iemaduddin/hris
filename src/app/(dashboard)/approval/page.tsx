import { redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getMyQueue, getMyApprovalHistory } from "@/src/modules/approval/actions/approval.actions";
import ApprovalClient from "@/src/modules/approval/components/approval-client";

export default async function ApprovalPage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "MANAJER"]);
	const session = await getCurrentSession();
	if (!session) redirect("/login");

  const [queue, history] = await Promise.all([
    getMyQueue(session.user.id),
    getMyApprovalHistory(session.user.id),
  ]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Approval Center</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Kotak masuk persetujuan cuti, lembur, dinas, mutasi, resign, probation, koreksi, dan update data. Setiap keputusan teraudit.
				</p>
			</div>

			<div className="mt-5">
        <ApprovalClient userId={session.user.id} queue={queue} history={history} />
			</div>
		</>
	);
}
