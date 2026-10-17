"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { startApprovalFlow } from "@/src/modules/approval/lib/approval-engine";
import { DEFAULT_CLEARANCE, areAllRequiredDone } from "@/src/modules/employee/lib/offboarding";

export type OffboardingActionResult = { success: boolean; message: string; id?: string };

export type OffboardingItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  plannedDate: string;
  status: string;
  clearanceProgress: string;
};

export type ClearanceItem = {
  id: string;
  category: string;
  title: string;
  picRole: string;
  required: boolean;
  status: string;
  note: string | null;
  canAct: boolean;
};

export type OffboardingDetail = {
  id: string;
  employeeId: string;
  employeeName: string;
  reason: string;
  plannedDate: string;
  effectiveDate: string | null;
  status: string;
  submittedAt: string | null;
  paklaringNumber: string | null;
  completedAt: string | null;
  clearance: ClearanceItem[];
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

/** PIC clearance: HR semua; FINANCE/IT untuk kategorinya; atasan untuk milik bawahan. */
async function canClear(p: Actor, item: { picRole: string }, karyawanId: string, atasanId: string | null): Promise<boolean> {
  if (isHr(p.role)) return true;
  if (p.role === "FINANCE" && item.picRole === "FINANCE") return true;
  if (p.role === "MANAJER" && item.picRole === "ATASAN" && p.employeeId === atasanId) return true;
  return false;
}

export async function getOffboardingList(): Promise<OffboardingItem[]> {
  const rows = await prisma.offboarding.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
      clearance: { select: { wajib: true, status: true } },
    },
  });
  return rows.map((r) => {
    const wajib = r.clearance.filter((c) => c.wajib);
    return {
      id: r.id,
      employeeId: r.karyawanId,
      employeeName: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
      plannedDate: r.tanggalRencana.toISOString().slice(0, 10),
      status: r.status,
      clearanceProgress: `${wajib.filter((c) => c.status === "SELESAI").length}/${wajib.length}`,
    };
  });
}

export async function getOffboardingDetail(id: string, userId: string): Promise<OffboardingDetail | null> {
  const p = await resolveActor(userId);
  const r = await prisma.offboarding.findUnique({
    where: { id },
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true, atasanLangsungId: true, userId: true } },
      clearance: { orderBy: { kategori: "asc" } },
    },
  });
  if (!r) return null;
  const isOwner = p.employeeId === r.karyawanId;
  const atasan = r.karyawan.atasanLangsungId === p.employeeId;
  if (!isHr(p.role) && !isOwner && !(p.role === "FINANCE") && !atasan) return null;
  return {
    id: r.id,
    employeeId: r.karyawanId,
    employeeName: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    reason: r.alasan,
    plannedDate: r.tanggalRencana.toISOString().slice(0, 10),
    effectiveDate: r.tanggalEfektif?.toISOString().slice(0, 10) ?? null,
    status: r.status,
    submittedAt: r.diajukanPada?.toISOString() ?? null,
    paklaringNumber: r.nomorPaklaring,
    completedAt: r.selesaiPada?.toISOString() ?? null,
    clearance: await Promise.all(
      r.clearance.map(async (c) => ({
        id: c.id,
        category: c.kategori,
        title: c.judul,
        picRole: c.picRole,
        required: c.wajib,
        status: c.status,
        note: c.catatan,
        canAct: await canClear(p, c, r.karyawanId, r.karyawan.atasanLangsungId),
      })),
    ),
  };
}

export async function getMyOffboarding(employeeId: string) {
  const rows = await prisma.offboarding.findMany({
    where: { karyawanId: employeeId },
    orderBy: { createdAt: "desc" },
    select: { id: true, tanggalRencana: true, status: true, nomorPaklaring: true },
  });
  return rows.map((r) => ({
    id: r.id,
    plannedDate: r.tanggalRencana.toISOString().slice(0, 10),
    status: r.status,
    paklaringNumber: r.nomorPaklaring,
  }));
}

