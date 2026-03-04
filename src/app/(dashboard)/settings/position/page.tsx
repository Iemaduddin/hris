import { getPositionFormOptions, getPositionOptions } from "@/src/modules/position/actions/position.actions";
import PositionForm from "@/src/modules/position/components/position-form";

export default async function PositionPage() {
	const [positions, formOptions] = await Promise.all([getPositionOptions(), getPositionFormOptions()]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Position / Jabatan</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Kelola jabatan, unit organisasi, dan job grade terkait.</p>
			</div>

			<div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Form Position</h2>
				<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pilih position untuk update atau isi form untuk menambah data baru.</p>

				<PositionForm positions={positions} formOptions={formOptions} />
			</div>
		</>
	);
}