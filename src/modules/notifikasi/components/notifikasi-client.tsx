"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import {
	simpanPreferensi,
	tandaiNotifikasi,
	type NotifikasiItem,
	type PreferensiItem,
} from "../actions/notifikasi.actions";

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
	day: "2-digit",
	month: "short",
	hour: "2-digit",
	minute: "2-digit",
});

export default function NotifikasiClient({
	initial,
	preferensi,
}: {
	initial: NotifikasiItem[];
	preferensi: PreferensiItem;
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [pushAktif, setPushAktif] = useState(preferensi.pushAktif);
	const [emailAktif, setEmailAktif] = useState(preferensi.emailAktif);

	function handleTandai(id: string | "semua") {
		startTransition(async () => {
			await tandaiNotifikasi(id);
			router.refresh();
		});
	}

	function handleSimpanPreferensi() {
		startTransition(async () => {
			const result = await simpanPreferensi({ pushAktif, emailAktif });
			if (!result.success) toast.error(result.message);
			else toast.success(result.message);
			router.refresh();
		});
	}

	const kolom: DataTableColumn<NotifikasiItem>[] = [
		{
			id: "waktu",
			header: "Waktu",
			render: (n) => <span>{timeFormatter.format(new Date(n.waktu))}</span>,
			sortValue: (n) => n.waktu,
			searchable: false,
		},
		{
			id: "judul",
			header: "Judul",
			render: (n) => (
				<span className={n.dibaca ? "" : "font-semibold"}>
					{n.url ? (
						<Link href={n.url} className="text-blue-700 hover:underline dark:text-blue-300">
							{n.judul}
						</Link>
					) : (
						n.judul
					)}
				</span>
			),
			sortValue: (n) => n.judul,
			searchValue: (n) => `${n.judul} ${n.isi}`,
		},
		{ id: "isi", header: "Isi", accessor: "isi" },
		{
			id: "jenis",
			header: "Jenis",
			render: (n) => <span>{n.jenis.replaceAll("_", " ")}</span>,
			sortValue: (n) => n.jenis,
			searchValue: (n) => n.jenis,
		},
		{
			id: "aksi",
			header: "Aksi",
			headerClassName: "text-right",
			cellClassName: "text-right",
			sortable: false,
			searchable: false,
			render: (n) =>
				n.dibaca ? (
					<span className="text-xs text-slate-400">Dibaca</span>
				) : (
					<button
						type="button"
						disabled={isPending}
						onClick={() => handleTandai(n.id)}
						className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50 disabled:opacity-60"
					>
						Tandai dibaca
					</button>
				),
		},
	];

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Semua Notifikasi</h2>
					<button
						type="button"
						disabled={isPending}
						onClick={() => handleTandai("semua")}
						className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50 disabled:opacity-60"
					>
						Tandai semua dibaca
					</button>
				</div>
				<div className="mt-4">
					<DataTable
						data={initial}
						columns={kolom}
						getRowId={(n) => n.id}
						emptyMessage="Belum ada notifikasi."
						initialSortState={{ columnId: "waktu", direction: "desc" }}
					/>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Preferensi</h2>
				<p className="mt-1 text-xs text-slate-500">
					Notifikasi in-app selalu tersimpan. Push dan email bisa dimatikan per kanal.
				</p>
				<div className="mt-4 flex flex-col gap-3">
					<label className="flex items-center gap-3 text-sm">
						<input type="checkbox" checked={pushAktif} onChange={(e) => setPushAktif(e.currentTarget.checked)} className="h-4 w-4" />
						Push ke HP (Expo) — pengajuan masuk & keputusan
					</label>
					<label className="flex items-center gap-3 text-sm">
						<input type="checkbox" checked={emailAktif} onChange={(e) => setEmailAktif(e.currentTarget.checked)} className="h-4 w-4" />
						Email — pengajuan masuk & keputusan
					</label>
				</div>
				<div className="mt-4">
					<button
						type="button"
						disabled={isPending}
						onClick={handleSimpanPreferensi}
						className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
					>
						Simpan Preferensi
					</button>
				</div>
			</div>
		</div>
	);
}
