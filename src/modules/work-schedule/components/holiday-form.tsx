"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "react-toastify";
import { LuX, LuTrash2, LuCalendarOff } from "react-icons/lu";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import FloatingTextarea from "@/src/components/ui/floating-input/textarea";
import { AddButton } from "@/src/components/ui/button";
import { submitHariLiburAction, deleteHariLibur } from "../actions/work-schedule.actions";
import type {
	HariLiburActionResult,
	HariLiburFormValues,
	HariLiburListItem,
} from "../types/work-schedule.type";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
	dateStyle: "medium",
});

function SubmitButton() {
	const { pending } = useFormStatus();
	return (
		<AddButton type="submit" disabled={pending} withIcon={false}>
			{pending ? "Menyimpan..." : "Simpan"}
		</AddButton>
	);
}

type HariLiburFormProps = {
	kalenderKerjaId: number;
	hariLiburList: HariLiburListItem[];
	onRefresh: () => void;
};

export default function HariLiburForm({ kalenderKerjaId, hariLiburList, onRefresh }: HariLiburFormProps) {
	const [state, formAction] = useActionState<HariLiburActionResult | null, FormData>(submitHariLiburAction, null);
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [showForm, setShowForm] = useState(false);
	const [formValues, setFormValues] = useState<HariLiburFormValues>({
		kalenderKerjaId,
		tanggal: "",
		nama: "",
		deskripsi: null,
		isCutiBersama: false,
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
				tanggal: "",
				nama: "",
				deskripsi: null,
				isCutiBersama: false,
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

	const handleDelete = async (id: number) => {
		const result = await deleteHariLibur(id);
		if (result.success) {
			toast.success(result.message);
			onRefresh();
		} else {
			toast.error(result.message);
		}
	};

	return (
		<div className="space-y-4">
			{/* Table */}
			{hariLiburList.length > 0 ? (
				<div className="overflow-x-auto">
					<table className="min-w-full border-separate border-spacing-0 text-sm">
						<thead>
							<tr>
								<th className="border-b border-blue-100 px-4 py-3 text-left font-semibold text-slate-700 dark:border-blue-900/60 dark:text-slate-100">
									Tanggal
								</th>
								<th className="border-b border-blue-100 px-4 py-3 text-left font-semibold text-slate-700 dark:border-blue-900/60 dark:text-slate-100">
									Nama
								</th>
								<th className="border-b border-blue-100 px-4 py-3 text-left font-semibold text-slate-700 dark:border-blue-900/60 dark:text-slate-100">
									Deskripsi
								</th>
								<th className="border-b border-blue-100 px-4 py-3 text-center font-semibold text-slate-700 dark:border-blue-900/60 dark:text-slate-100">
									Jenis
								</th>
								<th className="border-b border-blue-100 px-4 py-3 text-right font-semibold text-slate-700 dark:border-blue-900/60 dark:text-slate-100">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody>
							{hariLiburList.map((h) => (
								<tr key={h.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
									<td className="border-b border-blue-100 px-4 py-3 text-slate-900 dark:border-blue-900/60 dark:text-slate-100">
										{dateFormatter.format(new Date(h.tanggal))}
									</td>
									<td className="border-b border-blue-100 px-4 py-3 font-medium text-slate-900 dark:border-blue-900/60 dark:text-slate-100">
										{h.nama}
									</td>
									<td className="border-b border-blue-100 px-4 py-3 text-slate-600 dark:border-blue-900/60 dark:text-slate-400">
										{h.deskripsi || "-"}
									</td>
									<td className="border-b border-blue-100 px-4 py-3 text-center dark:border-blue-900/60">
										{h.isCutiBersama ? (
											<span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
												Cuti Bersama
											</span>
										) : (
											<span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
												Libur Nasional
											</span>
										)}
									</td>
									<td className="border-b border-blue-100 px-4 py-3 text-right dark:border-blue-900/60">
										<button
											type="button"
											onClick={() => handleDelete(h.id)}
											className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
											title="Hapus"
										>
											<LuTrash2 className="h-4 w-4" />
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-6 text-center dark:border-blue-800 dark:bg-blue-900/20">
					<LuCalendarOff className="mx-auto h-8 w-8 text-blue-400" />
					<p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Belum ada hari libur.</p>
					<p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Klik tombol di bawah untuk menambah hari libur.</p>
				</div>
			)}

			{/* Add Button */}
			{!showForm && (
				<div className="flex justify-end">
					<button
						type="button"
						onClick={() => setShowForm(true)}
						className="inline-flex h-10 items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-blue-900/30"
					>
						+ Tambah Hari Libur
					</button>
				</div>
			)}

			{/* Inline Form */}
			{showForm && (
				<div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
					<div className="mb-3 flex items-center justify-between">
						<h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tambah Hari Libur Baru</h4>
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
							<FloatingInput
								name="tanggal"
								label="Tanggal"
								type="date"
								value={formValues.tanggal}
								onChange={(e) => setFormValues((prev) => ({ ...prev, tanggal: e.target.value }))}
								placeholder="Pilih tanggal"
								errorText={state?.errors?.tanggal}
								required
							/>
							<FloatingInput
								name="nama"
								label="Nama Hari Libur"
								value={formValues.nama}
								onChange={(e) => setFormValues((prev) => ({ ...prev, nama: e.target.value }))}
								placeholder="Contoh: Hari Raya Idul Fitri"
								errorText={state?.errors?.nama}
								required
							/>
							<FloatingSelect
								name="isCutiBersama"
								label="Jenis Hari Libur"
								value={formValues.isCutiBersama ? "true" : "false"}
								onValueChange={(v) => setFormValues((prev) => ({ ...prev, isCutiBersama: v === "true" }))}
								options={[
									{ label: "Libur Nasional", value: "false" },
									{ label: "Cuti Bersama", value: "true" },
								]}
							/>
						</div>

						<FloatingTextarea
							name="deskripsi"
							label="Deskripsi (opsional)"
							value={formValues.deskripsi ?? ""}
							onChange={(e) => setFormValues((prev) => ({ ...prev, deskripsi: e.target.value || null }))}
							placeholder="Contoh: Libur nasional perayaan kemerdekaan"
						/>

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
