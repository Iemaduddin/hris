"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import {
	finalisasiRun,
	hitungSalaryRun,
	terbitkanRun,
	type RunDetailItem,
	type SalaryRunItem,
} from "../actions/payroll.actions";

const rupiah = new Intl.NumberFormat("id-ID");

export default function RunDetailClient({ run, detail }: { run: SalaryRunItem; detail: RunDetailItem[] }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	function runAction(action: Promise<{ success: boolean; message: string }>) {
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

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Periode {run.periode}</h2>
						<p className="mt-1 text-sm text-slate-500">
							{run.mulai} – {run.selesai} • {run.status.replaceAll("_", " ")} • {run.jumlahKaryawan} karyawan • Total {rupiah.format(Number(run.totalBersih))}
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						{["DRAF", "DIHITUNG"].includes(run.status) ? (
							<button type="button" onClick={() => runAction(hitungSalaryRun(run.id))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
								Hitung
							</button>
						) : null}						{run.status === "DIHITUNG" ? (
							<button type="button" onClick={() => runAction(finalisasiRun(run.id))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-amber-600 px-3 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-70">
								Finalisasi (Kunci)
							</button>
						) : null}
						{run.status === "FINAL" ? (
							<button type="button" onClick={() => runAction(terbitkanRun(run.id))} disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70">
								Terbitkan Payslip
							</button>
						) : null}
						{["DIHITUNG", "FINAL", "DITERBITKAN"].includes(run.status) ? (
							<a href={`/api/payroll/disburse?runId=${run.id}`} className="inline-flex h-9 items-center rounded-lg border border-blue-200 px-3 text-sm hover:bg-blue-50">
								Unduh CSV Bank
							</a>
						) : null}
					</div>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold">Karyawan</th>
								<th className="px-4 py-3 text-right font-semibold">Pokok</th>
								<th className="px-4 py-3 text-right font-semibold">Pendapatan</th>
								<th className="px-4 py-3 text-right font-semibold">Potongan</th>
								<th className="px-4 py-3 text-right font-semibold">Bersih</th>
								<th className="px-4 py-3 text-right font-semibold">Biaya PT</th>
								<th className="px-4 py-3 text-right font-semibold">Detail</th>
							</tr>
						</thead>
						<tbody>
							{detail.map((d) => (
								<tr key={d.id} className="border-b border-blue-100 dark:border-blue-900/60">
									<td className="px-4 py-3">
										{d.karyawanNama} <span className="text-xs text-slate-500">({d.nomorKaryawan})</span>
										<details className="mt-1 text-xs text-slate-500">
											<summary className="cursor-pointer">Rincian</summary>
											<ul className="mt-1 space-y-1">
												{d.rincian.map((r) => (
													<li key={r.kode} className="flex justify-between gap-4">
														<span>
															{r.nama} {r.keterangan ? `(${r.keterangan})` : ""}
														</span>
														<span className={r.kelompok === "POTONGAN" || r.kelompok === "IURAN" ? "text-red-600" : r.kelompok === "BIAYA_PERUSAHAAN" ? "text-sky-700" : "text-emerald-700"}>
															{rupiah.format(r.jumlah)}
														</span>
													</li>
												))}
											</ul>
										</details>
									</td>
									<td className="px-4 py-3 text-right">{rupiah.format(Number(d.gajiPokok))}</td>
									<td className="px-4 py-3 text-right">{rupiah.format(Number(d.totalPendapatan))}</td>
									<td className="px-4 py-3 text-right">{rupiah.format(Number(d.totalPotongan))}</td>
									<td className="px-4 py-3 text-right font-semibold">{rupiah.format(Number(d.gajiBersih))}</td>
									<td className="px-4 py-3 text-right text-slate-500">{rupiah.format(Number(d.totalBiayaPerusahaan))}</td>
									<td className="px-4 py-3 text-right">
										{run.status === "DITERBITKAN" ? (
											<Link href={`/payroll/payslip/SLIP-${run.periode}-${d.karyawanId.slice(-6).toUpperCase()}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
												Slip
											</Link>
										) : (
											<span className="text-xs text-slate-400">-</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
