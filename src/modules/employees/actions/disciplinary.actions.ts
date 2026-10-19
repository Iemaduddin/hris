"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { defaultExpiryDate, LEVEL_LABELS, validateEscalation } from "@/src/modules/employees/lib/disciplinary";
import { notifyEmployees } from "@/src/modules/notifications/lib/notifications";

export type DisciplinaryActionResult = { success: boolean; message: string; id?: string };

export type DisciplinaryActionItem = {
  id: string;
  number: string;
  employeeId: string;
  employeeName: string;
  level: string;
  levelLabel: string;
  title: string;
  publishedAt: string;
  validUntil: string | null;
  active: boolean;
  status: string;
};

export type DisciplinaryActionDetail = DisciplinaryActionItem & {
  violation: string;
  seriousViolation: boolean;
  suspensionStart: string | null;
  suspensionEnd: string | null;
  documentUrl: string | null;
  employeeSignedAt: string | null;
  employeeSignedName: string | null;
  note: string | null;
  revokeReason: string | null;
};

type Actor = { role: string; employeeId: string | null };

async function resolveActor(userId: string): Promise<Actor> {
  if (!userId) return { role: "EMPLOYEE", employeeId: null };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const employee = await prisma.karyawan.findFirst({ where: { userId }, select: { id: true } });
  return { role: user?.role ?? "EMPLOYEE", employeeId: employee?.id ?? null };
}

function isHr(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN_HR";
}

async function canManage(p: Actor, employeeId: string): Promise<boolean> {
  if (isHr(p.role)) return true;
  if (p.role !== "MANAJER" || !p.employeeId) return false;
  const subordinate = await prisma.karyawan.findFirst({
    where: { id: employeeId, atasanLangsungId: p.employeeId },
    select: { id: true },
  });
  return !!subordinate;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isActiveRecord(r: { status: string; berlakuSampai: Date | null }): boolean {
  return r.status === "DITERBITKAN" && (!r.berlakuSampai || r.berlakuSampai.getTime() >= startOfToday().getTime());
}

export async function getDisiplinList(userId: string): Promise<DisciplinaryActionItem[]> {
  const p = await resolveActor(userId);
  const rows = await prisma.suratPeringatan.findMany({
    where: !isHr(p.role) && p.employeeId ? { karyawan: { atasanLangsungId: p.employeeId } } : {},
    orderBy: { tanggalTerbit: "desc" },
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    number: r.nomor,
    employeeId: r.karyawanId,
    employeeName: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    level: r.tingkat,
    levelLabel: LEVEL_LABELS[r.tingkat] ?? r.tingkat,
    title: r.judul,
    publishedAt: r.tanggalTerbit.toISOString().slice(0, 10),
    validUntil: r.berlakuSampai?.toISOString().slice(0, 10) ?? null,
    active: isActiveRecord(r),
    status: r.status,
  }));
}

export async function getDisciplinaryActionDetail(id: string, userId: string): Promise<DisciplinaryActionDetail | null> {
  const p = await resolveActor(userId);
  const r = await prisma.suratPeringatan.findUnique({
    where: { id },
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true, atasanLangsungId: true } } },
  });
  if (!r) return null;
  const isOwner = p.employeeId === r.karyawanId;
  if (!isHr(p.role) && !isOwner && r.karyawan.atasanLangsungId !== p.employeeId) return null;
  return {
    id: r.id,
    number: r.nomor,
    employeeId: r.karyawanId,
    employeeName: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    level: r.tingkat,
    levelLabel: LEVEL_LABELS[r.tingkat] ?? r.tingkat,
    title: r.judul,
    publishedAt: r.tanggalTerbit.toISOString().slice(0, 10),
    validUntil: r.berlakuSampai?.toISOString().slice(0, 10) ?? null,
    active: isActiveRecord(r),
    status: r.status,
    violation: r.pelanggaran,
    seriousViolation: r.pelanggaranBerat,
    suspensionStart: r.tanggalSkorsingMulai?.toISOString().slice(0, 10) ?? null,
    suspensionEnd: r.tanggalSkorsingSelesai?.toISOString().slice(0, 10) ?? null,
    documentUrl: r.dokumenUrl,
    employeeSignedAt: r.ttdKaryawanPada?.toISOString() ?? null,
    employeeSignedName: r.ttdKaryawanNama,
    note: r.catatan,
    revokeReason: r.alasanCabut,
  };
}

