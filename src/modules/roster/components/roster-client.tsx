"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import {
	hapusPenugasanKalender,
	hapusRoster,
	simpanPenugasanKalender,
	simpanRosterPola,
	type PenugasanKalenderItem,
	type RosterListItem,
} from "../actions/roster.actions";

type RosterClientProps = {
	mulai: string;
	selesai: string;
	roster: RosterListItem[];
	penugasan: PenugasanKalenderItem[];
	karyawanOptions: Array<{ value: string; label: string }>;
	shiftOptions: Array<{ value: string; label: string }>;
	kalenderOptions: Array<{ value: number; label: string }>;
};

function todayInput(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function RosterClient({
	mulai,
	selesai,
	roster,
	penugasan,
	karyawanOptions,
	shiftOptions,
	kalenderOptions,
}: RosterClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [checked, setChecked] = useState<string[]>([]);
	const [pola, setPola] = useState("");
	const [pkKaryawan, setPkKaryawan] = useState("");
	const [pkKalender, setPkKalender] = useState("");
	const [pkMulai, setPkMulai] = useState(todayInput());
	const [pkSelesai, setPkSelesai] = useState("");

	const shiftKodeToId = new Map(
		shiftOptions.map((o) => [o.label.split(" — ")[0].trim().toUpperCase(), o.value] as const),
	);

	function toggleCheck(id: string) {
		setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
	}

	function applyPeriode(nextMulai: string, nextSelesai: string) {
		const params = new URLSearchParams();
		if (nextMulai) params.set("mulai", nextMulai);
		if (nextSelesai) params.set("selesai", nextSelesai);
		router.push(`/roster?${params.toString()}`);
	}

	function handleSimpanRoster() {
		const kodeList = pola.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
		const ids = kodeList.map((k) => shiftKodeToId.get(k)).filter((x): x is string => Boolean(x));
		if (checked.length === 0) {
			toast.error("Pilih minimal satu karyawan.");
			return;
		}
		if (ids.length === 0) {
			toast.error("Pola tidak valid. Contoh: PAGI,SIANG,MALAM (pakai kode shift).");
			return;
		}
		startTransition(async () => {
			const result = await simpanRosterPola({ karyawanIds: checked, mulai, selesai, polaShiftIds: ids });
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			router.refresh();
		});
	}

	function handleHapusRoster() {
		if (checked.length === 0) {
			toast.error("Pilih minimal satu karyawan.");
			return;
		}
		if (!confirm(`Hapus roster periode ${mulai}–${selesai} untuk ${checked.length} karyawan?`)) return;
		startTransition(async () => {
			const result = await hapusRoster({ karyawanIds: checked, mulai, selesai });
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			router.refresh();
		});
	}

	function handleSimpanPenugasan() {
		if (!pkKaryawan || !pkKalender || !pkMulai) {
			toast.error("Karyawan, kalender, dan tanggal mulai wajib diisi.");
			return;
		}
		startTransition(async () => {
			const result = await simpanPenugasanKalender({
				karyawanId: pkKaryawan,
				kalenderKerjaId: Number(pkKalender),
				tanggalMulai: pkMulai,
				tanggalSelesai: pkSelesai || undefined,
			});
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			router.refresh();
		});
	}

	function handleHapusPenugasan(id: number) {
		if (!confirm("Hapus penugasan ini?")) return;
		startTransition(async () => {
			const result = await hapusPenugasanKalender(id);
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			router.refresh();
		});
	}

	const kolomPenugasan: DataTableColumn<PenugasanKalenderItem>[] = [
		{ id: "karyawan", header: "Karyawan", accessor: "karyawanNama" },
		{ id: "kalender", header: "Kalender", accessor: "kalenderNama" },
		{
			id: "periode",
			header: "Periode",
			render: (p) => <span>{p.tanggalMulai} – {p.tanggalSelesai ?? "…"}</span>,
			sortValue: (p) => p.tanggalMulai,
			searchValue: (p) => `${p.tanggalMulai} ${p.tanggalSelesai ?? ""}`,
		},
		{
			id: "aksi",
			header: "Aksi",
			headerClassName: "text-right",
			cellClassName: "text-right",
			sortable: false,
			searchable: false,
			render: (p) => (
				<button
					type="button"
					onClick={() => handleHapusPenugasan(p.id)}
					disabled={isPending}
					className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
				>
					Hapus
				</button>
			),
		},
	];

	const kolomRoster: DataTableColumn<RosterListItem>[] = [
		{ id: "tanggal", header: "Tanggal", accessor: "tanggal" },
		{
			id: "karyawan",
			header: "Karyawan",
			render: (r) => (
				<span>
					{r.karyawanNama} <span className="text-xs text-slate-500">({r.nomorKaryawan})</span>
				</span>
			),
			sortValue: (r) => r.karyawanNama,
			searchValue: (r) => `${r.karyawanNama} ${r.nomorKaryawan}`,
		},
		{
			id: "shift",
			header: "Shift",
			render: (r) => (
				<span className="font-medium">
					{r.shiftKode} <span className="font-normal text-slate-500">({r.shiftNama})</span>
				</span>
			),
			sortValue: (r) => r.shiftKode,
			searchValue: (r) => `${r.shiftKode} ${r.shiftNama}`,
		},
	];

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Penugasan Kalender</h2>
				<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
					Untuk pola kantor/reguler. Penugasan baru menutup yang terbuka sebelumnya.
				</p>
				<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
					<FloatingSelect
						name="pkKaryawan"
						label="Karyawan"
						value={pkKaryawan}
						onValueChange={setPkKaryawan}
						options={karyawanOptions}
						placeholder="Pilih karyawan"
						searchable
					/>
					<FloatingSelect
						name="pkKalender"
						label="Kalender"
						value={pkKalender}
						onValueChange={setPkKalender}
						options={kalenderOptions.map((k) => ({ value: String(k.value), label: k.label }))}
						placeholder="Pilih kalender"
					/>
					<FloatingInput name="pkMulai" label="Tanggal Mulai" type="date" value={pkMulai} onChange={(e) => setPkMulai(e.currentTarget.value)} />
					<FloatingInput name="pkSelesai" label="Tanggal Selesai (opsional)" type="date" value={pkSelesai} onChange={(e) => setPkSelesai(e.currentTarget.value)} />
				</div>
				<div className="mt-4 flex justify-end">
					<button
						type="button"
						onClick={handleSimpanPenugasan}
						disabled={isPending}
						className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
					>
						Simpan Penugasan
					</button>
				</div>
				<div className="mt-4">
					<DataTable
						data={penugasan}
						columns={kolomPenugasan}
						getRowId={(p) => String(p.id)}
						emptyMessage="Belum ada penugasan kalender."
					/>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Roster Shift</h2>
				<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
					Pola rotasi dari kode shift, diputar per hari. Contoh pola: PAGI,SIANG,MALAM.
				</p>
				<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
					<FloatingInput name="mulai" label="Mulai" type="date" value={mulai} onChange={(e) => applyPeriode(e.currentTarget.value, selesai)} />
					<FloatingInput name="selesai" label="Selesai" type="date" value={selesai} onChange={(e) => applyPeriode(mulai, e.currentTarget.value)} />
					<div className="md:col-span-2">
						<FloatingInput
							name="pola"
							label="Pola Shift (kode, pisahkan koma)"
							value={pola}
							onChange={(e) => setPola(e.currentTarget.value.toUpperCase())}
							placeholder="PAGI,SIANG,MALAM"
						/>
					</div>
				</div>
				<div className="mt-4">
					<p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Karyawan ({checked.length} dipilih)</p>
					<div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-blue-100 p-3 md:grid-cols-3 dark:border-blue-900/60">
						{karyawanOptions.map((k) => (
							<label key={k.value} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
								<input type="checkbox" checked={checked.includes(k.value)} onChange={() => toggleCheck(k.value)} className="h-4 w-4" />
								<span className="truncate">{k.label}</span>
							</label>
						))}
					</div>
				</div>
				<div className="mt-4 flex justify-end gap-2">
					<button
						type="button"
						onClick={handleHapusRoster}
						disabled={isPending}
						className="inline-flex h-10 items-center justify-center rounded-lg border border-red-200 px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-70"
					>
						Hapus Periode
					</button>
					<button
						type="button"
						onClick={handleSimpanRoster}
						disabled={isPending}
						className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
					>
						{isPending ? "Menyimpan..." : "Simpan Roster"}
					</button>
				</div>
				<div className="mt-4">
					<DataTable
						data={roster}
						columns={kolomRoster}
						getRowId={(r) => String(r.id)}
						emptyMessage="Belum ada roster pada periode ini."
					/>
				</div>
			</div>
		</div>
	);
}
