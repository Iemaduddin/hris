"use client";

import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import type { FamilyStepProps } from "../types/step-props.type";

function removeWithConfirm(onRemove: () => void) {
	if (!window.confirm("Yakin ingin menghapus item ini?")) return;
	onRemove();
}

function emptyFamily() {
	return {
		name: "",
		relation: "PASANGAN",
		gender: "LAKI_LAKI",
		birthDate: "",
		nationalId: "",
		occupation: "",
	};
}

export default function FamilyStep({ value, onChange, errorMap, referenceOptions }: FamilyStepProps) {
	function updateRow(index: number, field: string, val: string) {
		onChange((prev) =>
			prev.map((item, i) => (i === index ? { ...item, [field]: val } : item)),
		);
	}

	function getRowError(index: number, field: string) {
		return errorMap[`${index}.${field}`];
	}

	return (
		<div className="space-y-4">
			{value.map((row, index) => (
				<div key={`family-${index}`} className="rounded-lg border border-blue-100 p-4 dark:border-blue-900/60">
					<div className="mb-3 flex items-center justify-between">
						<h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Data Keluarga #{index + 1}</h4>
						<button
							type="button"
							onClick={() =>
								removeWithConfirm(() =>
									onChange((prev) => prev.filter((_, i) => i !== index)),
								)
							}
							className="text-xs font-medium text-red-600 hover:underline"
						>
							Hapus
						</button>
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<FloatingInput
							name={`family-name-${index}`}
							label="Nama"
							value={row.name}
							onChange={(e) => updateRow(index, "name", e.target.value)}
							errorText={getRowError(index, "name")}
						/>
						<FloatingSelect
							name={`family-relation-${index}`}
							label="Hubungan"
							value={row.relation}
							searchable={false}
							onValueChange={(val) => updateRow(index, "relation", val)}
							options={referenceOptions.hubunganKeluarga}
						/>
						<FloatingSelect
							name={`family-gender-${index}`}
							label="Jenis Kelamin"
							value={row.gender}
							searchable={false}
							onValueChange={(val) => updateRow(index, "gender", val)}
							options={referenceOptions.jenisKelamin}
						/>

						<FloatingInput
							name={`family-birthDate-${index}`}
							label="Tanggal Lahir"
							type="date"
							value={row.birthDate}
							onChange={(e) => updateRow(index, "birthDate", e.target.value)}
						/>
						<FloatingInput
							name={`family-nationalId-${index}`}
							label="NIK"
							value={row.nationalId}
							onChange={(e) => updateRow(index, "nationalId", e.target.value)}
						/>
						<FloatingInput
							name={`family-occupation-${index}`}
							label="Pekerjaan"
							value={row.occupation}
							onChange={(e) => updateRow(index, "occupation", e.target.value)}
						/>
					</div>
				</div>
			))}

			<button
				type="button"
				onClick={() => onChange((prev) => [...prev, emptyFamily()])}
				className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
			>
				Tambah Keluarga
			</button>
		</div>
	);
}
