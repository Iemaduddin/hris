"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import FloatingTextarea from "@/src/components/ui/floating-input/textarea";
import { submitWorkLocationAction } from "../actions/work-location.actions";
import type {
	WorkLocationActionResult,
	WorkLocationFormValues,
	WorkLocationOption,
} from "../types/work-location.type";

const EMPTY_FORM: WorkLocationFormValues = {
	id: "",
	name: "",
	code: null,
	address: null,
	city: null,
	province: null,
	postalCode: null,
	latitude: null,
	longitude: null,
	radiusMeters: 100,
	isActive: true,
};

function SubmitButton({ hasId }: { hasId: boolean }) {
	const { pending } = useFormStatus();

	return (
		<button
			type="submit"
			disabled={pending}
			className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
		>
			{pending ? "Menyimpan..." : hasId ? "Update Work Location" : "Simpan Work Location"}
		</button>
	);
}

type WorkLocationFormProps = {
	locations: WorkLocationOption[];
};

function toLocationLabel(location: WorkLocationOption) {
	const codeSuffix = location.code ? ` (${location.code})` : "";
	return `${location.name}${codeSuffix}`;
}

function toFormValues(location?: WorkLocationOption): WorkLocationFormValues {
	if (!location) return EMPTY_FORM;

	return {
		id: location.id,
		name: location.name,
		code: location.code,
		address: location.address,
		city: location.city,
		province: location.province,
		postalCode: location.postalCode,
		latitude: location.latitude,
		longitude: location.longitude,
		radiusMeters: location.radiusMeters ?? 100,
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

		const orderedFields = [
			"name",
			"code",
			"address",
			"city",
			"province",
			"postalCode",
			"latitude",
			"longitude",
			"radiusMeters",
		] as const;

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
		if (!state?.success) return;

		toast.success(state.message || "Data work location berhasil disimpan.");
		if (state.id) setSelectedLocationId(state.id);
		router.refresh();
	}, [router, state]);

	return (
		<form ref={formRef} action={formAction} className="mt-4">
			<div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-blue-100 p-3 dark:border-blue-900/60">
				<div className="flex-1">
					<FloatingSelect
						name="selectedLocation"
						label="Pilih Work Location (Edit)"
						value={selectedLocationId}
						onValueChange={(nextValue) => setSelectedLocationId(nextValue)}
						options={locationSelectOptions}
						placeholder="Buat work location baru"
						searchable
					/>
				</div>
				<button
					type="button"
					onClick={() => setSelectedLocationId("")}
					className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
				>
					Buat Baru
				</button>
			</div>

			<input type="hidden" name="id" value={formValues.id ?? ""} readOnly />

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<FloatingInput
					name="name"
					label="Nama Lokasi"
					value={formValues.name}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || "";
						setFormValues((prev) => ({ ...prev, name: nextValue }));
					}}
					errorText={state?.errors?.name}
					required
				/>
				<FloatingInput
					name="code"
					label="Kode"
					value={formValues.code ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, code: nextValue }));
					}}
					errorText={state?.errors?.code}
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
					name="city"
					label="Kota"
					value={formValues.city ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, city: nextValue }));
					}}
					errorText={state?.errors?.city}
				/>
				<FloatingInput
					name="province"
					label="Provinsi"
					value={formValues.province ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, province: nextValue }));
					}}
					errorText={state?.errors?.province}
				/>
				<FloatingInput
					name="postalCode"
					label="Kode Pos"
					value={formValues.postalCode ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, postalCode: nextValue }));
					}}
					errorText={state?.errors?.postalCode}
				/>

				<FloatingInput
					name="latitude"
					label="Latitude"
					value={formValues.latitude?.toString() ?? ""}
					onChange={(event) => {
						const raw = event.currentTarget.value.trim();
						const parsed = raw ? Number.parseFloat(raw) : null;
						setFormValues((prev) => ({ ...prev, latitude: parsed === null || Number.isNaN(parsed) ? null : parsed }));
					}}
					errorText={state?.errors?.latitude}
				/>
				<FloatingInput
					name="longitude"
					label="Longitude"
					value={formValues.longitude?.toString() ?? ""}
					onChange={(event) => {
						const raw = event.currentTarget.value.trim();
						const parsed = raw ? Number.parseFloat(raw) : null;
						setFormValues((prev) => ({ ...prev, longitude: parsed === null || Number.isNaN(parsed) ? null : parsed }));
					}}
					errorText={state?.errors?.longitude}
				/>
				<FloatingInput
					name="radiusMeters"
					label="Radius (meter)"
					type="number"
					min={1}
					value={String(formValues.radiusMeters)}
					onChange={(event) => {
						const parsed = Number.parseInt(event.currentTarget.value || "100", 10);
						setFormValues((prev) => ({ ...prev, radiusMeters: Number.isNaN(parsed) ? 100 : parsed }));
					}}
					errorText={state?.errors?.radiusMeters}
				/>

				<FloatingTextarea
					name="address"
					label="Alamat"
					value={formValues.address ?? ""}
					onChange={(event) => {
						const nextValue = event.currentTarget.value || null;
						setFormValues((prev) => ({ ...prev, address: nextValue }));
					}}
					errorText={state?.errors?.address}
					containerClassName="md:col-span-3"
				/>
			</div>

			<div className="mt-4 flex items-center justify-end gap-4">
				<SubmitButton hasId={Boolean(formValues.id)} />
			</div>

			<div className="mt-6 rounded-xl border border-blue-100 dark:border-blue-900/60">
				<div className="border-b border-blue-100 px-4 py-3 dark:border-blue-900/60">
					<h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Daftar Work Location</h3>
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
										Belum ada work location.
									</td>
								</tr>
							) : (
								locations.map((location) => (
									<tr
										key={location.id}
										className={`border-b border-blue-100 dark:border-blue-900/60 ${selectedLocationId === location.id ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}
									>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{location.name}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{location.code ?? "-"}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{location.city ?? "-"}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{location.province ?? "-"}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-200">{location.isActive ? "Aktif" : "Tidak Aktif"}</td>
										<td className="px-4 py-3 text-right">
											<button
												type="button"
												onClick={() => {
													setSelectedLocationId(location.id);
													formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
												}}
												className="inline-flex h-8 items-center justify-center rounded-lg border border-blue-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
											>
												Edit
											</button>
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