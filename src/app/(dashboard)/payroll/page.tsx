import Link from "next/link";
import { requireUserRole } from "@/src/lib/auth-guard";
import { getSalaryRuns } from "@/src/modules/payroll/actions/payroll.actions";
import RunListClient from "@/src/modules/payroll/components/run-list-client";

const PAYROLL_ROLES = ["SUPER_ADMIN", "ADMIN_HR", "FINANCE"] as const;

export default async function PayrollPage() {
	await requireUserRole([...PAYROLL_ROLES]);
	const runs = await getSalaryRuns();

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Payroll</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Salary run per periode: hitung → finalisasi (kunci) → terbitkan payslip.
				</p>
				<Link href="/payroll/thr" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline">
					Kelola THR Keagamaan →
				</Link>
			</div>

			<div className="mt-5">
				<RunListClient runs={runs} />
			</div>
		</>
	);
}
