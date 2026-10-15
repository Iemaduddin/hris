"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { catatAudit } from "@/src/modules/audit/lib/audit";
import {
	KATEGORI_UPDATE_DATA,
	ringkasanUpdateData,
	validasiUpdateData,
} from "@/src/modules/employee/lib/updatedata";

/** Revalidate best-effort: di luar konteks request (E2E/CLI) Next melempar — abaikan. */
function segarkan(path: string): void {
	try {
		revalidatePath(path);
	} catch {
		// abaikan — hygiene cache, bukan logika inti
	}
}

export type UpdateDataActionResult = { success: boolean; message: string; id?: string };

export type UpdateDataItem = {
	id: string;
	nomor: string;
	kategori: string;
	ringkasan: string;
	status: string;
	alasan: string;
	diajukanPada: string | null;
};

function keItem(r: {
	id: string;
	nomor: string;
	kategori: string;
	dataBaru: unknown;
	status: string;
	alasan: string;
	diajukanPada: Date | null;
}): UpdateDataItem {
	return {
		id: r.id,
		nomor: r.nomor,
		kategori: r.kategori,
		ringkasan: ringkasanUpdateData(r.kategori, (r.dataBaru ?? {}) as Record<string, unknown>),
		status: r.status,
		alasan: r.alasan,
		diajukanPada: r.diajukanPada?.toISOString() ?? null,
	};
}

async function karyawanDariUser(userId: string): Promise<string | null> {
	if (!userId) return null;
	const k = await prisma.karyawan.findFirst({ where: { userId }, select: { id: true } });
	return k?.id ?? null;
}

export async function getUpdateDataSaya(userId: string): Promise<UpdateDataItem[]> {
	const saya = await karyawanDariUser(userId);
	if (!saya) return [];
	const rows = await prisma.updateDataRequest.findMany({
		where: { karyawanId: saya },
		orderBy: { createdAt: "desc" },
	});
	return rows.map((r) => keItem(r as never));
}

export async function getUpdateDataSemua(): Promise<Array<UpdateDataItem & { karyawanNama: string; nomorKaryawan: string }>> {
	const rows = await prisma.updateDataRequest.findMany({
		orderBy: { createdAt: "desc" },
		take: 200,
		include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
	});
	return rows.map((r) => ({
		...keItem(r as never),
		karyawanNama: r.karyawan.namaLengkap,
		nomorKaryawan: r.karyawan.nomorKaryawan,
	}));
}

