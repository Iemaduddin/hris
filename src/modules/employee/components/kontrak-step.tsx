"use client";

import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import FloatingTextarea from "@/src/components/ui/floating-input/textarea";
import type { KontrakStepProps } from "../types/step-props.type";

function removeWithConfirm(onRemove: () => void) {
	if (!window.confirm("Yakin ingin menghapus item ini?")) return;
	onRemove();
}

function emptyKontrak() {
	return {
		contractNumber: "",
		contractType: "PKWTT",
		startDate: "",
		endDate: "",
		status: "DRAFT",
		baseSalary: "",
		documentUrl: "",
		note: "",
	};
}

export default function KontrakStep({ value, onChange, errorMap, referenceOptions }: KontrakStepProps) {
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
				<div key={`kontrak-${index}`} className="rounded-lg border border-blue-100 p-4 dark:border-blue-900/60">
					<div className="mb-3 flex items-center justify-between">
						<h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Kontrak Kerja #{index + 1}</h4>
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
							name={`kontrak-contractNumber-${index}`}
							label="Nomor Kontrak"
							value={row.contractNumber}
							onChange={(e) => updateRow(index, "contractNumber", e.target.value)}
							errorText={getRowError(index, "contractNumber")}
						/>
						<FloatingSelect
							name={`kontrak-contractType-${index}`}
							label="Jenis Kontrak"
							value={row.contractType}
							onValueChange={(val) => updateRow(index, "contractType", val)}
							options={referenceOptions.jenisKontrak}
						/>
						<FloatingSelect
							name={`kontrak-status-${index}`}
							label="Status"
							value={row.status}
							onValueChange={(val) => updateRow(index, "status", val)}
							options={[
								{ value: "DRAFT", label: "Draft" },
								{ value: "AKTIF", label: "Aktif" },
								{ value: "AKAN_BERAKHIR", label: "Akan Berakhir" },
								{ value: "BERAKHIR", label: "Berakhir" },
								{ value: "DIBATALKAN", label: "Dibatalkan" },
							]}
						/>

						<FloatingInput
							name={`kontrak-startDate-${index}`}
							label="Tanggal Mulai"
							type="date"
							value={row.startDate}
							onChange={(e) => updateRow(index, "startDate", e.target.value)}
							errorText={getRowError(index, "startDate")}
						/>
						<FloatingInput
							name={`kontrak-endDate-${index}`}
							label="Tanggal Selesai"
							type="date"
							value={row.endDate}
							onChange={(e) => updateRow(index, "endDate", e.target.value)}
						/>
						<FloatingInput
							name={`kontrak-baseSalary-${index}`}
							label="Gaji Pokok"
							type="number"
							value={row.baseSalary}
							onChange={(e) => updateRow(index, "baseSalary", e.target.value)}
						/>

						<FloatingInput
							name={`kontrak-documentUrl-${index}`}
							label="URL Dokumen"
							value={row.documentUrl}
							onChange={(e) => updateRow(index, "documentUrl", e.target.value)}
						/>
						<FloatingTextarea
							name={`kontrak-note-${index}`}
							label="Catatan"
							value={row.note}
							onChange={(e) => updateRow(index, "note", e.target.value)}
							containerClassName="md:col-span-2"
						/>
					</div>
				</div>
			))}

			<button
				type="button"
				onClick={() => onChange((prev) => [...prev, emptyKontrak()])}
				className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
			>
				Tambah Kontrak
			</button>
		</div>
	);
}
