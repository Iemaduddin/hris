import { requireUserRole } from "@/src/lib/auth-guard";
import LaporanClient from "@/src/modules/reports/components/reports-client";

export default async function LaporanPage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "MANAJER", "FINANCE"]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Laporan</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Kehadiran, cuti, lembur, keterlambatan, saldo, turnover, dan kontrak. Ekspor CSV.
					Manajer hanya melihat timnya.
				</p>
			</div>

			<div className="mt-5">
				<LaporanClient />
			</div>
		</>
	);
}
