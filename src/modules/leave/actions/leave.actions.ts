"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/src/lib/prisma";
import { nextSerialNumber } from "@/src/lib/numbering";
import { toDbDate } from "@/src/lib/time";
import { startApprovalFlow } from "@/src/modules/approval/lib/approval-engine";
import { countRequestDays, deductBalance, generateAnnualBalances, getBalance, refundBalance } from "../lib/balance";

export type LeaveActionResult = { success: boolean; message: string; id?: string };

/** Kalender penugasan karyawan pada tanggal (untuk hitung hari cuti). */
async function employeeCalendar(employeeId: string, date: Date): Promise<number | null> {
  const assignment = await prisma.penugasanKalender.findFirst({
    where: {
      karyawanId: employeeId,
      tanggalMulai: { lte: date },
      OR: [{ tanggalSelesai: null }, { tanggalSelesai: { gte: date } }],
    },
    orderBy: { tanggalMulai: "desc" },
    select: { kalenderKerjaId: true },
  });
  return assignment?.kalenderKerjaId ?? null;
}

export type LeaveTypeItem = {
  id: number;
  code: string;
  name: string;
  category: string;
  usesBalance: boolean;
  annualQuota: string | null;
  requiresAttachment: boolean;
  isActive: boolean;
};

export async function listLeaveTypes(): Promise<LeaveTypeItem[]> {
  const rows = await prisma.jenisKetidakhadiran.findMany({ orderBy: { kode: "asc" } });
  return rows.map((r) => ({
    id: r.id,
    code: r.kode,
    name: r.nama,
    category: r.kategori,
    usesBalance: r.menggunakanSaldo,
    annualQuota: r.jatahTahunan?.toString() ?? null,
    requiresAttachment: r.wajibLampiran,
    isActive: r.isActive,
  }));
}

