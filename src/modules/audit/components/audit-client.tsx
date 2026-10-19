"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import FloatingInput from "@/src/components/ui/floating-input/input";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import type { AuditRow } from "../actions/audit.actions";

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
	day: "2-digit",
	month: "short",
	hour: "2-digit",
	minute: "2-digit",
});

function ringkas(value: unknown): string {
	if (value === null || value === undefined) return "-";
	try {
		const s = JSON.stringify(value);
		return s.length > 120 ? `${s.slice(0, 120)}…` : s;
	} catch {
		return "-";
	}
}

export default function AuditClient({ initial }: { initial: AuditRow[] }) {
	const router = useRouter();
	const [, startTransition] = useTransition();
	const [aksi, setAksi] = useState("");
	const [entity, setEntity] = useState("");
	const [q, setQ] = useState("");

	function terapkanFilter() {
		const params = new URLSearchParams();
		if (aksi.trim()) params.set("aksi", aksi.trim());
		if (entity.trim()) params.set("entity", entity.trim());
		if (q.trim()) params.set("q", q.trim());
		const qs = params.toString();
		startTransition(() => {
			router.push(qs ? `/audit?${qs}` : "/audit");
		});
	}

	const kolom: DataTableColumn<AuditRow>[] = [
		{
			id: "waktu",
			header: "Waktu",
			render: (r) => <span>{timeFormatter.format(new Date(r.waktu))}</span>,
			sortValue: (r) => r.waktu,
			searchable: false,
		},
		{
			id: "aksi",
			header: "Aksi",
			render: (r) => <span className="font-mono text-xs">{r.aksi}</span>,
			sortValue: (r) => r.aksi,
			searchValue: (r) => r.aksi,
		},
		{
			id: "entity",
			header: "Entity",
			render: (r) => (
				<span className="text-xs">
					{r.entityType}
					{r.entityId ? <span className="text-slate-400"> • {r.entityId.slice(0, 8)}</span> : null}
				</span>
			),
			sortValue: (r) => r.entityType,
			searchValue: (r) => `${r.entityType} ${r.entityId ?? ""}`,
		},
		{
			id: "actor",
			header: "Actor",
			render: (r) => (
				<span className="text-xs">
					{r.actorNama ?? "-"}
					{r.actorRole ? <span className="text-slate-400"> ({r.actorRole})</span> : null}
				</span>
			),
			sortValue: (r) => r.actorNama ?? "",
			searchValue: (r) => `${r.actorNama ?? ""} ${r.actorRole ?? ""}`,
		},
		{
			id: "perubahan",
			header: "Sebelum → Sesudah",
			sortable: false,
			render: (r) => (
				<span className="block max-w-72 truncate font-mono text-[11px] text-slate-500" title={`${ringkas(r.sebelum)} → ${ringkas(r.sesudah)}`}>
					{ringkas(r.sebelum)} → {ringkas(r.sesudah)}
				</span>
			),
			searchValue: (r) => r.reason ?? "",
		},
	];

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Audit Log</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Jejak aksi sensitif: actor + aksi + entity + sebelum/sesudah + reason. Koreksi presensi langsung
					ditutup — wajib via pengajuan + approval.
				</p>
				<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
					<FloatingInput name="aksi" label="Filter aksi (mis. PAYROLL)" value={aksi} onChange={(e) => setAksi(e.currentTarget.value)} />
					<FloatingInput name="entity" label="Filter entity (mis. SalaryRun)" value={entity} onChange={(e) => setEntity(e.currentTarget.value)} />
					<FloatingInput name="q" label="Cari actor / reason / id" value={q} onChange={(e) => setQ(e.currentTarget.value)} />
					<div className="flex items-end">
						<button
							type="button"
							onClick={terapkanFilter}
							className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
						>
							Terapkan
						</button>
					</div>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<DataTable
					data={initial}
					columns={kolom}
					getRowId={(r) => r.id}
					emptyMessage="Belum ada jejak audit untuk filter ini."
					searchPlaceholder="Cari di 200 baris terbaru..."
					initialSortState={{ columnId: "waktu", direction: "desc" }}
				/>
			</div>
		</div>
	);
}
