"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import FloatingTextarea from "@/src/components/ui/floating-input/textarea";
import { AddButton, EditButton } from "@/src/components/ui/button";
import { submitKalenderKerjaAction } from "../actions/work-schedule.actions";
import type {
	KalenderKerjaActionResult,
	KalenderKerjaFormValues,
	KalenderKerjaListItem,
} from "../types/work-schedule.type";

const EMPTY_FORM: KalenderKerjaFormValues = {
	nama: "",
	kode: null,
	deskripsi: null,
	isDefault: false,
	isActive: true,
};

function SubmitButton({ hasId }: { hasId: boolean }) {
	const { pending } = useFormStatus();
	return (
		<AddButton type="submit" disabled={pending} withIcon={false}>
			{pending ? "Menyimpan..." : hasId ? "Update Kalender" : "Simpan Kalender"}
		</AddButton>
	);
}

type KalenderKerjaFormProps = {
	kalenderList: KalenderKerjaListItem[];
};

export default function KalenderKerjaForm({ kalenderList }: KalenderKerjaFormProps) {
	const [state, formAction] = useActionState<KalenderKerjaActionResult | null, FormData>(submitKalenderKerjaAction, null);
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [selectedId, setSelectedId] = useState<number | "">("");
	const [formValues, setFormValues] = useState<KalenderKerjaFormValues>(EMPTY_FORM);

	useEffect(() => {
		if (!state || state.success || !state.errors) return;
		const orderedFields = ["nama", "kode", "deskripsi"] as const;
		for (const field of orderedFields) {
			if (!state.errors[field]) continue;
			const el = formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`);
			if (el) {
				el.scrollIntoView({ behavior: "smooth", block: "center" });
				el.focus({ preventScroll: true });
				return;
			}
		}
	}, [state]);

	useEffect(() => {
		if (!state) return;
		if (state.success) {
			toast.success(state.message);
			setFormValues(EMPTY_FORM);
			setSelectedId("");
		} else {
			toast.error(state.message);
		}
	}, [state]);

	useEffect(() => {
		if (state?.success) router.refresh();
	}, [state, router]);

	const handleSelect = (value: string) => {
		const id = Number(value);
		setSelectedId(id || "");
		const item = kalenderList.find((k) => k.id === id);
		if (item) {
			setFormValues({
				id: item.id,
				nama: item.nama,
				kode: item.kode,
				deskripsi: item.deskripsi,
				isDefault: item.isDefault,
				isActive: item.isActive,
			});
		}
	};

	const selectOptions = kalenderList.map((k) => ({
		label: `${k.nama}${k.kode ? ` (${k.kode})` : ""}`,
		value: String(k.id),
	}));

	return (
		<form ref={formRef} action={formAction} className="space-y-4">
			<div className="flex items-center gap-3 rounded-xl border border-blue-100 p-3 dark:border-blue-900/60">
				<div className="flex-1">
					<FloatingSelect
						name="selectedKalender"
						label="Pilih Kalender (Edit)"
						value={selectedId === "" ? "" : String(selectedId)}
						onValueChange={handleSelect}
						options={selectOptions}
						placeholder="Buat kalender baru"
						searchable
					/>
				</div>
				<EditButton type="button" onClick={() => { setSelectedId(""); setFormValues(EMPTY_FORM); }} withIcon={false}>
					Buat Baru
				</EditButton>
			</div>

			<input type="hidden" name="id" value={formValues.id ?? ""} readOnly />

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<FloatingInput
					name="nama"
					label="Nama Kalender"
					value={formValues.nama}
					onChange={(e) => setFormValues((prev) => ({ ...prev, nama: e.target.value }))}
					placeholder="Contoh: Kerja Pagi (5 Hari)"
					errorText={state?.errors?.nama}
					required
				/>
				<FloatingInput
					name="kode"
					label="Kode"
					value={formValues.kode ?? ""}
					onChange={(e) => setFormValues((prev) => ({ ...prev, kode: e.target.value || null }))}
					placeholder="Contoh: KP-5H"
					errorText={state?.errors?.kode}
				/>
				<div className="flex gap-4">
					<FloatingSelect
						name="isDefault"
						label="Default"
						value={formValues.isDefault ? "true" : "false"}
						onValueChange={(v) => setFormValues((prev) => ({ ...prev, isDefault: v === "true" }))}
						options={[
							{ label: "Ya", value: "true" },
							{ label: "Tidak", value: "false" },
						]}
					/>
					<FloatingSelect
						name="isActive"
						label="Status"
						value={formValues.isActive ? "true" : "false"}
						onValueChange={(v) => setFormValues((prev) => ({ ...prev, isActive: v !== "false" }))}
						options={[
							{ label: "Aktif", value: "true" },
							{ label: "Tidak Aktif", value: "false" },
						]}
					/>
				</div>
				<FloatingTextarea
					name="deskripsi"
					label="Deskripsi"
					value={formValues.deskripsi ?? ""}
					onChange={(e) => setFormValues((prev) => ({ ...prev, deskripsi: e.target.value || null }))}
					placeholder="Contoh: Jam kerja 08:00-17:00, Senin-Jumat"
					errorText={state?.errors?.deskripsi}
					containerClassName="md:col-span-3"
				/>
			</div>

			<div className="flex items-center justify-end gap-4">
				<SubmitButton hasId={Boolean(formValues.id)} />
			</div>
		</form>
	);
}
