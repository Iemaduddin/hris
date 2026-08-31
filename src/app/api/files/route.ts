import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { STORAGE_OWNER_TYPES, hapusFile, simpanFile, type StorageOwnerType } from "@/src/lib/storage-local";

function isOwnerType(value: string): value is StorageOwnerType {
	return (STORAGE_OWNER_TYPES as readonly string[]).includes(value);
}

async function getRequestUser() {
	const requestHeaders = await headers();
	const session = await auth.api.getSession({ headers: requestHeaders });
	if (!session) return null;
	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { id: true, role: true },
	});
	return user;
}

function isHrRole(role: string): boolean {
	return role === "SUPER_ADMIN" || role === "ADMIN_HR";
}

export async function POST(request: NextRequest) {
	const user = await getRequestUser();
	if (!user) {
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

		if ((ownerType === "karyawan" || ownerType === "perusahaan" || ownerType === "payroll") && !isHrRole(user.role)) {
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
			uploadedById: user.id,
		});

		return NextResponse.json({ success: true, ...result });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Gagal mengupload file.";
		const status = /didukung|maksimal|kosong|wajib/i.test(message) ? 400 : 500;
		return NextResponse.json({ error: message }, { status });
	}
}

export async function DELETE(request: NextRequest) {
	const user = await getRequestUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	if (!isHrRole(user.role)) {
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
