import { NextRequest, NextResponse } from "next/server";
import { uploadToDrive, type DriveFolderType, type SubfolderPath } from "@/src/lib/google-drive";

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File | null;
		const folderType = (formData.get("folderType") as DriveFolderType) || "general";
		const subfolderPathRaw = formData.get("subfolderPath") as string | null;
		const customFileName = formData.get("fileName") as string | null;

		if (!file) {
			return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
		}

		const maxSize = 10 * 1024 * 1024;
		if (file.size > maxSize) {
			return NextResponse.json({ error: "Ukuran file maksimal 10MB" }, { status: 400 });
		}

		const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
		if (!allowedTypes.includes(file.type)) {
			return NextResponse.json({ error: "Tipe file tidak didukung" }, { status: 400 });
		}

		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);

		const ext = file.name.split(".").pop() || "bin";
		let fileName: string;
		if (customFileName) {
			const cleanCustom = customFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
			fileName = `${cleanCustom}.${ext}`;
		} else {
			const timestamp = Date.now();
			const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
			fileName = `${timestamp}_${cleanName}`;
		}

		let subfolderPath: SubfolderPath | undefined;
		if (subfolderPathRaw) {
			try {
				const parsed = JSON.parse(subfolderPathRaw);
				subfolderPath = Array.isArray(parsed) ? parsed : [parsed];
			} catch {
				subfolderPath = subfolderPathRaw;
			}
		}

		const result = await uploadToDrive(buffer, fileName, file.type, folderType, subfolderPath);

		return NextResponse.json({
			success: true,
			fileId: result.fileId,
			fileName: result.fileName,
			url: result.directLink,
			webViewLink: result.webViewLink,
		});
	} catch (error) {
		console.error("Upload error:", error);
		return NextResponse.json(
			{ error: "Gagal mengupload file ke Google Drive" },
			{ status: 500 },
		);
	}
}
