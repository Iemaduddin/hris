"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "react-toastify";
import { LuX, LuTrash2 } from "react-icons/lu";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { AddButton } from "@/src/components/ui/button";
import { submitJadwalKerjaAction, deleteJadwalKerja } from "../actions/work-schedule.actions";
import type {
	JadwalKerjaActionResult,
	JadwalKerjaFormValues,
	JadwalKerjaListItem,
} from "../types/work-schedule.type";

const HARI_OPTIONS = [
	{ label: "Senin", value: "SENIN" },
	{ label: "Selasa", value: "SELASA" },
	{ label: "Rabu", value: "RABU" },
	{ label: "Kamis", value: "KAMIS" },
	{ label: "Jumat", value: "JUMAT" },
	{ label: "Sabtu", value: "SABTU" },
	{ label: "Minggu", value: "MINGGU" },
];

const HARI_LABEL: Record<string, string> = {
	SENIN: "Senin",
	SELASA: "Selasa",
	RABU: "Rabu",
	KAMIS: "Kamis",
	JUMAT: "Jumat",
	SABTU: "Sabtu",
	MINGGU: "Minggu",
};

const HARI_ORDER = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];

function formatTime(value: Date | null): string {
	if (!value) return "";
	const d = new Date(value);
	return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function SubmitButton() {
	const { pending } = useFormStatus();
	return (
		<AddButton type="submit" disabled={pending} withIcon={false}>
			{pending ? "Menyimpan..." : "Simpan"}
		</AddButton>
	);
}

type JadwalKerjaFormProps = {
	kalenderKerjaId: number;
	jadwalList: JadwalKerjaListItem[];
	onRefresh: () => void;
};

export default function JadwalKerjaForm({ kalenderKerjaId, jadwalList, onRefresh }: JadwalKerjaFormProps) {
	const [state, formAction] = useActionState<JadwalKerjaActionResult | null, FormData>(submitJadwalKerjaAction, null);
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [showForm, setShowForm] = useState(false);
	const [formValues, setFormValues] = useState<JadwalKerjaFormValues>({
		kalenderKerjaId,
		hari: "",
		isHariKerja: true,
		jamMasuk: "08:00",
		jamKeluar: "17:00",
		jamMulaiIstirahat: "12:00",
		jamSelesaiIstirahat: "13:00",
	});

	useEffect(() => {
		setFormValues((prev) => ({ ...prev, kalenderKerjaId }));
	}, [kalenderKerjaId]);

	useEffect(() => {
		if (!state) return;
		if (state.success) {
			toast.success(state.message);
			setFormValues((prev) => ({
				...prev,
				hari: "",
				isHariKerja: true,
				jamMasuk: "08:00",
				jamKeluar: "17:00",
				jamMulaiIstirahat: "12:00",
				jamSelesaiIstirahat: "13:00",
			}));
			setShowForm(false);
			onRefresh();
		} else {
			toast.error(state.message);
		}
	}, [state, onRefresh]);

	useEffect(() => {
		if (state?.success) router.refresh();
	}, [state, router]);

	const usedDays = jadwalList.map((j) => j.hari);
	const availableDays = HARI_OPTIONS.filter((opt) => !usedDays.includes(opt.value));

	const sortedJadwal = [...jadwalList].sort(
		(a, b) => HARI_ORDER.indexOf(a.hari) - HARI_ORDER.indexOf(b.hari),
	);

	const handleDelete = async (id: number) => {
		const result = await deleteJadwalKerja(id);
		if (result.success) {
			toast.success(result.message);
			onRefresh();
		} else {
			toast.error(result.message);
		}
	};

	return (
		<div className="space-y-4">
			{/* Weekly Schedule Table */}
			<div className="overflow-x-auto">
				<table className="min-w-full border-separate border-spacing-0 text-sm">
					<thead>
						<tr>
							<th className="border-b border-blue-100 px-4 py-3 text-left font-semibold text-slate-700 dark:border-blue-900/60 dark:text-slate-100">
								Hari
							</th>
							<th className="border-b border-blue-100 px-4 py-3 text-center font-semibold text-slate-700 dark:border-blue-900/60 dark:text-slate-100">
								Status
							</th>
							<th className="border-b border-blue-100 px-4 py-3 text-center font-semibold text-slate-700 dark:border-blue-900/60 dark:text-slate-100">
								Jam Masuk
							</th>
							<th className="border-b border-blue-100 px-4 py-3 text-center font-semibold text-slate-700 dark:border-blue-900/60 dark:text-slate-100">
								Jam Keluar
							</th>
							<th className="border-b border-blue-100 px-4 py-3 text-center font-semibold text-slate-700 dark:border-blue-900/60 dark:text-slate-100">
								Istirahat
							</th>
							<th className="border-b border-blue-100 px-4 py-3 text-right font-semibold text-slate-700 dark:border-blue-900/60 dark:text-slate-100">
								Aksi
							</th>
						</tr>
					</thead>
					<tbody>
						{HARI_ORDER.map((hari) => {
							const jadwal = jadwalList.find((j) => j.hari === hari);
							const isWork = jadwal?.isHariKerja ?? false;

							return (
								<tr key={hari} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
									<td className="border-b border-blue-100 px-4 py-3 font-medium text-slate-900 dark:border-blue-900/60 dark:text-slate-100">
										{HARI_LABEL[hari]}
									</td>
									<td className="border-b border-blue-100 px-4 py-3 text-center dark:border-blue-900/60">
										{jadwal ? (
											isWork ? (
												<span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
													Kerja
												</span>
											) : (
												<span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
													Libur
												</span>
											)
										) : (
											<span className="text-xs text-slate-400 dark:text-slate-500">-</span>
										)}
									</td>
									<td className="border-b border-blue-100 px-4 py-3 text-center text-slate-700 dark:border-blue-900/60 dark:text-slate-200">
										{jadwal && isWork ? formatTime(jadwal.jamMasuk) : "-"}
									</td>
									<td className="border-b border-blue-100 px-4 py-3 text-center text-slate-700 dark:border-blue-900/60 dark:text-slate-200">
										{jadwal && isWork ? formatTime(jadwal.jamKeluar) : "-"}
									</td>
									<td className="border-b border-blue-100 px-4 py-3 text-center text-slate-700 dark:border-blue-900/60 dark:text-slate-200">
										{jadwal && isWork && jadwal.jamMulaiIstirahat && jadwal.jamSelesaiIstirahat
											? `${formatTime(jadwal.jamMulaiIstirahat)} - ${formatTime(jadwal.jamSelesaiIstirahat)}`
											: "-"}
									</td>
									<td className="border-b border-blue-100 px-4 py-3 text-right dark:border-blue-900/60">
										{jadwal && (
											<div className="flex items-center justify-end gap-1">
												<button
													type="button"
													onClick={() => handleDelete(jadwal.id)}
													className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
													title="Hapus"
												>
													<LuTrash2 className="h-4 w-4" />
												</button>
											</div>
										)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Add Button */}
			{availableDays.length > 0 && !showForm && (
				<div className="flex justify-end">
					<button
						type="button"
						onClick={() => setShowForm(true)}
						className="inline-flex h-10 items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-blue-900/30"
					>
						+ Tambah Jadwal
					</button>
				</div>
			)}

			{/* Inline Form */}
			{showForm && availableDays.length > 0 && (
				<div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
					<div className="mb-3 flex items-center justify-between">
						<h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tambah Jadwal Baru</h4>
						<button
							type="button"
							onClick={() => setShowForm(false)}
							className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
						>
							<LuX className="h-5 w-5" />
						</button>
					</div>

					<form ref={formRef} action={formAction} className="space-y-3">
						<input type="hidden" name="kalenderKerjaId" value={kalenderKerjaId} readOnly />

						<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
							<FloatingSelect
								name="hari"
								label="Hari"
								value={formValues.hari}
								onValueChange={(v) => setFormValues((prev) => ({ ...prev, hari: v }))}
								options={availableDays}
								placeholder="Contoh: Senin"
								errorText={state?.errors?.hari}
							/>

							<FloatingSelect
								name="isHariKerja"
								label="Status Hari"
								value={formValues.isHariKerja ? "true" : "false"}
								onValueChange={(v) => setFormValues((prev) => ({ ...prev, isHariKerja: v === "true" }))}
								options={[
									{ label: "Hari Kerja", value: "true" },
									{ label: "Hari Libur", value: "false" },
								]}
							/>

							{formValues.isHariKerja && (
								<>
									<FloatingInput
										name="jamMasuk"
										label="Jam Masuk"
										type="time"
										value={formValues.jamMasuk}
										onChange={(e) => setFormValues((prev) => ({ ...prev, jamMasuk: e.target.value }))}
										placeholder="08:00"
										errorText={state?.errors?.jamMasuk}
									/>
									<FloatingInput
										name="jamKeluar"
										label="Jam Keluar"
										type="time"
										value={formValues.jamKeluar}
										onChange={(e) => setFormValues((prev) => ({ ...prev, jamKeluar: e.target.value }))}
										placeholder="17:00"
										errorText={state?.errors?.jamKeluar}
									/>
									<FloatingInput
										name="jamMulaiIstirahat"
										label="Mulai Istirahat"
										type="time"
										value={formValues.jamMulaiIstirahat ?? ""}
										onChange={(e) => setFormValues((prev) => ({ ...prev, jamMulaiIstirahat: e.target.value || null }))}
										placeholder="12:00"
									/>
									<FloatingInput
										name="jamSelesaiIstirahat"
										label="Selesai Istirahat"
										type="time"
										value={formValues.jamSelesaiIstirahat ?? ""}
										onChange={(e) => setFormValues((prev) => ({ ...prev, jamSelesaiIstirahat: e.target.value || null }))}
										placeholder="13:00"
									/>
								</>
							)}
						</div>

						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setShowForm(false)}
								className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
							>
								Batal
							</button>
							<SubmitButton />
						</div>
					</form>
				</div>
			)}
		</div>
	);
}
