import type { Metadata } from "next";
import { getEmployeeWizardBootstrapData, getEmployeesList } from "@/src/modules/employee/actions/employee.actions";
import EmployeesClient from "@/src/modules/employee/components/employees-client";

export const metadata: Metadata = {
	title: "Employees",
};

export default async function EmployeesPage() {
	const [{ summaries, referenceOptions }, employees] = await Promise.all([
		getEmployeeWizardBootstrapData(),
		getEmployeesList(),
	]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Data Karyawan</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Kelola data karyawan. Klik tombol Edit untuk mengubah data melalui wizard.
				</p>
			</div>

			<EmployeesClient
				summaries={summaries}
				referenceOptions={referenceOptions}
				employees={employees}
			/>
		</>
	);
}
