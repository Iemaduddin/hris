"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import { CONTOH_KARYAWAN, CONTOH_RIWAYAT } from "@/src/modules/employee/lib/impor";
import {
	eksekusiImporKaryawan,
	eksekusiImporRiwayat,
	eksporKaryawan,
	eksporRiwayat,
	validasiImporKaryawan,
	validasiImporRiwayat,
	type HasilValidasiImpor,
	type MasalahKualitas,
} from "@/src/modules/employee/actions/impor.actions";

type Tab = "karyawan" | "riwayat" | "ekspor" | "kualitas";

function unduhCsv(nama: string, csv: string) {
	const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = nama;
	a.click();
	URL.revokeObjectURL(url);
}

function bacaFile(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ""));
		reader.onerror = () => reject(new Error("Gagal membaca file."));
		reader.readAsText(file, "utf-8");
	});
}

const kolomHasil: DataTableColumn<{ noBaris: number; ringkasan: string; galat: string[] }>[] = [
	{ id: "noBaris", header: "Baris", accessor: "noBaris" },
	{ id: "ringkasan", header: "Ringkasan", accessor: "ringkasan" },
	{
		id: "galat",
		header: "Masalah",
		render: (r) => <span className="text-red-600">{r.galat.length === 0 ? "OK" : r.galat.join("; ")}</span>,
		sortable: false,
		searchValue: (r) => r.galat.join("; "),
	},
];

