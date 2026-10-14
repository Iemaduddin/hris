"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import { prosesPengajuanAction, type RiwayatApprovalItem } from "../actions/approval.actions";
import type { AntrianItem, ReferensiType } from "../lib/approval-engine";

const TYPE_LABEL: Record<string, string> = {
	CUTI: "Cuti/Izin",
	LEMBUR: "Lembur",
	DINAS: "Dinas/WFH",
	MUTASI: "Mutasi",
	RESIGN: "Resign",
	PROBATION: "Probation",
	TUKAR_SHIFT: "Tukar Shift",
	KOREKSI: "Koreksi Presensi",
	REIMBURSE: "Reimbursement",
	UANGDINAS: "Uang Dinas",
};

export default function ApprovalClient({
	userId,
	antrian,
	riwayat,
}: {
	userId: string;
	antrian: AntrianItem[];
	riwayat: RiwayatApprovalItem[];
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [catatan, setCatatan] = useState("");

	function handleProses(type: ReferensiType, id: string, keputusan: "SETUJU" | "TOLAK") {
		const note = keputusan === "TOLAK" ? prompt("Alasan penolakan:") ?? "" : catatan;
		if (keputusan === "TOLAK" && !note) return;
		startTransition(async () => {
			const result = await prosesPengajuanAction(userId, type, id, keputusan, note || undefined);
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			setCatatan("");
			router.refresh();
		});
	}

	const kolomAntrian: DataTableColumn<AntrianItem>[] = [
		{
			id: "jenis",
			header: "Jenis",
			render: (item) => <span className="font-medium">{TYPE_LABEL[item.type] ?? item.type}</span>,
			sortValue: (item) => TYPE_LABEL[item.type] ?? item.type,
			searchValue: (item) => `${TYPE_LABEL[item.type] ?? item.type} ${item.type}`,
		},
		{ id: "nomor", header: "Nomor", accessor: "nomor" },
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
		{ id: "ringkasan", header: "Ringkasan", accessor: "ringkasan" },
		{
			id: "aksi",
			header: "Aksi",
			headerClassName: "text-right",
			cellClassName: "text-right",
			sortable: false,
			searchable: false,
			render: (item) => (
				<div className="inline-flex gap-2">
					<button
						type="button"
						onClick={() => handleProses(item.type, item.id, "SETUJU")}
						disabled={isPending}
						className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
					>
						Setuju
					</button>
					<button
						type="button"
						onClick={() => handleProses(item.type, item.id, "TOLAK")}
						disabled={isPending}
						className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
					>
						Tolak
					</button>
				</div>
			),
		},
	];

	const kolomRiwayat: DataTableColumn<RiwayatApprovalItem>[] = [
		{
			id: "jenis",
			header: "Jenis",
			render: (r) => <span>{TYPE_LABEL[r.type] ?? r.type}</span>,
			sortValue: (r) => TYPE_LABEL[r.type] ?? r.type,
		},
		{ id: "tahap", header: "Tahap", accessor: "tahap" },
		{ id: "status", header: "Keputusan", accessor: "status" },
		{
			id: "waktu",
			header: "Waktu",
			render: (r) => <span>{r.diprosesPada ? new Date(r.diprosesPada).toLocaleString("id-ID") : "-"}</span>,
			sortValue: (r) => r.diprosesPada ?? "",
		},
	];

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
					Menunggu Persetujuan ({antrian.length})
				</h2>
				<div className="mt-4">
					<DataTable
						data={antrian}
						columns={kolomAntrian}
						getRowId={(item) => `${item.type}-${item.id}`}
						emptyMessage="Tidak ada yang menunggu."
					/>
				</div>
				<div className="mt-4 max-w-md">
					<FloatingInput
						name="catatan"
						label="Catatan persetujuan (opsional)"
						value={catatan}
						onChange={(e) => setCatatan(e.currentTarget.value)}
					/>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Riwayat Keputusan Saya</h2>
				<div className="mt-4">
					<DataTable
						data={riwayat}
						columns={kolomRiwayat}
						getRowId={(r) => r.id}
						emptyMessage="Belum ada riwayat."
					/>
				</div>
			</div>
		</div>
	);
}
