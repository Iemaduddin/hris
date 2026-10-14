"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
	deleteKomponen,
	saveKomponen,
	seedKomponenDefault,
	simpanGajiKaryawan,
	type GajiKaryawanItem,
	type KomponenItem,
} from "../actions/payroll.actions";

const KELOMPOK_OPTIONS = [
	{ value: "PENDAPATAN", label: "Pendapatan" },
	{ value: "TUNJANGAN", label: "Tunjangan" },
	{ value: "POTONGAN", label: "Potongan" },
	{ value: "IURAN", label: "Iuran (karyawan)" },
	{ value: "BIAYA_PERUSAHAAN", label: "Biaya perusahaan (tak potong gaji)" },
];

const TIPE_OPTIONS = [
	{ value: "NOMINAL", label: "Nominal tetap" },
	{ value: "PERSEN", label: "% dari gaji pokok" },
	{ value: "PER_HARI", label: "Per hari hadir" },
	{ value: "PER_JAM_LEMBUR", label: "Per jam lembur" },
	{ value: "PER_SHIFT_MALAM", label: "Per shift malam" },
];

const BOOL_OPTIONS = [
	{ value: "true", label: "Ya" },
	{ value: "false", label: "Tidak" },
];

const rupiah = new Intl.NumberFormat("id-ID");

