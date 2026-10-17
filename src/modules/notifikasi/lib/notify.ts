import prisma from "@/src/lib/prisma";
import { sendPush, type PushMessage } from "@/src/lib/push";
import { sendEmail } from "@/src/lib/email";

export type NotificationKindInput = "PENGAJUAN_MASUK" | "KEPUTUSAN" | "INFO";

export type NotificationInput = {
  userId: string;
  title: string;
  body: string;
  kind?: NotificationKindInput;
  referenceType?: string;
  referenceId?: string;
  /** Deep-link web (mis. /approval). Mobile memakai referensiType/Id. */
  url?: string;
  /** Data push mobile (deep-link + id + status). */
  pushData?: Record<string, unknown>;
};

async function getPreferences(userId: string): Promise<{ pushEnabled: boolean; emailEnabled: boolean }> {
  const row = await prisma.preferensiNotifikasi.findUnique({ where: { userId } });
  return { pushEnabled: row?.pushAktif ?? true, emailEnabled: row?.emailAktif ?? true };
}

/**
 * Tulis notifikasi terpadu: in-app selalu disimpan, push + email
 * mengikuti preferensi per-user. Best-effort: tak pernah melempar.
 */
export async function sendNotification(input: NotificationInput): Promise<void> {
  try {
    if (!input.userId) return;
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, isActive: true, email: true },
    });
    if (!user || user.isActive === false) return;

    await prisma.notifikasi.create({
      data: {
        userId: user.id,
        judul: input.title,
        isi: input.body,
        jenis: (input.kind ?? "INFO") as never,
        referensiType: input.referenceType ?? null,
        referensiId: input.referenceId ?? null,
        url: input.url ?? null,
      },
    });

    const pref = await getPreferences(user.id);

    if (pref.pushEnabled) {
      const employee = await prisma.karyawan.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });
      if (employee) {
        const devices = await prisma.perangkatKaryawan.findMany({
          where: { karyawanId: employee.id, isActive: true, pushToken: { not: null } },
          select: { pushToken: true },
        });
        const tokens = [...new Set(devices.map((d) => d.pushToken).filter((t): t is string => Boolean(t)))];
        if (tokens.length > 0) {
          const messages: PushMessage[] = tokens.map((to) => ({
            to,
            title: input.title,
            body: input.body,
            sound: "default",
            priority: "high",
            data: input.pushData ?? { url: input.url ?? null },
          }));
          await sendPush(messages);
        }
      }
    }

    if (pref.emailEnabled && user.email) {
      await sendEmail(user.email, `[HRIS] ${input.title}`, `${input.body}${input.url ? `\n\nBuka: ${input.url}` : ""}`);
    }
  } catch (error) {
    console.warn("[notifikasi] Gagal mengirim:", error instanceof Error ? error.message : error);
  }
}

/** ID user approver untuk satu tahap: personal (karyawan) atau semua HR aktif. */
export async function getStageApproverUsers(step: {
  approverKaryawanId: string | null;
  approverRole: string | null;
}): Promise<string[]> {
  if (step.approverKaryawanId) {
    const k = await prisma.karyawan.findUnique({
      where: { id: step.approverKaryawanId },
      select: { userId: true },
    });
    return k?.userId ? [k.userId] : [];
  }
  if (step.approverRole === "ADMIN_HR") {
    const hrs = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN_HR"] }, isActive: true },
      select: { id: true },
    });
    return hrs.map((h) => h.id);
  }
  return [];
}

/**
 * Beritahu semua approver tahap berjalan — dipanggil setiap pengajuan
 * masuk (semua tipe via startApprovalFlow + UPDATE_DATA via submitDataUpdate).
 */
export async function notifyNewApprover(
  type: string,
  id: string,
  title: string,
  body: string,
  url: string,
  pushData?: Record<string, unknown>,
): Promise<void> {
  try {
    const steps = await prisma.approvalStep.findMany({
      where: { referensiType: type, referensiId: id, status: "MENUNGGU" },
      select: { approverKaryawanId: true, approverRole: true },
    });
    const userIds = new Set<string>();
    for (const s of steps) {
      for (const u of await getStageApproverUsers(s)) userIds.add(u);
    }
    for (const userId of userIds) {
      await sendNotification({
        userId,
        title,
        body,
        kind: "PENGAJUAN_MASUK",
        referenceType: type,
        referenceId: id,
        url,
        pushData,
      });
    }
  } catch (error) {
    console.warn("[notifikasi] Gagal memberitahu approver:", error instanceof Error ? error.message : error);
  }
}
