import type { Metadata } from "next";
import { requireUserRole } from "@/src/lib/auth-guard";
import { getEmployeeWizardBootstrapData, getEmployeesList, getExpiringContracts } from "@/src/modules/employees/actions/employee.actions";
import EmployeesClient from "@/src/modules/employees/components/employees-client";
import ContractReminder from "@/src/modules/employees/components/contract-reminder";

export const metadata: Metadata = {
	title: "Employees",
};

export default async function EmployeesPage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
	const [{ summaries, referenceOptions }, employees, kontrakHampirBerakhir] = await Promise.all([
		getEmployeeWizardBootstrapData(),
		getEmployeesList(),
		getExpiringContracts(30),
	]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Data Employee</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Kelola data karyawan. Klik tombol Edit untuk mengubah data melalui wizard.
				</p>
			</div>

			<ContractReminder items={kontrakHampirBerakhir} />

			<EmployeesClient
				summaries={summaries}
				referenceOptions={referenceOptions}
				employees={employees}
			/>
		</>
	);
}