export default function KomponenClient({
	items,
	assignMap,
}: {
	items: KomponenItem[];
	assignMap: GajiKaryawanItem[];
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [selectedId, setSelectedId] = useState("");
	const [kode, setKode] = useState("");
	const [nama, setNama] = useState("");
	const [kelompok, setKelompok] = useState("TUNJANGAN");
	const [tipe, setTipe] = useState("NOMINAL");
	const [nilai, setNilai] = useState("");
	const [batasAtas, setBatasAtas] = useState("");
	const [isActive, setIsActive] = useState("true");

	const [assignKaryawan, setAssignKaryawan] = useState("");
	const [assignChecked, setAssignChecked] = useState<string[]>([]);

	function applySelection(id: string) {
		setSelectedId(id);
		const next = items.find((i) => i.id === id);
		if (next) {
			setKode(next.kode);
			setNama(next.nama);
			setKelompok(next.kelompok);
			setTipe(next.tipe);
			setNilai(next.nilai);
			setBatasAtas(next.batasAtas ?? "");
			setIsActive(next.isActive ? "true" : "false");
		} else {
			setKode("");
			setNama("");
			setNilai("");
			setBatasAtas("");
			setIsActive("true");
		}
	}

	function handleSave() {
		if (!kode || !nama) {
			toast.error("Kode dan nama wajib diisi.");
			return;
		}
		const fd = new FormData();
		if (selectedId) fd.set("id", selectedId);
		fd.set("kode", kode);
		fd.set("nama", nama);
		fd.set("kelompok", kelompok);
		fd.set("tipe", tipe);
		fd.set("nilai", nilai || "0");
		fd.set("batasAtas", batasAtas);
		fd.set("isActive", isActive);
		startTransition(async () => {
			const result = await saveKomponen(fd);
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			applySelection("");
			router.refresh();
		});
	}

	function handleSeed() {
		startTransition(async () => {
			const result = await seedKomponenDefault();
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			router.refresh();
		});
	}

	function pickAssignKaryawan(id: string) {
		setAssignKaryawan(id);
		const found = assignMap.find((a) => a.karyawanId === id);
		setAssignChecked(found ? found.komponenIds : []);
	}

	function handleSaveAssign() {
		if (!assignKaryawan) {
			toast.error("Pilih karyawan.");
			return;
		}
		startTransition(async () => {
			const result = await simpanGajiKaryawan(assignKaryawan, assignChecked);
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
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
						{selectedId ? "Edit Komponen" : "Komponen Baru"}
					</h2>
					<button type="button" onClick={handleSeed} disabled={isPending} className="inline-flex h-9 items-center rounded-lg border border-emerald-200 px-3 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
						Seed Default MVP
					</button>
				</div>
				<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
					<FloatingInput name="kode" label="Kode" value={kode} onChange={(e) => setKode(e.currentTarget.value.toUpperCase())} />
					<FloatingInput name="nama" label="Nama" value={nama} onChange={(e) => setNama(e.currentTarget.value)} />
					<FloatingSelect name="kelompok" label="Kelompok" value={kelompok} onValueChange={setKelompok} options={KELOMPOK_OPTIONS} />
					<FloatingSelect name="tipe" label="Tipe Hitung" value={tipe} onValueChange={setTipe} options={TIPE_OPTIONS} />
					<FloatingInput name="nilai" label="Nilai" type="number" value={nilai} onChange={(e) => setNilai(e.currentTarget.value)} />
					<FloatingInput name="batasAtas" label="Batas Atas (opsional)" type="number" value={batasAtas} onChange={(e) => setBatasAtas(e.currentTarget.value)} />
					<FloatingSelect name="isActive" label="Aktif" value={isActive} onValueChange={setIsActive} options={BOOL_OPTIONS} />
				</div>
				<div className="mt-4 flex justify-end gap-2">
					{selectedId ? (
						<button type="button" onClick={() => applySelection("")} className="inline-flex h-10 items-center rounded-lg border border-blue-200 px-4 text-sm hover:bg-blue-50">
							Buat Baru
						</button>
					) : null}
					<button type="button" onClick={handleSave} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
						Simpan
					</button>
				</div>
				<div className="mt-4 overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold">Kode</th>
								<th className="px-4 py-3 text-left font-semibold">Nama</th>
								<th className="px-4 py-3 text-left font-semibold">Kelompok</th>
								<th className="px-4 py-3 text-left font-semibold">Tipe</th>
								<th className="px-4 py-3 text-right font-semibold">Nilai</th>
								<th className="px-4 py-3 text-right font-semibold">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item) => (
								<tr key={item.id} className="border-b border-blue-100 dark:border-blue-900/60">
									<td className="px-4 py-3 font-medium">{item.kode}</td>
									<td className="px-4 py-3">{item.nama}</td>
									<td className="px-4 py-3">{item.kelompok}</td>
									<td className="px-4 py-3">{item.tipe.replaceAll("_", " ")}</td>
									<td className="px-4 py-3 text-right">{item.tipe === "PERSEN" ? `${item.nilai}%` : rupiah.format(Number(item.nilai))}</td>
									<td className="px-4 py-3 text-right">
										<div className="inline-flex gap-2">
											<button type="button" onClick={() => applySelection(item.id)} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
												Edit
											</button>
											<button
												type="button"
												disabled={isPending}
												onClick={() => {
													if (!confirm("Hapus komponen ini?")) return;
													startTransition(async () => {
														const result = await deleteKomponen(item.id);
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
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Komponen per Karyawan</h2>
				<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
					<FloatingSelect
						name="assignKaryawan"
						label="Karyawan"
						value={assignKaryawan}
						onValueChange={pickAssignKaryawan}
						options={assignMap.map((a) => ({ value: a.karyawanId, label: a.karyawanNama }))}
						placeholder="Pilih karyawan"
						searchable
					/>
				</div>
				{assignKaryawan ? (
					<>
						<div className="mt-4 grid grid-cols-1 gap-1 md:grid-cols-2">
							{items.filter((i) => i.isActive).map((item) => (
								<label key={item.id} className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={assignChecked.includes(item.id)}
										onChange={() =>
											setAssignChecked((prev) => (prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id]))
										}
										className="h-4 w-4"
									/>
									<span>
										{item.kode} — {item.nama}
									</span>
								</label>
							))}
						</div>
						<div className="mt-4 flex justify-end">
							<button type="button" onClick={handleSaveAssign} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
								Simpan
							</button>
						</div>
					</>
				) : null}
			</div>
		</div>
	);
}
