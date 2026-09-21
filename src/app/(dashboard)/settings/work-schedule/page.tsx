import { requireUserRole } from "@/src/lib/auth-guard";
import { getKalenderKerjaList, getKalenderKerjaById } from "@/src/modules/work-schedule/actions/work-schedule.actions";
import WorkScheduleClient from "@/src/modules/work-schedule/components/work-schedule-client";

export default async function WorkSchedulePage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
	const kalenderList = await getKalenderKerjaList();

	const defaultKalender = kalenderList.find((k) => k.isDefault) ?? kalenderList[0];
	const selectedKalenderDetail = defaultKalender ? await getKalenderKerjaById(defaultKalender.id) : null;

	const jadwalList = selectedKalenderDetail?.jadwalKerja ?? [];
	const hariLiburList = selectedKalenderDetail?.hariLibur ?? [];

	const selectedKalender = selectedKalenderDetail
		? { ...selectedKalenderDetail, _count: { jadwalKerja: jadwalList.length, hariLibur: hariLiburList.length } }
		: null;

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900 mb-5">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Jadwal Kerja</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Kelola kalender kerja, jadwal harian, dan hari libur perusahaan.
				</p>
			</div>

			<WorkScheduleClient
				kalenderList={kalenderList}
				selectedKalender={selectedKalender}
				jadwalList={jadwalList}
				hariLiburList={hariLiburList}
			/>
		</>
	);
}
