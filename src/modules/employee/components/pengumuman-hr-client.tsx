"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import {
	archiveAnnouncement,
	createAnnouncement,
	deleteAnnouncement,
	publishAnnouncement,
	type AnnouncementItem,
} from "@/src/modules/employee/actions/pengumuman.actions";

export default function PengumumanHrClient({
	userId,
	initial,
	unitOptions,
}: {
	userId: string;
	initial: AnnouncementItem[];
	unitOptions: Array<{ value: string; label: string }>;
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [title, setJudul] = useState("");
	const [body, setIsi] = useState("");
	const [unitId, setUnitId] = useState("");
	const [selesai, setSelesai] = useState("");

	function runAction(action: Promise<{ success: boolean; message: string }>) {
		startTransition(async () => {
			const result = await action;
			if (!result.success) toast.error(result.message);
			else {
				toast.success(result.message);
				setJudul("");
				setIsi("");
				setUnitId("");
				setSelesai("");
			}
			router.refresh();
		});
	}

	const kolom: DataTableColumn<AnnouncementItem>[] = [
		{ id: "title", header: "Judul", accessor: "title" },
		{
			id: "target",
			header: "Target",
			render: (r) => <span>{r.unitName ?? "Semua"}</span>,
			sortValue: (r) => r.unitName ?? "Semua",
			searchValue: (r) => r.unitName ?? "Semua",
		},
		{
			id: "status",
			header: "Status",
			render: (r) => <span>{r.status}</span>,
			sortValue: (r) => r.status,
			searchValue: (r) => r.status,
		},
		{
			id: "aksi",
			header: "Aksi",
			headerClassName: "text-right",
			cellClassName: "text-right",
			sortable: false,
			searchable: false,
			render: (r) => (
				<div className="inline-flex gap-2">
					{r.status === "DRAFT" && (
						<button
							type="button"
							disabled={isPending}
							onClick={() => runAction(publishAnnouncement(r.id))}
							className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
						>
							Terbitkan
						</button>
					)}
					{r.status !== "DIARSIPKAN" && (
						<button
							type="button"
							disabled={isPending}
							onClick={() => runAction(archiveAnnouncement(r.id))}
							className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60"
						>
							Arsip
						</button>
					)}
					{r.status === "DRAFT" && (
						<button
							type="button"
							disabled={isPending}
							onClick={() => runAction(deleteAnnouncement(r.id))}
							className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
						>
							Hapus
						</button>
					)}
				</div>
			),
		},
	];

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Buat Pengumuman</h2>
				<p className="mt-1 text-xs text-slate-500">
					Terbit = broadcast in-app + push + email ke target (semua / satu unit).
				</p>
				<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
					<FloatingInput name="title" label="Judul" value={title} onChange={(e) => setJudul(e.currentTarget.value)} />
					<FloatingSelect
						name="unit"
						label="Target (kosong = semua)"
						value={unitId}
						onValueChange={setUnitId}
						options={[{ value: "", label: "Semua karyawan" }, ...unitOptions]}
					/>
					<FloatingInput name="selesai" label="Tayang sampai (opsional)" type="date" value={selesai} onChange={(e) => setSelesai(e.currentTarget.value)} />
				</div>
				<div className="mt-4">
					<label className="mb-1 block text-xs text-slate-500" htmlFor="body-pengumuman">Isi</label>
					<textarea
						id="body-pengumuman"
						value={body}
						onChange={(e) => setIsi(e.currentTarget.value)}
						rows={4}
						className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
					/>
				</div>
				<div className="mt-4 flex justify-end">
					<button
						type="button"
						disabled={isPending}
						onClick={() => {
							if (!title.trim() || !body.trim()) {
								toast.error("Judul dan isi wajib diisi.");
								return;
							}
							runAction(
								createAnnouncement(
									{ title, body, orgUnitId: unitId || undefined, endsAt: selesai || undefined },
									userId,
								),
							);
						}}
						className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
					>
						Simpan Draf
					</button>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Daftar</h2>
				<div className="mt-4">
					<DataTable data={initial} columns={kolom} getRowId={(r) => r.id} emptyMessage="Belum ada pengumuman." />
				</div>
			</div>
		</div>
	);
}
