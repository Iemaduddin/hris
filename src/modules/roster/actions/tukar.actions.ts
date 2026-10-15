"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { validasiPasanganRoster, validasiTanggalTukar } from "@/src/modules/roster/lib/tukar";

export type TukarActionResult = { success: boolean; message: string; id?: string };

/** Revalidate best-effort: di luar konteks request (E2E/CLI) Next melempar — abaikan. */
function segarkan(path: string): void {
	try {
		revalidatePath(path);
	} catch {
		// abaikan — hygiene cache, bukan logika inti
	}
}

export type TukarItem = {
  id: string;
  tanggal: string;
  lawanNama: string;
  arah: "keluar" | "masuk";
  shiftSaya: string;
  shiftLawan: string;
  status: string;
};

async function karyawanDariUser(userId: string): Promise<string | null> {
  if (!userId) return null;
  const k = await prisma.karyawan.findFirst({ where: { userId }, select: { id: true } });
  return k?.id ?? null;
}

async function rosterPada(karyawanId: string, tanggal: Date) {
  return prisma.rosterShift.findUnique({
    where: { karyawanId_tanggal: { karyawanId, tanggal } },
    include: { shift: { select: { id: true, nama: true } } },
  });
}

export async function getTukarSaya(userId: string): Promise<{ keluar: TukarItem[]; masuk: TukarItem[] }> {
  const saya = await karyawanDariUser(userId);
  if (!saya) return { keluar: [], masuk: [] };
  const [keluar, masuk] = await Promise.all([
    prisma.tukarShift.findMany({
      where: { pemohonKaryawanId: saya },
      orderBy: { tanggal: "desc" },
      include: {
        pasangan: { select: { namaLengkap: true } },
      },
    }),
    prisma.tukarShift.findMany({
      where: { pasanganKaryawanId: saya },
      orderBy: { tanggal: "desc" },
      include: {
        pemohon: { select: { namaLengkap: true } },
      },
    }),
  ]);
  const keItem = async (
    r: { id: string; tanggal: Date; status: string; shiftPemohonId: string | null; shiftPasanganId: string | null },
    arah: "keluar" | "masuk",
    lawanNama: string,
  ): Promise<TukarItem> => {
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
      tanggal: r.tanggal.toISOString().slice(0, 10),
      lawanNama,
      arah,
      shiftSaya: arah === "keluar" ? (s1?.nama ?? "-") : (s2?.nama ?? "-"),
      shiftLawan: arah === "keluar" ? (s2?.nama ?? "-") : (s1?.nama ?? "-"),
      status: r.status,
    };
  };
  return {
    keluar: await Promise.all(keluar.map((r) => keItem(r, "keluar", r.pasangan.namaLengkap))),
    masuk: await Promise.all(masuk.map((r) => keItem(r, "masuk", r.pemohon.namaLengkap))),
  };
}

