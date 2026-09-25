import { requireUserRole } from "@/src/lib/auth-guard";
import { getJenisCutiList, getPengajuanCuti, getSaldoCutiList } from "@/src/modules/leave/actions/leave.actions";
import { getKaryawanAktifOptions } from "@/src/modules/recap/actions/recap.actions";
import CutiClient from "@/src/modules/leave/components/leave-client";

export default async function CutiPage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
	const tahun = new Date().getFullYear();

	const [items, saldo, karyawanOptions, jenisList] = await Promise.all([
		getPengajuanCuti(),
		getSaldoCutiList(tahun),
		getKaryawanAktifOptions(),
		getJenisCutiList(),
	]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Cuti & Izin</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Pengajuan karyawan dan sisa saldo. Persetujuan via Approval Center.
				</p>
			</div>

			<div className="mt-5">
				<CutiClient
					items={items}
					saldo={saldo}
					tahun={tahun}
					karyawanOptions={karyawanOptions}
					jenisOptions={jenisList.filter((j) => j.isActive).map((j) => ({ value: j.id, label: j.nama, wajibLampiran: j.wajibLampiran }))}
				/>
			</div>
		</>
	);
}
