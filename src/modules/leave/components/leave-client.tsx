"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
	ajukanCuti,
	batalCuti,
	buatPengajuanCuti,
	type PengajuanCutiItem,
	type SaldoCutiItem,
} from "../actions/leave.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

type CutiClientProps = {
	items: PengajuanCutiItem[];
	saldo: SaldoCutiItem[];
	tahun: number;
	karyawanOptions: Array<{ value: string; label: string }>;
	jenisOptions: Array<{ value: number; label: string; wajibLampiran: boolean }>;
};

function todayInput(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CutiClient({ items, saldo, tahun, karyawanOptions, jenisOptions }: CutiClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [karyawanId, setKaryawanId] = useState("");
	const [jenisId, setJenisId] = useState("");
	const [mulai, setMulai] = useState(todayInput());
	const [selesai, setSelesai] = useState(todayInput());
	const [alasan, setAlasan] = useState("");

	function run(action: Promise<{ success: boolean; message: string }>) {
		startTransition(async () => {
			const result = await action;
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			router.refresh();
		});
	}

	function handleBuat() {
		if (!karyawanId || !jenisId) {
			toast.error("Pilih karyawan dan jenis.");
			return;
		}
		run(
			buatPengajuanCuti({
				karyawanId,
				jenisId: Number(jenisId),
				mulai,
				selesai,
				alasan,
			}),
		);
	}

	const kolomPengajuan: DataTableColumn<PengajuanCutiItem>[] = [
		{
			id: "nomor",
			header: "Nomor",
			render: (item) => <span className="font-medium">{item.nomor}</span>,
			sortValue: (item) => item.nomor,
			searchValue: (item) => item.nomor,
		},
		{ id: "karyawan", header: "Karyawan", accessor: "karyawanNama" },
		{ id: "jenis", header: "Jenis", accessor: "jenisNama" },
		{
			id: "periode",
			header: "Periode",
			sortable: false,
			searchable: false,
			render: (item) => <span>{item.mulai} – {item.selesai}</span>,
		},
		{
			id: "jumlahHari",
			header: "Hari",
			headerClassName: "text-right",
			cellClassName: "text-right",
			render: (item) => <span>{item.jumlahHari}</span>,
			sortValue: (item) => item.jumlahHari,
			searchable: false,
		},
		{
			id: "status",
			header: "Status",
			render: (item) => <span>{item.status.replaceAll("_", " ")}</span>,
			sortValue: (item) => item.status,
			searchValue: (item) => item.status.replaceAll("_", " "),
		},
		{
			id: "aksi",
			header: "Aksi",
			headerClassName: "text-right",
			cellClassName: "text-right",
			sortable: false,
			searchable: false,
			render: (item) => (
				<div className="inline-flex gap-2">
					{item.status === "DRAFT" ? (
						<button type="button" onClick={() => run(ajukanCuti(item.id))} disabled={isPending} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50 disabled:opacity-60">
							Ajukan
						</button>
					) : null}
					{["DRAFT", "DIAJUKAN", "MENUNGGU_APPROVAL", "DISETUJUI"].includes(item.status) ? (
						<button type="button" onClick={() => run(batalCuti(item.id, true))} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
							Batal
						</button>
					) : null}
				</div>
			),
		},
	];

	const kolomSaldo: DataTableColumn<SaldoCutiItem>[] = [
		{ id: "karyawan", header: "Karyawan", accessor: "karyawanNama" },
		{ id: "jenis", header: "Jenis", accessor: "jenisNama" },
		{
			id: "saldoAwal",
			header: "Awal",
			headerClassName: "text-right",
			cellClassName: "text-right",
			render: (s) => <span>{s.saldoAwal}</span>,
			sortValue: (s) => s.saldoAwal,
			searchable: false,
		},
		{
			id: "saldoAkhir",
			header: "Sisa",
			headerClassName: "text-right",
			cellClassName: "text-right font-semibold",
			render: (s) => <span>{s.saldoAkhir}</span>,
			sortValue: (s) => s.saldoAkhir,
			searchable: false,
		},
	];

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Buat Pengajuan</h2>
				<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
					<FloatingSelect name="karyawanId" label="Karyawan" value={karyawanId} onValueChange={setKaryawanId} options={karyawanOptions} placeholder="Pilih karyawan" searchable />
					<FloatingSelect name="jenisId" label="Jenis" value={jenisId} onValueChange={setJenisId} options={jenisOptions.map((j) => ({ value: String(j.value), label: j.label }))} placeholder="Pilih jenis" />
					<FloatingInput name="mulai" label="Tanggal Mulai" type="date" value={mulai} onChange={(e) => setMulai(e.currentTarget.value)} />
					<FloatingInput name="selesai" label="Tanggal Selesai" type="date" value={selesai} onChange={(e) => setSelesai(e.currentTarget.value)} />
					<FloatingInput name="alasan" label="Alasan" value={alasan} onChange={(e) => setAlasan(e.currentTarget.value)} />
				</div>
				<div className="mt-4 flex justify-end">
					<button type="button" onClick={handleBuat} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
						Simpan Draf
					</button>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Pengajuan</h2>
				<div className="mt-4">
					<DataTable
						data={items}
						columns={kolomPengajuan}
						getRowId={(item) => item.id}
						emptyMessage="Belum ada pengajuan."
					/>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Saldo {tahun}</h2>
				<div className="mt-4">
					<DataTable
						data={saldo}
						columns={kolomSaldo}
						getRowId={(s) => String(s.id)}
						emptyMessage="Belum ada saldo. Generate di Pengaturan → Jenis Ketidakhadiran."
					/>
				</div>
			</div>
		</div>
	);
}
