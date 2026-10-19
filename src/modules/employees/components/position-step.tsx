"use client";

import FloatingCheckbox from "@/src/components/ui/floating-input/checkbox";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import FloatingTextarea from "@/src/components/ui/floating-input/textarea";
import type { PositionStepProps } from "../types/step-props.type";

function removeWithConfirm(onRemove: () => void) {
	if (!window.confirm("Yakin ingin menghapus item ini?")) return;
	onRemove();
}

function emptyPosition(today: string) {
	return {
		organizationalUnitId: "",
		positionId: "",
		workLocationId: "",
		isPrimary: true,
		isCurrent: true,
		effectiveDate: today,
		note: "",
	};
}

export default function PositionStep({ value, onChange, errorMap, referenceOptions }: PositionStepProps) {
	const today = new Date().toISOString().split("T")[0];

	function updateRow(index: number, field: string, val: string | boolean) {
		onChange((prev) =>
			prev.map((item, i) => {
				if (i !== index) return item;
				const next = { ...item, [field]: val };
				if (field === "organizationalUnitId") {
					const posisiId = String(val);
					const validPositions = referenceOptions.positions.filter(
						(p) => !referenceOptions.positionUnitMap[p.value] || referenceOptions.positionUnitMap[p.value] === posisiId,
					);
					if (next.positionId && !validPositions.find((p) => p.value === next.positionId)) {
						next.positionId = "";
					}
				}
				return next;
			}),
		);
	}

	function getRowError(index: number, field: string) {
		return errorMap[`${index}.${field}`];
	}

	function getFilteredPositions(unitId: string) {
		if (!unitId) return referenceOptions.positions;
		return referenceOptions.positions.filter(
			(p) => !referenceOptions.positionUnitMap[p.value] || referenceOptions.positionUnitMap[p.value] === unitId,
		);
	}

	return (
		<div className="space-y-4">
			{value.map((row, index) => (
				<div key={`position-${index}`} className="rounded-lg border border-blue-100 p-4 dark:border-blue-900/60">
					<div className="mb-3 flex items-center justify-between">
						<h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
							{value.length === 1 ? "Penempatan Employee" : `Penempatan #${index + 1}`}
						</h4>
						{value.length > 1 && (
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
						)}
					</div>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<FloatingSelect
							name={`position-organizationalUnitId-${index}`}
							label="Unit Organisasi"
							value={row.organizationalUnitId}
							onValueChange={(val) => updateRow(index, "organizationalUnitId", val)}
							options={referenceOptions.organizationalUnits}
							placeholder="Pilih unit"
						/>
						<FloatingSelect
							name={`position-positionId-${index}`}
							label="Posisi"
							value={row.positionId}
							onValueChange={(val) => updateRow(index, "positionId", val)}
							options={getFilteredPositions(row.organizationalUnitId)}
							placeholder={row.organizationalUnitId ? "Pilih posisi (sesuai unit)" : "Pilih unit terlebih dahulu"}
							disabled={!row.organizationalUnitId}
						/>
						<FloatingSelect
							name={`position-workLocationId-${index}`}
							label="Lokasi Kerja"
							value={row.workLocationId}
							onValueChange={(val) => updateRow(index, "workLocationId", val)}
							options={referenceOptions.workLocations}
							placeholder="Pilih lokasi"
						/>
						<FloatingInput
							name={`position-effectiveDate-${index}`}
							label="Tanggal Efektif"
							type="date"
							value={row.effectiveDate || today}
							onChange={(e) => updateRow(index, "effectiveDate", e.target.value)}
							errorText={getRowError(index, "effectiveDate")}
						/>
						<FloatingCheckbox
							name={`position-isPrimary-${index}`}
							label="Jabatan Utama"
							checked={row.isPrimary}
							onChange={(e) => updateRow(index, "isPrimary", e.target.checked)}
						/>
						<FloatingCheckbox
							name={`position-isCurrent-${index}`}
							label="Posisi Saat Ini"
							checked={row.isCurrent}
							onChange={(e) => updateRow(index, "isCurrent", e.target.checked)}
						/>
						<FloatingTextarea
							name={`position-note-${index}`}
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
				onClick={() => onChange((prev) => [...prev, emptyPosition(today)])}
				className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
			>
				Tambah Penempatan
			</button>
		</div>
	);
}
