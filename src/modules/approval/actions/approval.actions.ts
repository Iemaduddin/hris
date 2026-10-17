"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { recordAudit } from "@/src/modules/audit/lib/audit";
import { deductBalance } from "@/src/modules/leave/lib/balance";
import { openClearance } from "@/src/modules/employee/actions/offboarding.actions";
import { applyDataUpdate } from "@/src/modules/employee/lib/updatedata";
import { executeSwap } from "@/src/modules/roster/actions/tukar.actions";
import { applyCorrection } from "@/src/modules/attendance/actions/koreksi.actions";
import { notifyRequestDecision } from "../lib/approval-notify";
import {
  getApprovalQueue,
  processApproval,
  type QueueItem,
  type ReferensiType,
} from "../lib/approval-engine";

export type ApprovalActionResult = {
  success: boolean;
  message: string;
  /** Terisi bila keputusan final (untuk trigger notifikasi push M4). */
  outcome?: "DISETUJUI" | "DITOLAK";
};

/** Revalidate best-effort: di luar konteks request (E2E/CLI) Next melempar — abaikan. */
function revalidateBestEffort(path: string): void {
	try {
		revalidatePath(path);
	} catch {
		// abaikan — hygiene cache, bukan logika inti
	}
}

async function resolveApprover(userId: string): Promise<{ role: string; employeeId: string | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const employee = await prisma.karyawan.findFirst({
    where: { userId },
    select: { id: true },
  });
  return { role: user?.role ?? "EMPLOYEE", employeeId: employee?.id ?? null };
}

function isHr(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN_HR";
}

export async function getMyQueue(userId: string): Promise<QueueItem[]> {
  const approver = await resolveApprover(userId);
  return getApprovalQueue(approver.employeeId, isHr(approver.role));
}

export async function processSubmissionAction(
  userId: string,
  type: ReferensiType,
  id: string,
  decision: "SETUJU" | "TOLAK",
  note?: string,
): Promise<ApprovalActionResult> {
  const approver = await resolveApprover(userId);

  const onFinalApproval =
    type === "CUTI"
      ? async () => {
          const request = await prisma.pengajuanKetidakhadiran.findUnique({
            where: { id },
            include: { jenisKetidakhadiran: { select: { menggunakanSaldo: true } } },
          });
          if (!request) return { success: false, message: "Pengajuan tidak ditemukan." };
          if (!request.jenisKetidakhadiran.menggunakanSaldo) {
            return { success: true, message: "OK" };
          }
          const year = new Date(request.tanggalMulai).getUTCFullYear();
          return deductBalance(
            request.karyawanId,
            request.jenisKetidakhadiranId,
            year,
						Number(request.jumlahHari),
						id,
						`Pemakaian ${request.nomorPengajuan}`,
					);
				}
            : type === "TUKAR_SHIFT"
              ? async () => executeSwap(id)
            : type === "KOREKSI"
              ? async () => applyCorrection(id)
              : type === "UPDATE_DATA"
                ? async () => applyDataUpdate(id)
                : undefined;

  const result = await processApproval({
    type,
    id,
    approverUserId: userId,
    approverRole: approver.role,
    approverEmployeeId: approver.employeeId,
    decision,
    note,
    onFinalApproval,
  });

  revalidateBestEffort("/approval");
  revalidateBestEffort("/leave");
  revalidateBestEffort("/overtime");
  revalidateBestEffort("/duty");
  revalidateBestEffort("/employees/mutasi");
  revalidateBestEffort("/employees/offboarding");
  revalidateBestEffort("/employees/probation");
  revalidateBestEffort("/employees/update-data");
  revalidateBestEffort("/account/update-data");
  revalidateBestEffort("/account/tukar");
  revalidateBestEffort("/roster");

  // PRD mobile Bag. 5.8 — notifikasi push ke pemohon saat keputusan final.
  if (result.success && result.outcome) {
    await notifyRequestDecision(type, id, result.outcome);
  }

  // Offboarding disetujui final → buka fase clearance.
  if (result.success && result.outcome === "DISETUJUI" && type === "RESIGN") {
    await openClearance(id);
    revalidateBestEffort("/employees/offboarding");
  }

  // P4-2: penolakan update-data teraudit (persetujuan tercatat di DITERAPKAN).
  if (result.success && result.outcome === "DITOLAK" && type === "UPDATE_DATA") {
    await prisma.updateDataRequest.update({
      where: { id },
      data: { diputuskanOlehId: userId, diputuskanPada: new Date(), catatanPutusan: note ?? null },
    });
    await recordAudit({
      actorUserId: userId,
      aksi: "UPDATE_DATA.DITOLAK",
      entityType: "UpdateDataRequest",
      entityId: id,
      sebelum: { status: "MENUNGGU_APPROVAL" },
      sesudah: { status: "DITOLAK" },
      alasan: note ?? null,
    });
  }

  return result;
}

export type ApprovalHistoryItem = {
  id: string;
  type: string;
  referenceId: string;
  stage: number;
  status: string;
  note: string | null;
  processedAt: string | null;
};

export async function getMyApprovalHistory(userId: string): Promise<ApprovalHistoryItem[]> {
  const rows = await prisma.approvalStep.findMany({
    where: { diprosesOlehId: userId },
    orderBy: { diprosesPada: "desc" },
    take: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.referensiType,
    referenceId: r.referensiId,
    stage: r.tahap,
    status: r.status,
    note: r.catatan,
    processedAt: r.diprosesPada?.toISOString() ?? null,
  }));
}
