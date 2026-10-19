"use client";

import { useState } from "react";
import EmployeesTable from "./employees-table";
import EmployeeWizardForm from "./employee-wizard-form";
import type { EmployeeListItem, EmployeeWizardSummary, EmployeeWizardReferenceOptions } from "../types/employee.type";

type EmployeesClientProps = {
	summaries: EmployeeWizardSummary[];
	referenceOptions: EmployeeWizardReferenceOptions;
	employees: EmployeeListItem[];
};

export default function EmployeesClient({ summaries, referenceOptions, employees }: EmployeesClientProps) {
	const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
	const [loadKey, setLoadKey] = useState(0);

	function handleSelectEmployee(id: string) {
		setSelectedEmployeeId(id);
		setLoadKey((prev) => prev + 1);
	}

	return (
		<>
			<div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Form Data Employee</h2>
				<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
					Buat dan edit data karyawan lengkap secara bertahap, simpan setiap langkah, lalu lanjutkan kapan pun.
				</p>
				<EmployeeWizardForm
					summaries={summaries}
					referenceOptions={referenceOptions}
					selectedEmployeeId={selectedEmployeeId}
					loadKey={loadKey}
					onResetSelection={() => setSelectedEmployeeId("")}
				/>
			</div>
			<div className="mt-5">
				<EmployeesTable employees={employees} onSelectEmployee={handleSelectEmployee} />
			</div>
		</>
	);
}
