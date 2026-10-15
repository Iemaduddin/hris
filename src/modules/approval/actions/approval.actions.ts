"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { catatAudit } from "@/src/modules/audit/lib/audit";
import { potongSaldo } from "@/src/modules/leave/lib/balance";
import { bukaClearance } from "@/src/modules/employee/actions/offboarding.actions";
import { terapkanUpdateData } from "@/src/modules/employee/lib/updatedata";
import { eksekusiTukar } from "@/src/modules/roster/actions/tukar.actions";
import { terapkanKoreksi } from "@/src/modules/attendance/actions/koreksi.actions";
import { notifikasiKeputusanPengajuan } from "../lib/approval-notify";
import {
	getAntrianApproval,
	prosesApproval,
	type AntrianItem,
	type ReferensiType,
} from "../lib/approval-engine";

export type ApprovalActionResult = {
	success: boolean;
	message: string;
	/** Terisi bila keputusan final (untuk trigger notifikasi push M4). */
	selesai?: "DISETUJUI" | "DITOLAK";
};

/** Revalidate best-effort: di luar konteks request (E2E/CLI) Next melempar — abaikan. */
function segarkan(path: string): void {
	try {
		revalidatePath(path);
	} catch {
		// abaikan — hygiene cache, bukan logika inti
	}
}

async function resolveApprover(userId: string): Promise<{ role: string; karyawanId: string | null }> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});
	const karyawan = await prisma.karyawan.findFirst({
		where: { userId },
		select: { id: true },
	});
	return { role: user?.role ?? "EMPLOYEE", karyawanId: karyawan?.id ?? null };
}

function isHr(role: string): boolean {
	return role === "SUPER_ADMIN" || role === "ADMIN_HR";
}

export async function getAntrianSaya(userId: string): Promise<AntrianItem[]> {
	const approver = await resolveApprover(userId);
	return getAntrianApproval(approver.karyawanId, isHr(approver.role));
}

export async function prosesPengajuanAction(
	userId: string,
	type: ReferensiType,
	id: string,
	keputusan: "SETUJU" | "TOLAK",
	catatan?: string,
): Promise<ApprovalActionResult> {
	const approver = await resolveApprover(userId);

	const onFinalApprove =
		type === "CUTI"
			? async () => {
					const pengajuan = await prisma.pengajuanKetidakhadiran.findUnique({
						where: { id },
						include: { jenisKetidakhadiran: { select: { menggunakanSaldo: true } } },
					});
					if (!pengajuan) return { success: false, message: "Pengajuan tidak ditemukan." };
					if (!pengajuan.jenisKetidakhadiran.menggunakanSaldo) {
						return { success: true, message: "OK" };
					}
					const tahun = new Date(pengajuan.tanggalMulai).getUTCFullYear();
					return potongSaldo(
						pengajuan.karyawanId,
						pengajuan.jenisKetidakhadiranId,
						tahun,
						Number(pengajuan.jumlahHari),
						id,
						`Pemakaian ${pengajuan.nomorPengajuan}`,
					);
				}
			: type === "TUKAR_SHIFT"
				? async () => eksekusiTukar(id)
			: type === "KOREKSI"
				? async () => terapkanKoreksi(id)
				: type === "UPDATE_DATA"
					? async () => terapkanUpdateData(id)
					: undefined;

	const result = await prosesApproval({
		type,
		id,
		approverUserId: userId,
		approverRole: approver.role,
		approverKaryawanId: approver.karyawanId,
		keputusan,
		catatan,
		onFinalApprove,
	});

	segarkan("/approval");
	segarkan("/leave");
	segarkan("/overtime");
	segarkan("/duty");
	segarkan("/employees/mutasi");
	segarkan("/employees/offboarding");
	segarkan("/employees/probation");
	segarkan("/employees/update-data");
	segarkan("/account/update-data");
	segarkan("/account/tukar");
	segarkan("/roster");

	// PRD mobile Bag. 5.8 — notifikasi push ke pemohon saat keputusan final.
	if (result.success && result.selesai) {
		await notifikasiKeputusanPengajuan(type, id, result.selesai);
	}

	// Offboarding disetujui final → buka fase clearance.
	if (result.success && result.selesai === "DISETUJUI" && type === "RESIGN") {
		await bukaClearance(id);
		segarkan("/employees/offboarding");
	}

	// P4-2: penolakan update-data teraudit (persetujuan tercatat di DITERAPKAN).
	if (result.success && result.selesai === "DITOLAK" && type === "UPDATE_DATA") {
		await prisma.updateDataRequest.update({
			where: { id },
			data: { diputuskanOlehId: userId, diputuskanPada: new Date(), catatanPutusan: catatan ?? null },
		});
		await catatAudit({
			actorUserId: userId,
			aksi: "UPDATE_DATA.DITOLAK",
			entityType: "UpdateDataRequest",
			entityId: id,
			sebelum: { status: "MENUNGGU_APPROVAL" },
			sesudah: { status: "DITOLAK" },
			alasan: catatan ?? null,
		});
	}

	return result;
}

export type RiwayatApprovalItem = {
	id: string;
	type: string;
	referensiId: string;
	tahap: number;
	status: string;
	catatan: string | null;
	diprosesPada: string | null;
};

export async function getRiwayatApprovalSaya(userId: string): Promise<RiwayatApprovalItem[]> {
	const rows = await prisma.approvalStep.findMany({
		where: { diprosesOlehId: userId },
		orderBy: { diprosesPada: "desc" },
		take: 50,
	});
	return rows.map((r) => ({
		id: r.id,
		type: r.referensiType,
		referensiId: r.referensiId,
		tahap: r.tahap,
		status: r.status,
		catatan: r.catatan,
		diprosesPada: r.diprosesPada?.toISOString() ?? null,
	}));
}
