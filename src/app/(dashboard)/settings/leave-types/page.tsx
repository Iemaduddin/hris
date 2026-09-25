import { requireUserRole } from "@/src/lib/auth-guard";
import { getJenisCutiList } from "@/src/modules/leave/actions/leave.actions";
import JenisCutiForm from "@/src/modules/leave/components/leave-type-form";

export default async function JenisKetidakhadiranPage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
	const items = await getJenisCutiList();

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Jenis Ketidakhadiran</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Kelola jenis cuti/izin, kuota tahunan, dan generate saldo karyawan.
				</p>
			</div>

			<div className="mt-5">
				<JenisCutiForm items={items} tahunAktif={new Date().getFullYear()} />
			</div>
		</>
	);
}
