import prisma from "@/src/lib/prisma";
import { getRequestSummary, type ReferensiType } from "./approval-engine";
import { sendNotification } from "@/src/modules/notifikasi/lib/notify";

/** Beritahu pemohon saat pengajuan disetujui/ditolak (best-effort). */

const KIND_SLUGS: Record<ReferensiType, string> = {
  CUTI: "leave",
  LEMBUR: "overtime",
  DINAS: "duty",
  MUTASI: "mutasi",
  RESIGN: "resign",
  PROBATION: "probation",
  TUKAR_SHIFT: "tukar",
  KOREKSI: "koreksi",
  UPDATE_DATA: "updatedata",
  REIMBURSE: "reimburse",
  UANGDINAS: "uangdinas",
};

export type DecisionStatus = "DISETUJUI" | "DITOLAK";

export async function notifyRequestDecision(
  type: ReferensiType,
  id: string,
  status: DecisionStatus,
): Promise<void> {
  try {
    const detail = await getRequestSummary(type, id);
    if (!detail) return;

    const employee = await prisma.karyawan.findUnique({
      where: { id: detail.employeeId },
      select: { userId: true },
    });
    if (!employee?.userId) return;

    const approved = status === "DISETUJUI";
    const slug = KIND_SLUGS[type];
    await sendNotification({
      userId: employee.userId,
      title: approved ? "Pengajuan Disetujui" : "Pengajuan Ditolak",
      body: `${detail.number} • ${detail.summary} — ${approved ? "disetujui" : "ditolak"}.`,
      kind: "KEPUTUSAN",
      referenceType: type,
      referenceId: id,
      url: "/account/requests",
      pushData: {
        url: `/requests/detail?id=${encodeURIComponent(detail.id)}&kind=${slug}`,
        kind: slug,
        id: detail.id,
        status,
      },
    });
  } catch (error) {
    console.warn(
      "[approval-notify] Gagal mengirim notifikasi:",
      error instanceof Error ? error.message : error,
    );
  }
}
