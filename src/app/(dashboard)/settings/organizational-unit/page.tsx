import { getOrganizationalUnitOptions } from "@/src/modules/organizational-unit/actions/organizational-unit.actions";
import OrganizationalUnitForm from "@/src/modules/organizational-unit/components/organizational-unit-form";

export default async function OrganizationalUnitPage() {
	const units = await getOrganizationalUnitOptions();

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Struktur Organisasi</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Kelola unit organisasi, parent unit, dan status aktifnya.</p>
			</div>

			<div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Form Unit Organisasi</h2>
				<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pilih unit untuk update atau isi form untuk menambah unit baru.</p>

				<OrganizationalUnitForm units={units} />
			</div>
		</>
	);
}