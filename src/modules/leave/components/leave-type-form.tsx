"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { deleteJenisCuti, generateSaldoAction, saveJenisCuti, type JenisCutiItem } from "../actions/leave.actions";

const KATEGORI_OPTIONS = [
	{ value: "CUTI", label: "Cuti" },
	{ value: "IZIN", label: "Izin" },
];

const BOOL_OPTIONS = [
	{ value: "true", label: "Ya" },
	{ value: "false", label: "Tidak" },
];

const EMPTY = { kode: "", nama: "", kategori: "CUTI", menggunakanSaldo: "false", jatahTahunan: "", wajibLampiran: "false", isActive: "true" };

export default function JenisCutiForm({ items, tahunAktif }: { items: JenisCutiItem[]; tahunAktif: number }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [values, setValues] = useState(EMPTY);
	const [tahun, setTahun] = useState(String(tahunAktif));

	function applySelection(id: number | null) {
		setSelectedId(id);
		const next = items.find((i) => i.id === id);
		setValues(
			next
				? {
						kode: next.kode,
						nama: next.nama,
						kategori: next.kategori,
						menggunakanSaldo: next.menggunakanSaldo ? "true" : "false",
						jatahTahunan: next.jatahTahunan ?? "",
						wajibLampiran: next.wajibLampiran ? "true" : "false",
						isActive: next.isActive ? "true" : "false",
					}
				: EMPTY,
		);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const fd = new FormData();
		if (selectedId) fd.set("id", String(selectedId));
		fd.set("kode", values.kode);
		fd.set("nama", values.nama);
		fd.set("kategori", values.kategori);
		fd.set("menggunakanSaldo", values.menggunakanSaldo);
		fd.set("jatahTahunan", values.jatahTahunan);
		fd.set("wajibLampiran", values.wajibLampiran);
		fd.set("isActive", values.isActive);
		startTransition(async () => {
			const result = await saveJenisCuti(fd);
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			applySelection(null);
			router.refresh();
		});
	}

	function handleDelete(id: number) {
		if (!confirm("Hapus jenis ini?")) return;
		startTransition(async () => {
			const result = await deleteJenisCuti(id);
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			if (selectedId === id) applySelection(null);
			router.refresh();
		});
	}

	function handleGenerate() {
		startTransition(async () => {
			const result = await generateSaldoAction(Number(tahun));
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
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
					{selectedId ? "Edit Jenis" : "Jenis Baru"}
				</h2>
				<form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
					<FloatingInput name="kode" label="Kode" value={values.kode} onChange={(e) => setValues((p) => ({ ...p, kode: e.currentTarget.value.toUpperCase() }))} required />
					<FloatingInput name="nama" label="Nama" value={values.nama} onChange={(e) => setValues((p) => ({ ...p, nama: e.currentTarget.value }))} required />
					<FloatingSelect name="kategori" label="Kategori" value={values.kategori} onValueChange={(v) => setValues((p) => ({ ...p, kategori: v }))} options={KATEGORI_OPTIONS} />
					<FloatingSelect name="menggunakanSaldo" label="Pakai Saldo" value={values.menggunakanSaldo} onValueChange={(v) => setValues((p) => ({ ...p, menggunakanSaldo: v }))} options={BOOL_OPTIONS} />
					<FloatingInput name="jatahTahunan" label="Jatah Tahunan" type="number" value={values.jatahTahunan} onChange={(e) => setValues((p) => ({ ...p, jatahTahunan: e.currentTarget.value }))} />
					<FloatingSelect name="wajibLampiran" label="Wajib Lampiran" value={values.wajibLampiran} onValueChange={(v) => setValues((p) => ({ ...p, wajibLampiran: v }))} options={BOOL_OPTIONS} />
					<FloatingSelect name="isActive" label="Aktif" value={values.isActive} onValueChange={(v) => setValues((p) => ({ ...p, isActive: v }))} options={BOOL_OPTIONS} />
					<div className="flex items-end justify-end gap-2 md:col-span-4">
						{selectedId ? (
							<button type="button" onClick={() => applySelection(null)} className="inline-flex h-10 items-center rounded-lg border border-blue-200 px-4 text-sm hover:bg-blue-50">
								Buat Baru
							</button>
						) : null}
						<button type="submit" disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
							{isPending ? "Menyimpan..." : "Simpan"}
						</button>
					</div>
				</form>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Generate Saldo Tahunan</h2>
				<div className="mt-4 flex flex-wrap items-end gap-4">
					<FloatingInput name="tahun" label="Tahun" type="number" value={tahun} onChange={(e) => setTahun(e.currentTarget.value)} />
					<button type="button" onClick={handleGenerate} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70">
						Generate
					</button>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold">Kode</th>
								<th className="px-4 py-3 text-left font-semibold">Nama</th>
								<th className="px-4 py-3 text-left font-semibold">Kategori</th>
								<th className="px-4 py-3 text-right font-semibold">Jatah</th>
								<th className="px-4 py-3 text-left font-semibold">Aktif</th>
								<th className="px-4 py-3 text-right font-semibold">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item) => (
								<tr key={item.id} className="border-b border-blue-100 dark:border-blue-900/60">
									<td className="px-4 py-3 font-medium">{item.kode}</td>
									<td className="px-4 py-3">{item.nama}</td>
									<td className="px-4 py-3">{item.kategori}</td>
									<td className="px-4 py-3 text-right">{item.menggunakanSaldo ? item.jatahTahunan : "-"}</td>
									<td className="px-4 py-3">{item.isActive ? "Ya" : "Tidak"}</td>
									<td className="px-4 py-3 text-right">
										<div className="inline-flex gap-2">
											<button type="button" onClick={() => applySelection(item.id)} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
												Edit
											</button>
											<button type="button" onClick={() => handleDelete(item.id)} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
												Hapus
											</button>
										</div>
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
