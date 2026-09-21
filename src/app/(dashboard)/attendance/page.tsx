import { requireUserRole } from "@/src/lib/auth-guard";
import { getPresensiHarian } from "@/src/modules/attendance/actions/attendance.actions";
import { getKaryawanAktifOptions } from "@/src/modules/recap/actions/recap.actions";
import PresensiClient from "@/src/modules/attendance/components/attendance-client";

function todayInput(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function PresensiPage({
	searchParams,
}: {
	searchParams: Promise<{ tanggal?: string }>;
}) {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
	const params = await searchParams;
	const tanggal = params.tanggal || todayInput();

	const [items, karyawanOptions] = await Promise.all([
		getPresensiHarian(tanggal),
		getKaryawanAktifOptions(),
	]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Presensi Harian</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Log event presensi {tanggal}. Koreksi selalu teraudit.
				</p>
			</div>

			<div className="mt-5">
				<PresensiClient tanggal={tanggal} items={items} karyawanOptions={karyawanOptions} />
			</div>
		</>
	);
}
