"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { validateRosterPair, validateSwapDate } from "@/src/modules/roster/lib/tukar";

export type SwapActionResult = { success: boolean; message: string; id?: string };

/** Revalidate best-effort: di luar konteks request (E2E/CLI) Next melempar — abaikan. */
function revalidateBestEffort(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // abaikan — hygiene cache, bukan logika inti
  }
}

export type SwapItem = {
  id: string;
  date: string;
  peerName: string;
  direction: "outgoing" | "incoming";
  myShift: string;
  peerShift: string;
  status: string;
};

async function employeeIdFromUser(userId: string): Promise<string | null> {
  if (!userId) return null;
  const k = await prisma.karyawan.findFirst({ where: { userId }, select: { id: true } });
  return k?.id ?? null;
}

async function rosterOn(employeeId: string, date: Date) {
  return prisma.rosterShift.findUnique({
    where: { karyawanId_tanggal: { karyawanId: employeeId, tanggal: date } },
    include: { shift: { select: { id: true, nama: true } } },
  });
}

export async function getMySwaps(userId: string): Promise<{ outgoing: SwapItem[]; incoming: SwapItem[] }> {
  const mine = await employeeIdFromUser(userId);
  if (!mine) return { outgoing: [], incoming: [] };
  const [outgoing, incoming] = await Promise.all([
    prisma.tukarShift.findMany({
      where: { pemohonKaryawanId: mine },
      orderBy: { tanggal: "desc" },
      include: {
        pasangan: { select: { namaLengkap: true } },
      },
    }),
    prisma.tukarShift.findMany({
      where: { pasanganKaryawanId: mine },
      orderBy: { tanggal: "desc" },
      include: {
        pemohon: { select: { namaLengkap: true } },
      },
    }),
  ]);
  const toSwapItem = async (
    r: { id: string; tanggal: Date; status: string; shiftPemohonId: string | null; shiftPasanganId: string | null },
    direction: "outgoing" | "incoming",
    peerName: string,
  ): Promise<SwapItem> => {
    const [s1, s2] = await Promise.all([
      r.shiftPemohonId
        ? prisma.shift.findUnique({ where: { id: r.shiftPemohonId }, select: { nama: true } })
        : null,
      r.shiftPasanganId
        ? prisma.shift.findUnique({ where: { id: r.shiftPasanganId }, select: { nama: true } })
        : null,
    ]);
    return {
      id: r.id,
      date: r.tanggal.toISOString().slice(0, 10),
      peerName,
      direction,
      myShift: direction === "outgoing" ? (s1?.nama ?? "-") : (s2?.nama ?? "-"),
      peerShift: direction === "outgoing" ? (s2?.nama ?? "-") : (s1?.nama ?? "-"),
      status: r.status,
    };
  };
  return {
    outgoing: await Promise.all(outgoing.map((r) => toSwapItem(r, "outgoing", r.pasangan.namaLengkap))),
    incoming: await Promise.all(incoming.map((r) => toSwapItem(r, "incoming", r.pemohon.namaLengkap))),
  };
}

