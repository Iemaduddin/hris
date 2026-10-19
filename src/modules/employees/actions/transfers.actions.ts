"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { startApprovalFlow } from "@/src/modules/approval/lib/approval-engine";
import { hasChanges, getTransferTypeLabel, validateTransfer } from "@/src/modules/employees/lib/transfers";

export type TransferActionResult = { success: boolean; message: string; id?: string };

export type TransferItem = {
  id: string;
  number: string;
  employeeId: string;
  employeeName: string;
  kind: string;
  kindLabel: string;
  from: string;
  to: string;
  effectiveDate: string;
  status: string;
};

export type TransferDetail = TransferItem & {
  reason: string;
  fromUnitName: string | null;
  fromPositionName: string | null;
  fromWorkLocationName: string | null;
  toUnitName: string | null;
  toPositionName: string | null;
  toWorkLocationName: string | null;
  toSupervisorName: string | null;
  submittedAt: string | null;
  appliedAt: string | null;
  steps: Array<{ stage: number; status: string; note: string | null; processedAt: string | null }>;
};

type Actor = { role: string; employeeId: string | null };

async function resolveActor(userId: string): Promise<Actor> {
  if (!userId) return { role: "EMPLOYEE", employeeId: null };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const karyawan = await prisma.karyawan.findFirst({ where: { userId }, select: { id: true } });
  return { role: user?.role ?? "EMPLOYEE", employeeId: karyawan?.id ?? null };
}

function isHr(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN_HR";
}

/** Manajer hanya untuk bawahan langsung; HR untuk semua. */
async function canManage(p: Actor, karyawanId: string): Promise<boolean> {
  if (isHr(p.role)) return true;
  if (p.role !== "MANAJER" || !p.employeeId) return false;
  const subordinate = await prisma.karyawan.findFirst({
    where: { id: karyawanId, atasanLangsungId: p.employeeId },
    select: { id: true },
  });
  return !!subordinate;
}

function summarizePlacement(unit: string | null, posisi: string | null, lokasi: string | null): string {
  return [posisi, unit, lokasi].filter(Boolean).join(" • ") || "-";
}

async function activePlacement(karyawanId: string) {
  return prisma.posisiKaryawan.findFirst({
    where: { karyawanId, isCurrent: true },
    orderBy: { tanggalEfektif: "desc" },
    include: {
      unitOrganisasi: { select: { nama: true } },
      posisi: { select: { nama: true } },
      lokasiKerja: { select: { nama: true } },
    },
  });
}

export async function getTransferList(userId: string): Promise<TransferItem[]> {
  const p = await resolveActor(userId);
  const rows = await prisma.mutasi.findMany({
    where: !isHr(p.role) && p.employeeId ? { karyawan: { atasanLangsungId: p.employeeId } } : {},
    orderBy: { createdAt: "desc" },
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
      keUnit: { select: { nama: true } },
      kePosisi: { select: { nama: true } },
      keLokasi: { select: { nama: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    number: r.nomor,
    employeeId: r.karyawanId,
    employeeName: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    kind: r.jenis,
    kindLabel: getTransferTypeLabel(r.jenis),
    from: summarizePlacement(r.dariUnitNama, r.dariPosisiNama, r.dariLokasiNama),
    to: summarizePlacement(r.keUnit?.nama ?? null, r.kePosisi?.nama ?? null, r.keLokasi?.nama ?? null),
    effectiveDate: r.tanggalEfektif.toISOString().slice(0, 10),
    status: r.status,
  }));
}

export async function getTransferDetail(id: string, userId: string): Promise<TransferDetail | null> {
  const p = await resolveActor(userId);
  const r = await prisma.mutasi.findUnique({
    where: { id },
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true, atasanLangsungId: true } },
      keUnit: { select: { nama: true } },
      kePosisi: { select: { nama: true } },
      keLokasi: { select: { nama: true } },
      keAtasan: { select: { namaLengkap: true } },
    },
  });
  if (!r) return null;
  if (!isHr(p.role) && r.karyawan.atasanLangsungId !== p.employeeId) return null;
  const steps = await prisma.approvalStep.findMany({
    where: { referensiType: "MUTASI", referensiId: id },
    orderBy: { tahap: "asc" },
  });
  return {
    id: r.id,
    number: r.nomor,
    employeeId: r.karyawanId,
    employeeName: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    kind: r.jenis,
    kindLabel: getTransferTypeLabel(r.jenis),
    from: summarizePlacement(r.dariUnitNama, r.dariPosisiNama, r.dariLokasiNama),
    to: summarizePlacement(r.keUnit?.nama ?? null, r.kePosisi?.nama ?? null, r.keLokasi?.nama ?? null),
    effectiveDate: r.tanggalEfektif.toISOString().slice(0, 10),
    status: r.status,
    reason: r.alasan,
    fromUnitName: r.dariUnitNama,
    fromPositionName: r.dariPosisiNama,
    fromWorkLocationName: r.dariLokasiNama,
    toUnitName: r.keUnit?.nama ?? null,
    toPositionName: r.kePosisi?.nama ?? null,
    toWorkLocationName: r.keLokasi?.nama ?? null,
    toSupervisorName: r.keAtasan?.namaLengkap ?? null,
    submittedAt: r.diajukanPada?.toISOString() ?? null,
    appliedAt: r.diterapkanPada?.toISOString() ?? null,
    steps: steps.map((s) => ({
      stage: s.tahap,
      status: s.status,
      note: s.catatan,
      processedAt: s.diprosesPada?.toISOString() ?? null,
    })),
  };
}