export async function getPasanganOptions(karyawanId: string): Promise<Array<{ value: string; label: string }>> {
  const rows = await prisma.karyawan.findMany({
    where: { status: { in: ["AKTIF", "PROBASI"] }, id: { not: karyawanId } },
    orderBy: { namaLengkap: "asc" },
    select: { id: true, namaLengkap: true, nomorKaryawan: true },
  });
  return rows.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` }));
}

export async function buatTukar(
  input: { pasanganKaryawanId: string; tanggal: string; alasan: string },
  userId: string,
): Promise<TukarActionResult> {
  const saya = await karyawanDariUser(userId);
  if (!saya) return { success: false, message: "Akun belum tertaut ke karyawan." };
  if (input.pasanganKaryawanId === saya) return { success: false, message: "Tidak bisa tukar dengan diri sendiri." };
  const errTgl = validasiTanggalTukar(input.tanggal);
  if (errTgl) return { success: false, message: errTgl };
  if (!input.alasan.trim()) return { success: false, message: "Alasan wajib diisi." };
  const pasangan = await prisma.karyawan.findUnique({
    where: { id: input.pasanganKaryawanId },
    select: { status: true },
  });
  if (!pasangan || !["AKTIF", "PROBASI"].includes(pasangan.status)) {
    return { success: false, message: "Pasangan tidak aktif." };
  }
  const tgl = toDbDate(input.tanggal);
  const [rSaya, rLawan] = await Promise.all([rosterPada(saya, tgl), rosterPada(input.pasanganKaryawanId, tgl)]);
  const err = validasiPasanganRoster(rSaya?.shiftId ?? null, rLawan?.shiftId ?? null);
  if (err) return { success: false, message: err };
  const dobel = await prisma.tukarShift.findFirst({
    where: { pemohonKaryawanId: saya, tanggal: tgl, status: { in: ["DRAFT", "DIAJUKAN", "MENUNGGU_APPROVAL"] } },
    select: { id: true },
  });
  if (dobel) return { success: false, message: "Sudah ada pengajuan aktif di tanggal itu." };

  const created = await prisma.tukarShift.create({
    data: {
      tanggal: tgl,
      pemohonKaryawanId: saya,
      pasanganKaryawanId: input.pasanganKaryawanId,
      shiftPemohonId: rSaya!.shiftId,
      shiftPasanganId: rLawan!.shiftId,
      alasan: input.alasan.trim(),
      createdById: userId,
    },
    select: { id: true },
  });
  segarkan("/account/tukar");
  return { success: true, message: "Draf tukar tersimpan.", id: created.id };
}

/** Ajukan: tahap 1 pasangan, tahap 2 HR. */
export async function ajukanTukar(id: string, userId: string): Promise<TukarActionResult> {
  const saya = await karyawanDariUser(userId);
  const row = await prisma.tukarShift.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.pemohonKaryawanId !== saya) return { success: false, message: "Hanya pemohon." };
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
  // Roster bisa berubah sejak draf — validasi ulang.
  const [rSaya, rLawan] = await Promise.all([
    rosterPada(row.pemohonKaryawanId, row.tanggal),
    rosterPada(row.pasanganKaryawanId, row.tanggal),
  ]);
  const err = validasiPasanganRoster(rSaya?.shiftId ?? null, rLawan?.shiftId ?? null);
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
        shiftPemohonId: rSaya!.shiftId,
        shiftPasanganId: rLawan!.shiftId,
      },
    }),
  ]);
  segarkan("/account/tukar");
  segarkan("/approval");
  return { success: true, message: "Dikirim ke pasangan → HR." };
}

export async function batalkanTukar(id: string, userId: string): Promise<TukarActionResult> {
  const saya = await karyawanDariUser(userId);
  const row = await prisma.tukarShift.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.pemohonKaryawanId !== saya) return { success: false, message: "Hanya pemohon." };
  if (!["DRAFT", "DIAJUKAN"].includes(row.status)) {
    return { success: false, message: "Status ini tidak bisa dibatalkan." };
  }
  await prisma.$transaction([
    prisma.tukarShift.update({ where: { id }, data: { status: "DIBATALKAN" } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "TUKAR_SHIFT", referensiId: id } }),
  ]);
  segarkan("/account/tukar");
  return { success: true, message: "Pengajuan dibatalkan." };
}

/** Eksekusi swap saat final approve (dipanggil sebagai onFinalApprove). */
export async function eksekusiTukar(id: string): Promise<{ success: boolean; message: string }> {
  const row = await prisma.tukarShift.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  const [rSaya, rLawan] = await Promise.all([
    rosterPada(row.pemohonKaryawanId, row.tanggal),
    rosterPada(row.pasanganKaryawanId, row.tanggal),
  ]);
  // Roster berubah di tengah jalan → gagalkan (engine mengembalikan tahap).
  if (!rSaya || !rLawan) return { success: false, message: "Roster berubah — salah satu sudah tidak punya shift." };
  if (rSaya.shiftId !== row.shiftPemohonId || rLawan.shiftId !== row.shiftPasanganId) {
    return { success: false, message: "Roster berubah sejak diajukan — ajukan ulang." };
  }
  await prisma.$transaction([
    prisma.rosterShift.update({ where: { id: rSaya.id }, data: { shiftId: row.shiftPasanganId! } }),
    prisma.rosterShift.update({ where: { id: rLawan.id }, data: { shiftId: row.shiftPemohonId! } }),
  ]);
  return { success: true, message: "Shift ditukar." };
}