export async function saveLeaveType(formData: FormData): Promise<LeaveActionResult> {
  const idRaw = String(formData.get("id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "CUTI");
  const usesBalance = String(formData.get("usesBalance") ?? "") === "true";
  const quotaRaw = String(formData.get("annualQuota") ?? "").trim();
  const requiresAttachment = String(formData.get("requiresAttachment") ?? "") === "true";
  const isActive = String(formData.get("isActive") ?? "") !== "false";

  if (!code || !name) return { success: false, message: "Kode dan nama wajib diisi." };
  if (category !== "CUTI" && category !== "IZIN") return { success: false, message: "Kategori tidak valid." };
  const quota = usesBalance ? Number(quotaRaw) : null;
  if (usesBalance && (Number.isNaN(quota as number) || (quota as number) < 0)) {
    return { success: false, message: "Jatah tahunan tidak valid." };
  }

  try {
    if (idRaw) {
      await prisma.jenisKetidakhadiran.update({
        where: { id: Number(idRaw) },
        data: { kode: code, nama: name, kategori: category as never, menggunakanSaldo: usesBalance, jatahTahunan: quota, wajibLampiran: requiresAttachment, isActive },
      });
    } else {
      await prisma.jenisKetidakhadiran.create({
        data: { kode: code, nama: name, kategori: category as never, menggunakanSaldo: usesBalance, jatahTahunan: quota, wajibLampiran: requiresAttachment, isActive },
      });
    }
    revalidatePath("/settings/leave-types");
    return { success: true, message: "Jenis ketidakhadiran tersimpan." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, message: "Kode sudah digunakan." };
    }
    return { success: false, message: "Gagal menyimpan jenis." };
  }
}

export async function deleteLeaveType(id: number): Promise<LeaveActionResult> {
	try {
		await prisma.jenisKetidakhadiran.delete({ where: { id } });
		revalidatePath("/settings/leave-types");
		return { success: true, message: "Jenis dihapus." };
	} catch {
		return { success: false, message: "Gagal menghapus. Jenis sudah dipakai pengajuan/saldo." };
	}
}

export type LeaveBalanceItem = {
  id: number;
  employeeId: string;
  employeeName: string;
  leaveTypeName: string;
  year: number;
  openingBalance: string;
  closingBalance: string;
};

export async function listLeaveBalances(year: number, employeeId?: string): Promise<LeaveBalanceItem[]> {
  const rows = await prisma.saldoCuti.findMany({
    where: { tahun: year, ...(employeeId ? { karyawanId: employeeId } : {}) },
    orderBy: [{ karyawan: { namaLengkap: "asc" } }],
    include: {
      karyawan: { select: { namaLengkap: true } },
      jenisKetidakhadiran: { select: { nama: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    employeeId: r.karyawanId,
    employeeName: r.karyawan.namaLengkap,
    leaveTypeName: r.jenisKetidakhadiran.nama,
    year: r.tahun,
    openingBalance: r.saldoAwal.toString(),
    closingBalance: r.saldoAkhir.toString(),
  }));
}

export async function getMyRemainingBalance(employeeId: string, year: number) {
  const rows = await prisma.saldoCuti.findMany({
    where: { karyawanId: employeeId, tahun: year },
    include: { jenisKetidakhadiran: { select: { nama: true, kode: true } } },
  });
  return rows.map((r) => ({ leaveType: r.jenisKetidakhadiran.nama, remaining: r.saldoAkhir.toString() }));
}

export async function generateBalances(year: number): Promise<LeaveActionResult> {
  if (!year || year < 2000 || year > 2100) return { success: false, message: "Tahun tidak valid." };
  const result = await generateAnnualBalances(year);
  revalidatePath("/settings/leave-types");
  revalidatePath("/leave");
  return { success: true, message: `Saldo ${year} dibuat: ${result.created} baru, ${result.skipped} sudah ada.` };
}

export type LeaveRequestItem = {
  id: string;
  number: string;
  employeeId: string;
  employeeName: string;
  leaveTypeName: string;
  usesBalance: boolean;
  startDate: string;
  endDate: string;
  totalDays: string;
  status: string;
};

export async function listLeaveRequests(filter?: { employeeId?: string; status?: string }): Promise<LeaveRequestItem[]> {
  const rows = await prisma.pengajuanKetidakhadiran.findMany({
    where: {
      ...(filter?.employeeId ? { karyawanId: filter.employeeId } : {}),
      ...(filter?.status ? { status: filter.status as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      karyawan: { select: { namaLengkap: true } },
      jenisKetidakhadiran: { select: { nama: true, menggunakanSaldo: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    number: r.nomorPengajuan,
    employeeId: r.karyawanId,
    employeeName: r.karyawan.namaLengkap,
    leaveTypeName: r.jenisKetidakhadiran.nama,
    usesBalance: r.jenisKetidakhadiran.menggunakanSaldo,
    startDate: r.tanggalMulai.toISOString().slice(0, 10),
    endDate: r.tanggalSelesai.toISOString().slice(0, 10),
    totalDays: r.jumlahHari.toString(),
    status: r.status,
  }));
}

async function checkOverlap(employeeId: string, start: Date, end: Date, excludeId?: string): Promise<boolean> {
  const clash = await prisma.pengajuanKetidakhadiran.findFirst({
    where: {
      karyawanId: employeeId,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
      status: { in: ["DIAJUKAN", "MENUNGGU_APPROVAL", "DISETUJUI"] as never },
      tanggalMulai: { lte: end },
      tanggalSelesai: { gte: start },
    },
    select: { id: true },
  });
  return Boolean(clash);
}

export async function createLeaveRequest(input: {
  employeeId: string;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  address?: string;
  emergencyPhone?: string;
  attachment?: string;
}): Promise<LeaveActionResult> {
  const start = toDbDate(input.startDate);
  const end = toDbDate(input.endDate);
  if (!(start <= end)) return { success: false, message: "Rentang tanggal tidak valid." };

  const leaveType = await prisma.jenisKetidakhadiran.findUnique({ where: { id: input.leaveTypeId } });
  if (!leaveType || !leaveType.isActive) return { success: false, message: "Jenis ketidakhadiran tidak valid." };
  if (leaveType.wajibLampiran && !input.attachment) {
    return { success: false, message: "Jenis ini mewajibkan lampiran." };
  }
  if (await checkOverlap(input.employeeId, start, end)) {
    return { success: false, message: "Bertabrakan dengan pengajuan aktif lain." };
  }

  const totalDays = await countRequestDays(start, end, await employeeCalendar(input.employeeId, start));
  if (totalDays <= 0) return { success: false, message: "Periode hanya berisi hari libur." };

  const number = await nextSerialNumber("CUTI", start.getUTCFullYear());
  const created = await prisma.pengajuanKetidakhadiran.create({
    data: {
      nomorPengajuan: number,
      karyawanId: input.employeeId,
      jenisKetidakhadiranId: input.leaveTypeId,
      tanggalMulai: start,
      tanggalSelesai: end,
      jumlahHari: totalDays,
      alasan: input.reason || null,
      alamatSelamaTidakHadir: input.address || null,
      nomorTeleponDarurat: input.emergencyPhone || null,
      urlLampiran: input.attachment || null,
      status: "DRAFT",
    },
  });

  revalidatePath("/leave");
  return { success: true, message: `Draf tersimpan (${totalDays} hari).`, id: created.id };
}

export async function submitLeave(id: string): Promise<LeaveActionResult> {
  const request = await prisma.pengajuanKetidakhadiran.findUnique({
    where: { id },
    include: { jenisKetidakhadiran: { select: { menggunakanSaldo: true } } },
  });
  if (!request || request.status !== "DRAFT") {
    return { success: false, message: "Hanya draf yang bisa diajukan." };
  }

  if (request.jenisKetidakhadiran.menggunakanSaldo) {
    const year = new Date(request.tanggalMulai).getUTCFullYear();
    const balance = await getBalance(request.karyawanId, request.jenisKetidakhadiranId, year);
    if (!balance || Number(balance.saldoAkhir) < Number(request.jumlahHari)) {
      return { success: false, message: `Saldo tidak cukup (sisa ${balance?.saldoAkhir ?? 0}).` };
    }
  }

  await startApprovalFlow("CUTI", id);
  revalidatePath("/leave");
  return { success: true, message: "Pengajuan dikirim ke atasan." };
}

export async function cancelLeave(id: string, isHr: boolean): Promise<LeaveActionResult> {
  const request = await prisma.pengajuanKetidakhadiran.findUnique({ where: { id } });
  if (!request) return { success: false, message: "Pengajuan tidak ditemukan." };

  if (["DIAJUKAN", "MENUNGGU_APPROVAL", "DRAFT"].includes(request.status as string)) {
    await prisma.pengajuanKetidakhadiran.update({ where: { id }, data: { status: "DIBATALKAN" } });
    await prisma.approvalStep.deleteMany({ where: { referensiType: "CUTI", referensiId: id } });
    revalidatePath("/leave");
    return { success: true, message: "Pengajuan dibatalkan." };
  }

  if (request.status === "DISETUJUI" && isHr) {
    const year = new Date(request.tanggalMulai).getUTCFullYear();
    await refundBalance(
      request.karyawanId,
      request.jenisKetidakhadiranId,
      year,
      Number(request.jumlahHari),
      id,
      `Pembatalan ${request.nomorPengajuan}`,
    );
    await prisma.pengajuanKetidakhadiran.update({ where: { id }, data: { status: "DIBATALKAN" } });
    revalidatePath("/leave");
    return { success: true, message: "Dibatalkan dan saldo dikembalikan." };
  }

  return { success: false, message: "Status ini tidak bisa dibatalkan." };
}