export type TransferOption = { value: string; label: string };

export async function getTransferOptions(userId: string): Promise<{
  karyawan: TransferOption[];
  units: TransferOption[];
  positions: TransferOption[];
  locations: TransferOption[];
  atasan: TransferOption[];
}> {
  const p = await resolveActor(userId);
  const [karyawan, units, positions, locations, atasan] = await Promise.all([
    prisma.karyawan.findMany({
      where: {
        status: { in: ["AKTIF", "PROBASI"] },
        ...(!isHr(p.role) && p.employeeId ? { atasanLangsungId: p.employeeId } : {}),
      },
      orderBy: { namaLengkap: "asc" },
      select: { id: true, namaLengkap: true, nomorKaryawan: true },
    }),
    prisma.unitOrganisasi.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
    prisma.posisi.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
    prisma.lokasiKerja.findMany({
      where: { isActive: true },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
    prisma.karyawan.findMany({
      where: { status: { in: ["AKTIF", "PROBASI"] } },
      orderBy: { namaLengkap: "asc" },
      select: { id: true, namaLengkap: true, nomorKaryawan: true },
    }),
  ]);
  return {
    karyawan: karyawan.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` })),
    units: units.map((u) => ({ value: u.id, label: u.nama })),
    positions: positions.map((x) => ({ value: x.id, label: x.nama })),
    locations: locations.map((x) => ({ value: x.id, label: x.nama })),
    atasan: atasan.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` })),
  };
}

