"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LuCalendarDays, LuClock, LuCalendarOff, LuSettings2 } from "react-icons/lu";
import KalenderKerjaForm from "./work-calendar-form";
import JadwalKerjaForm from "./daily-schedule-form";
import HariLiburForm from "./holiday-form";
import type {
	KalenderKerjaListItem,
	JadwalKerjaListItem,
	HariLiburListItem,
} from "../types/work-schedule.type";

type TabType = "jadwal" | "libur";

type WorkScheduleClientProps = {
	kalenderList: KalenderKerjaListItem[];
	selectedKalender: KalenderKerjaListItem | null;
	jadwalList: JadwalKerjaListItem[];
	hariLiburList: HariLiburListItem[];
};

export default function WorkScheduleClient({
	kalenderList,
	selectedKalender,
	jadwalList,
	hariLiburList,
}: WorkScheduleClientProps) {
	const router = useRouter();
	const [selectedKalenderId, setSelectedKalenderId] = useState<number>(selectedKalender?.id ?? 0);
	const [activeTab, setActiveTab] = useState<TabType>("jadwal");
	const [showFormKalender, setShowFormKalender] = useState(false);

	const handleRefresh = useCallback(() => {
		router.refresh();
	}, [router]);

	const currentKalender = kalenderList.find((k) => k.id === selectedKalenderId);

	return (
		<div className="space-y-5">
			{/* Header Section */}
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Kalender Kerja</h2>
						<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
							Pilih kalender untuk melihat atau mengatur jadwal harian dan hari libur.
						</p>
					</div>
					<button
						type="button"
						onClick={() => setShowFormKalender(!showFormKalender)}
						className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
					>
						<LuSettings2 className="h-4 w-4" />
						{showFormKalender ? "Tutup" : "Kelola Kalender"}
					</button>
				</div>

				{/* Calendar Cards - Horizontal Scroll */}
				{kalenderList.length > 0 && (
					<div className="mt-4 flex gap-3 overflow-x-auto pb-2">
						{kalenderList.map((k) => (
							<button
								key={k.id}
								type="button"
								onClick={() => setSelectedKalenderId(k.id)}
								className={`flex min-w-[180px] flex-col rounded-xl border p-3 text-left transition ${
									selectedKalenderId === k.id
										? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30"
										: "border-blue-100 bg-white hover:border-blue-300 dark:border-blue-900/60 dark:bg-slate-900"
								}`}
							>
								<div className="flex items-center gap-2">
									<LuCalendarDays className={`h-4 w-4 ${selectedKalenderId === k.id ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
									<span className="font-medium text-slate-900 dark:text-slate-100">{k.nama}</span>
								</div>
								<div className="mt-2 flex gap-2">
									{k.isDefault && (
										<span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
											Default
										</span>
									)}
									<span className="text-xs text-slate-500 dark:text-slate-400">
										{k._count.jadwalKerja} jadwal
									</span>
								</div>
							</button>
						))}
					</div>
				)}

				{kalenderList.length === 0 && (
					<div className="mt-4 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-6 text-center dark:border-blue-800 dark:bg-blue-900/20">
						<LuCalendarDays className="mx-auto h-8 w-8 text-blue-400" />
						<p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Belum ada kalender kerja.</p>
						<p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Klik &quot;Kelola Kalender&quot; untuk membuat baru.</p>
					</div>
				)}
			</div>

			{/* Form Kalender - Collapsible */}
			{showFormKalender && (
				<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
					<KalenderKerjaForm kalenderList={kalenderList} />
				</div>
			)}

			{/* Jadwal & Libur Tabs */}
			{selectedKalenderId && currentKalender && (
				<div className="rounded-2xl border border-blue-100 bg-white dark:border-blue-900/60 dark:bg-slate-900">
					{/* Tab Header */}
					<div className="border-b border-blue-100 dark:border-blue-900/60">
						<div className="flex">
							<button
								type="button"
								onClick={() => setActiveTab("jadwal")}
								className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition ${
									activeTab === "jadwal"
										? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
										: "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
								}`}
							>
								<LuClock className="h-4 w-4" />
								Jadwal Harian
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("libur")}
								className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition ${
									activeTab === "libur"
										? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
										: "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
								}`}
							>
								<LuCalendarOff className="h-4 w-4" />
								Hari Libur
								{hariLiburList.length > 0 && (
									<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
										{hariLiburList.length}
									</span>
								)}
							</button>
						</div>
					</div>

					{/* Tab Content */}
					<div className="p-5">
						{activeTab === "jadwal" ? (
							<JadwalKerjaForm
								kalenderKerjaId={selectedKalenderId}
								jadwalList={jadwalList}
								onRefresh={handleRefresh}
							/>
						) : (
							<HariLiburForm
								kalenderKerjaId={selectedKalenderId}
								hariLiburList={hariLiburList}
								onRefresh={handleRefresh}
							/>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
