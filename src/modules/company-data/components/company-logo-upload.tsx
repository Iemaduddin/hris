"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FiEdit2 } from "react-icons/fi";
import { toast } from "react-toastify";
import { uploadCompanyLogoAction } from "../actions/company-data.actions";

type CompanyLogoUploadProps = {
	companyId?: string;
	logo?: string | null;
};

const MAX_IMAGE_SIZE = 1024;
const TARGET_QUALITY = 0.82;
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

function readImage(file: File) {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const objectUrl = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(objectUrl);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error("Gagal membaca gambar."));
		};
		img.src = objectUrl;
	});
}

async function compressImage(file: File): Promise<File> {
	const image = await readImage(file);
	const ratio = Math.min(MAX_IMAGE_SIZE / image.width, MAX_IMAGE_SIZE / image.height, 1);
	const width = Math.max(1, Math.floor(image.width * ratio));
	const height = Math.max(1, Math.floor(image.height * ratio));

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Canvas tidak tersedia.");
	}

	context.drawImage(image, 0, 0, width, height);

	const blob = await new Promise<Blob | null>((resolve) => {
		canvas.toBlob(resolve, "image/webp", TARGET_QUALITY);
	});

	if (!blob) {
		throw new Error("Gagal mengompres gambar.");
	}

	const fileName = file.name.replace(/\.[^/.]+$/, "") || "company-logo";
	const compressed = new File([blob], `${fileName}.webp`, { type: "image/webp" });

	if (compressed.size > MAX_FILE_SIZE_BYTES) {
		throw new Error("Ukuran gambar setelah kompresi masih di atas 2MB.");
	}

	return compressed;
}

export default function CompanyLogoUpload({ companyId, logo }: CompanyLogoUploadProps) {
	const isUploadDisabled = !companyId;
	const inputRef = useRef<HTMLInputElement>(null);
	const [currentLogo, setCurrentLogo] = useState(logo ?? "");
	const [compressedFile, setCompressedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState("");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [previewUrl]);

	const resetDialogState = () => {
		setCompressedFile(null);
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		setPreviewUrl("");
		setIsDialogOpen(false);
	};

	const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.currentTarget.files?.[0];
		if (!file) return;

		setError(null);
		setMessage(null);

		if (!file.type.startsWith("image/")) {
			const messageText = "File harus berupa gambar.";
			setError(messageText);
			toast.error(messageText);
			event.currentTarget.value = "";
			return;
		}

		if (file.size > MAX_FILE_SIZE_BYTES) {
			const messageText = "Ukuran file maksimal 2MB.";
			setError(messageText);
			toast.error(messageText);
			event.currentTarget.value = "";
			return;
		}

		try {
			const compressed = await compressImage(file);
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
			const compressedPreview = URL.createObjectURL(compressed);
			setCompressedFile(compressed);
			setPreviewUrl(compressedPreview);
			setIsDialogOpen(true);
		} catch (compressError) {
			const messageText = compressError instanceof Error ? compressError.message : "Gagal memproses gambar. Coba file lain.";
			setError(messageText);
			toast.error(messageText);
		}

		event.currentTarget.value = "";
	};

	const handleSave = async () => {
		if (!companyId) {
			const messageText = "Simpan data perusahaan terlebih dahulu.";
			setError(messageText);
			toast.error(messageText);
			return;
		}

		if (!compressedFile) return;

		setIsSaving(true);
		setError(null);
		setMessage(null);

		const payload = new FormData();
		payload.append("companyId", companyId);
		payload.append("file", compressedFile);

		const result = await uploadCompanyLogoAction(payload);
		setIsSaving(false);

		if (!result.success) {
			setError(result.message);
			toast.error(result.message);
			return;
		}

		setCurrentLogo(result.logo ?? "");
		setMessage(result.message);
		toast.success(result.message);
		resetDialogState();
	};

	return (
		<>
			<div className="mt-4 flex flex-col items-center">
					<button
						type="button"
						onClick={() => inputRef.current?.click()}
						disabled={isUploadDisabled}
						className="group relative h-36 w-36 overflow-hidden rounded-2xl border border-dashed border-blue-200 bg-white transition hover:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900/60 dark:bg-slate-900"
					>
						{currentLogo ? (
							<img src={currentLogo} alt="Logo perusahaan" className="h-full w-full object-cover" />
						) : (
							<div className="flex h-full w-full items-center justify-center text-xs text-slate-400 dark:text-slate-500">
								Upload Logo Perusahaan
							</div>
						)}
						<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 backdrop-blur-none transition-all group-hover:bg-slate-900/25 group-hover:opacity-100 group-hover:backdrop-blur-sm group-disabled:opacity-0">
							<FiEdit2 className="h-5 w-5 text-white" />
						</div>
					</button>
					<input
						ref={inputRef}
						type="file"
						accept="image/*"
						disabled={isUploadDisabled}
						onChange={handleFileChange}
						className="hidden"
					/>
					{isUploadDisabled ? (
						<p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
							Upload logo akan aktif setelah data perusahaan berhasil disimpan.
						</p>
					) : null}
				</div>
			{message ? <p className="mt-2 text-center text-xs text-emerald-600">{message}</p> : null}
			{error ? <p className="mt-2 text-center text-xs text-red-500">{error}</p> : null}
			{isDialogOpen ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
						<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Preview Avatar</h3>
						<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Gambar sudah dikompres. Simpan untuk upload.</p>
						<div className="mt-3 overflow-hidden rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/60 dark:bg-slate-800">
							{previewUrl ? (
								<img src={previewUrl} alt="Preview avatar" className="h-72 w-full object-contain" />
							) : null}
						</div>
						<div className="mt-4 flex justify-end gap-2">
							<button
								type="button"
								onClick={resetDialogState}
								disabled={isSaving}
								className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 px-3 text-sm text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSave}
								disabled={isSaving}
								className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
							>
								{isSaving ? "Menyimpan..." : "Simpan"}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
}
