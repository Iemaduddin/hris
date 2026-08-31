import { createHash } from "node:crypto";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import prisma from "./prisma";

export const STORAGE_OWNER_TYPES = ["perusahaan", "karyawan", "pengajuan", "payroll", "general"] as const;

export type StorageOwnerType = (typeof STORAGE_OWNER_TYPES)[number];

type MimeRule = {
	allowed: string[];
	maxBytes: number;
};

const DEFAULT_RULES: Record<StorageOwnerType, MimeRule> = {
	perusahaan: {
		allowed: ["image/jpeg", "image/png", "image/webp", "image/gif"],
		maxBytes: 2 * 1024 * 1024,
	},
	karyawan: {
		allowed: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"],
		maxBytes: 10 * 1024 * 1024,
	},
	pengajuan: {
		allowed: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"],
		maxBytes: 10 * 1024 * 1024,
	},
	payroll: {
		allowed: ["application/pdf"],
		maxBytes: 10 * 1024 * 1024,
	},
	general: {
		allowed: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"],
		maxBytes: Number(process.env["MAX_FILE_MB"] ?? 10) * 1024 * 1024,
	},
};

export function getStorageDir(): string {
	const configured = process.env["STORAGE_DIR"];
	if (configured) {
		return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
	}
	return path.join(process.cwd(), "storage");
}

function sanitizeSegment(value: string): string {
	const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
	return cleaned.slice(0, 80) || "file";
}

function assertSafeRelativePath(relativePath: string): string[] {
	const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
	const segments = normalized.split("/").filter(Boolean);
	if (segments.length === 0 || segments.some((s) => s === "." || s === "..")) {
		throw new Error("Path berkas tidak valid.");
	}
	return segments;
}

export function toFileUrl(relativePath: string): string {
	const segments = assertSafeRelativePath(relativePath);
	return `/api/files/${segments.map(encodeURIComponent).join("/")}`;
}

export function isStoragePath(value: string | null | undefined): value is string {
	if (!value) return false;
	if (/^https?:\/\//i.test(value)) return false;
	try {
		assertSafeRelativePath(value.replace(/^\/api\/files\//, ""));
		return true;
	} catch {
		return false;
	}
}

export function normalizeStoredPath(value: string): string {
	return value.replace(/^\/api\/files\//, "").replace(/\\/g, "/").replace(/^\/+/, "");
}

export type SaveFileInput = {
	buffer: Buffer;
	originalName: string;
	mime: string;
	ownerType: StorageOwnerType;
	ownerId: string;
	subfolder?: string;
	customName?: string;
	jenis?: string;
	uploadedById?: string;
};

export type SaveFileResult = {
	path: string;
	url: string;
	fileName: string;
	mime: string;
	size: number;
	hash: string;
};

export async function simpanFile(input: SaveFileInput): Promise<SaveFileResult> {
	const rules = DEFAULT_RULES[input.ownerType];
	if (!rules.allowed.includes(input.mime)) {
		throw new Error("Tipe file tidak didukung untuk kategori ini.");
	}
	if (input.buffer.length > rules.maxBytes) {
		throw new Error(`Ukuran file maksimal ${Math.round(rules.maxBytes / 1024 / 1024)}MB.`);
	}
	if (input.buffer.length === 0) {
		throw new Error("File kosong.");
	}

	const ext = (input.originalName.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
	const base = input.customName ? sanitizeSegment(input.customName) : sanitizeSegment(input.originalName.replace(/\.[^/.]+$/, ""));
	const stamp = Date.now().toString(36);
	const rand = Math.random().toString(36).slice(2, 8);
	const fileName = `${base}_${stamp}${rand}.${ext}`;

	const segments = [input.ownerType, sanitizeSegment(input.ownerId)];
	if (input.subfolder) {
		for (const part of input.subfolder.split("/").filter(Boolean)) {
			segments.push(sanitizeSegment(part));
		}
	}
	segments.push(fileName);
	const relativePath = segments.join("/");

	const absolutePath = path.join(getStorageDir(), ...segments);
	await mkdir(path.dirname(absolutePath), { recursive: true });
	await writeFile(absolutePath, input.buffer);

	const hash = createHash("sha256").update(input.buffer).digest("hex");

	await prisma.fileAsset.upsert({
		where: { path: relativePath },
		update: {
			mime: input.mime,
			size: BigInt(input.buffer.length),
			hash,
			jenis: input.jenis,
			uploadedById: input.uploadedById,
		},
		create: {
			ownerType: input.ownerType,
			ownerId: input.ownerId,
			jenis: input.jenis,
			path: relativePath,
			mime: input.mime,
			size: BigInt(input.buffer.length),
			hash,
			uploadedById: input.uploadedById,
		},
	});

	return {
		path: relativePath,
		url: toFileUrl(relativePath),
		fileName,
		mime: input.mime,
		size: input.buffer.length,
		hash,
	};
}

export async function hapusFile(relativePath: string): Promise<void> {
	const segments = assertSafeRelativePath(normalizeStoredPath(relativePath));
	const absolutePath = path.join(getStorageDir(), ...segments);
	try {
		await unlink(absolutePath);
	} catch (error) {
		const code = (error as NodeJS.ErrnoException)?.code;
		if (code !== "ENOENT") throw error;
	}
	await prisma.fileAsset.deleteMany({ where: { path: segments.join("/") } });
}

export async function bacaFile(relativePath: string): Promise<{ absolutePath: string; mime: string | null; size: number }> {
	const segments = assertSafeRelativePath(normalizeStoredPath(relativePath));
	const absolutePath = path.join(getStorageDir(), ...segments);
	const info = await stat(absolutePath);
	if (!info.isFile()) throw new Error("Berkas tidak ditemukan.");
	const asset = await prisma.fileAsset.findUnique({
		where: { path: segments.join("/") },
		select: { mime: true },
	});
	return { absolutePath, mime: asset?.mime ?? null, size: info.size };
}