export async function createMutasi(
  input: {
    employeeId: string;
    kind: string;
    toUnitId: string;
    toPositionId: string;
    toWorkLocationId: string;
    toSupervisorId: string;
    effectiveDate: string;
    reason: string;
  },
  userId: string,
): Promise<TransferActionResult> {
  const p = await resolveActor(userId);
  if (!(await canManage(p, input.employeeId))) {
    return { success: false, message: "Anda hanya bisa mengusulkan mutasi bawahan langsung." };
  }
  const karyawan = await prisma.karyawan.findUnique({
    where: { id: input.employeeId },
    select: { id: true, status: true },
  });
  if (!karyawan || !["AKTIF", "PROBASI"].includes(karyawan.status)) {
    return { success: false, message: "Employee tidak aktif." };
  }

  const aktif = await activePlacement(input.employeeId);
  const err = validateTransfer({
    jenis: input.kind,
    dari: {
      unitId: aktif?.unitOrganisasiId ?? "",
      posisiId: aktif?.posisiId ?? "",
      lokasiId: aktif?.lokasiKerjaId ?? "",
    },
    ke: { unitId: input.toUnitId, posisiId: input.toPositionId, lokasiId: input.toWorkLocationId },
    tanggalEfektif: input.effectiveDate,
    reason: input.reason,
  });
  if (err) return { success: false, message: err };

  if (input.toSupervisorId) {
    if (input.toSupervisorId === input.employeeId) return { success: false, message: "Atasan baru tidak boleh diri sendiri." };
    const ada = await prisma.karyawan.findUnique({ where: { id: input.toSupervisorId }, select: { id: true } });
    if (!ada) return { success: false, message: "Atasan baru tidak ditemukan." };
  }
  for (const [kunci, model] of [
    ["Unit", prisma.unitOrganisasi],
    ["Posisi", prisma.posisi],
    ["Lokasi", prisma.lokasiKerja],
  ] as const) {
    const id = kunci === "Unit" ? input.toUnitId : kunci === "Posisi" ? input.toPositionId : input.toWorkLocationId;
    if (id && !(await (model as typeof prisma.unitOrganisasi).findUnique({ where: { id }, select: { id: true } }))) {
      return { success: false, message: `Tujuan ${kunci} tidak ditemukan.` };
    }
  }

  const tgl = toDbDate(input.effectiveDate);
  const created = await prisma.mutasi.create({
    data: {
      nomor: `MTS-${tgl.getUTCFullYear()}-${input.employeeId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      karyawanId: input.employeeId,
      jenis: input.kind as never,
      dariUnitId: aktif?.unitOrganisasiId ?? null,
      dariPosisiId: aktif?.posisiId ?? null,
      dariLokasiId: aktif?.lokasiKerjaId ?? null,
      dariUnitNama: aktif?.unitOrganisasi?.nama ?? null,
      dariPosisiNama: aktif?.posisi?.nama ?? null,
      dariLokasiNama: aktif?.lokasiKerja?.nama ?? null,
      keUnitId: input.toUnitId || null,
      kePosisiId: input.toPositionId || null,
      keLokasiId: input.toWorkLocationId || null,
      keAtasanId: input.toSupervisorId || null,
      tanggalEfektif: tgl,
      alasan: input.reason.trim(),
      createdById: userId,
    },
  });
  revalidatePath("/employees/transfers");
  return { success: true, message: `Draf ${created.nomor} tersimpan.`, id: created.id };
}

export async function submitTransfer(id: string, userId: string): Promise<TransferActionResult> {
  const p = await resolveActor(userId);
  const row = await prisma.mutasi.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Mutasi tidak ditemukan." };
  if (!(await canManage(p, row.karyawanId))) return { success: false, message: "Akses ditolak." };
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
  // Validasi ulang tujuan vs penempatan terkini (bisa berubah sejak draf dibuat).
  const aktif = await activePlacement(row.karyawanId);
  if (
    !hasChanges(
      {
        unitId: aktif?.unitOrganisasiId ?? "",
        posisiId: aktif?.posisiId ?? "",
        lokasiId: aktif?.lokasiKerjaId ?? "",
      },
      { unitId: row.keUnitId ?? "", posisiId: row.kePosisiId ?? "", lokasiId: row.keLokasiId ?? "" },
    )
  ) {
    return { success: false, message: "Penempatan sudah sama dengan tujuan (tidak ada perubahan)." };
  }
  await startApprovalFlow("MUTASI", id);
  revalidatePath("/employees/transfers");
  revalidatePath("/approval");
  return { success: true, message: "Mutasi dikirim ke atasan → HR." };
}

export async function cancelTransfer(id: string, userId: string): Promise<TransferActionResult> {
  const p = await resolveActor(userId);
  const row = await prisma.mutasi.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Mutasi tidak ditemukan." };
  if (!(await canManage(p, row.karyawanId))) return { success: false, message: "Akses ditolak." };
  if (!["DRAFT", "DIAJUKAN"].includes(row.status)) {
    return { success: false, message: "Status ini tidak bisa dibatalkan." };
  }
  await prisma.$transaction([
    prisma.mutasi.update({ where: { id }, data: { status: "DIBATALKAN" } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "MUTASI", referensiId: id } }),
  ]);
  revalidatePath("/employees/transfers");
  return { success: true, message: "Mutasi dibatalkan." };
}

export async function applyTransfer(id: string, userId: string): Promise<TransferActionResult> {
  const p = await resolveActor(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa menerapkan mutasi." };
  const row = await prisma.mutasi.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Mutasi tidak ditemukan." };
  if (row.status !== "DISETUJUI") return { success: false, message: "Hanya yang DISETUJUI yang bisa diterapkan." };

  const sehari = 24 * 60 * 60 * 1000;
  const tutupPada = new Date(row.tanggalEfektif.getTime() - sehari);

  await prisma.$transaction(async (tx) => {
    const aktif = await tx.posisiKaryawan.findMany({
      where: { karyawanId: row.karyawanId, isCurrent: true },
      select: { id: true, isPrimary: true },
    });
    for (const a of aktif) {
      await tx.posisiKaryawan.update({
        where: { id: a.id },
        data: { isCurrent: false, tanggalBerakhir: tutupPada },
      });
    }
    await tx.posisiKaryawan.create({
      data: {
        karyawanId: row.karyawanId,
        unitOrganisasiId: row.keUnitId,
        posisiId: row.kePosisiId,
        lokasiKerjaId: row.keLokasiId,
        isPrimary: aktif[0]?.isPrimary ?? true,
        isCurrent: true,
        tanggalEfektif: row.tanggalEfektif,
        catatan: `Mutasi ${row.nomor} (${getTransferTypeLabel(row.jenis)})`,
      },
    });
    if (row.keAtasanId) {
      await tx.karyawan.update({ where: { id: row.karyawanId }, data: { atasanLangsungId: row.keAtasanId } });
    }
    await tx.mutasi.update({
      where: { id },
      data: { status: "DITERAPKAN", diterapkanPada: new Date(), diterapkanOlehId: userId },
    });
  });

  revalidatePath("/employees/transfers");
  revalidatePath("/employees");
  return { success: true, message: `Mutasi ${row.nomor} diterapkan ke penempatan.` };
}

export async function deleteTransfer(id: string, userId: string): Promise<TransferActionResult> {
  const p = await resolveActor(userId);
  const row = await prisma.mutasi.findUnique({ where: { id }, select: { karyawanId: true, status: true } });
  if (!row) return { success: false, message: "Mutasi tidak ditemukan." };
  if (!(await canManage(p, row.karyawanId))) return { success: false, message: "Akses ditolak." };
  if (!["DRAFT", "DITOLAK", "DIBATALKAN"].includes(row.status)) {
    return { success: false, message: "Mutasi yang sudah berjalan tidak bisa dihapus." };
  }
  await prisma.$transaction([
    prisma.mutasi.delete({ where: { id } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "MUTASI", referensiId: id } }),
  ]);
  revalidatePath("/employees/transfers");
  return { success: true, message: "Mutasi dihapus." };
}