export async function getMyDisciplinaryActions(employeeId: string): Promise<DisciplinaryActionItem[]> {
  const rows = await prisma.suratPeringatan.findMany({
    where: { karyawanId: employeeId, status: { in: ["DITERBITKAN", "DICABUT"] } },
    orderBy: { tanggalTerbit: "desc" },
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    number: r.nomor,
    employeeId: r.karyawanId,
    employeeName: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    level: r.tingkat,
    levelLabel: LEVEL_LABELS[r.tingkat] ?? r.tingkat,
    title: r.judul,
    publishedAt: r.tanggalTerbit.toISOString().slice(0, 10),
    validUntil: r.berlakuSampai?.toISOString().slice(0, 10) ?? null,
    active: isActiveRecord(r),
    status: r.status,
  }));
}

export async function getActiveWarnings(): Promise<DisciplinaryActionItem[]> {
  const rows = await prisma.suratPeringatan.findMany({
    where: { status: "DITERBITKAN" },
    orderBy: { tanggalTerbit: "desc" },
    take: 20,
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows
    .filter(isActiveRecord)
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      number: r.nomor,
      employeeId: r.karyawanId,
      employeeName: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
      level: r.tingkat,
      levelLabel: LEVEL_LABELS[r.tingkat] ?? r.tingkat,
      title: r.judul,
      publishedAt: r.tanggalTerbit.toISOString().slice(0, 10),
      validUntil: r.berlakuSampai?.toISOString().slice(0, 10) ?? null,
      active: true,
      status: r.status,
    }));
}

