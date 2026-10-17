"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { nextSerialNumber } from "@/src/lib/numbering";
import { startApprovalFlow } from "@/src/modules/approval/lib/approval-engine";
import { calculateLpjDifference } from "@/src/modules/payroll/lib/uang-keluar";

export type TravelAdvanceActionResult = { success: boolean; message: string; id?: string };

/** Revalidate best-effort: di luar konteks request (E2E/CLI) Next melempar — abaikan. */
function revalidateBestEffort(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // abaikan — hygiene cache, bukan logika inti
  }
}

export type TravelAdvanceItem = {
  id: string;
  number: string;
  employeeId: string;
  employeeName: string;
  dutyNumber: string;
  advanceAmount: string;
  status: string;
  difference: string | null;
};

export type TravelAdvanceDetail = TravelAdvanceItem & {
  purpose: string | null;
  handoverDate: string | null;
  actualTotal: string | null;
  attachmentUrl: string | null;
  refunded: string | null;
};

function isFinance(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN_HR" || role === "FINANCE";
}

async function resolveActor(userId: string): Promise<{ role: string; employeeId: string | null }> {
  if (!userId) return { role: "EMPLOYEE", employeeId: null };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const employee = await prisma.karyawan.findFirst({ where: { userId }, select: { id: true } });
  return { role: user?.role ?? "EMPLOYEE", employeeId: employee?.id ?? null };
}

function toItem(r: {
  id: string;
  nomor: string;
  karyawanId: string;
  karyawan: { namaLengkap: string; nomorKaryawan: string };
  dinas: { nomorPengajuan: string };
  nominalMuka: unknown;
  status: string;
  totalRealisasi: unknown;
}): TravelAdvanceItem {
  const difference =
    r.totalRealisasi === null || r.totalRealisasi === undefined
      ? null
      : String(calculateLpjDifference(Number(r.nominalMuka), Number(r.totalRealisasi)));
  return {
    id: r.id,
    number: r.nomor,
    employeeId: r.karyawanId,
    employeeName: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    dutyNumber: r.dinas.nomorPengajuan,
    advanceAmount: String(r.nominalMuka),
    status: r.status,
    difference,
  };
}

export async function listUangDinas(): Promise<TravelAdvanceItem[]> {
  const rows = await prisma.uangDinas.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
      dinas: { select: { nomorPengajuan: true } },
    },
  });
  return rows.map(toItem);
}

export async function getMyUangDinas(employeeId: string): Promise<TravelAdvanceItem[]> {
  const rows = await prisma.uangDinas.findMany({
    where: { karyawanId: employeeId },
    orderBy: { createdAt: "desc" },
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
      dinas: { select: { nomorPengajuan: true } },
    },
  });
  return rows.map(toItem);
}

export async function getApprovedDutyOptions(karyawanId?: string): Promise<Array<{ value: string; label: string }>> {
  const rows = await prisma.dinasWFH.findMany({
    where: {
      status: "DISETUJUI",
      ...(karyawanId ? { karyawanId } : {}),
      uangDinas: null,
    },
    orderBy: { tanggalMulai: "desc" },
    take: 100,
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows.map((r) => ({
    value: r.id,
    label: `${r.nomorPengajuan} • ${r.karyawan.namaLengkap} • ${r.tanggalMulai.toISOString().slice(0, 10)}`,
  }));
}

export async function getUangDinasDetail(id: string, userId: string): Promise<(TravelAdvanceDetail & { purpose: string | null }) | null> {
  const actor = await resolveActor(userId);
  const r = await prisma.uangDinas.findUnique({
    where: { id },
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
      dinas: { select: { nomorPengajuan: true } },
    },
  });
  if (!r) return null;
  if (!isFinance(actor.role) && actor.employeeId !== r.karyawanId) return null;
  const base = toItem(r);
  return {
    ...base,
    purpose: r.keperluan,
    handoverDate: r.tanggalSerah?.toISOString().slice(0, 10) ?? null,
    actualTotal: r.totalRealisasi?.toString() ?? null,
    attachmentUrl: r.lampiranLpjUrl,
    refunded: r.dikembalikan?.toString() ?? null,
  };
}

export async function createUangDinas(
  input: { dutyId: string; employeeId: string; advanceAmount: number; purpose: string },
  userId: string,
): Promise<TravelAdvanceActionResult> {
  const actor = await resolveActor(userId);
  const dinas = await prisma.dinasWFH.findUnique({ where: { id: input.dutyId } });
  if (!dinas) return { success: false, message: "Dinas tidak ditemukan." };
  if (dinas.status !== "DISETUJUI") return { success: false, message: "Hanya dinas DISETUJUI." };
  const employeeId = isFinance(actor.role) && input.employeeId ? input.employeeId : actor.employeeId;
  if (!employeeId || employeeId !== dinas.karyawanId) {
    return { success: false, message: "Dinas bukan milik karyawan ini." };
  }
  if (!Number.isFinite(input.advanceAmount) || input.advanceAmount <= 0) {
    return { success: false, message: "Nominal muka harus lebih dari 0." };
  }
  const ada = await prisma.uangDinas.findUnique({ where: { dinasId: input.dutyId }, select: { id: true } });
  if (ada) return { success: false, message: "Dinas ini sudah punya uang muka." };

  const now = new Date();
  const created = await prisma.uangDinas.create({
    data: {
      nomor: await nextSerialNumber("UDM", now.getFullYear()),
      dinasId: input.dutyId,
      karyawanId: employeeId,
      nominalMuka: Math.round(input.advanceAmount),
      keperluan: input.purpose.trim() || null,
      createdById: userId,
    },
    select: { id: true },
  });
  revalidateBestEffort("/payroll/uang-dinas");
  return { success: true, message: "Draf uang muka tersimpan.", id: created.id };
}

export async function submitUangDinas(id: string, userId: string): Promise<TravelAdvanceActionResult> {
  const actor = await resolveActor(userId);
  const row = await prisma.uangDinas.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!isFinance(actor.role) && actor.employeeId !== row.karyawanId) {
    return { success: false, message: "Akses ditolak." };
  }
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
  await startApprovalFlow("UANGDINAS", id);
  revalidateBestEffort("/payroll/uang-dinas");
  revalidateBestEffort("/approval");
  return { success: true, message: "Dikirim ke atasan → HR." };
}