export async function getOffboardingOptions(): Promise<Array<{ value: string; label: string }>> {
  const karyawan = await prisma.karyawan.findMany({
    where: { status: { in: ["AKTIF", "PROBASI"] } },
    orderBy: { namaLengkap: "asc" },
    select: { id: true, namaLengkap: true, nomorKaryawan: true },
  });
  return karyawan.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` }));
}

export async function createOffboarding(
  input: { employeeId: string; plannedDate: string; reason: string },
  userId: string,
): Promise<OffboardingActionResult> {
  const p = await resolveActor(userId);
  const isOwner = p.employeeId === input.employeeId;
  if (!isHr(p.role) && !isOwner) {
    return { success: false, message: "Hanya untuk diri sendiri (HR bisa buatkan)." };
  }
  const employee = await prisma.karyawan.findUnique({
    where: { id: input.employeeId },
    select: { status: true },
  });
  if (!employee || !["AKTIF", "PROBASI"].includes(employee.status)) {
    return { success: false, message: "Karyawan tidak aktif." };
  }
  if (!input.reason.trim()) return { success: false, message: "Alasan wajib diisi." };
  const date = toDbDate(input.plannedDate);
  if (Number.isNaN(date.getTime())) return { success: false, message: "Tanggal rencana tidak valid." };
  const active = await prisma.offboarding.findFirst({
    where: { karyawanId: input.employeeId, status: { in: ["DIAJUKAN", "MENUNGGU_APPROVAL", "DISETUJUI", "CLEARANCE"] } },
    select: { id: true },
  });
  if (active) return { success: false, message: "Sudah ada pengajuan berjalan." };

  const created = await prisma.offboarding.create({
    data: {
      karyawanId: input.employeeId,
      alasan: input.reason.trim(),
      tanggalRencana: date,
      createdById: userId,
    },
    select: { id: true },
  });
  revalidatePath("/employees/offboarding");
  return { success: true, message: "Pengajuan resign tersimpan sebagai draf.", id: created.id };
}

export async function submitOffboarding(id: string, userId: string): Promise<OffboardingActionResult> {
  const p = await resolveActor(userId);
  const row = await prisma.offboarding.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  const isOwner = p.employeeId === row.karyawanId;
  if (!isHr(p.role) && !isOwner) return { success: false, message: "Akses ditolak." };
  if (row.status !== "DIAJUKAN") return { success: false, message: "Hanya draf yang bisa diajukan." };
  await startApprovalFlow("RESIGN", id);
  revalidatePath("/employees/offboarding");
  revalidatePath("/approval");
  return { success: true, message: "Dikirim ke atasan → HR." };
}

export async function cancelOffboarding(id: string, userId: string): Promise<OffboardingActionResult> {
  const p = await resolveActor(userId);
  const row = await prisma.offboarding.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  const isOwner = p.employeeId === row.karyawanId;
  if (!isHr(p.role) && !isOwner) return { success: false, message: "Akses ditolak." };
  if (!["DIAJUKAN", "MENUNGGU_APPROVAL"].includes(row.status)) {
    return { success: false, message: "Status ini tidak bisa dibatalkan." };
  }
  await prisma.$transaction([
    prisma.offboarding.update({ where: { id }, data: { status: "DIBATALKAN" } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "RESIGN", referensiId: id } }),
  ]);
  revalidatePath("/employees/offboarding");
  return { success: true, message: "Pengajuan dibatalkan." };
}

/** Dipanggil otomatis saat DISETUJUI final: buka fase clearance + cek kasbon. */
export async function openClearance(offboardingId: string): Promise<void> {
  const ob = await prisma.offboarding.findUnique({
    where: { id: offboardingId },
    select: { karyawanId: true, status: true },
  });
  if (!ob || ob.status !== "DISETUJUI") return;
  const exists = await prisma.offboardingClearance.count({ where: { offboardingId } });
  if (exists > 0) return;

  const activeAdvances = await prisma.kasbon.findMany({
    where: { karyawanId: ob.karyawanId, status: "DISETUJUI", sisaHutang: { gt: 0 } },
    select: { nomor: true, sisaHutang: true },
  });
  const advancesSettled = activeAdvances.length === 0;

  await prisma.$transaction([
    prisma.offboardingClearance.createMany({
      data: DEFAULT_CLEARANCE.map((c) => ({
        offboardingId,
        kategori: c.kategori as never,
        judul: c.judul,
        picRole: c.picRole,
        wajib: c.wajib,
        ...(c.otomatis && advancesSettled
          ? { status: "SELESAI" as never, catatan: "Otomatis: tidak ada kasbon berjalan." }
          : {}),
      })),
    }),
    prisma.offboarding.update({ where: { id: offboardingId }, data: { status: "CLEARANCE" } }),
  ]);
}

export async function completeClearance(
  itemId: string,
  done: boolean,
  note: string,
  userId: string,
): Promise<OffboardingActionResult> {
  const p = await resolveActor(userId);
  const item = await prisma.offboardingClearance.findUnique({
    where: { id: itemId },
    include: { offboarding: { select: { karyawanId: true, status: true, karyawan: { select: { atasanLangsungId: true } } } } },
  });
  if (!item || item.offboarding.status !== "CLEARANCE") {
    return { success: false, message: "Item tidak tersedia." };
  }
  if (!(await canClear(p, item, item.offboarding.karyawanId, item.offboarding.karyawan.atasanLangsungId))) {
    return { success: false, message: "Hanya PIC terkait/HR yang bisa menandai." };
  }
  await prisma.offboardingClearance.update({
    where: { id: itemId },
    data: done
      ? { status: "SELESAI", catatan: note.trim() || null, diselesaikanOlehId: userId, diselesaikanPada: new Date() }
      : { status: "BELUM", catatan: null, diselesaikanOlehId: null, diselesaikanPada: null },
  });
  revalidatePath("/employees/offboarding");
  return { success: true, message: done ? "Clearance ditandai selesai." : "Dikembalikan ke belum." };
}

export async function completeOffboarding(
  id: string,
  effectiveDate: string,
  userId: string,
): Promise<OffboardingActionResult> {
  const p = await resolveActor(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa menyelesaikan." };
  const ob = await prisma.offboarding.findUnique({
    where: { id },
    include: { clearance: { select: { wajib: true, status: true } } },
  });
  if (!ob || ob.status !== "CLEARANCE") return { success: false, message: "Belum fase clearance." };
  if (!areAllRequiredDone(ob.clearance)) {
    return { success: false, message: "Masih ada clearance wajib belum selesai." };
  }
  const date = toDbDate(effectiveDate);
  if (Number.isNaN(date.getTime())) return { success: false, message: "Tanggal efektif tidak valid." };

  const number = `PAK-${date.getUTCFullYear()}-${ob.karyawanId.slice(-6).toUpperCase()}`;
  await prisma.$transaction(async (tx) => {
    await tx.karyawan.update({
      where: { id: ob.karyawanId },
      data: { status: "RESIGN", tanggalResign: date },
    });
    const account = await tx.karyawan.findUnique({ where: { id: ob.karyawanId }, select: { userId: true } });
    if (account?.userId) {
      await tx.user.update({ where: { id: account.userId }, data: { isActive: false } });
      await tx.session.deleteMany({ where: { userId: account.userId } });
    }
    await tx.offboarding.update({
      where: { id },
      data: { status: "SELESAI", tanggalEfektif: date, nomorPaklaring: number, selesaiPada: new Date(), selesaiOlehId: userId },
    });
  });

  revalidatePath("/employees/offboarding");
  revalidatePath("/employees");
  return { success: true, message: `Selesai. Paklaring ${number} terbit, akun dinonaktifkan.` };
}

export async function deleteOffboarding(id: string, userId: string): Promise<OffboardingActionResult> {
  const p = await resolveActor(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa menghapus." };
  const ob = await prisma.offboarding.findUnique({ where: { id }, select: { status: true } });
  if (!ob || !["DITOLAK", "DIBATALKAN"].includes(ob.status)) {
    return { success: false, message: "Hanya yang ditolak/dibatalkan yang bisa dihapus." };
  }
  await prisma.$transaction([
    prisma.offboardingClearance.deleteMany({ where: { offboardingId: id } }),
    prisma.offboarding.delete({ where: { id } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "RESIGN", referensiId: id } }),
  ]);
  revalidatePath("/employees/offboarding");
  return { success: true, message: "Data dihapus." };
}

export type EmploymentCertificateView = {
  number: string;
  employeeName: string;
  employeeNumber: string;
  joinDate: string;
  resignDate: string;
  lastPosition: string;
  reason: string;
};

export async function getEmploymentCertificate(id: string, userId: string): Promise<EmploymentCertificateView | null> {
  const p = await resolveActor(userId);
  if (!isHr(p.role) && p.role !== "MANAJER") return null;
  const ob = await prisma.offboarding.findUnique({
    where: { id },
    include: {
      karyawan: {
        select: {
          namaLengkap: true,
          nomorKaryawan: true,
          tanggalMasuk: true,
          posisiKaryawan: {
            orderBy: { tanggalEfektif: "desc" },
            take: 1,
            select: { posisi: { select: { nama: true } }, unitOrganisasi: { select: { nama: true } } },
          },
        },
      },
    },
  });
  if (!ob || ob.status !== "SELESAI" || !ob.nomorPaklaring || !ob.tanggalEfektif) return null;
  const latest = ob.karyawan.posisiKaryawan[0];
  return {
    number: ob.nomorPaklaring,
    employeeName: ob.karyawan.namaLengkap,
    employeeNumber: ob.karyawan.nomorKaryawan,
    joinDate: ob.karyawan.tanggalMasuk.toISOString().slice(0, 10),
    resignDate: ob.tanggalEfektif.toISOString().slice(0, 10),
    lastPosition: [latest?.posisi?.nama, latest?.unitOrganisasi?.nama].filter(Boolean).join(" • ") || "-",
    reason: ob.alasan,
  };
}
