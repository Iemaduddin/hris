import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createReadStream } from "node:fs";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { bacaFile } from "@/src/lib/storage-local";

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
	const requestHeaders = await headers();
	const session = await auth.api.getSession({ headers: requestHeaders });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	const { path } = await context.params;
	const relativePath = (path ?? []).join("/");
	if (!relativePath) {
		return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
	}

	const [ownerType] = relativePath.split("/");
	if (ownerType !== "perusahaan") {
		const user = await prisma.user.findUnique({
			where: { id: session.user.id },
			select: { role: true },
		});
		const role = user?.role ?? "EMPLOYEE";
		if (role !== "SUPER_ADMIN" && role !== "ADMIN_HR") {
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
