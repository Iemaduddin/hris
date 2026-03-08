import type { Metadata } from "next";
import { getEmployeeWizardBootstrapData } from "@/src/modules/employee/actions/employee.actions";
import EmployeeWizardForm from "@/src/modules/employee/components/employee-wizard-form";

export const metadata: Metadata = {
	title: "Employees",
};

export default async function EmployeesPage() {
	const { summaries, referenceOptions } = await getEmployeeWizardBootstrapData();

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Employee Wizard</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Buat dan edit data employee lengkap secara bertahap, simpan setiap langkah, lalu lanjutkan kapan pun.
				</p>
			</div>

			<div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<EmployeeWizardForm summaries={summaries} referenceOptions={referenceOptions} />
			</div>
		</>
	);
}