export async function cancelUangDinas(id: string, userId: string): Promise<TravelAdvanceActionResult> {
  const actor = await resolveActor(userId);
  const row = await prisma.uangDinas.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!isFinance(actor.role) && actor.employeeId !== row.karyawanId) {
    return { success: false, message: "Akses ditolak." };
  }
  if (!["DRAFT", "DIAJUKAN"].includes(row.status)) {
    return { success: false, message: "Status ini tidak bisa dibatalkan." };
  }
  await prisma.$transaction([
    prisma.uangDinas.update({ where: { id }, data: { status: "DIBATALKAN" } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "UANGDINAS", referensiId: id } }),
  ]);
  revalidateBestEffort("/payroll/uang-dinas");
  return { success: true, message: "Dibatalkan." };
}

export async function deleteUangDinas(id: string, userId: string): Promise<TravelAdvanceActionResult> {
  const actor = await resolveActor(userId);
  if (!isFinance(actor.role)) return { success: false, message: "Hanya HR/Finance." };
  const row = await prisma.uangDinas.findUnique({ where: { id }, select: { status: true } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!["DRAFT", "DITOLAK", "DIBATALKAN"].includes(row.status)) {
    return { success: false, message: "Hanya draf/ditolak/dibatalkan yang bisa dihapus." };
  }
  await prisma.$transaction([
    prisma.uangDinas.delete({ where: { id } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "UANGDINAS", referensiId: id } }),
  ]);
  revalidateBestEffort("/payroll/uang-dinas");
  return { success: true, message: "Dihapus." };
}

export async function recordHandover(id: string, userId: string): Promise<TravelAdvanceActionResult> {
  const actor = await resolveActor(userId);
  if (!isFinance(actor.role)) return { success: false, message: "Hanya HR/Finance." };
  const row = await prisma.uangDinas.findUnique({ where: { id }, select: { status: true } });
  if (!row || row.status !== "DISETUJUI") return { success: false, message: "Hanya yang DISETUJUI." };
  await prisma.uangDinas.update({ where: { id }, data: { tanggalSerah: toDbDate(new Date()) } });
  revalidateBestEffort("/payroll/uang-dinas");
  return { success: true, message: "Serah uang dicatat." };
}

export async function submitLpj(
  id: string,
  input: { actualTotal: number; attachmentUrl: string },
  userId: string,
): Promise<TravelAdvanceActionResult> {
  const actor = await resolveActor(userId);
  const row = await prisma.uangDinas.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!isFinance(actor.role) && actor.employeeId !== row.karyawanId) {
    return { success: false, message: "Akses ditolak." };
  }
  if (row.status !== "DISETUJUI") return { success: false, message: "Hanya yang DISETUJUI bisa LPJ." };
  if (!Number.isFinite(input.actualTotal) || input.actualTotal < 0) {
    return { success: false, message: "Realisasi tidak valid." };
  }
  if (!input.attachmentUrl.trim()) return { success: false, message: "Bukti LPJ wajib dilampirkan." };
  await prisma.uangDinas.update({
    where: { id },
    data: {
      totalRealisasi: Math.round(input.actualTotal),
      lampiranLpjUrl: input.attachmentUrl.trim(),
      tanggalLpj: new Date(),
      status: "LPJ_DIAJUKAN",
    },
  });
  revalidateBestEffort("/payroll/uang-dinas");
  return { success: true, message: "LPJ dikirim untuk verifikasi." };
}

