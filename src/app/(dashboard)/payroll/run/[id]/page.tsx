import { notFound } from "next/navigation";
import { requireUserRole } from "@/src/lib/auth-guard";
import { getDisburseSalaryRun, getRunDetail } from "@/src/modules/payroll/actions/payroll.actions";
import RunDetailClient from "@/src/modules/payroll/components/run-detail-client";

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "FINANCE"]);
	const { id } = await params;
	const [{ run, detail }, disburse] = await Promise.all([getRunDetail(id), getDisburseSalaryRun(id)]);
	if (!run) notFound();

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Salary Run {run.periode}</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Detail perhitungan per karyawan dari snapshot rekap.
				</p>
			</div>

			{disburse && disburse.incomplete.length > 0 ? (
				<div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
					<p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
						{disburse.incomplete.length} karyawan tanpa data bank lengkap — tidak ikut file CSV transfer:
					</p>
					<p className="mt-1 text-sm text-amber-700 dark:text-amber-300">{disburse.incomplete.join("; ")}</p>
				</div>
			) : null}

			<div className="mt-5">
				<RunDetailClient run={run} detail={detail} />
			</div>
		</>
	);
}
