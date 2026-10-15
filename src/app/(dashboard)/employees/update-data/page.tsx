import { requireUserRole, getCurrentSession } from "@/src/lib/auth-guard";
import { redirect } from "next/navigation";
import { getUpdateDataSemua } from "@/src/modules/employee/actions/updatedata.actions";
import UpdateDataHrClient from "@/src/modules/employee/components/updatedata-hr-client";

export default async function UpdateDataHrPage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
	const session = await getCurrentSession();
	if (!session) redirect("/login");
	const rows = await getUpdateDataSemua();

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Update Data Karyawan</h1>
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
