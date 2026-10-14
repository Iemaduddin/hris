import { NextRequest, NextResponse } from "next/server";
import { STORAGE_OWNER_TYPES, hapusFile, simpanFile, type StorageOwnerType } from "@/src/lib/storage-local";
import { requireApiSession } from "@/src/lib/api-v1";

function isOwnerType(value: string): value is StorageOwnerType {
	return (STORAGE_OWNER_TYPES as readonly string[]).includes(value);
}

function isHrRole(role: string): boolean {
	return role === "SUPER_ADMIN" || role === "ADMIN_HR";
}

export async function POST(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get("file") as File | null;
		const ownerTypeRaw = String(formData.get("ownerType") ?? "general");
		const ownerId = String(formData.get("ownerId") ?? "").trim();
		const subfolder = String(formData.get("subfolder") ?? "").trim();
		const customName = String(formData.get("fileName") ?? "").trim();
		const jenis = String(formData.get("jenis") ?? "").trim();

		if (!file || file.size === 0) {
			return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
		}

		const ownerType = isOwnerType(ownerTypeRaw) ? ownerTypeRaw : "general";

		if ((ownerType === "karyawan" || ownerType === "perusahaan" || ownerType === "payroll") && !isHrRole(ctx.role)) {
			return NextResponse.json({ error: "Anda tidak memiliki izin upload untuk kategori ini." }, { status: 403 });
		}

		if (!ownerId) {
			return NextResponse.json({ error: "ownerId wajib diisi." }, { status: 400 });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const result = await simpanFile({
			buffer,
			originalName: file.name,
			mime: file.type,
			ownerType,
			ownerId,
			subfolder: subfolder || undefined,
			customName: customName || undefined,
			jenis: jenis || undefined,
			uploadedById: ctx.userId,
		});

		return NextResponse.json({ success: true, ...result });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Gagal mengupload file.";
		const status = /didukung|maksimal|kosong|wajib/i.test(message) ? 400 : 500;
		return NextResponse.json({ error: message }, { status });
	}
}

export async function DELETE(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	if (!isHrRole(ctx.role)) {
		return NextResponse.json({ error: "Anda tidak memiliki izin menghapus file." }, { status: 403 });
	}

	try {
		const body = await request.json();
		const relativePath = String(body?.path ?? "").trim();
		if (!relativePath) {
			return NextResponse.json({ error: "path tidak ditemukan." }, { status: 400 });
		}

		await hapusFile(relativePath);
		return NextResponse.json({ success: true, message: "File berhasil dihapus." });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Gagal menghapus file.";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
