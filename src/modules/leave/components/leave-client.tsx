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
				<div className="mt-4 overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold">Nomor</th>
								<th className="px-4 py-3 text-left font-semibold">Karyawan</th>
								<th className="px-4 py-3 text-left font-semibold">Jenis</th>
								<th className="px-4 py-3 text-left font-semibold">Periode</th>
								<th className="px-4 py-3 text-right font-semibold">Hari</th>
								<th className="px-4 py-3 text-left font-semibold">Status</th>
								<th className="px-4 py-3 text-right font-semibold">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{items.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-4 py-6 text-center text-slate-500">
										Belum ada pengajuan.
									</td>
								</tr>
							) : (
								items.map((item) => (
									<tr key={item.id} className="border-b border-blue-100 dark:border-blue-900/60">
										<td className="px-4 py-3 font-medium">{item.nomor}</td>
										<td className="px-4 py-3">{item.karyawanNama}</td>
										<td className="px-4 py-3">{item.jenisNama}</td>
										<td className="px-4 py-3">
											{item.mulai} – {item.selesai}
										</td>
										<td className="px-4 py-3 text-right">{item.jumlahHari}</td>
										<td className="px-4 py-3">{item.status.replaceAll("_", " ")}</td>
										<td className="px-4 py-3 text-right">
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
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Saldo {tahun}</h2>
				<div className="mt-4 overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold">Karyawan</th>
								<th className="px-4 py-3 text-left font-semibold">Jenis</th>
								<th className="px-4 py-3 text-right font-semibold">Awal</th>
								<th className="px-4 py-3 text-right font-semibold">Sisa</th>
							</tr>
						</thead>
						<tbody>
							{saldo.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-4 py-6 text-center text-slate-500">
										Belum ada saldo. Generate di Pengaturan → Jenis Ketidakhadiran.
									</td>
								</tr>
							) : (
								saldo.map((s) => (
									<tr key={s.id} className="border-b border-blue-100 dark:border-blue-900/60">
										<td className="px-4 py-3">{s.karyawanNama}</td>
										<td className="px-4 py-3">{s.jenisNama}</td>
										<td className="px-4 py-3 text-right">{s.saldoAwal}</td>
										<td className="px-4 py-3 text-right font-semibold">{s.saldoAkhir}</td>
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
