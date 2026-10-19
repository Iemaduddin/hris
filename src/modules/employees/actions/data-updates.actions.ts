"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { recordAudit } from "@/src/modules/audit/lib/audit";
import {
  UPDATE_DATA_CATEGORIES,
  normalizeDataBaru,
  summarizeDataUpdate,
  validateDataUpdate,
  getCategoryLabel,
} from "@/src/modules/employees/lib/data-updates";

/** Revalidate best-effort: di luar konteks request (E2E/CLI) Next melempar — abaikan. */
function revalidateBestEffort(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // abaikan — hygiene cache, bukan logika inti
  }
}

export type DataUpdateActionResult = { success: boolean; message: string; id?: string };

export type DataUpdateItem = {
  id: string;
  number: string;
  category: string;
  summary: string;
  status: string;
  reason: string;
  submittedAt: string | null;
};

function toItem(r: {
  id: string;
  nomor: string;
  kategori: string;
  dataBaru: unknown;
  status: string;
  reason: string;
  diajukanPada: Date | null;
}): DataUpdateItem {
  return {
    id: r.id,
    number: r.nomor,
    category: r.kategori,
    summary: summarizeDataUpdate(r.kategori, (r.dataBaru ?? {}) as Record<string, unknown>),
    status: r.status,
    reason: r.reason,
    submittedAt: r.diajukanPada?.toISOString() ?? null,
  };
}

async function employeeIdFromUser(userId: string): Promise<string | null> {
  if (!userId) return null;
  const k = await prisma.karyawan.findFirst({ where: { userId }, select: { id: true } });
  return k?.id ?? null;
}

export async function getMyDataUpdates(userId: string): Promise<DataUpdateItem[]> {
  const mine = await employeeIdFromUser(userId);
  if (!mine) return [];
  const rows = await prisma.updateDataRequest.findMany({
    where: { karyawanId: mine },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => toItem(r as never));
}

export async function getAllDataUpdates(): Promise<Array<DataUpdateItem & { employeeName: string; employeeNumber: string }>> {
  const rows = await prisma.updateDataRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows.map((r) => ({
    ...toItem(r as never),
    employeeName: r.karyawan.namaLengkap,
    employeeNumber: r.karyawan.nomorKaryawan,
  }));
}

export async function createDataUpdate(
  input: { category: string; targetId?: string; newData: Record<string, unknown>; reason: string; attachmentUrl?: string },
  userId: string,
): Promise<DataUpdateActionResult> {
  const mine = await employeeIdFromUser(userId);
  if (!mine) return { success: false, message: "Akun belum tertaut ke karyawan." };
  const category = String(input.category ?? "").toUpperCase();
  if (!(UPDATE_DATA_CATEGORIES as readonly string[]).includes(category)) {
    return { success: false, message: "Kategori tidak valid." };
  }
  const newData = normalizeDataBaru(input.newData ?? {});
  const err = validateDataUpdate(category, newData);
  if (err) return { success: false, message: err };
  if (!String(input.reason ?? "").trim()) return { success: false, message: "Alasan perubahan wajib diisi." };

  const employee = await prisma.karyawan.findUnique({
    where: { id: mine },
    select: { id: true, status: true, alamat: true, telepon: true, email: true },
  });
  if (!employee || !["AKTIF", "PROBASI"].includes(employee.status)) {
    return { success: false, message: "Status karyawan tidak aktif." };
  }

  // Snapshot nilai lama agar HR bisa bandingkan sebelum/sesudah.
  let oldData: Record<string, unknown> | null = null;
  let targetId: string | null = null;
  if (category === "ALAMAT") oldData = { alamat: employee.alamat };
  else if (category === "KONTAK") oldData = { telepon: employee.telepon, email: employee.email };
  else if (category === "KELUARGA" && input.targetId) {
    const existing = await prisma.keluargaKaryawan.findFirst({
      where: { id: String(input.targetId), karyawanId: mine },
    });
    if (!existing) return { success: false, message: "Data keluarga tujuan tidak ditemukan." };
    targetId = existing.id;
    oldData = { ...existing, tanggalLahir: existing.tanggalLahir?.toISOString() ?? null } as never;
  }

  const year = new Date().getUTCFullYear();
  const created = await prisma.updateDataRequest.create({
    data: {
      nomor: `UPD-${year}-${mine.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      karyawanId: mine,
      kategori: category as never,
      targetId,
      dataLama: (oldData ?? undefined) as never,
      dataBaru: newData as never,
      alasan: String(input.reason).trim(),
      lampiranUrl: String(input.attachmentUrl ?? "").trim() || null,
      createdById: userId,
    },
    select: { id: true, nomor: true },
  });
  revalidateBestEffort("/account/data-updates");
  return { success: true, message: `Draf ${created.nomor} tersimpan.`, id: created.id };
}

export async function submitDataUpdate(id: string, userId: string): Promise<DataUpdateActionResult> {
  const mine = await employeeIdFromUser(userId);
  const row = await prisma.updateDataRequest.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.karyawanId !== mine) return { success: false, message: "Hanya milik sendiri." };
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
  await recordAudit({
    actorUserId: userId,
    aksi: "UPDATE_DATA.DIAJUKAN",
    entityType: "UpdateDataRequest",
    entityId: id,
    sebelum: { status: "DRAFT" },
    sesudah: { status: "MENUNGGU_APPROVAL", nomor: row.nomor },
    reason: row.alasan,
  });
  // P4-3: beritahu HR (in-app + push + email per preferensi).
  try {
    const { notifyNewApprover } = await import("@/src/modules/notifications/lib/notifications");
    const { summarizeDataUpdate, getCategoryLabel } = await import("@/src/modules/employees/lib/data-updates");
    const requester = await prisma.karyawan.findUnique({
      where: { id: row.karyawanId },
      select: { namaLengkap: true, nomorKaryawan: true },
    });
    await notifyNewApprover(
      "UPDATE_DATA",
      id,
      "Pengajuan Update Data Baru",
      `${row.nomor} • ${requester?.namaLengkap ?? "-"} (${requester?.nomorKaryawan ?? "-"}) — ${getCategoryLabel(row.kategori)} • ${summarizeDataUpdate(row.kategori, (row.dataBaru ?? {}) as Record<string, unknown>)}`,
      "/employees/data-updates",
    );
  } catch {
    // abaikan — notifikasi pelengkap
  }
  revalidateBestEffort("/account/data-updates");
  revalidateBestEffort("/approval");
  return { success: true, message: "Dikirim ke HR untuk verifikasi." };
}

export async function cancelDataUpdate(id: string, userId: string): Promise<DataUpdateActionResult> {
  const mine = await employeeIdFromUser(userId);
  const row = await prisma.updateDataRequest.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.karyawanId !== mine) return { success: false, message: "Hanya milik sendiri." };
  if (!["DRAFT", "DIAJUKAN"].includes(row.status)) {
    return { success: false, message: "Status ini tidak bisa dibatalkan." };
  }
  await prisma.$transaction([
    prisma.updateDataRequest.update({ where: { id }, data: { status: "DIBATALKAN" } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "UPDATE_DATA", referensiId: id } }),
  ]);
  revalidateBestEffort("/account/data-updates");
  return { success: true, message: "Pengajuan dibatalkan." };
}
