import { requireUserRole } from "@/src/lib/auth-guard";
import { getKaryawanAktifOptions } from "@/src/modules/recap/actions/recap.actions";
import { getActiveShiftOptions } from "@/src/modules/shift/actions/shift.actions";
import {
	getKalenderOptions,
	getPenugasanKalender,
	getRosterPeriode,
} from "@/src/modules/roster/actions/roster.actions";
import RosterClient from "@/src/modules/roster/components/roster-client";

function fmt(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function defaultRange(): { mulai: string; selesai: string } {
	const now = new Date();
	const mulai = new Date(now.getFullYear(), now.getMonth(), 1);
	const selesai = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	return { mulai: fmt(mulai), selesai: fmt(selesai) };
}

export default async function RosterPage({
	searchParams,
}: {
	searchParams: Promise<{ mulai?: string; selesai?: string }>;
}) {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
	const params = await searchParams;
	const fallback = defaultRange();
	const mulai = params.mulai || fallback.mulai;
	const selesai = params.selesai || fallback.selesai;

	const [roster, penugasan, karyawanOptions, shiftOptions, kalenderOptions] = await Promise.all([
		getRosterPeriode(mulai, selesai),
		getPenugasanKalender(),
		getKaryawanAktifOptions(),
		getActiveShiftOptions(),
		getKalenderOptions(),
	]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Roster & Penugasan</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Penugasan kalender untuk pola reguler, roster shift untuk pola bergilir/malam.
				</p>
			</div>

			<div className="mt-5">
				<RosterClient
					mulai={mulai}
					selesai={selesai}
					roster={roster}
					penugasan={penugasan}
					karyawanOptions={karyawanOptions}
					shiftOptions={shiftOptions}
					kalenderOptions={kalenderOptions}
				/>
			</div>
		</>
	);
}
