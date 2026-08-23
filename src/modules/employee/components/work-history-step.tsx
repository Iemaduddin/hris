"use client";

import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingTextarea from "@/src/components/ui/floating-input/textarea";
import type { WorkHistoryStepProps } from "../types/step-props.type";

function removeWithConfirm(onRemove: () => void) {
	if (!window.confirm("Yakin ingin menghapus item ini?")) return;
	onRemove();
}

function emptyWorkHistory() {
	return {
		companyName: "",
		position: "",
		startDate: "",
		endDate: "",
		lastSalary: "",
		reasonLeaving: "",
		referencePhone: "",
	};
}

export default function WorkHistoryStep({ value, onChange, errorMap }: WorkHistoryStepProps) {
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
				<div key={`work-history-${index}`} className="rounded-lg border border-blue-100 p-4 dark:border-blue-900/60">
					<div className="mb-3 flex items-center justify-between">
						<h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Riwayat Kerja #{index + 1}</h4>
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
							name={`work-companyName-${index}`}
							label="Nama Perusahaan"
							value={row.companyName}
							onChange={(e) => updateRow(index, "companyName", e.target.value)}
							errorText={getRowError(index, "companyName")}
						/>
						<FloatingInput
							name={`work-position-${index}`}
							label="Posisi"
							value={row.position}
							onChange={(e) => updateRow(index, "position", e.target.value)}
						/>
						<FloatingInput
							name={`work-lastSalary-${index}`}
							label="Gaji Terakhir"
							type="currency"
							value={row.lastSalary}
							onChange={(e) => updateRow(index, "lastSalary", e.target.value)}
						/>

						<FloatingInput
							name={`work-startDate-${index}`}
							label="Mulai Kerja"
							type="date"
							value={row.startDate}
							onChange={(e) => updateRow(index, "startDate", e.target.value)}
						/>
						<FloatingInput
							name={`work-endDate-${index}`}
							label="Selesai Kerja"
							type="date"
							value={row.endDate}
							onChange={(e) => updateRow(index, "endDate", e.target.value)}
						/>
						<FloatingInput
							name={`work-referencePhone-${index}`}
							label="No. Referensi"
							value={row.referencePhone}
							onChange={(e) => updateRow(index, "referencePhone", e.target.value)}
						/>

						<FloatingTextarea
							name={`work-reasonLeaving-${index}`}
							label="Alasan Berhenti"
							value={row.reasonLeaving}
							onChange={(e) => updateRow(index, "reasonLeaving", e.target.value)}
							containerClassName="md:col-span-3"
						/>
					</div>
				</div>
			))}

			<button
				type="button"
				onClick={() => onChange((prev) => [...prev, emptyWorkHistory()])}
				className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
			>
				Tambah Riwayat Kerja
			</button>
		</div>
	);
}