export async function buatUpdateData(
	input: { kategori: string; targetId?: string; dataBaru: Record<string, unknown>; alasan: string; lampiranUrl?: string },
	userId: string,
): Promise<UpdateDataActionResult> {
	const saya = await karyawanDariUser(userId);
	if (!saya) return { success: false, message: "Akun belum tertaut ke karyawan." };
	const kategori = String(input.kategori ?? "").toUpperCase();
	if (!(KATEGORI_UPDATE_DATA as readonly string[]).includes(kategori)) {
		return { success: false, message: "Kategori tidak valid." };
	}
	const err = validasiUpdateData(kategori, input.dataBaru ?? {});
	if (err) return { success: false, message: err };
	if (!String(input.alasan ?? "").trim()) return { success: false, message: "Alasan perubahan wajib diisi." };

	const karyawan = await prisma.karyawan.findUnique({
		where: { id: saya },
		select: { id: true, status: true, alamat: true, telepon: true, email: true },
	});
	if (!karyawan || !["AKTIF", "PROBASI"].includes(karyawan.status)) {
		return { success: false, message: "Status karyawan tidak aktif." };
	}

	// Snapshot nilai lama agar HR bisa bandingkan sebelum/sesudah.
	let dataLama: Record<string, unknown> | null = null;
	let targetId: string | null = null;
	if (kategori === "ALAMAT") dataLama = { alamat: karyawan.alamat };
	else if (kategori === "KONTAK") dataLama = { telepon: karyawan.telepon, email: karyawan.email };
	else if (kategori === "KELUARGA" && input.targetId) {
		const lama = await prisma.keluargaKaryawan.findFirst({
			where: { id: String(input.targetId), karyawanId: saya },
		});
		if (!lama) return { success: false, message: "Data keluarga tujuan tidak ditemukan." };
		targetId = lama.id;
		dataLama = { ...lama, tanggalLahir: lama.tanggalLahir?.toISOString() ?? null } as never;
	}

	const tahun = new Date().getUTCFullYear();
	const created = await prisma.updateDataRequest.create({
		data: {
			nomor: `UPD-${tahun}-${saya.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
			karyawanId: saya,
			kategori: kategori as never,
			targetId,
			dataLama: (dataLama ?? undefined) as never,
			dataBaru: (input.dataBaru ?? {}) as never,
			alasan: String(input.alasan).trim(),
			lampiranUrl: String(input.lampiranUrl ?? "").trim() || null,
			createdById: userId,
		},
		select: { id: true, nomor: true },
	});
	segarkan("/account/update-data");
	return { success: true, message: `Draf ${created.nomor} tersimpan.`, id: created.id };
}

export async function ajukanUpdateData(id: string, userId: string): Promise<UpdateDataActionResult> {
	const saya = await karyawanDariUser(userId);
	const row = await prisma.updateDataRequest.findUnique({ where: { id } });
	if (!row) return { success: false, message: "Data tidak ditemukan." };
	if (row.karyawanId !== saya) return { success: false, message: "Hanya milik sendiri." };
	if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
	// Alur HR-saja (tanpa atasan): satu tahap ADMIN_HR.
	await prisma.$transaction([
		prisma.approvalStep.deleteMany({ where: { referensiType: "UPDATE_DATA", referensiId: id } }),
		prisma.approvalStep.create({
			data: { referensiType: "UPDATE_DATA", referensiId: id, tahap: 1, approverRole: "ADMIN_HR" },
		}),
		prisma.updateDataRequest.update({
			where: { id },
			data: { status: "MENUNGGU_APPROVAL", diajukanPada: new Date() },
		}),
	]);
	await catatAudit({
		actorUserId: userId,
		aksi: "UPDATE_DATA.DIAJUKAN",
		entityType: "UpdateDataRequest",
		entityId: id,
		sebelum: { status: "DRAFT" },
		sesudah: { status: "MENUNGGU_APPROVAL", nomor: row.nomor },
		alasan: row.alasan,
	});
	// P4-3: beritahu HR (in-app + push + email per preferensi).
	try {
		const { beritahuApproverBaru } = await import("@/src/modules/notifikasi/lib/notify");
		const { ringkasanUpdateData, labelKategori } = await import("@/src/modules/employee/lib/updatedata");
		const pemohon = await prisma.karyawan.findUnique({
			where: { id: row.karyawanId },
			select: { namaLengkap: true, nomorKaryawan: true },
		});
		await beritahuApproverBaru(
			"UPDATE_DATA",
			id,
			"Pengajuan Update Data Baru",
			`${row.nomor} • ${pemohon?.namaLengkap ?? "-"} (${pemohon?.nomorKaryawan ?? "-"}) — ${labelKategori(row.kategori)} • ${ringkasanUpdateData(row.kategori, (row.dataBaru ?? {}) as Record<string, unknown>)}`,
			"/employees/update-data",
		);
	} catch {
		// abaikan — notifikasi pelengkap
	}
	segarkan("/account/update-data");
	segarkan("/approval");
	return { success: true, message: "Dikirim ke HR untuk verifikasi." };
}

export async function batalkanUpdateData(id: string, userId: string): Promise<UpdateDataActionResult> {
	const saya = await karyawanDariUser(userId);
	const row = await prisma.updateDataRequest.findUnique({ where: { id } });
	if (!row) return { success: false, message: "Data tidak ditemukan." };
	if (row.karyawanId !== saya) return { success: false, message: "Hanya milik sendiri." };
	if (!["DRAFT", "DIAJUKAN"].includes(row.status)) {
		return { success: false, message: "Status ini tidak bisa dibatalkan." };
	}
	await prisma.$transaction([
		prisma.updateDataRequest.update({ where: { id }, data: { status: "DIBATALKAN" } }),
		prisma.approvalStep.deleteMany({ where: { referensiType: "UPDATE_DATA", referensiId: id } }),
	]);
	segarkan("/account/update-data");
	return { success: true, message: "Pengajuan dibatalkan." };
}
