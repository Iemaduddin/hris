"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { getRekapBulanan, hitungUlangRekapAction, type RekapBulananItem } from "../actions/recap.actions";

type RekapClientProps = {
	tahun: number;
	bulan: number;
	karyawanId: string;
	items: RekapBulananItem[];
	karyawanOptions: Array<{ value: string; label: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" });
const timeFormatter = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });

const STATUS_STYLE: Record<string, string> = {
	HADIR: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
	TERLAMBAT: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
	ALPA: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
	CUTI: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
	IZIN: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
	SAKIT: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
	DINAS: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200",
	LIBUR: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export default function RekapClient({ tahun, bulan, karyawanId, items, karyawanOptions }: RekapClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [filterKaryawan, setFilterKaryawan] = useState(karyawanId);

	const monthValue = `${tahun}-${String(bulan).padStart(2, "0")}`;

	function applyFilter(nextBulan: string, nextKaryawan: string) {
		const params = new URLSearchParams();
		if (nextBulan) params.set("periode", nextBulan);
		if (nextKaryawan) params.set("karyawanId", nextKaryawan);
		router.push(`/recap?${params.toString()}`);
	}

	function handleHitungUlang() {
		const ids = karyawanId ? [karyawanId] : karyawanOptions.map((k) => k.value);
		if (ids.length === 0) {
			toast.error("Tidak ada karyawan aktif.");
			return;
		}
		const first = new Date(tahun, bulan - 1, 1);
		const last = new Date(tahun, bulan, 0);
		const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

		startTransition(async () => {
			const result = await hitungUlangRekapAction(ids, fmt(first), fmt(last));
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			router.refresh();
		});
	}

	const ringkas = items.reduce<Record<string, number>>((acc, item) => {
		acc[item.status] = (acc[item.status] ?? 0) + 1;
		return acc;
	}, {});

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<div className="flex flex-wrap items-end gap-4">
					<FloatingInput
						name="periode"
						label="Periode"
						type="month"
						value={monthValue}
						onChange={(e) => applyFilter(e.currentTarget.value, filterKaryawan)}
					/>
					<div className="min-w-64 flex-1">
						<FloatingSelect
							name="karyawanId"
							label="Karyawan (kosongkan = semua)"
							value={filterKaryawan}
							onValueChange={(v) => {
								setFilterKaryawan(v);
								applyFilter(monthValue, v);
							}}
							options={karyawanOptions}
							placeholder="Semua karyawan"
							searchable
						/>
					</div>
					<button
						type="button"
						onClick={handleHitungUlang}
						disabled={isPending}
						className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
					>
						{isPending ? "Menghitung..." : "Hitung Ulang Periode Ini"}
					</button>
				</div>
				{items.length > 0 ? (
					<div className="mt-4 flex flex-wrap gap-2 text-xs">
						{Object.entries(ringkas).map(([status, count]) => (
							<span key={status} className={`rounded-full px-3 py-1 font-semibold ${STATUS_STYLE[status] ?? ""}`}>
								{status}: {count}
							</span>
						))}
					</div>
				) : null}
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold">Tanggal</th>
								<th className="px-4 py-3 text-left font-semibold">Karyawan</th>
								<th className="px-4 py-3 text-left font-semibold">Status</th>
								<th className="px-4 py-3 text-right font-semibold">Telat</th>
								<th className="px-4 py-3 text-right font-semibold">Pulang Cepat</th>
								<th className="px-4 py-3 text-right font-semibold">Lembur</th>
								<th className="px-4 py-3 text-left font-semibold">Masuk–Keluar</th>
							</tr>
						</thead>
						<tbody>
							{items.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-4 py-6 text-center text-slate-500">
										Belum ada rekap. Klik “Hitung Ulang Periode Ini”.
									</td>
								</tr>
							) : (
								items.map((item) => (
									<tr key={item.id} className="border-b border-blue-100 dark:border-blue-900/60">
										<td className="px-4 py-3">{dateFormatter.format(new Date(item.tanggal))}</td>
										<td className="px-4 py-3">
											{item.karyawanNama} <span className="text-xs text-slate-500">({item.nomorKaryawan})</span>
										</td>
										<td className="px-4 py-3">
											<span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[item.status] ?? ""}`}>
												{item.status}
											</span>
										</td>
										<td className="px-4 py-3 text-right">{item.telatMenit}&prime;</td>
										<td className="px-4 py-3 text-right">{item.pulangCepatMenit}&prime;</td>
										<td className="px-4 py-3 text-right">{item.lemburMenit}&prime;</td>
										<td className="px-4 py-3">
											{item.masukAktual ? timeFormatter.format(new Date(item.masukAktual)) : "-"}
											{" – "}
											{item.keluarAktual ? timeFormatter.format(new Date(item.keluarAktual)) : "-"}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