export async function getPartnerOptions(employeeId: string): Promise<Array<{ value: string; label: string }>> {
  const rows = await prisma.karyawan.findMany({
    where: { status: { in: ["AKTIF", "PROBASI"] }, id: { not: employeeId } },
    orderBy: { namaLengkap: "asc" },
    select: { id: true, namaLengkap: true, nomorKaryawan: true },
  });
  return rows.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` }));
}

export async function createSwap(
  input: { partnerEmployeeId: string; date: string; reason: string },
  userId: string,
): Promise<SwapActionResult> {
  const mine = await employeeIdFromUser(userId);
  if (!mine) return { success: false, message: "Akun belum tertaut ke karyawan." };
  if (input.partnerEmployeeId === mine) return { success: false, message: "Tidak bisa tukar dengan diri sendiri." };
  const dateError = validateSwapDate(input.date);
  if (dateError) return { success: false, message: dateError };
  if (!input.reason.trim()) return { success: false, message: "Alasan wajib diisi." };
  const partner = await prisma.karyawan.findUnique({
    where: { id: input.partnerEmployeeId },
    select: { status: true },
  });
  if (!partner || !["AKTIF", "PROBASI"].includes(partner.status)) {
    return { success: false, message: "Pasangan tidak aktif." };
  }
  const date = toDbDate(input.date);
  const [myRoster, peerRoster] = await Promise.all([rosterOn(mine, date), rosterOn(input.partnerEmployeeId, date)]);
  const err = validateRosterPair(myRoster?.shiftId ?? null, peerRoster?.shiftId ?? null);
  if (err) return { success: false, message: err };
  const duplicate = await prisma.tukarShift.findFirst({
    where: { pemohonKaryawanId: mine, tanggal: date, status: { in: ["DRAFT", "DIAJUKAN", "MENUNGGU_APPROVAL"] } },
    select: { id: true },
  });
  if (duplicate) return { success: false, message: "Sudah ada pengajuan aktif di tanggal itu." };

  const created = await prisma.tukarShift.create({
    data: {
      tanggal: date,
      pemohonKaryawanId: mine,
      pasanganKaryawanId: input.partnerEmployeeId,
      shiftPemohonId: myRoster!.shiftId,
      shiftPasanganId: peerRoster!.shiftId,
      alasan: input.reason.trim(),
      createdById: userId,
    },
    select: { id: true },
  });
  revalidateBestEffort("/account/tukar");
  return { success: true, message: "Draf tukar tersimpan.", id: created.id };
}

/** Ajukan: tahap 1 pasangan, tahap 2 HR. */
export async function submitSwap(id: string, userId: string): Promise<SwapActionResult> {
  const mine = await employeeIdFromUser(userId);
  const row = await prisma.tukarShift.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.pemohonKaryawanId !== mine) return { success: false, message: "Hanya pemohon." };
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
  // Roster bisa berubah sejak draf — validasi ulang.
  const [myRoster, peerRoster] = await Promise.all([
    rosterOn(row.pemohonKaryawanId, row.tanggal),
    rosterOn(row.pasanganKaryawanId, row.tanggal),
  ]);
  const err = validateRosterPair(myRoster?.shiftId ?? null, peerRoster?.shiftId ?? null);
  if (err) return { success: false, message: err };

  await prisma.$transaction([
    prisma.approvalStep.deleteMany({ where: { referensiType: "TUKAR_SHIFT", referensiId: id } }),
    prisma.approvalStep.create({
      data: { referensiType: "TUKAR_SHIFT", referensiId: id, tahap: 1, approverKaryawanId: row.pasanganKaryawanId },
    }),
    prisma.approvalStep.create({
      data: { referensiType: "TUKAR_SHIFT", referensiId: id, tahap: 2, approverRole: "ADMIN_HR" },
    }),
    prisma.tukarShift.update({
      where: { id },
      data: {
        status: "MENUNGGU_APPROVAL",
        diajukanPada: new Date(),
        shiftPemohonId: myRoster!.shiftId,
        shiftPasanganId: peerRoster!.shiftId,
      },
    }),
  ]);
  revalidateBestEffort("/account/tukar");
  revalidateBestEffort("/approval");
  return { success: true, message: "Dikirim ke pasangan → HR." };
}

export async function cancelSwap(id: string, userId: string): Promise<SwapActionResult> {
  const mine = await employeeIdFromUser(userId);
  const row = await prisma.tukarShift.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.pemohonKaryawanId !== mine) return { success: false, message: "Hanya pemohon." };
  if (!["DRAFT", "DIAJUKAN"].includes(row.status)) {
    return { success: false, message: "Status ini tidak bisa dibatalkan." };
  }
  await prisma.$transaction([
    prisma.tukarShift.update({ where: { id }, data: { status: "DIBATALKAN" } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "TUKAR_SHIFT", referensiId: id } }),
  ]);
  revalidateBestEffort("/account/tukar");
  return { success: true, message: "Pengajuan dibatalkan." };
}

/** Eksekusi swap saat final approve (dipanggil sebagai onFinalApprove). */
export async function executeSwap(id: string): Promise<{ success: boolean; message: string }> {
  const row = await prisma.tukarShift.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  const [myRoster, peerRoster] = await Promise.all([
    rosterOn(row.pemohonKaryawanId, row.tanggal),
    rosterOn(row.pasanganKaryawanId, row.tanggal),
  ]);
  // Roster berubah di tengah jalan → gagalkan (engine mengembalikan tahap).
  if (!myRoster || !peerRoster) return { success: false, message: "Roster berubah — salah satu sudah tidak punya shift." };
  if (myRoster.shiftId !== row.shiftPemohonId || peerRoster.shiftId !== row.shiftPasanganId) {
    return { success: false, message: "Roster berubah sejak diajukan — ajukan ulang." };
  }
  await prisma.$transaction([
    prisma.rosterShift.update({ where: { id: myRoster.id }, data: { shiftId: row.shiftPasanganId! } }),
    prisma.rosterShift.update({ where: { id: peerRoster.id }, data: { shiftId: row.shiftPemohonId! } }),
  ]);
  return { success: true, message: "Shift ditukar." };
}
