"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "react-toastify";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import FloatingInput from "@/src/components/ui/floating-input/input";
import { AddButton } from "@/src/components/ui/button";
import { submitScheduleAssignmentAction } from "../actions/schedule.actions";
import type {
	ScheduleAssignmentActionResult,
	ScheduleAssignmentFormValues,
	KaryawanOption,
	JadwalKerjaOption,
} from "../types/schedule.type";

const EMPTY_FORM: ScheduleAssignmentFormValues = {
	karyawanId: "",
	jadwalKerjaId: 0,
	tanggalMulai: "",
	tanggalSelesai: null,
};

function SubmitButton({ hasId }: { hasId: boolean }) {
	const { pending } = useFormStatus();

	return (
		<AddButton type="submit" disabled={pending} withIcon={false}>
			{pending ? "Menyimpan..." : hasId ? "Update Penugasan" : "Simpan Penugasan"}
		</AddButton>
	);
}

const hariLabel: Record<string, string> = {
	SENIN: "Senin",
	SELASA: "Selasa",
	RABU: "Rabu",
	KAMIS: "Kamis",
	JUMAT: "Jumat",
	SABTU: "Sabtu",
	MINGGU: "Minggu",
};

type ScheduleAssignmentFormProps = {
	karyawan: KaryawanOption[];
	jadwalKerja: JadwalKerjaOption[];
	selectedAssignment?: ScheduleAssignmentFormValues;
	onSuccess?: () => void;
};

export default function ScheduleAssignmentForm({
	karyawan,
	jadwalKerja,
	selectedAssignment,
	onSuccess,
}: ScheduleAssignmentFormProps) {
	const [state, formAction] = useActionState<ScheduleAssignmentActionResult | null, FormData>(
		submitScheduleAssignmentAction,
		null,
	);
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [formValues, setFormValues] = useState<ScheduleAssignmentFormValues>(
		selectedAssignment ?? EMPTY_FORM,
	);

	useEffect(() => {
		if (selectedAssignment) {
			setFormValues(selectedAssignment);
		}
	}, [selectedAssignment]);

	useEffect(() => {
		if (!state || state.success || !state.errors) return;

		const orderedFields = ["karyawanId", "jadwalKerjaId", "tanggalMulai"] as const;

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
			toast.success(state.message || "Penugasan jadwal berhasil disimpan.");
			setFormValues(EMPTY_FORM);
			onSuccess?.();
		} else {
			toast.error(state.message || "Gagal menyimpan penugasan jadwal.");
		}
	}, [state, onSuccess]);

	useEffect(() => {
		if (state?.success) {
			router.refresh();
		}
	}, [state, router]);

	const karyawanOptions = karyawan.map((item) => ({
		label: `${item.namaLengkap} (${item.nomorKaryawan})`,
		value: item.id,
	}));

	const jadwalOptions = jadwalKerja.map((item) => ({
		label: `${hariLabel[item.hari] ?? item.hari} - ${item.kalenderKerja.nama}`,
		value: String(item.id),
	}));

	return (
		<form ref={formRef} action={formAction} className="space-y-4">
			<input type="hidden" name="id" value={formValues.id ?? ""} readOnly />

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<FloatingSelect
					name="karyawanId"
					label="Karyawan"
					value={formValues.karyawanId}
					onValueChange={(nextValue) => setFormValues((prev) => ({ ...prev, karyawanId: nextValue }))}
					options={karyawanOptions}
					placeholder="Pilih karyawan"
					searchable
					errorText={state?.errors?.karyawanId}
				/>

				<FloatingSelect
					name="jadwalKerjaId"
					label="Jadwal Kerja"
					value={formValues.jadwalKerjaId ? String(formValues.jadwalKerjaId) : ""}
					onValueChange={(nextValue) => setFormValues((prev) => ({ ...prev, jadwalKerjaId: Number(nextValue) }))}
					options={jadwalOptions}
					placeholder="Pilih jadwal kerja"
					searchable
					errorText={state?.errors?.jadwalKerjaId}
				/>

				<FloatingInput
					name="tanggalMulai"
					label="Tanggal Mulai"
					type="date"
					value={formValues.tanggalMulai}
					onChange={(event) => setFormValues((prev) => ({ ...prev, tanggalMulai: event.target.value }))}
					errorText={state?.errors?.tanggalMulai}
					required
				/>

				<FloatingInput
					name="tanggalSelesai"
					label="Tanggal Selesai (Opsional)"
					type="date"
					value={formValues.tanggalSelesai ?? ""}
					onChange={(event) =>
						setFormValues((prev) => ({ ...prev, tanggalSelesai: event.target.value || null }))
					}
					errorText={state?.errors?.tanggalSelesai}
				/>
			</div>

			<div className="flex items-center justify-end gap-4">
				<SubmitButton hasId={Boolean(formValues.id)} />
			</div>
		</form>
	);
}
