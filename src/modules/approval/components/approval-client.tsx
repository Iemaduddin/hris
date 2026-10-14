"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import { prosesPengajuanAction, type RiwayatApprovalItem } from "../actions/approval.actions";
import type { AntrianItem, ReferensiType } from "../lib/approval-engine";

const TYPE_LABEL: Record<string, string> = {
	CUTI: "Cuti/Izin",
	LEMBUR: "Lembur",
	DINAS: "Dinas/WFH",
	MUTASI: "Mutasi",
	RESIGN: "Resign",
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

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
					Menunggu Persetujuan ({antrian.length})
				</h2>
				<div className="mt-4 overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold">Jenis</th>
								<th className="px-4 py-3 text-left font-semibold">Nomor</th>
								<th className="px-4 py-3 text-left font-semibold">Karyawan</th>
								<th className="px-4 py-3 text-left font-semibold">Ringkasan</th>
								<th className="px-4 py-3 text-right font-semibold">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{antrian.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-4 py-6 text-center text-slate-500">
										Tidak ada yang menunggu.
									</td>
								</tr>
							) : (
								antrian.map((item) => (
									<tr key={`${item.type}-${item.id}`} className="border-b border-blue-100 dark:border-blue-900/60">
										<td className="px-4 py-3 font-medium">{TYPE_LABEL[item.type] ?? item.type}</td>
										<td className="px-4 py-3">{item.nomor}</td>
										<td className="px-4 py-3">
											{item.karyawanNama} <span className="text-xs text-slate-500">({item.nomorKaryawan})</span>
										</td>
										<td className="px-4 py-3">{item.ringkasan}</td>
										<td className="px-4 py-3 text-right">
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
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
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
				<div className="mt-4 overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold">Jenis</th>
								<th className="px-4 py-3 text-left font-semibold">Tahap</th>
								<th className="px-4 py-3 text-left font-semibold">Keputusan</th>
								<th className="px-4 py-3 text-left font-semibold">Waktu</th>
							</tr>
						</thead>
						<tbody>
							{riwayat.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-4 py-6 text-center text-slate-500">
										Belum ada riwayat.
									</td>
								</tr>
							) : (
								riwayat.map((r) => (
									<tr key={r.id} className="border-b border-blue-100 dark:border-blue-900/60">
										<td className="px-4 py-3">{TYPE_LABEL[r.type] ?? r.type}</td>
										<td className="px-4 py-3">{r.tahap}</td>
										<td className="px-4 py-3 font-medium">{r.status}</td>
										<td className="px-4 py-3">{r.diprosesPada ? new Date(r.diprosesPada).toLocaleString("id-ID") : "-"}</td>
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
