import { requireUserRole } from "@/src/lib/auth-guard";
import { getScheduleAssignments, getScheduleOptions } from "@/src/modules/schedule/actions/schedule.actions";
import ScheduleAssignmentTable from "@/src/modules/schedule/components/schedule-assignment-table";

export default async function SchedulePage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
	const [assignments, options] = await Promise.all([
		getScheduleAssignments(),
		getScheduleOptions(),
	]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Jadwal Kerja</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Kelola penugasan jadwal kerja/shift untuk karyawan.
				</p>
			</div>

			<ScheduleAssignmentTable
				assignments={assignments}
				karyawan={options.karyawan}
				jadwalKerja={options.jadwalKerja}
			/>
		</>
	);
}
