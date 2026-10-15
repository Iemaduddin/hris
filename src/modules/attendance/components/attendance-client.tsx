"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import { catatPresensi, type PresensiListItem } from "../actions/attendance.actions";

const TIPE_OPTIONS = [
	{ value: "MASUK", label: "Masuk" },
	{ value: "KELUAR", label: "Keluar" },
	{ value: "MULAI_ISTIRAHAT", label: "Mulai Istirahat" },
	{ value: "SELESAI_ISTIRAHAT", label: "Selesai Istirahat" },
	{ value: "KELUAR_KANTOR", label: "Keluar Kantor" },
	{ value: "KEMBALI_KANTOR", label: "Kembali Kantor" },
];

type PresensiClientProps = {
	tanggal: string;
	items: PresensiListItem[];
	karyawanOptions: Array<{ value: string; label: string }>;
};

const timeFormatter = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function PresensiClient({ tanggal, items, karyawanOptions }: PresensiClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [karyawanId, setKaryawanId] = useState("");
	const [tipe, setTipe] = useState("MASUK");
	const [waktu, setWaktu] = useState("");
	const [catatan, setCatatan] = useState("");

	function handleCatat() {
		if (!karyawanId) {
			toast.error("Pilih karyawan.");
			return;
		}
		startTransition(async () => {
			const result = await catatPresensi({ karyawanId, tipe, waktu: waktu || undefined, catatan });
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			setCatatan("");
			setWaktu("");
			router.refresh();
		});
	}

	function handleKoreksi() {
		toast.info("Koreksi langsung ditutup. Ajukan via Koreksi Presensi — diproses atasan → HR.");
	}

	const kolomPresensi: DataTableColumn<PresensiListItem>[] = [
		{
			id: "waktu",
			header: "Waktu",
			render: (item) => <span>{timeFormatter.format(new Date(item.waktu))}</span>,
			sortValue: (item) => item.waktu,
			searchable: false,
		},
		{
			id: "karyawan",
			header: "Karyawan",
			render: (item) => (
				<span>
					{item.karyawanNama} <span className="text-xs text-slate-500">({item.nomorKaryawan})</span>
				</span>
			),
			sortValue: (item) => item.karyawanNama,
			searchValue: (item) => `${item.karyawanNama} ${item.nomorKaryawan}`,
		},
		{
			id: "tipe",
			header: "Tipe",
			render: (item) => <span>{item.tipe.replaceAll("_", " ")}</span>,
			sortValue: (item) => item.tipe,
			searchValue: (item) => item.tipe.replaceAll("_", " "),
		},
		{ id: "sumber", header: "Sumber", accessor: "sumber" },
		{ id: "status", header: "Status", accessor: "status" },
		{
			id: "aksi",
			header: "Aksi",
			headerClassName: "text-right",
			cellClassName: "text-right",
			sortable: false,
			searchable: false,
			render: (item) =>
				item.status === "VALID" ? (
					<div className="inline-flex items-center gap-2">
						<span className="text-xs text-slate-400">Via pengajuan</span>
						<Link
							href="/account/koreksi"
							onClick={handleKoreksi}
							className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50"
						>
							Koreksi via Approval
						</Link>
					</div>
				) : (
					<span className="text-xs text-slate-400">{item.catatan ?? "-"}</span>
				),
		},
	];

	return (
		<div className="space-y-5">
			<div className="flex items-center justify-end">
				<FloatingInput
					name="filterTanggal"
					label="Tanggal"
					type="date"
					value={tanggal}
					onChange={(e) => {
						if (e.currentTarget.value) router.push(`/attendance?tanggal=${e.currentTarget.value}`);
					}}
				/>
			</div>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Catat Manual</h2>
				<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
					<FloatingSelect
						name="karyawanId"
						label="Karyawan"
						value={karyawanId}
						onValueChange={setKaryawanId}
						options={karyawanOptions}
						placeholder="Pilih karyawan"
						searchable
					/>
					<FloatingSelect
						name="tipe"
						label="Tipe"
						value={tipe}
						onValueChange={setTipe}
						options={TIPE_OPTIONS}
					/>
					<FloatingInput
						name="waktu"
						label="Waktu (kosongkan = sekarang)"
						type="datetime-local"
						value={waktu}
						onChange={(e) => setWaktu(e.currentTarget.value)}
					/>
					<FloatingInput
						name="catatan"
						label="Catatan"
						value={catatan}
						onChange={(e) => setCatatan(e.currentTarget.value)}
					/>
				</div>
				<div className="mt-4 flex justify-end">
					<button
						type="button"
						onClick={handleCatat}
						disabled={isPending}
						className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
					>
						{isPending ? "Menyimpan..." : "Catat Presensi"}
					</button>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Log {tanggal}</h2>
				<div className="mt-4">
					<DataTable
						data={items}
						columns={kolomPresensi}
						getRowId={(item) => item.id}
						emptyMessage="Belum ada presensi pada tanggal ini."
					/>
				</div>
			</div>
		</div>
	);
}