export async function verifyLpj(
  id: string,
  input: { approve: boolean; note: string; remainderChoice: string },
  userId: string,
): Promise<TravelAdvanceActionResult> {
  const actor = await resolveActor(userId);
  if (!isFinance(actor.role)) return { success: false, message: "Hanya HR/Finance." };
  const row = await prisma.uangDinas.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.status !== "LPJ_DIAJUKAN" || row.totalRealisasi === null) {
    return { success: false, message: "Belum ada LPJ." };
  }
  if (!input.approve) {
    await prisma.uangDinas.update({
      where: { id },
      data: { status: "DISETUJUI", totalRealisasi: null, lampiranLpjUrl: null, tanggalLpj: null },
    });
    revalidateBestEffort("/payroll/uang-dinas");
    return { success: true, message: `LPJ ditolak, kembali: ${input.note || "-"}` };
  }

  const difference = calculateLpjDifference(Number(row.nominalMuka), Number(row.totalRealisasi));
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  if (difference > 0 && input.remainderChoice === "POTONG_GAJI") {
    // Sisa dipotong gaji: jadikan kasbon tenor 1 yang langsung disetujui.
    await prisma.$transaction([
      prisma.kasbon.create({
        data: {
          nomor: await nextSerialNumber("KSB", now.getUTCFullYear()),
          karyawanId: row.karyawanId,
          nominal: difference,
          tenorBulan: 1,
          angsuranPerBulan: difference,
          sisaHutang: difference,
          mulaiPotong: monthStart,
          alasan: `Sisa uang dinas ${row.nomor}`,
          status: "DISETUJUI",
          approvedById: userId,
          approvedAt: now,
          createdById: userId,
        },
      }),
      prisma.uangDinas.update({
        where: { id },
        data: { status: "SELESAI", dikembalikan: 0 },
      }),
    ]);
    revalidateBestEffort("/payroll/uang-dinas");
    revalidateBestEffort("/payroll/kasbon");
    return { success: true, message: `Selesai. Sisa Rp${difference.toLocaleString("id-ID")} dipotong gaji.` };
  }

  if (difference < 0) {
    // Kurang: perusahaan menutup via reimbursement yang langsung disetujui.
    const shortfall = -difference;
    await prisma.$transaction([
      prisma.expenseClaim.create({
        data: {
          nomor: await nextSerialNumber("RMB", now.getFullYear()),
          karyawanId: row.karyawanId,
          kategori: "DINAS",
          nominal: shortfall,
          keterangan: `Kekurangan uang dinas ${row.nomor}`,
          lampiranUrl: row.lampiranLpjUrl,
          status: "DISETUJUI",
          diajukanPada: now,
          approvedById: userId,
          approvedAt: now,
          createdById: userId,
        },
      }),
      prisma.uangDinas.update({ where: { id }, data: { status: "SELESAI" } }),
    ]);
    revalidateBestEffort("/payroll/uang-dinas");
    revalidateBestEffort("/payroll/reimbursement");
    return { success: true, message: `Selesai. Kurang Rp${shortfall.toLocaleString("id-ID")} jadi reimbursement.` };
  }

  await prisma.uangDinas.update({ where: { id }, data: { status: "SELESAI" } });
  revalidateBestEffort("/payroll/uang-dinas");
  if (difference === 0) return { success: true, message: "Selesai, pas." };
  return { success: true, message: `Selesai. Sisa Rp${difference.toLocaleString("id-ID")} — catat pengembaliannya via tombol Kembali.` };
}

export async function recordRefund(id: string, userId: string): Promise<TravelAdvanceActionResult> {
  const actor = await resolveActor(userId);
  if (!isFinance(actor.role)) return { success: false, message: "Hanya HR/Finance." };
  const row = await prisma.uangDinas.findUnique({ where: { id } });
  if (!row || row.status !== "SELESAI" || row.totalRealisasi === null) {
    return { success: false, message: "Tidak ada sisa untuk dicatat." };
  }
  const difference = calculateLpjDifference(Number(row.nominalMuka), Number(row.totalRealisasi));
  if (difference <= 0) return { success: false, message: "Tidak ada sisa." };
  if (row.dikembalikan !== null) return { success: false, message: "Sudah dicatat." };
  await prisma.uangDinas.update({ where: { id }, data: { dikembalikan: difference } });
  revalidateBestEffort("/payroll/uang-dinas");
  return { success: true, message: `Pengembalian Rp${difference.toLocaleString("id-ID")} dicatat.` };
}
