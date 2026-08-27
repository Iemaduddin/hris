import { NextRequest, NextResponse } from "next/server";
import { getDriveFileUrl } from "@/src/lib/google-drive";

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const fileId = searchParams.get("fileId");

		if (!fileId) {
			return NextResponse.json({ error: "fileId tidak ditemukan" }, { status: 400 });
		}

		const url = await getDriveFileUrl(fileId);

		return NextResponse.json({ success: true, url });
	} catch (error) {
		console.error("Download error:", error);
		return NextResponse.json(
			{ error: "Gagal mengambil URL file dari Google Drive" },
			{ status: 500 },
		);
	}
}
