"use client";

import { useTheme } from "next-themes";
import { ResponsiveBar } from "@nivo/bar";

export type TrenItem = { label: string; nilai: number };

type TrenChartProps = {
	data: TrenItem[];
	sumbuY: string;
	/** Format angka untuk tooltip ("ringkas" default, "rupiah", atau "jam"). */
	format?: "ringkas" | "rupiah" | "jam";
};

const ringkas = new Intl.NumberFormat("id-ID", { notation: "compact" });
const rupiah = new Intl.NumberFormat("id-ID");

const FORMAT: Record<NonNullable<TrenChartProps["format"]>, (n: number) => string> = {
	ringkas: (n) => ringkas.format(n),
	rupiah: (n) => `Rp${rupiah.format(Math.round(n))}`,
	jam: (n) => `${n} jam`,
};

function TooltipBar({ indexValue, nilai, warna, format }: { indexValue: string; nilai: number; warna: string; format: (n: number) => string }) {
	return (
		<div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
			<span className="h-3 w-3 rounded-sm" style={{ backgroundColor: warna }} />
			<span className="font-medium text-slate-500 dark:text-slate-400">{indexValue}</span>
			<span className="font-bold text-slate-900 dark:text-white">{format(nilai)}</span>
		</div>
	);
}

export default function TrenChart({ data, sumbuY, format = "ringkas" }: TrenChartProps) {
	const { resolvedTheme } = useTheme();
	const gelap = resolvedTheme === "dark";
	const teksAksen = gelap ? "#94a3b8" : "#64748b";
	const garisGrid = gelap ? "#1e293b" : "#e2e8f0";

	if (data.every((d) => d.nilai === 0)) {
		return <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">Belum ada data.</p>;
	}
	return (
		<div className="h-80">
			<ResponsiveBar
				data={data.map((d) => ({ label: d.label, Nilai: d.nilai }))}
				keys={["Nilai"]}
				indexBy="label"
				margin={{ top: 20, right: 16, bottom: 48, left: 64 }}
				padding={0.4}
				borderRadius={6}
				defs={[
					{
						id: "gradasi",
						type: "linearGradient",
						colors: [
							{ offset: 0, color: "#2563eb" },
							{ offset: 100, color: gelap ? "#1e40af" : "#93c5fd" },
						],
					},
				]}
				fill={[{ match: { id: "Nilai" }, id: "gradasi" }]}
				borderColor={{ from: "color", modifiers: [["darker", 0.3]] }}
				axisTop={null}
				axisRight={null}
				axisBottom={{ tickSize: 0, tickPadding: 10, tickRotation: -25 }}
				axisLeft={{ tickSize: 0, tickPadding: 10, format: (v) => ringkas.format(Number(v)), legend: sumbuY, legendPosition: "middle", legendOffset: -52 }}
				gridYValues={5}
				enableLabel={false}
				motionConfig="gentle"
				tooltip={({ value, color, indexValue }) => (
					<TooltipBar indexValue={String(indexValue)} nilai={Number(value)} warna={String(color)} format={FORMAT[format]} />
				)}
				theme={{
					background: "transparent",
					axis: {
						ticks: { text: { fill: teksAksen, fontSize: 11 }, line: { stroke: "transparent" } },
						legend: { text: { fill: teksAksen, fontSize: 11 } },
						domain: { line: { stroke: garisGrid } },
					},
					grid: { line: { stroke: garisGrid, strokeDasharray: "4 4" } },
				}}
			/>
		</div>
	);
}
