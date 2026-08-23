import { getJobGradeOptions } from "@/src/modules/job-grade/actions/job-grade.actions";
import JobGradeForm from "@/src/modules/job-grade/components/job-grade-form";

export default async function JobGradePage() {
	const grades = await getJobGradeOptions();

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Golongan Posisi</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Kelola level golongan posisi dan rentang gaji.</p>
			</div>

			<div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Form Golongan Posisi</h2>
				<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pilih golongan posisi untuk update atau isi form untuk menambah data baru.</p>

				<JobGradeForm grades={grades} />
			</div>
		</>
	);
}