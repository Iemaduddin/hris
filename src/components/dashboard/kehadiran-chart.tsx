"use client";

import { useTheme } from "next-themes";
import { ResponsivePie } from "@nivo/pie";

export type IrisanKehadiran = { id: string; label: string; value: number };

const WARNA_STATUS: Record<string, string> = {
	HADIR: "#10b981",
	TERLAMBAT: "#f59e0b",
	ALPA: "#f43f5e",
	CUTI: "#0ea5e9",
	IZIN: "#8b5cf6",
	SAKIT: "#fb923c",
	DINAS: "#06b6d4",
	LIBUR: "#94a3b8",
};

const warnaIrisan = (id: string | number) => WARNA_STATUS[String(id)] ?? "#cbd5e1";

function TooltipIrisan({ datum, total }: { datum: { label: string | number; value: number; color: string }; total: number }) {
	const persen = total > 0 ? Math.round((datum.value / total) * 100) : 0;
	return (
		<div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
			<span className="h-3 w-3 rounded-full" style={{ backgroundColor: datum.color }} />
			<span className="font-medium text-slate-700 dark:text-slate-200">{String(datum.label).replace(/ \(\d+\)$/, "")}</span>
			<span className="font-bold text-slate-900 dark:text-white">
				{datum.value} ({persen}%)
			</span>
		</div>
	);
}

export default function KehadiranChart({ data }: { data: IrisanKehadiran[] }) {
	const { resolvedTheme } = useTheme();
	const gelap = resolvedTheme === "dark";
	const teksAksen = gelap ? "#94a3b8" : "#64748b";

	const total = data.reduce((acc, d) => acc + d.value, 0);
	if (total === 0) {
		return <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">Belum ada data kehadiran hari ini.</p>;
	}
	const berlabel = data.map((d) => ({ ...d, label: `${d.label} (${d.value})` }));

	return (
		<div className="relative h-80">
			<ResponsivePie
				data={berlabel}
				margin={{ top: 24, right: 24, bottom: 72, left: 24 }}
				innerRadius={0.62}
				padAngle={1.5}
				cornerRadius={5}
				activeOuterRadiusOffset={8}
				colors={({ id }) => warnaIrisan(id)}
				borderWidth={2}
				borderColor={{ from: "color", modifiers: [["darker", 0.25]] }}
				enableArcLinkLabels
				arcLinkLabelsSkipAngle={12}
				arcLinkLabelsDiagonalLength={12}
				arcLinkLabelsStraightLength={10}
				arcLinkLabelsThickness={2}
				arcLinkLabelsTextOffset={6}
				arcLinkLabelsTextColor={teksAksen}
				arcLinkLabelComponent={({ label }) => (
					<text textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fontWeight: 600, fill: teksAksen }}>
						{label}
					</text>
				)}
				enableArcLabels={false}
				motionConfig="gentle"
				legends={[
					{
						anchor: "bottom",
						direction: "row",
						justify: false,
						translateX: 0,
						translateY: 56,
						itemsSpacing: 6,
						itemWidth: 118,
						itemHeight: 20,
						itemDirection: "left-to-right",
						itemOpacity: 1,
						symbolSize: 12,
						symbolShape: "circle",
						itemTextColor: teksAksen,
						effects: [{ on: "hover", style: { itemOpacity: 1 } }],
					},
				]}
				tooltip={({ datum }) => <TooltipIrisan datum={datum} total={total} />}
				theme={{ background: "transparent", labels: { text: { fontSize: 11 } } }}
			/>
			<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-16">
				<span className="text-3xl font-bold text-slate-900 dark:text-white">{total}</span>
				<span className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">karyawan</span>
			</div>
		</div>
	);
}