export async function createDisciplinaryAction(
  input: {
    employeeId: string;
    level: string;
    title: string;
    violation: string;
    seriousViolation: boolean;
    publishedAt: string;
    validUntil: string;
    suspensionStart: string;
    suspensionEnd: string;
    documentUrl: string;
    note: string;
  },
  userId: string,
): Promise<DisciplinaryActionResult> {
  const p = await resolveActor(userId);
  if (!(await canManage(p, input.employeeId))) {
    return { success: false, message: "Anda hanya bisa mengusulkan untuk bawahan langsung." };
  }
  const employee = await prisma.karyawan.findUnique({ where: { id: input.employeeId }, select: { status: true } });
  if (!employee || !["AKTIF", "PROBASI"].includes(employee.status)) {
    return { success: false, message: "Employee tidak aktif." };
  }
  if (!(LEVEL_LABELS as Record<string, string>)[input.level]) {
    return { success: false, message: "Tingkat tidak valid." };
  }
  if (!input.title.trim() || !input.violation.trim()) {
    return { success: false, message: "Judul dan pelanggaran wajib diisi." };
  }
  const date = toDbDate(input.publishedAt);
  if (Number.isNaN(date.getTime())) return { success: false, message: "Tanggal terbit tidak valid." };
  let expiry: Date | null = null;
  if (input.validUntil.trim()) {
    expiry = toDbDate(input.validUntil);
    if (Number.isNaN(expiry.getTime())) return { success: false, message: "Berlaku sampai tidak valid." };
  }
  let suspStart: Date | null = null;
  let suspEnd: Date | null = null;
  if (input.level === "SKORSING") {
    if (!input.suspensionStart || !input.suspensionEnd) {
      return { success: false, message: "Skorsing wajib ada rentang tanggal." };
    }
    suspStart = toDbDate(input.suspensionStart);
    suspEnd = toDbDate(input.suspensionEnd);
    if (Number.isNaN(suspStart.getTime()) || Number.isNaN(suspEnd.getTime()) || suspEnd < suspStart) {
      return { success: false, message: "Rentang skorsing tidak valid." };
    }
  }

  const created = await prisma.suratPeringatan.create({
    data: {
      nomor: `SP-${date.getUTCFullYear()}-${input.employeeId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      karyawanId: input.employeeId,
      tingkat: input.level as never,
      judul: input.title.trim(),
      pelanggaran: input.violation.trim(),
      pelanggaranBerat: input.seriousViolation,
      tanggalTerbit: date,
      berlakuSampai: expiry,
      tanggalSkorsingMulai: suspStart,
      tanggalSkorsingSelesai: suspEnd,
      dokumenUrl: input.documentUrl.trim() || null,
      catatan: input.note.trim() || null,
      createdById: userId,
    },
    select: { id: true },
  });
  revalidatePath("/employees/disciplinary-actions");
  return { success: true, message: "Draf surat tersimpan.", id: created.id };
}

async function activeLevels(employeeId: string): Promise<string[]> {
  const rows = await prisma.suratPeringatan.findMany({
    where: { karyawanId: employeeId, status: "DITERBITKAN" },
    select: { tingkat: true, berlakuSampai: true, status: true },
  });
  return rows.filter(isActiveRecord).map((r) => r.tingkat);
}

export async function publishDisiplin(id: string, userId: string): Promise<DisciplinaryActionResult> {
  const p = await resolveActor(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa menerbitkan." };
  const row = await prisma.suratPeringatan.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diterbitkan." };
  const err = validateEscalation(row.tingkat, await activeLevels(row.karyawanId), row.pelanggaranBerat);
  if (err) return { success: false, message: err };
  await prisma.suratPeringatan.update({
    where: { id },
    data: {
      status: "DITERBITKAN",
      berlakuSampai: row.berlakuSampai ?? defaultExpiryDate(row.tanggalTerbit),
      diterbitkanOlehId: userId,
      diterbitkanPada: new Date(),
    },
  });
  revalidatePath("/employees/disciplinary-actions");
  await notifyEmployees([row.karyawanId], {
    title: "Surat peringatan diterbitkan",
    body: `${row.nomor} (${LEVEL_LABELS[row.tingkat] ?? row.tingkat}) telah diterbitkan. Buka aplikasi untuk membacanya.`,
    kind: "INFO",
    referenceType: "SP",
    referenceId: id,
    url: "/account/disciplinary-actions",
  });
  return { success: true, message: `${row.nomor} diterbitkan.` };
}

export async function revokeDisciplinaryAction(id: string, reason: string, userId: string): Promise<DisciplinaryActionResult> {
  const p = await resolveActor(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa mencabut." };
  const row = await prisma.suratPeringatan.findUnique({ where: { id }, select: { status: true } });
  if (!row || row.status !== "DITERBITKAN") return { success: false, message: "Hanya yang terbit yang bisa dicabut." };
  if (!reason.trim()) return { success: false, message: "Alasan pencabutan wajib diisi." };
  await prisma.suratPeringatan.update({
    where: { id },
    data: { status: "DICABUT", alasanCabut: reason.trim(), dicabutOlehId: userId, dicabutPada: new Date() },
  });
  revalidatePath("/employees/disciplinary-actions");
  return { success: true, message: "Surat dicabut." };
}

export async function deleteDisciplinaryAction(id: string, userId: string): Promise<DisciplinaryActionResult> {
  const p = await resolveActor(userId);
  const row = await prisma.suratPeringatan.findUnique({ where: { id }, select: { karyawanId: true, status: true } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!(await canManage(p, row.karyawanId))) return { success: false, message: "Akses ditolak." };
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa dihapus." };
  await prisma.suratPeringatan.delete({ where: { id } });
  revalidatePath("/employees/disciplinary-actions");
  return { success: true, message: "Draf dihapus." };
}

export async function acknowledgeDisiplin(id: string, userId: string): Promise<DisciplinaryActionResult> {
  const p = await resolveActor(userId);
  const row = await prisma.suratPeringatan.findUnique({
    where: { id },
    select: { karyawanId: true, status: true, ttdKaryawanPada: true, karyawan: { select: { namaLengkap: true } } },
  });
  if (!row || row.status !== "DITERBITKAN") return { success: false, message: "Surat tidak tersedia." };
  if (p.employeeId !== row.karyawanId) return { success: false, message: "Hanya untuk karyawan bersangkutan." };
  if (row.ttdKaryawanPada) return { success: false, message: "Sudah ditandatangani." };
  await prisma.suratPeringatan.update({
    where: { id },
    data: { ttdKaryawanPada: new Date(), ttdKaryawanNama: row.karyawan.namaLengkap },
  });
  revalidatePath("/account/disciplinary-actions");
  return { success: true, message: "Tercatat sudah dibaca." };
}
