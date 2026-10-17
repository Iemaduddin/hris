import { requireUserRole } from "@/src/lib/auth-guard";
import { listDuties } from "@/src/modules/duty/actions/duty.actions";
import { getActiveEmployeeOptions } from "@/src/modules/recap/actions/recap.actions";
import DinasClient from "@/src/modules/duty/components/duty-client";

export default async function DinasPage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
  const [items, employeeOptions] = await Promise.all([listDuties(), getActiveEmployeeOptions()]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Dinas Luar & WFH</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Hari yang disetujui dihitung sebagai kehadiran dalam rekap.
				</p>
			</div>

			<div className="mt-5">
        <DinasClient items={items} employeeOptions={employeeOptions} />
			</div>
		</>
	);
}
