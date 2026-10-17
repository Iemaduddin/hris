"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { recordAudit } from "@/src/modules/audit/lib/audit";
import { toDbDate } from "@/src/lib/time";
import { startApprovalFlow } from "@/src/modules/approval/lib/approval-engine";
import { validateCorrection, correctionTime } from "@/src/modules/attendance/lib/koreksi";

export type CorrectionActionResult = { success: boolean; message: string; id?: string };

export type CorrectionItem = {
  id: string;
  date: string;
  eventType: string;
  correctedTime: string;
  reason: string;
  status: string;
};

/** Revalidate best-effort: di luar konteks request (E2E/CLI) Next melempar — abaikan. */
function revalidateBestEffort(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // abaikan — hygiene cache, bukan logika inti
  }
}

async function employeeIdFromUser(userId: string): Promise<string | null> {
  if (!userId) return null;
  const k = await prisma.karyawan.findFirst({ where: { userId }, select: { id: true } });
  return k?.id ?? null;
}

export async function getMyCorrections(userId: string): Promise<CorrectionItem[]> {
  const mine = await employeeIdFromUser(userId);
  if (!mine) return [];
  const rows = await prisma.koreksiPresensi.findMany({
    where: { karyawanId: mine },
    orderBy: { tanggal: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    date: r.tanggal.toISOString().slice(0, 10),
    eventType: r.tipe,
    correctedTime: r.waktuBaru.toISOString().slice(11, 16),
    reason: r.alasan,
    status: r.status,
  }));
}

export async function createCorrection(
  input: { date: string; eventType: string; time: string; reason: string; attachmentUrl: string },
  userId: string,
): Promise<CorrectionActionResult> {
  const mine = await employeeIdFromUser(userId);
  if (!mine) return { success: false, message: "Akun belum tertaut ke karyawan." };
  const err = validateCorrection(input);
  if (err) return { success: false, message: err };
  const date = toDbDate(input.date);
  const duplicate = await prisma.koreksiPresensi.findFirst({
    where: { karyawanId: mine, tanggal: date, tipe: input.eventType as never, status: { in: ["DRAFT", "DIAJUKAN", "MENUNGGU_APPROVAL"] } },
    select: { id: true },
  });
  if (duplicate) return { success: false, message: "Sudah ada pengajuan aktif untuk itu." };

  const created = await prisma.koreksiPresensi.create({
    data: {
      karyawanId: mine,
      tanggal: date,
      tipe: input.eventType as never,
      waktuBaru: correctionTime(input.date, input.time),
      alasan: input.reason.trim(),
      lampiranUrl: input.attachmentUrl.trim() || null,
      createdById: userId,
    },
    select: { id: true },
  });
  revalidateBestEffort("/account/koreksi");
  return { success: true, message: "Draf koreksi tersimpan.", id: created.id };
}

export async function submitCorrection(id: string, userId: string): Promise<CorrectionActionResult> {
  const mine = await employeeIdFromUser(userId);
  const row = await prisma.koreksiPresensi.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.karyawanId !== mine) return { success: false, message: "Hanya milik sendiri." };
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
  await startApprovalFlow("KOREKSI", id);
  revalidateBestEffort("/account/koreksi");
  revalidateBestEffort("/approval");
  return { success: true, message: "Dikirim ke atasan → HR." };
}

export async function cancelCorrection(id: string, userId: string): Promise<CorrectionActionResult> {
  const mine = await employeeIdFromUser(userId);
  const row = await prisma.koreksiPresensi.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.karyawanId !== mine) return { success: false, message: "Hanya milik sendiri." };
  if (!["DRAFT", "DIAJUKAN"].includes(row.status)) {
    return { success: false, message: "Status ini tidak bisa dibatalkan." };
  }
  await prisma.$transaction([
    prisma.koreksiPresensi.update({ where: { id }, data: { status: "DIBATALKAN" } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "KOREKSI", referensiId: id } }),
  ]);
  revalidateBestEffort("/account/koreksi");
  return { success: true, message: "Pengajuan dibatalkan." };
}

/**
 * Terapkan koreksi saat final approve (dipanggil sebagai onFinalApprove):
 * event lama (bila ada) dibatalkan, event MANUAL/DIKOREKSI dibuat.
 * Rekap menghitung ulang otomatis saat dibaca berikutnya.
 */
export async function applyCorrection(id: string): Promise<{ success: boolean; message: string }> {
  const row = await prisma.koreksiPresensi.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  const dayStart = new Date(row.tanggal);
  const dayEnd = new Date(row.tanggal.getTime() + 86_400_000);
  const previous = await prisma.absensi.findFirst({
    where: {
      karyawanId: row.karyawanId,
      tipe: row.tipe,
      waktu: { gte: dayStart, lt: dayEnd },
      status: { in: ["VALID", "DIKOREKSI"] },
    },
    orderBy: { waktu: "desc" },
  });
  await prisma.$transaction([
    ...(previous
      ? [
          prisma.absensi.update({
            where: { id: previous.id },
            data: { status: "DIBATALKAN", catatan: `Digantikan koreksi ${row.id.slice(-6).toUpperCase()}` },
          }),
        ]
      : []),
    prisma.absensi.create({
      data: {
        karyawanId: row.karyawanId,
        waktu: row.waktuBaru,
        tipe: row.tipe,
        sumber: "MANUAL",
        status: "DIKOREKSI",
        catatan: `Koreksi mandiri disetujui (${row.alasan})`,
      },
    }),
    prisma.koreksiPresensi.update({ where: { id }, data: { absensiId: previous?.id ?? null } }),
  ]);
  // P0-9: penerapan koreksi via approval teraudit (sebelum=event lama, sesudah=jam baru).
  const finalStep = await prisma.approvalStep.findFirst({
    where: { referensiType: "KOREKSI", referensiId: id, status: "DISETUJUI" },
    orderBy: { tahap: "desc" },
    select: { diprosesOlehId: true },
  });
  await recordAudit({
    actorUserId: finalStep?.diprosesOlehId ?? null,
    aksi: "KOREKSI.DITERAPKAN",
    entityType: "KoreksiPresensi",
    entityId: id,
    sebelum: previous ? { absensiId: previous.id, waktu: previous.waktu, tipe: previous.tipe, status: previous.status } : null,
    sesudah: { karyawanId: row.karyawanId, waktuBaru: row.waktuBaru, tipe: row.tipe },
    alasan: row.alasan,
  });
  return { success: true, message: "Koreksi diterapkan." };
}
