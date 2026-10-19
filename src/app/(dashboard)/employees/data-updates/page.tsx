import { requireUserRole, getCurrentSession } from "@/src/lib/auth-guard";
import { redirect } from "next/navigation";
import { getAllDataUpdates } from "@/src/modules/employees/actions/data-updates.actions";
import UpdateDataHrClient from "@/src/modules/employees/components/data-update-hr-client";

export default async function UpdateDataHrPage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
	const session = await getCurrentSession();
	if (!session) redirect("/login");
	const rows = await getAllDataUpdates();

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Update Data Employee</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Verifikasi usulan perubahan data dari karyawan.
				</p>
			</div>

			<div className="mt-5">
				<UpdateDataHrClient userId={session.user.id} rows={rows} />
			</div>
		</>
	);
}
