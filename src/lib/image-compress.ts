type CompressOptions = {
	maxWidth?: number;
	maxHeight?: number;
	quality?: number;
	maxFileSize?: number;
};

const DEFAULT_OPTIONS: Required<CompressOptions> = {
	maxWidth: 1920,
	maxHeight: 1920,
	quality: 0.82,
	maxFileSize: 2 * 1024 * 1024,
};

function readFileAsImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Gagal membaca gambar."));
		};
		img.src = url;
	});
}

function calculateDimensions(
	originalWidth: number,
	originalHeight: number,
	maxWidth: number,
	maxHeight: number,
): { width: number; height: number } {
	const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight, 1);
	return {
		width: Math.max(1, Math.floor(originalWidth * ratio)),
		height: Math.max(1, Math.floor(originalHeight * ratio)),
	};
}

function renderToCanvas(
	img: HTMLImageElement,
	width: number,
	height: number,
): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas tidak tersedia.");

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(img, 0, 0, width, height);

	return canvas;
}

function canvasToBlob(
	canvas: HTMLCanvasElement,
	quality: number,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error("Gagal mengompres gambar."));
			},
			"image/webp",
			quality,
		);
	});
}

function downscaleWithQuality(
	canvas: HTMLCanvasElement,
	img: HTMLImageElement,
	width: number,
	height: number,
	targetQuality: number,
	maxFileSize: number,
): Promise<Blob> {
	let quality = targetQuality;
	let currentCanvas = canvas;

	return (async () => {
		while (quality >= 0.3) {
			const blob = await canvasToBlob(currentCanvas, quality);
			if (blob.size <= maxFileSize) return blob;

			quality -= 0.1;
			currentCanvas = renderToCanvas(img, width, height);
		}

		return canvasToBlob(currentCanvas, 0.3);
	})();
}

export async function compressImage(
	file: File,
	options?: CompressOptions,
): Promise<File> {
	const opts = { ...DEFAULT_OPTIONS, ...options };

	if (!file.type.startsWith("image/")) {
		throw new Error("File harus berupa gambar.");
	}

	const img = await readFileAsImage(file);
	const { width, height } = calculateDimensions(
		img.naturalWidth,
		img.naturalHeight,
		opts.maxWidth,
		opts.maxHeight,
	);

	const canvas = renderToCanvas(img, width, height);
	let blob = await canvasToBlob(canvas, opts.quality);

	if (blob.size > opts.maxFileSize) {
		blob = await downscaleWithQuality(canvas, img, width, height, opts.quality, opts.maxFileSize);
	}

	const baseName = file.name.replace(/\.[^/.]+$/, "") || "image";
	return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
	return readFileAsImage(file).then((img) => ({
		width: img.naturalWidth,
		height: img.naturalHeight,
	}));
}
