"use client";

import { useRef, useState } from "react";
import { toast } from "react-toastify";
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
		ijazah: "",
		transkrip: "",
	};
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "application/pdf"];
const ACCEPTED_EXTENSIONS = ".png,.jpg,.jpeg,.pdf";

function extractFileIdFromDriveUrl(url: string): string | null {
	try {
		const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
		return match ? match[1] : null;
	} catch {
		return null;
	}
}

function PdfPreviewModal({ url, onClose }: { url: string; onClose: () => void }) {
	const embedUrl = url.includes("export=view")
		? url.replace("export=view", "export=preview")
		: url;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
			<div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
					<h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Preview Dokumen</h3>
					<div className="flex items-center gap-2">
						<a
							href={url}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
						>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
								<polyline points="15 3 21 3 21 9" />
								<line x1="10" y1="14" x2="21" y2="3" />
							</svg>
							Buka di Drive
						</a>
						<button
							type="button"
							onClick={onClose}
							className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
						>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</div>
				</div>
				<div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-800">
					<iframe
						src={embedUrl}
						className="h-full w-full border-0"
						title="Preview Dokumen"
					/>
				</div>
			</div>
		</div>
	);
}

function FileUploadField({
	name,
	label,
	value,
	onFileSelect,
	onFileReady,
	onFileDelete,
	uploadType,
	employeeName,
	grade,
}: {
	name: string;
	label: string;
	value: string;
	onFileSelect: (url: string) => void;
	onFileReady?: (file: File) => void;
	onFileDelete?: () => void;
	uploadType: "ijazah" | "transkrip";
	employeeName: string;
	grade: string;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [showPdfPreview, setShowPdfPreview] = useState(false);
	const [thumbFailed, setThumbFailed] = useState(false);
	const previewUrlRef = useRef<string>("");

	const isDriveUrl = value.includes("drive.google.com");
	const fileId = isDriveUrl ? extractFileIdFromDriveUrl(value) : null;

	const thumbnailUrl = fileId
		? `https://drive.google.com/uc?export=view&id=${fileId}`
		: value;
	const previewUrl = fileId
		? `https://drive.google.com/file/d/${fileId}/preview`
		: value;

	function handleDelete() {
		if (!window.confirm(`Yakin ingin menghapus ${label}?`)) return;

		if (previewUrlRef.current) {
			URL.revokeObjectURL(previewUrlRef.current);
			previewUrlRef.current = "";
		}

		onFileSelect("");
		onFileDelete?.();
		toast.success(`${label} dihapus.`);
	}

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!ACCEPTED_TYPES.includes(file.type)) {
			toast.error("File harus berupa gambar atau PDF.");
			e.target.value = "";
			return;
		}

		if (previewUrlRef.current) {
			URL.revokeObjectURL(previewUrlRef.current);
		}

		const objectUrl = URL.createObjectURL(file);
		previewUrlRef.current = objectUrl;
		setThumbFailed(false);
		onFileSelect(objectUrl);
		onFileReady?.(file);
		toast.success(`${label} berhasil dipilih.`);
		e.target.value = "";
	}

	return (
		<div>
			<label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => inputRef.current?.click()}
					className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
				>
					Pilih File
				</button>
				<input
					ref={inputRef}
					type="file"
					accept={ACCEPTED_EXTENSIONS}
					onChange={handleChange}
					className="hidden"
				/>
				{value ? (
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setShowPdfPreview(true)}
							className="text-xs text-blue-600 hover:underline"
						>
							Lihat
						</button>
						<button
							type="button"
							onClick={handleDelete}
							className="text-xs font-medium text-red-600 hover:underline"
						>
							Hapus
						</button>
					</div>
				) : (
					<span className="text-xs text-slate-400 dark:text-slate-500">Belum ada file</span>
				)}
			</div>
			{value && !thumbFailed ? (
				<img
					src={thumbnailUrl}
					alt={`Preview ${label}`}
					className="mt-2 h-20 rounded border border-blue-100 object-contain dark:border-blue-900/60"
					onError={() => setThumbFailed(true)}
				/>
			) : null}
			{showPdfPreview && value ? (
				<PdfPreviewModal url={previewUrl} onClose={() => setShowPdfPreview(false)} />
			) : null}
		</div>
	);
}

export default function EducationStep({ value, onChange, errorMap, referenceOptions, employeeName, onFileReady, onFileDelete }: EducationStepProps) {
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
							type="text"
							inputMode="numeric"
							maxLength={4}
							value={row.startYear}
							onChange={(e) => {
								const val = e.target.value.replace(/\D/g, "").slice(0, 4);
								updateRow(index, "startYear", val);
							}}
						/>
						<FloatingInput
							name={`education-graduationYear-${index}`}
							label="Tahun Lulus"
							type="text"
							inputMode="numeric"
							maxLength={4}
							value={row.graduationYear}
							onChange={(e) => {
								const val = e.target.value.replace(/\D/g, "").slice(0, 4);
								updateRow(index, "graduationYear", val);
							}}
						/>
						<FloatingInput
							name={`education-gpa-${index}`}
							label="IPK"
							value={row.gpa}
							onChange={(e) => updateRow(index, "gpa", e.target.value)}
						/>
						<FileUploadField
							name={`education-ijazah-${index}`}
							label="Ijazah"
							value={row.ijazah}
							onFileSelect={(val) => updateRow(index, "ijazah", val)}
							onFileReady={(file) => onFileReady?.(index, "ijazah", file)}
							onFileDelete={() => onFileDelete?.(index, "ijazah")}
							employeeName={employeeName}
							uploadType="ijazah"
							grade={row.degree}
						/>
						<FileUploadField
							name={`education-transkrip-${index}`}
							label="Transkrip Nilai"
							value={row.transkrip}
							onFileSelect={(val) => updateRow(index, "transkrip", val)}
							onFileReady={(file) => onFileReady?.(index, "transkrip", file)}
							onFileDelete={() => onFileDelete?.(index, "transkrip")}
							employeeName={employeeName}
							uploadType="transkrip"
							grade={row.degree}
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
