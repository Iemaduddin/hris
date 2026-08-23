"use client";

import { useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import type { ApexTreeRef, NestedNode } from "react-apextree";
import type { OrganizationalUnitOption } from "../types/organizational-unit.type";

const ApexTreeChart = dynamic(() => import("react-apextree").then((mod) => ({ default: mod.ApexTreeChart })), { ssr: false });

type OrgChartProps = {
	units: OrganizationalUnitOption[];
};

function buildTreeData(units: OrganizationalUnitOption[]): NestedNode {
	const map = new Map<string, OrganizationalUnitOption>();
	for (const unit of units) map.set(unit.id, unit);

	function toNode(unit: OrganizationalUnitOption): NestedNode {
		const children = units.filter((u) => u.parentId === unit.id);
		return {
			id: unit.id,
			name: unit.nama,
			data: undefined as undefined,
			children: children.map(toNode),
		};
	}

	const roots = units.filter((u) => !u.parentId || !map.has(u.parentId));
	return roots.length === 1
		? toNode(roots[0])
		: {
				id: "root",
				name: "Organisasi",
				data: undefined as undefined,
				children: roots.map(toNode),
			};
}

const treeOptions = {
	width: "100%",
	height: 500,
	direction: "top" as const,
	nodeWidth: 150,
	nodeHeight: 60,
	nodeBGColor: "#ffffff",
	borderColor: "#3b82f6",
	borderRadius: "8px",
	edgeColor: "#93c5fd",
	edgeWidth: 2,
	fontSize: "13px",
	fontWeight: "600",
	fontColor: "#1e293b",
	enableExpandCollapse: true,
	enableToolbar: false,
	siblingSpacing: 30,
	childrenSpacing: 50,
};

export default function OrgChartSection({ units }: OrgChartProps) {
	const treeRef = useRef<ApexTreeRef>(null);
	const treeData = useMemo(() => buildTreeData(units), [units]);

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Bagan Struktur Organisasi</h2>
				<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
					Tampilan hierarki organisasi dari atas ke bawah. Klik node untuk expand/collapse.
				</p>
			</div>

			<div className="overflow-hidden rounded-xl border border-blue-100 bg-white dark:border-blue-900/60 dark:bg-slate-900">
				{units.length === 0 ? (
					<div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
						Belum ada unit organisasi.
					</div>
				) : (
					<div className="overflow-x-auto p-4">
						<ApexTreeChart
							ref={treeRef}
							data={treeData}
							options={treeOptions}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
