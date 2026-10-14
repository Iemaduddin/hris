import { requireUserRole } from "@/src/lib/auth-guard";
import { getGajiKaryawanMap, getKomponenList } from "@/src/modules/payroll/actions/payroll.actions";
import KomponenClient from "@/src/modules/payroll/components/salary-components-client";

export default async function KomponenPage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "FINANCE"]);
	const [items, assignMap] = await Promise.all([getKomponenList(), getGajiKaryawanMap()]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Komponen Gaji</h1>
			<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
				Master komponen dan penugasan per karyawan. Persentase BPJS dan batas atas dapat dikonfigurasi.
				PPh 21 TER dihitung otomatis (PP 58/2023) dari status PTKP karyawan — komponen manual
				POT_PPH21 diabaikan agar tidak ganda.
			</p>
			</div>

			<div className="mt-5">
				<KomponenClient items={items} assignMap={assignMap} />
			</div>
		</>
	);
}
