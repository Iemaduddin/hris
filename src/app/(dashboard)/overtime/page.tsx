import { requireUserRole } from "@/src/lib/auth-guard";
import { getLemburList } from "@/src/modules/overtime/actions/overtime.actions";
import { getKaryawanAktifOptions } from "@/src/modules/recap/actions/recap.actions";
import LemburClient from "@/src/modules/overtime/components/overtime-client";

export default async function LemburPage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
	const [items, karyawanOptions] = await Promise.all([getLemburList(), getKaryawanAktifOptions()]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Lembur</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Pengajuan lembur. Jam yang disetujui mengalir ke rekap dan payroll.
				</p>
			</div>

			<div className="mt-5">
				<LemburClient items={items} karyawanOptions={karyawanOptions} />
			</div>
		</>
	);
}
