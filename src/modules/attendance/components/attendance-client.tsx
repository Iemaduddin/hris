"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { catatPresensi, koreksiPresensi, type PresensiListItem } from "../actions/attendance.actions";

const TIPE_OPTIONS = [
	{ value: "MASUK", label: "Masuk" },
	{ value: "KELUAR", label: "Keluar" },
	{ value: "MULAI_ISTIRAHAT", label: "Mulai Istirahat" },
	{ value: "SELESAI_ISTIRAHAT", label: "Selesai Istirahat" },
	{ value: "KELUAR_KANTOR", label: "Keluar Kantor" },
	{ value: "KEMBALI_KANTOR", label: "Kembali Kantor" },
];

type PresensiClientProps = {
	tanggal: string;
	items: PresensiListItem[];
	karyawanOptions: Array<{ value: string; label: string }>;
};

const timeFormatter = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function PresensiClient({ tanggal, items, karyawanOptions }: PresensiClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [karyawanId, setKaryawanId] = useState("");
	const [tipe, setTipe] = useState("MASUK");
	const [waktu, setWaktu] = useState("");
	const [catatan, setCatatan] = useState("");

	function handleCatat() {
		if (!karyawanId) {
			toast.error("Pilih karyawan.");
			return;
		}
		startTransition(async () => {
			const result = await catatPresensi({ karyawanId, tipe, waktu: waktu || undefined, catatan });
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			setCatatan("");
			setWaktu("");
			router.refresh();
		});
	}

	function handleKoreksi(id: string, status: "DIKOREKSI" | "DIBATALKAN") {
		const note = status === "DIBATALKAN" ? prompt("Alasan pembatalan:") ?? "" : "";
		if (status === "DIBATALKAN" && !note) return;
		startTransition(async () => {
			const result = await koreksiPresensi(id, status, note);
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
			<div className="flex items-center justify-end">
				<FloatingInput
					name="filterTanggal"
					label="Tanggal"
					type="date"
					value={tanggal}
					onChange={(e) => {
						if (e.currentTarget.value) router.push(`/attendance?tanggal=${e.currentTarget.value}`);
					}}
				/>
			</div>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Catat Manual</h2>
				<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
					<FloatingSelect
						name="karyawanId"
						label="Karyawan"
						value={karyawanId}
						onValueChange={setKaryawanId}
						options={karyawanOptions}
						placeholder="Pilih karyawan"
						searchable
					/>
					<FloatingSelect
						name="tipe"
						label="Tipe"
						value={tipe}
						onValueChange={setTipe}
						options={TIPE_OPTIONS}
					/>
					<FloatingInput
						name="waktu"
						label="Waktu (kosongkan = sekarang)"
						type="datetime-local"
						value={waktu}
						onChange={(e) => setWaktu(e.currentTarget.value)}
					/>
					<FloatingInput
						name="catatan"
						label="Catatan"
						value={catatan}
						onChange={(e) => setCatatan(e.currentTarget.value)}
					/>
				</div>
				<div className="mt-4 flex justify-end">
					<button
						type="button"
						onClick={handleCatat}
						disabled={isPending}
						className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
					>
						{isPending ? "Menyimpan..." : "Catat Presensi"}
					</button>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Log {tanggal}</h2>
				<div className="mt-4 overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold">Waktu</th>
								<th className="px-4 py-3 text-left font-semibold">Karyawan</th>
								<th className="px-4 py-3 text-left font-semibold">Tipe</th>
								<th className="px-4 py-3 text-left font-semibold">Sumber</th>
								<th className="px-4 py-3 text-left font-semibold">Status</th>
								<th className="px-4 py-3 text-right font-semibold">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{items.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-4 py-6 text-center text-slate-500">
										Belum ada presensi pada tanggal ini.
									</td>
								</tr>
							) : (
								items.map((item) => (
									<tr key={item.id} className="border-b border-blue-100 dark:border-blue-900/60">
										<td className="px-4 py-3">{timeFormatter.format(new Date(item.waktu))}</td>
										<td className="px-4 py-3">
											{item.karyawanNama} <span className="text-xs text-slate-500">({item.nomorKaryawan})</span>
										</td>
										<td className="px-4 py-3">{item.tipe.replaceAll("_", " ")}</td>
										<td className="px-4 py-3">{item.sumber}</td>
										<td className="px-4 py-3">{item.status}</td>
										<td className="px-4 py-3 text-right">
											{item.status === "VALID" ? (
												<div className="inline-flex gap-2">
													<button
														type="button"
														onClick={() => handleKoreksi(item.id, "DIKOREKSI")}
														disabled={isPending}
														className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50 disabled:opacity-60"
													>
														Koreksi
													</button>
													<button
														type="button"
														onClick={() => handleKoreksi(item.id, "DIBATALKAN")}
														disabled={isPending}
														className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
													>
														Batal
													</button>
												</div>
											) : (
												<span className="text-xs text-slate-400">{item.catatan ?? "-"}</span>
											)}
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
