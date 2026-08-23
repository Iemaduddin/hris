"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import FloatingTextarea from "@/src/components/ui/floating-input/textarea";
import { AddButton, EditButton } from "@/src/components/ui/button";
import { submitWorkLocationAction } from "../actions/work-location.actions";
import type {
	WorkLocationActionResult,
	WorkLocationFormValues,
	WorkLocationOption,
} from "../types/work-location.type";

const EMPTY_FORM: WorkLocationFormValues = {
	id: "",
	nama: "",
	kode: null,
	alamat: null,
	kota: null,
	provinsi: null,
	kodePos: null,
	isActive: true,
};

function SubmitButton({ hasId }: { hasId: boolean }) {
	const { pending } = useFormStatus();

	return (
		<AddButton type="submit" disabled={pending} withIcon={false}>
			{pending ? "Menyimpan..." : hasId ? "Update Lokasi" : "Simpan Lokasi"}
		</AddButton>
	);
}

type WorkLocationFormProps = {
	locations: WorkLocationOption[];
};

function toLocationLabel(location: WorkLocationOption) {
	const kodeSuffix = location.kode ? ` (${location.kode})` : "";
	return `${location.nama}${kodeSuffix}`;
}

function toFormValues(location?: WorkLocationOption): WorkLocationFormValues {
	if (!location) return EMPTY_FORM;

	return {
		id: location.id,
		nama: location.nama,
		kode: location.kode,
		alamat: location.alamat,
		kota: location.kota,
		provinsi: location.provinsi,
		kodePos: location.kodePos,
		isActive: location.isActive,
	};
}

export default function WorkLocationForm({ locations }: WorkLocationFormProps) {
	const [state, formAction] = useActionState<WorkLocationActionResult | null, FormData>(submitWorkLocationAction, null);
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [selectedLocationId, setSelectedLocationId] = useState("");

	const selectedLocation = useMemo(
		() => locations.find((item) => item.id === selectedLocationId),
		[locations, selectedLocationId],
	);

	const [formValues, setFormValues] = useState<WorkLocationFormValues>(() => toFormValues(selectedLocation));

	useEffect(() => {
		setFormValues(toFormValues(selectedLocation));
	}, [selectedLocation]);

	const locationSelectOptions = useMemo(
		() => locations.map((item) => ({ label: toLocationLabel(item), value: item.id })),
		[locations],
	);

	useEffect(() => {
		if (!state || state.success || !state.errors) return;

		const orderedFields = ["nama", "kode", "alamat", "kota", "provinsi", "kodePos"] as const;

		for (const field of orderedFields) {
			if (!state.errors[field]) continue;

			const namedField = formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`);
			if (namedField && namedField.tabIndex !== -1 && namedField.getAttribute("aria-hidden") !== "true") {
				namedField.scrollIntoView({ behavior: "smooth", block: "center" });
				namedField.focus({ preventScroll: true });
				return;
			}

			const selectTrigger = formRef.current?.querySelector<HTMLElement>(`[data-select-trigger-for="${field}"]`);
			if (selectTrigger) {
				selectTrigger.scrollIntoView({ behavior: "smooth", block: "center" });
				selectTrigger.focus({ preventScroll: true });
				return;
			}
		}
	}, [state]);

	useEffect(() => {
		if (!state) return;

		if (state.success) {
			toast.success(state.message || "Data lokasi berhasil disimpan.");
			if (state.id) setSelectedLocationId(state.id);
		} else {
			toast.error(state.message || "Gagal menyimpan data lokasi.");
		}
	}, [state]);

	useEffect(() => {
		if (state?.success) {
			router.refresh();
		}
	}, [state, router]);

	return (
		<form ref={formRef} action={formAction} className="mt-4">
			<div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-blue-100 p-3 dark:border-blue-900/60">
				<div className="flex-1">
					<FloatingSelect
						name="selectedLocation"
						label="Pilih Lokasi (Edit)"
						value={selectedLocationId}
						onValueChange={(nextValue) => setSelectedLocationId(nextValue)}
						options={locationSelectOptions}
						placeholder="Buat lokasi baru"
						searchable
					/>
				</div>
				<EditButton type="button" onClick={() => setSelectedLocationId("")} withIcon={false}>
					Buat Baru
				</EditButton>
			</div>

			<input type="hidden" name="id" value={formValues.id ?? ""} readOnly />

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<FloatingInput
					name="nama"
					label="Nama Lokasi"
					value={formValues.nama}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || "";
						setFormValues((prev) => ({ ...prev, nama: nextValue }));
					}}
					errorText={state?.errors?.nama}
					required
				/>
				<FloatingInput
					name="kode"
					label="Kode"
					value={formValues.kode ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, kode: nextValue }));
					}}
					errorText={state?.errors?.kode}
				/>
				<FloatingSelect
					name="isActive"
					label="Status"
					value={formValues.isActive ? "true" : "false"}
					onValueChange={(nextValue) => setFormValues((prev) => ({ ...prev, isActive: nextValue !== "false" }))}
					options={[
						{ label: "Aktif", value: "true" },
						{ label: "Tidak Aktif", value: "false" },
					]}
					errorText={state?.errors?.isActive}
				/>

				<FloatingInput
					name="kota"
					label="Kota"
					value={formValues.kota ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, kota: nextValue }));
					}}
					errorText={state?.errors?.kota}
				/>
				<FloatingInput
					name="provinsi"
					label="Provinsi"
					value={formValues.provinsi ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, provinsi: nextValue }));
					}}
					errorText={state?.errors?.provinsi}
				/>
				<FloatingInput
					name="kodePos"
					label="Kode Pos"
					value={formValues.kodePos ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, kodePos: nextValue }));
					}}
					errorText={state?.errors?.kodePos}
				/>

				<FloatingTextarea
					name="alamat"
					label="Alamat"
					value={formValues.alamat ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, alamat: nextValue }));
					}}
					errorText={state?.errors?.alamat}
					containerClassName="md:col-span-3"
				/>
			</div>

			<div className="mt-4 flex items-center justify-end gap-4">
				<SubmitButton hasId={Boolean(formValues.id)} />
			</div>

			<div className="mt-6 rounded-xl border border-blue-100 dark:border-blue-900/60">
				<div className="border-b border-blue-100 px-4 py-3 dark:border-blue-900/60">
					<h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Daftar Lokasi Kerja</h3>
					<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Klik Edit untuk memuat data ke form di atas.</p>
				</div>

				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Nama</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Kode</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Kota</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Provinsi</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-100">Status</th>
								<th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-100">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{locations.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
										Belum ada lokasi kerja.
									</td>
								</tr>
							) : (
								locations.map((location) => (
									<tr
										key={location.id}
										className={`border-b border-blue-100 dark:border-blue-900/60 ${selectedLocationId === location.id ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}
									>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{location.nama}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{location.kode ?? "-"}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{location.kota ?? "-"}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{location.provinsi ?? "-"}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{location.isActive ? "Aktif" : "Tidak Aktif"}</td>
										<td className="px-4 py-3 text-right">
												<EditButton
													type="button"
													size="xs"
													withIcon={false}
													onClick={() => {
														setSelectedLocationId(location.id);
														formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
													}}
												>
													Edit
												</EditButton>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</form>
	);
}
