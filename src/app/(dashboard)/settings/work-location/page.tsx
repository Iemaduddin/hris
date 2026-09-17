import { requireUserRole } from "@/src/lib/auth-guard";
import { getWorkLocationOptions } from "@/src/modules/work-location/actions/work-location.actions";
import WorkLocationForm from "@/src/modules/work-location/components/work-location-form";

export default async function WorkLocationPage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
	const locations = await getWorkLocationOptions();

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Lokasi Kerja</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Kelola lokasi kerja kantor/cabang dan radius absensi.</p>
			</div>

			<div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Form Lokasi Kerja</h2>
				<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pilih lokasi untuk update atau isi form untuk menambah data baru.</p>

				<WorkLocationForm locations={locations} />
			</div>
		</>
	);
}