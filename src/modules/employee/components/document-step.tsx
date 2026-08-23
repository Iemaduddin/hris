"use client";

import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import FloatingTextarea from "@/src/components/ui/floating-input/textarea";
import type { DocumentStepProps } from "../types/step-props.type";

function removeWithConfirm(onRemove: () => void) {
	if (!window.confirm("Yakin ingin menghapus item ini?")) return;
	onRemove();
}

function emptyDocument() {
	return {
		documentType: "KTP",
		name: "",
		fileUrl: "",
		fileSize: "",
		mimeType: "",
		expiredAt: "",
		note: "",
	};
}

export default function DocumentStep({ value, onChange, errorMap, referenceOptions }: DocumentStepProps) {
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
				<div key={`document-${index}`} className="rounded-lg border border-blue-100 p-4 dark:border-blue-900/60">
					<div className="mb-3 flex items-center justify-between">
						<h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Dokumen #{index + 1}</h4>
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
							name={`document-type-${index}`}
							label="Jenis Dokumen"
							value={row.documentType}
							onValueChange={(val) => updateRow(index, "documentType", val)}
							options={referenceOptions.jenisDokumen}
						/>
						<FloatingInput
							name={`document-name-${index}`}
							label="Nama Dokumen"
							value={row.name}
							onChange={(e) => updateRow(index, "name", e.target.value)}
							errorText={getRowError(index, "name")}
						/>
						<FloatingInput
							name={`document-fileUrl-${index}`}
							label="URL File"
							value={row.fileUrl}
							onChange={(e) => updateRow(index, "fileUrl", e.target.value)}
							errorText={getRowError(index, "fileUrl")}
						/>

						<FloatingInput
							name={`document-fileSize-${index}`}
							label="Ukuran File (bytes)"
							type="number"
							value={row.fileSize}
							onChange={(e) => updateRow(index, "fileSize", e.target.value)}
						/>
						<FloatingInput
							name={`document-mimeType-${index}`}
							label="MIME Type"
							value={row.mimeType}
							onChange={(e) => updateRow(index, "mimeType", e.target.value)}
						/>
						<FloatingInput
							name={`document-expiredAt-${index}`}
							label="Tanggal Kadaluarsa"
							type="date"
							value={row.expiredAt}
							onChange={(e) => updateRow(index, "expiredAt", e.target.value)}
						/>

						<FloatingTextarea
							name={`document-note-${index}`}
							label="Catatan"
							value={row.note}
							onChange={(e) => updateRow(index, "note", e.target.value)}
							containerClassName="md:col-span-3"
						/>
					</div>
				</div>
			))}

			<button
				type="button"
				onClick={() => onChange((prev) => [...prev, emptyDocument()])}
				className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
			>
				Tambah Dokumen
			</button>
		</div>
	);
}
