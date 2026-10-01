"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import { buatSalaryRun, hapusRun, type SalaryRunItem } from "../actions/payroll.actions";

const rupiah = new Intl.NumberFormat("id-ID");

function currentPeriode(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function RunListClient({ runs }: { runs: SalaryRunItem[] }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [periode, setPeriode] = useState(currentPeriode());

	function handleBuat() {
		startTransition(async () => {
			const result = await buatSalaryRun(periode);
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
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Buat Periode Baru</h2>
				<div className="mt-4 flex flex-wrap items-end gap-4">
					<FloatingInput name="periode" label="Periode (YYYY-MM)" value={periode} onChange={(e) => setPeriode(e.currentTarget.value)} />
					<button type="button" onClick={handleBuat} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
						Buat Run
					</button>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold">Periode</th>
								<th className="px-4 py-3 text-left font-semibold">Status</th>
								<th className="px-4 py-3 text-right font-semibold">Karyawan</th>
								<th className="px-4 py-3 text-right font-semibold">Total Bersih</th>
								<th className="px-4 py-3 text-right font-semibold">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{runs.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-4 py-6 text-center text-slate-500">
										Belum ada salary run.
									</td>
								</tr>
							) : (
								runs.map((r) => (
									<tr key={r.id} className="border-b border-blue-100 dark:border-blue-900/60">
										<td className="px-4 py-3 font-medium">{r.periode}</td>
										<td className="px-4 py-3">{r.status.replaceAll("_", " ")}</td>
										<td className="px-4 py-3 text-right">{r.jumlahKaryawan}</td>
										<td className="px-4 py-3 text-right">{rupiah.format(Number(r.totalBersih))}</td>
										<td className="px-4 py-3 text-right">
											<div className="inline-flex gap-2">
												<Link href={`/payroll/run/${r.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
													Buka
												</Link>
												{["DRAF", "DIHITUNG"].includes(r.status) ? (
													<button
														type="button"
														disabled={isPending}
														onClick={() => {
															if (!confirm("Hapus run ini?")) return;
															startTransition(async () => {
																const result = await hapusRun(r.id);
																if (!result.success) {
																	toast.error(result.message);
																	return;
																}
																toast.success(result.message);
																router.refresh();
															});
														}}
														className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
													>
														Hapus
													</button>
												) : null}
											</div>
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
