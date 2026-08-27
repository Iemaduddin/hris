import { NextRequest, NextResponse } from "next/server";
import { deleteFromDrive } from "@/src/lib/google-drive";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { fileId } = body;

		if (!fileId) {
			return NextResponse.json({ error: "fileId tidak ditemukan" }, { status: 400 });
		}

		await deleteFromDrive(fileId);

		return NextResponse.json({ success: true, message: "File berhasil dihapus." });
	} catch (error) {
		console.error("Delete error:", error);
		return NextResponse.json(
			{ error: "Gagal menghapus file dari Google Drive" },
			{ status: 500 },
		);
	}
}
