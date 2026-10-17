import { redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getDataQuality } from "@/src/modules/employee/actions/impor.actions";
import ImporClient from "@/src/modules/employee/components/impor-client";

export default async function ImporPage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
	const session = await getCurrentSession();
	if (!session) redirect("/login");
	const hasil = await getDataQuality();

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Impor & Kualitas Data</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Impor CSV karyawan/riwayat (validasi dulu, NIK ganda ditolak), ekspor, dan dashboard kelengkapan data.
				</p>
			</div>

			<div className="mt-5">
				<ImporClient userId={session.user.id} kualitas={hasil.issues ?? []} />
			</div>
		</>
	);
}
