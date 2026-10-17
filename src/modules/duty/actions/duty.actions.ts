"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { nextSerialNumber } from "@/src/lib/numbering";
import { toDbDate } from "@/src/lib/time";
import { startApprovalFlow } from "@/src/modules/approval/lib/approval-engine";

export type DutyActionResult = { success: boolean; message: string; id?: string };

export type DutyItem = {
  id: string;
  number: string;
  employeeId: string;
  employeeName: string;
  dutyType: string;
  startDate: string;
  endDate: string;
  location: string | null;
  status: string;
};

export async function listDuties(filter?: { employeeId?: string; status?: string }): Promise<DutyItem[]> {
  const rows = await prisma.dinasWFH.findMany({
    where: {
      ...(filter?.employeeId ? { karyawanId: filter.employeeId } : {}),
      ...(filter?.status ? { status: filter.status as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { karyawan: { select: { namaLengkap: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    number: r.nomorPengajuan,
    employeeId: r.karyawanId,
    employeeName: r.karyawan.namaLengkap,
    dutyType: r.jenis,
    startDate: r.tanggalMulai.toISOString().slice(0, 10),
    endDate: r.tanggalSelesai.toISOString().slice(0, 10),
    location: r.lokasi,
    status: r.status,
  }));
}

export async function createDuty(input: {
  employeeId: string;
  dutyType: string;
  startDate: string;
  endDate: string;
  location?: string;
  purpose?: string;
  attachment?: string;
}): Promise<DutyActionResult> {
  const start = toDbDate(input.startDate);
  const end = toDbDate(input.endDate);
  if (!(start <= end)) return { success: false, message: "Rentang tanggal tidak valid." };
  if (input.dutyType !== "DINAS_LUAR" && input.dutyType !== "WFH") {
    return { success: false, message: "Jenis tidak valid." };
  }
  if (!input.purpose?.trim()) return { success: false, message: "Keperluan wajib diisi." };

  const number = await nextSerialNumber("DINAS", start.getUTCFullYear());
  const created = await prisma.dinasWFH.create({
    data: {
      nomorPengajuan: number,
      karyawanId: input.employeeId,
      jenis: input.dutyType as never,
      tanggalMulai: start,
      tanggalSelesai: end,
      lokasi: input.location || null,
      keperluan: input.purpose.trim(),
      urlLampiran: input.attachment || null,
      status: "DRAFT",
    },
  });
  revalidatePath("/duty");
  return { success: true, message: "Draf tersimpan.", id: created.id };
}

export async function submitDuty(id: string): Promise<DutyActionResult> {
  const row = await prisma.dinasWFH.findUnique({ where: { id } });
  if (!row || row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
  await startApprovalFlow("DINAS", id);
  revalidatePath("/duty");
  return { success: true, message: "Dikirim ke atasan." };
}

export async function cancelDuty(id: string, isHr: boolean): Promise<DutyActionResult> {
  const row = await prisma.dinasWFH.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  const allowed =
    ["DRAFT", "DIAJUKAN", "MENUNGGU_APPROVAL"].includes(row.status as string) ||
    (row.status === "DISETUJUI" && isHr);
  if (!allowed) return { success: false, message: "Status ini tidak bisa dibatalkan." };
  await prisma.dinasWFH.update({ where: { id }, data: { status: "DIBATALKAN" } });
  await prisma.approvalStep.deleteMany({ where: { referensiType: "DINAS", referensiId: id } });
  revalidatePath("/duty");
  return { success: true, message: "Dibatalkan." };
}
