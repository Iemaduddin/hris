import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { bacaFile } from "@/src/lib/storage-local";
import { requireApiSession } from "@/src/lib/api-v1";

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
	const ctx = await requireApiSession(_request);
	if (!ctx) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	const { path } = await context.params;
	const relativePath = (path ?? []).join("/");
	if (!relativePath) {
		return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
	}

	const [ownerType, ownerId] = relativePath.split("/");
	if (ownerType !== "perusahaan") {
		const isHr = ctx.role === "SUPER_ADMIN" || ctx.role === "ADMIN_HR";
		// Karyawan boleh mengunduh berkas folder miliknya sendiri (mis. foto profil).
		const milikSendiri = ownerType === "karyawan" && !!ownerId && ownerId === ctx.karyawanId;
		if (!isHr && !milikSendiri) {
			return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
		}
	}

	try {
		const file = await bacaFile(relativePath);
		const stream = createReadStream(file.absolutePath);

		return new NextResponse(stream as unknown as ReadableStream, {
			headers: {
				"Content-Type": file.mime ?? "application/octet-stream",
				"Content-Length": String(file.size),
				"Cache-Control": "private, max-age=3600",
			},
		});
	} catch {
		return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
	}
}