export default function ImporClient({
	userId,
	kualitas,
}: {
	userId: string;
	kualitas: MasalahKualitas[];
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [tab, setTab] = useState<Tab>("karyawan");
	const [csv, setCsv] = useState("");
	const [hasil, setHasil] = useState<HasilValidasiImpor | null>(null);
	const [hanyaGagal, setHanyaGagal] = useState(true);
	const [masalahAktif, setMasalahAktif] = useState<string | null>(null);

	function runAction<T>(action: Promise<T>, onOk: (r: T) => void) {
		startTransition(async () => {
			try {
				const result = await action;
				onOk(result);
			} catch {
				toast.error("Gagal memproses.");
			}
			router.refresh();
		});
	}

	async function handleFile(file: File | undefined) {
		if (!file) return;
		try {
			setCsv(await bacaFile(file));
			setHasil(null);
			toast.success(`File ${file.name} dibaca. Klik Validasi.`);
		} catch {
			toast.error("Gagal membaca file.");
		}
	}

	function handleValidasi() {
		if (!csv.trim()) {
			toast.error("Pilih file CSV dulu.");
			return;
		}
		setHanyaGagal(true);
		runAction(tab === "karyawan" ? validasiImporKaryawan(csv) : validasiImporRiwayat(csv), (r) => {
			if (!r.success) {
				toast.error(r.message);
				return;
			}
			setHasil(r);
			toast[r.jumlahGagal > 0 ? "warning" : "success"](r.message);
		});
	}

	function handleEksekusi() {
		if (!hasil || hasil.jumlahGagal > 0) {
			toast.error("Perbaiki semua baris bermasalah dulu.");
			return;
		}
		if (!confirm(`Impor ${hasil.jumlahValid} baris?`)) return;
		runAction(
			tab === "karyawan" ? eksekusiImporKaryawan(csv, userId) : eksekusiImporRiwayat(csv, userId),
			(r) => {
				if (!r.success) toast.error(r.message);
				else {
					toast.success(r.message);
					setCsv("");
					setHasil(null);
				}
			},
		);
	}

	function handleEkspor(jenis: "karyawan" | "riwayat") {
		runAction(jenis === "karyawan" ? eksporKaryawan() : eksporRiwayat(), (r) => {
			if (!r.success || !r.csv) {
				toast.error(r.message);
				return;
			}
			unduhCsv(`ekspor-${jenis}-${new Date().toISOString().slice(0, 10)}.csv`, r.csv);
			toast.success(r.message);
		});
	}

	const contoh = tab === "karyawan" ? CONTOH_KARYAWAN : CONTOH_RIWAYAT;
	const tampil = hasil ? (hanyaGagal ? hasil.baris.filter((b) => b.galat.length > 0) : hasil.baris) : [];
	const masalah = kualitas.find((m) => m.kunci === masalahAktif);

	return (
		<div className="space-y-5">
			<div className="flex gap-2">
				{(
					[
						["karyawan", "Impor Karyawan"],
						["riwayat", "Impor Riwayat"],
						["ekspor", "Ekspor"],
						["kualitas", "Kualitas Data"],
					] as Array<[Tab, string]>
				).map(([id, label]) => (
					<button
						key={id}
						type="button"
						onClick={() => {
							setTab(id);
							setHasil(null);
							setCsv("");
						}}
						className={`rounded-full px-4 py-2 text-sm font-medium ${tab === id ? "bg-blue-600 text-white" : "border border-blue-200 hover:bg-blue-50"}`}
					>
						{label}
					</button>
				))}
			</div>

			{(tab === "karyawan" || tab === "riwayat") && (
				<>
					<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
						<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
							{tab === "karyawan" ? "Impor Karyawan" : "Impor Riwayat (append)"}
						</h2>
						<p className="mt-1 text-xs text-slate-500">
							{tab === "karyawan"
								? "Nomor kosong = auto-generate. NIK ganda (di file / di DB) ditolak. Maks 500 baris."
								: "Baris ditambahkan (append), data lama tak dihapus. Karyawan dicocokkan via nomorKaryawan."}
						</p>
						<div className="mt-4 flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => unduhCsv(`template-${tab}.csv`, contoh)}
								className="rounded-lg border border-blue-200 px-3 py-2 text-sm hover:bg-blue-50"
							>
								Unduh Template
							</button>
							<label className="cursor-pointer rounded-lg border border-blue-200 px-3 py-2 text-sm hover:bg-blue-50">
								Pilih File CSV
								<input
									type="file"
									accept=".csv,text/csv"
									className="hidden"
									onChange={(e) => void handleFile(e.currentTarget.files?.[0])}
								/>
							</label>
							<button
								type="button"
								disabled={isPending || !csv}
								onClick={handleValidasi}
								className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
							>
								{isPending ? "Memproses..." : "Validasi"}
							</button>
							{hasil && hasil.jumlahGagal === 0 && hasil.total > 0 && (
								<button
									type="button"
									disabled={isPending}
									onClick={handleEksekusi}
									className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
								>
									Eksekusi ({hasil.jumlahValid})
								</button>
							)}
						</div>
						{hasil && (
							<div className="mt-4">
								<div className="mb-2 flex items-center justify-between">
									<p className="text-sm text-slate-600 dark:text-slate-300">
										{hasil.jumlahValid} valid • {hasil.jumlahGagal} bermasalah dari {hasil.total}
									</p>
									<label className="flex items-center gap-2 text-xs">
										<input type="checkbox" checked={hanyaGagal} onChange={(e) => setHanyaGagal(e.currentTarget.checked)} />
										Hanya tampilkan bermasalah
									</label>
								</div>
								<DataTable
									data={tampil}
									columns={kolomHasil}
									getRowId={(r) => String(r.noBaris)}
									emptyMessage={hanyaGagal ? "Semua baris valid — siap eksekusi." : "Tidak ada baris."}
								/>
							</div>
						)}
					</div>
				</>
			)}

			{tab === "ekspor" && (
				<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ekspor CSV</h2>
					<p className="mt-1 text-xs text-slate-500">Kolom sama dengan template impor — bisa diedit lalu diimpor ulang.</p>
					<div className="mt-4 flex flex-wrap gap-2">
						<button
							type="button"
							disabled={isPending}
							onClick={() => handleEkspor("karyawan")}
							className="rounded-lg border border-blue-200 px-3 py-2 text-sm hover:bg-blue-50 disabled:opacity-60"
						>
							Unduh Karyawan
						</button>
						<button
							type="button"
							disabled={isPending}
							onClick={() => handleEkspor("riwayat")}
							className="rounded-lg border border-blue-200 px-3 py-2 text-sm hover:bg-blue-50 disabled:opacity-60"
						>
							Unduh Riwayat
						</button>
					</div>
				</div>
			)}

			{tab === "kualitas" && (
				<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Kualitas Data</h2>
					<div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
						{kualitas.map((m) => (
							<button
								key={m.kunci}
								type="button"
								onClick={() => setMasalahAktif(masalahAktif === m.kunci ? null : m.kunci)}
								className={`rounded-xl border p-3 text-left ${masalahAktif === m.kunci ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700"}`}
							>
								<p className={`text-2xl font-bold ${m.jumlah > 0 ? "text-amber-600" : "text-emerald-600"}`}>{m.jumlah}</p>
								<p className="text-xs text-slate-600 dark:text-slate-300">{m.label}</p>
							</button>
						))}
					</div>
					{masalah && (
						<div className="mt-4">
							<h3 className="text-sm font-semibold">{masalah.label} (maks 100)</h3>
							<div className="mt-2">
								<DataTable
									data={masalah.contoh}
									columns={[
										{ id: "nomor", header: "Nomor", accessor: "nomorKaryawan" },
										{ id: "nama", header: "Nama", accessor: "namaLengkap" },
										{ id: "info", header: "Info", accessor: "info" },
									]}
									getRowId={(r) => r.id}
									emptyMessage="Bersih."
								/>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
