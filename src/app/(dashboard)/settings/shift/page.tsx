import { requireUserRole } from "@/src/lib/auth-guard";
import { getShiftList } from "@/src/modules/shift/actions/shift.actions";
import ShiftForm from "@/src/modules/shift/components/shift-form";

export default async function ShiftPage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
	const shifts = await getShiftList();

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Shift Kerja</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Kelola shift bergilir termasuk shift malam (lintas hari) untuk roster.
				</p>
			</div>

			<div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<ShiftForm shifts={shifts} />
			</div>
		</>
	);
}
