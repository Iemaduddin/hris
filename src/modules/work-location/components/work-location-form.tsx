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
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

const EMPTY_FORM: WorkLocationFormValues = {
	id: "",
	nama: "",
	kode: null,
	alamat: null,
	kota: null,
	provinsi: null,
	kodePos: null,
	latitude: null,
	longitude: null,
	radiusMeter: null,
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

/** "" atau teks tidak terbaca → null; angka valid dikembalikan apa adanya. */
function parseNumberOrNull(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const parsed = Number(trimmed);
	return Number.isNaN(parsed) ? null : parsed;
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
		latitude: location.latitude,
		longitude: location.longitude,
		radiusMeter: location.radiusMeter,
		isActive: location.isActive,
	};
}

export default function WorkLocationForm({ locations }: WorkLocationFormProps) {
	const [state, formAction] = useActionState<WorkLocationActionResult | null, FormData>(submitWorkLocationAction, null);
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [selectedLocationId, setSelectedLocationId] = useState("");

	function handlePilihEdit(id: string) {
		setSelectedLocationId(id);
		formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	const kolomLokasi: DataTableColumn<WorkLocationOption>[] = [
		{
			id: "nama",
			header: "Nama",
			render: (location) => <span className="font-medium">{location.nama}</span>,
			sortValue: (location) => location.nama,
			searchValue: (location) => `${location.nama} ${location.kode ?? ""} ${location.kota ?? ""}`,
		},
		{
			id: "kode",
			header: "Kode",
			render: (location) => <span>{location.kode ?? "-"}</span>,
			sortValue: (location) => location.kode ?? "-",
			searchValue: (location) => location.kode ?? "",
		},
		{
			id: "kota",
			header: "Kota",
			render: (location) => <span>{location.kota ?? "-"}</span>,
			sortValue: (location) => location.kota ?? "-",
			searchValue: (location) => location.kota ?? "",
		},
		{
			id: "provinsi",
			header: "Provinsi",
			render: (location) => <span>{location.provinsi ?? "-"}</span>,
			sortValue: (location) => location.provinsi ?? "-",
			searchValue: (location) => location.provinsi ?? "",
		},
		{
			id: "radius",
			header: "Radius",
			headerClassName: "text-right",
			cellClassName: "text-right",
			render: (location) => <span>{location.radiusMeter == null ? "-" : `${location.radiusMeter} m`}</span>,
			sortValue: (location) => location.radiusMeter ?? 0,
			searchable: false,
		},
		{
			id: "status",
			header: "Status",
			render: (location) => <span>{location.isActive ? "Aktif" : "Tidak Aktif"}</span>,
			sortValue: (location) => (location.isActive ? "Aktif" : "Tidak Aktif"),
			searchable: false,
		},
		{
			id: "aksi",
			header: "Aksi",
			headerClassName: "text-right",
			cellClassName: "text-right",
			sortable: false,
			searchable: false,
			render: (location) => (
				<EditButton
					type="button"
					size="xs"
					withIcon={false}
					onClick={() => handlePilihEdit(location.id)}
				>
					Edit
				</EditButton>
			),
		},
	];

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

		const orderedFields = ["nama", "kode", "alamat", "kota", "provinsi", "kodePos", "latitude", "longitude", "radiusMeter"] as const;

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

				<FloatingInput
					name="latitude"
					label="Latitude"
					inputMode="decimal"
					placeholder="-6.2088"
					value={formValues.latitude == null ? "" : String(formValues.latitude)}
					onChange={(event) => setFormValues((prev) => ({ ...prev, latitude: parseNumberOrNull(event.currentTarget.value) }))}
					errorText={state?.errors?.latitude}
				/>
				<FloatingInput
					name="longitude"
					label="Longitude"
					inputMode="decimal"
					placeholder="106.8456"
					value={formValues.longitude == null ? "" : String(formValues.longitude)}
					onChange={(event) => setFormValues((prev) => ({ ...prev, longitude: parseNumberOrNull(event.currentTarget.value) }))}
					errorText={state?.errors?.longitude}
				/>
				<FloatingInput
					name="radiusMeter"
					label="Radius Presensi (meter)"
					inputMode="numeric"
					placeholder="Kosongkan bila tidak divalidasi"
					value={formValues.radiusMeter == null ? "" : String(formValues.radiusMeter)}
					onChange={(event) => setFormValues((prev) => ({ ...prev, radiusMeter: parseNumberOrNull(event.currentTarget.value) }))}
					errorText={state?.errors?.radiusMeter}
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

				<div className="p-4">
					<DataTable
						data={locations}
						columns={kolomLokasi}
						getRowId={(location) => location.id}
						emptyMessage="Belum ada lokasi kerja."
					/>
				</div>
			</div>
		</form>
	);
}
