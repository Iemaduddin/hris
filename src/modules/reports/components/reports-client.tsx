"use client";

import { useEffect, useState, useTransition } from "react";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { getLaporan, type LaporanHasil } from "../actions/reports.actions";

const JENIS_OPTIONS = [
	{ value: "kehadiran", label: "Kehadiran" },
	{ value: "cuti", label: "Cuti & Izin" },
	{ value: "lembur", label: "Lembur" },
	{ value: "turnover", label: "Turnover (Masuk/Keluar)" },
	{ value: "kontrak", label: "Kontrak Berakhir" },
];

function monthRange(): { mulai: string; selesai: string } {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	const mulai = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
	const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	return { mulai, selesai: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(last)}` };
}

function toCsv(columns: string[], rows: string[][]): string {
	const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
	return [columns.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

export default function LaporanClient() {
	const [isPending, startTransition] = useTransition();
	const [filterAwal] = useState(monthRange);
	const [jenis, setJenis] = useState("kehadiran");
	const [mulai, setMulai] = useState(filterAwal.mulai);
	const [selesai, setSelesai] = useState(filterAwal.selesai);
	const [hasil, setHasil] = useState<LaporanHasil | null>(null);
	const [memuatAwal, setMemuatAwal] = useState(true);

	useEffect(() => {
		let batal = false;
		getLaporan("kehadiran", filterAwal.mulai, filterAwal.selesai).then((data) => {
			if (!batal) {
				setHasil(data);
				setMemuatAwal(false);
			}
		});
		return () => {
			batal = true;
		};
	}, [filterAwal]);

	function handleTampilkan() {
		startTransition(async () => {
			setHasil(await getLaporan(jenis, mulai, selesai));
		});
	}

	function handleUnduh() {
		if (!hasil || hasil.rows.length === 0) return;
		const blob = new Blob(["\uFEFF" + toCsv(hasil.columns, hasil.rows)], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `laporan-${jenis}-${mulai}_${selesai}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<div className="flex flex-wrap items-end gap-4">
					<div className="min-w-48">
						<FloatingSelect name="jenis" label="Jenis Laporan" value={jenis} onValueChange={setJenis} options={JENIS_OPTIONS} />
					</div>
					<FloatingInput name="mulai" label="Mulai" type="date" value={mulai} onChange={(e) => setMulai(e.currentTarget.value)} />
					<FloatingInput name="selesai" label="Selesai" type="date" value={selesai} onChange={(e) => setSelesai(e.currentTarget.value)} />
					<button type="button" onClick={handleTampilkan} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
						{isPending ? "Memuat..." : "Tampilkan"}
					</button>
					{hasil && hasil.rows.length > 0 ? (
						<button type="button" onClick={handleUnduh} className="inline-flex h-10 items-center rounded-lg border border-emerald-200 px-4 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
							Unduh CSV ({hasil.rows.length})
						</button>
					) : null}
				</div>
			</div>

			{memuatAwal && !hasil ? (
			<div className="rounded-2xl border border-blue-100 bg-white p-5 text-sm text-slate-500 dark:border-blue-900/60 dark:bg-slate-900 dark:text-slate-400">
				Memuat laporan...
			</div>
		) : null}

		{hasil ? (
				<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead>
								<tr className="border-b border-blue-100 dark:border-blue-900/60">
									{hasil.columns.map((c) => (
										<th key={c} className="px-4 py-3 text-left font-semibold">
											{c}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{hasil.rows.length === 0 ? (
									<tr>
										<td colSpan={hasil.columns.length} className="px-4 py-6 text-center text-slate-500">
											Tidak ada data.
										</td>
									</tr>
								) : (
									hasil.rows.slice(0, 200).map((row, i) => (
										<tr key={i} className="border-b border-blue-100 dark:border-blue-900/60">
											{row.map((cell, j) => (
												<td key={j} className="px-4 py-3">
													{cell}
												</td>
											))}
										</tr>
									))
								)}
							</tbody>
						</table>
						{hasil.rows.length > 200 ? (
							<p className="mt-2 text-xs text-slate-400">Menampilkan 200 baris pertama. Unduh CSV untuk semua.</p>
						) : null}
					</div>
				</div>
			) : null}
		</div>
	);
}
