"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { potongSaldo } from "@/src/modules/leave/lib/balance";
import { bukaClearance } from "@/src/modules/employee/actions/offboarding.actions";
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

	revalidatePath("/approval");
	revalidatePath("/leave");
	revalidatePath("/overtime");
	revalidatePath("/duty");
	revalidatePath("/employees/mutasi");
	revalidatePath("/employees/offboarding");

	// PRD mobile Bag. 5.8 — notifikasi push ke pemohon saat keputusan final.
	if (result.success && result.selesai) {
		await notifikasiKeputusanPengajuan(type, id, result.selesai);
	}

	// Offboarding disetujui final → buka fase clearance.
	if (result.success && result.selesai === "DISETUJUI" && type === "RESIGN") {
		await bukaClearance(id);
		revalidatePath("/employees/offboarding");
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
