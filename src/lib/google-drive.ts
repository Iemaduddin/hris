import { Readable } from "node:stream";
import { google, type drive_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";

async function getGoogleDriveClient(): Promise<drive_v3.Drive> {
	const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
	const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

	if (!clientId || !clientSecret || !refreshToken) {
		throw new Error(
			"Google OAuth credentials belum dikonfigurasi di .env (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN)",
		);
	}

	const oauth2Client = new OAuth2Client(clientId, clientSecret);
	oauth2Client.setCredentials({ refresh_token: refreshToken });

	return google.drive({ version: "v3", auth: oauth2Client });
}

export type DriveUploadResult = {
	fileId: string;
	fileName: string;
	webViewLink: string;
	directLink: string;
};

export type DriveFolderType = "company" | "employee" | "document" | "general";

const FOLDER_NAMES: Record<DriveFolderType, string> = {
	company: "Data Perusahaan",
	employee: "Data Karyawan",
	document: "Dokumen",
	general: "",
};

export type SubfolderPath = string | string[];

async function getOrCreateSubfolder(
	drive: drive_v3.Drive,
	parentFolderId: string,
	folderName: string,
): Promise<string> {
	const query = `name='${folderName}' and parents='${parentFolderId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
	const existing = await drive.files.list({ q: query, fields: "files(id)" });

	if (existing.data.files && existing.data.files.length > 0) {
		return existing.data.files[0].id!;
	}

	const folder = await drive.files.create({
		requestBody: {
			name: folderName,
			parents: [parentFolderId],
			mimeType: "application/vnd.google-apps.folder",
		},
		fields: "id",
		supportsAllDrives: true,
	});

	return folder.data.id!;
}

async function resolveFolderPath(
	drive: drive_v3.Drive,
	parentFolderId: string,
	path: SubfolderPath,
): Promise<string> {
	const segments = Array.isArray(path) ? path : [path];
	let currentId = parentFolderId;

	for (const segment of segments) {
		if (segment) {
			currentId = await getOrCreateSubfolder(drive, currentId, segment);
		}
	}

	return currentId;
}

export async function uploadToDrive(
	file: Buffer,
	fileName: string,
	mimeType: string,
	folderType: DriveFolderType = "general",
	subfolderPath?: SubfolderPath,
): Promise<DriveUploadResult> {
	const drive = await getGoogleDriveClient();
	const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
	const baseFolderName = FOLDER_NAMES[folderType];

	let folderId = parentFolderId;

	if (baseFolderName) {
		folderId = await getOrCreateSubfolder(drive, folderId, baseFolderName);
	}

	if (subfolderPath) {
		folderId = await resolveFolderPath(drive, folderId, subfolderPath);
	}

	const response = await drive.files.create({
		requestBody: {
			name: fileName,
			parents: [folderId],
		},
		media: {
			mimeType,
			body: new Readable({
				read() {
					this.push(file);
					this.push(null);
				},
			}),
		},
		fields: "id, name, webViewLink",
		supportsAllDrives: true,
	});

	const fileId = response.data.id!;
	const webViewLink = response.data.webViewLink ?? "";

	await drive.permissions.create({
		fileId,
		requestBody: {
			role: "reader",
			type: "anyone",
			allowFileDiscovery: true,
		},
		supportsAllDrives: true,
	});

	const directLink = `https://drive.google.com/uc?export=view&id=${fileId}`;

	return {
		fileId,
		fileName: response.data.name ?? fileName,
		webViewLink,
		directLink,
	};
}

export async function deleteFromDrive(fileId: string): Promise<void> {
	const drive = await getGoogleDriveClient();

	await drive.files.delete({
		fileId,
		supportsAllDrives: true,
	});
}

export async function getDriveFileUrl(fileId: string): Promise<string> {
	return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

export function getAuthUrl(clientId: string, clientSecret: string, redirectUri: string): string {
	const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

	return oauth2Client.generateAuthUrl({
		access_type: "offline",
		scope: ["https://www.googleapis.com/auth/drive"],
		prompt: "consent",
	});
}

export async function getTokensFromCode(
	code: string,
	clientId: string,
	clientSecret: string,
	redirectUri: string,
): Promise<{ access_token: string; refresh_token: string }> {
	const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

	const { tokens } = await oauth2Client.getToken(code);
	return {
		access_token: tokens.access_token ?? "",
		refresh_token: tokens.refresh_token ?? "",
	};
}
