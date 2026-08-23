"use client";

import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import type { EducationStepProps } from "../types/step-props.type";

function boolOptions() {
	return [
		{ value: "true", label: "Ya" },
		{ value: "false", label: "Tidak" },
	];
}

function removeWithConfirm(onRemove: () => void) {
	if (!window.confirm("Yakin ingin menghapus item ini?")) return;
	onRemove();
}

function emptyEducation() {
	return {
		degree: "S1",
		institution: "",
		major: "",
		startYear: "",
		graduationYear: "",
		gpa: "",
		isHighest: false,
		documentUrl: "",
	};
}

export default function EducationStep({ value, onChange, errorMap, referenceOptions }: EducationStepProps) {
	function updateRow(index: number, field: string, val: string | boolean) {
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
				<div key={`education-${index}`} className="rounded-lg border border-blue-100 p-4 dark:border-blue-900/60">
					<div className="mb-3 flex items-center justify-between">
						<h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Pendidikan #{index + 1}</h4>
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
						<FloatingSelect
							name={`education-degree-${index}`}
							label="Jenjang"
							value={row.degree}
							onValueChange={(val) => updateRow(index, "degree", val)}
							options={referenceOptions.gelarPendidikan}
							searchable={false}
						/>
						<FloatingInput
							name={`education-institution-${index}`}
							label="Institusi"
							value={row.institution}
							onChange={(e) => updateRow(index, "institution", e.target.value)}
							errorText={getRowError(index, "institution")}
						/>
						<FloatingInput
							name={`education-major-${index}`}
							label="Jurusan"
							value={row.major}
							onChange={(e) => updateRow(index, "major", e.target.value)}
						/>
						<FloatingInput
							name={`education-startYear-${index}`}
							label="Tahun Masuk"
							type="number"
							value={row.startYear}
							onChange={(e) => updateRow(index, "startYear", e.target.value)}
						/>
						<FloatingInput
							name={`education-graduationYear-${index}`}
							label="Tahun Lulus"
							type="number"
							value={row.graduationYear}
							onChange={(e) => updateRow(index, "graduationYear", e.target.value)}
						/>
						<FloatingInput
							name={`education-gpa-${index}`}
							label="IPK"
							value={row.gpa}
							onChange={(e) => updateRow(index, "gpa", e.target.value)}
						/>
						<FloatingInput
							name={`education-documentUrl-${index}`}
							label="URL Dokumen"
							value={row.documentUrl}
							onChange={(e) => updateRow(index, "documentUrl", e.target.value)}
							containerClassName="md:col-span-2"
						/>
						<FloatingSelect
							name={`education-isHighest-${index}`}
							label="Pendidikan Tertinggi"
							value={row.isHighest ? "true" : "false"}
							onValueChange={(val) => updateRow(index, "isHighest", val === "true")}
							options={boolOptions()}
						/>
					</div>
				</div>
			))}

			<button
				type="button"
				onClick={() => onChange((prev) => [...prev, emptyEducation()])}
				className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
			>
				Tambah Pendidikan
			</button>
		</div>
	);
}
