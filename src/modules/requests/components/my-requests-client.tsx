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
} from "@/src/modules/leave/actions/leave.actions";
import {
	ajukanLembur,
	batalLembur,
	buatLembur,
	type LemburItem,
} from "@/src/modules/overtime/actions/overtime.actions";
import {
	ajukanDinas,
	batalDinas,
	buatDinas,
	type DinasItem,
} from "@/src/modules/duty/actions/duty.actions";

type Props = {
	karyawanId: string;
	cuti: PengajuanCutiItem[];
	lembur: LemburItem[];
	dinas: DinasItem[];
	jenisOptions: Array<{ value: number; label: string }>;
	saldo: Array<{ jenis: string; sisa: string }>;
};

function todayInput(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function PengajuanSayaClient({ karyawanId, cuti, lembur, dinas, jenisOptions, saldo }: Props) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [tab, setTab] = useState<"cuti" | "lembur" | "dinas">("cuti");

	const [jenisId, setJenisId] = useState("");
	const [mulai, setMulai] = useState(todayInput());
	const [selesai, setSelesai] = useState(todayInput());
	const [alasan, setAlasan] = useState("");
	const [tanggal, setTanggal] = useState(todayInput());
	const [jamMulai, setJamMulai] = useState("");
	const [jamSelesai, setJamSelesai] = useState("");
	const [jenisDinas, setJenisDinas] = useState("DINAS_LUAR");
	const [lokasi, setLokasi] = useState("");
	const [keperluan, setKeperluan] = useState("");

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

	const tabs = [
		{ key: "cuti", label: "Cuti / Izin" },
		{ key: "lembur", label: "Lembur" },
		{ key: "dinas", label: "Dinas / WFH" },
	] as const;

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sisa Saldo Cuti</h2>
				<div className="mt-3 flex flex-wrap gap-2 text-sm">
					{saldo.length === 0 ? (
						<span className="text-slate-500">Belum ada saldo tahun ini.</span>
					) : (
						saldo.map((s) => (
							<span key={s.jenis} className="rounded-full bg-sky-100 px-3 py-1 font-semibold text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
								{s.jenis}: {s.sisa}
							</span>
						))
					)}
				</div>
			</div>

			<div className="flex gap-2">
				{tabs.map((t) => (
					<button
						key={t.key}
						type="button"
						onClick={() => setTab(t.key)}
						className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
							tab === t.key
								? "border-blue-500 bg-blue-600 text-white"
								: "border-blue-200 text-slate-700 hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200"
						}`}
					>
						{t.label}
					</button>
				))}
			</div>

			{tab === "cuti" ? (
				<>
					<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
						<h2 className="text-lg font-semibold">Ajukan Cuti / Izin</h2>
						<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
							<FloatingSelect name="jenisId" label="Jenis" value={jenisId} onValueChange={setJenisId} options={jenisOptions.map((j) => ({ value: String(j.value), label: j.label }))} placeholder="Pilih jenis" />
							<FloatingInput name="mulai" label="Tanggal Mulai" type="date" value={mulai} onChange={(e) => setMulai(e.currentTarget.value)} />
							<FloatingInput name="selesai" label="Tanggal Selesai" type="date" value={selesai} onChange={(e) => setSelesai(e.currentTarget.value)} />
							<FloatingInput name="alasan" label="Alasan" value={alasan} onChange={(e) => setAlasan(e.currentTarget.value)} />
						</div>
						<div className="mt-4 flex justify-end">
							<button
								type="button"
								disabled={isPending}
								onClick={() => {
									if (!jenisId) {
										toast.error("Pilih jenis.");
										return;
									}
									run(buatPengajuanCuti({ karyawanId, jenisId: Number(jenisId), mulai, selesai, alasan }));
								}}
								className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
							>
								Simpan Draf
							</button>
						</div>
					</div>
					<PengajuanTable
						cols={["Nomor", "Jenis", "Periode", "Hari", "Status"]}
						rows={cuti.map((c) => ({
							id: c.id,
							status: c.status,
							cells: [c.nomor, c.jenisNama, `${c.mulai} – ${c.selesai}`, c.jumlahHari, c.status.replaceAll("_", " ")],
						}))}
						isPending={isPending}
						onAjukan={(id) => run(ajukanCuti(id))}
						onBatal={(id) => run(batalCuti(id, false))}
					/>
				</>
			) : null}

			{tab === "lembur" ? (
				<>
					<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
						<h2 className="text-lg font-semibold">Ajukan Lembur</h2>
						<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
							<FloatingInput name="tanggal" label="Tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.currentTarget.value)} />
							<FloatingInput name="jamMulai" label="Jam Mulai" type="time" value={jamMulai} onChange={(e) => setJamMulai(e.currentTarget.value)} />
							<FloatingInput name="jamSelesai" label="Jam Selesai" type="time" value={jamSelesai} onChange={(e) => setJamSelesai(e.currentTarget.value)} />
							<FloatingInput name="alasanLembur" label="Alasan" value={alasan} onChange={(e) => setAlasan(e.currentTarget.value)} />
						</div>
						<div className="mt-4 flex justify-end">
							<button
								type="button"
								disabled={isPending}
								onClick={() => {
									if (!jamMulai || !jamSelesai || !alasan.trim()) {
										toast.error("Lengkapi jam dan alasan.");
										return;
									}
									run(buatLembur({ karyawanId, tanggal, jamMulai, jamSelesai, alasan }));
								}}
								className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
							>
								Simpan Draf
							</button>
						</div>
					</div>
					<PengajuanTable
						cols={["Tanggal", "Jam", "Total", "Status"]}
						rows={lembur.map((l) => ({
							id: l.id,
							status: l.status,
							cells: [l.tanggal, `${l.jamMulai}–${l.jamSelesai}`, `${l.jumlahJam} jam`, l.status.replaceAll("_", " ")],
						}))}
						isPending={isPending}
						ajukanLabel={["DRAFT"]}
						batalLabel={["DRAFT", "DIAJUKAN"]}
						onAjukan={(id) => run(ajukanLembur(id))}
						onBatal={(id) => run(batalLembur(id))}
					/>
				</>
			) : null}

			{tab === "dinas" ? (
				<>
					<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
						<h2 className="text-lg font-semibold">Ajukan Dinas / WFH</h2>
						<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
							<FloatingSelect name="jenisDinas" label="Jenis" value={jenisDinas} onValueChange={setJenisDinas} options={[{ value: "DINAS_LUAR", label: "Dinas Luar" }, { value: "WFH", label: "WFH" }]} />
							<FloatingInput name="mulaiDinas" label="Tanggal Mulai" type="date" value={mulai} onChange={(e) => setMulai(e.currentTarget.value)} />
							<FloatingInput name="selesaiDinas" label="Tanggal Selesai" type="date" value={selesai} onChange={(e) => setSelesai(e.currentTarget.value)} />
							<FloatingInput name="lokasi" label="Lokasi" value={lokasi} onChange={(e) => setLokasi(e.currentTarget.value)} />
							<FloatingInput name="keperluan" label="Keperluan" value={keperluan} onChange={(e) => setKeperluan(e.currentTarget.value)} />
						</div>
						<div className="mt-4 flex justify-end">
							<button
								type="button"
								disabled={isPending}
								onClick={() => {
									if (!keperluan.trim()) {
										toast.error("Isi keperluan.");
										return;
									}
									run(buatDinas({ karyawanId, jenis: jenisDinas, mulai, selesai, lokasi, keperluan }));
								}}
								className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
							>
								Simpan Draf
							</button>
						</div>
					</div>
					<PengajuanTable
						cols={["Nomor", "Jenis", "Periode", "Status"]}
						rows={dinas.map((d) => ({
							id: d.id,
							status: d.status,
							cells: [d.nomor, d.jenis === "DINAS_LUAR" ? "Dinas Luar" : "WFH", `${d.mulai} – ${d.selesai}`, d.status.replaceAll("_", " ")],
						}))}
						isPending={isPending}
						onAjukan={(id) => run(ajukanDinas(id))}
						onBatal={(id) => run(batalDinas(id, false))}
					/>
				</>
			) : null}
		</div>
	);
}

function PengajuanTable({
	cols,
	rows,
	isPending,
	onAjukan,
	onBatal,
	ajukanLabel = ["DRAFT"],
	batalLabel = ["DRAFT", "DIAJUKAN", "MENUNGGU_APPROVAL"],
}: {
	cols: string[];
	rows: Array<{ id: string; status: string; cells: string[] }>;
	isPending: boolean;
	onAjukan: (id: string) => void;
	onBatal: (id: string) => void;
	ajukanLabel?: string[];
	batalLabel?: string[];
}) {
	return (
		<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
			<div className="overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead>
						<tr className="border-b border-blue-100 dark:border-blue-900/60">
							{cols.map((c) => (
								<th key={c} className="px-4 py-3 text-left font-semibold">
									{c}
								</th>
							))}
							<th className="px-4 py-3 text-right font-semibold">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{rows.length === 0 ? (
							<tr>
								<td colSpan={cols.length + 1} className="px-4 py-6 text-center text-slate-500">
									Belum ada pengajuan.
								</td>
							</tr>
						) : (
							rows.map((row) => (
								<tr key={row.id} className="border-b border-blue-100 dark:border-blue-900/60">
									{row.cells.map((cell, i) => (
										<td key={i} className="px-4 py-3">
											{cell}
										</td>
									))}
									<td className="px-4 py-3 text-right">
										<div className="inline-flex gap-2">
											{ajukanLabel.includes(row.status) ? (
												<button type="button" onClick={() => onAjukan(row.id)} disabled={isPending} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50 disabled:opacity-60">
													Ajukan
												</button>
											) : null}
											{batalLabel.includes(row.status) ? (
												<button type="button" onClick={() => onBatal(row.id)} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
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
	);
}
