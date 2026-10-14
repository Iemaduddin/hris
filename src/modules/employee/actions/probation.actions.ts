"use server";

import { revalidatePath } from "next/cache";
import type { StatusProbation } from "@/generated/prisma/client";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { mulaiAlurApproval } from "@/src/modules/approval/lib/approval-engine";
import { labelHasilProbation, sisaHariProbation, validasiPenilaian } from "@/src/modules/employee/lib/probation";

export type ProbationActionResult = { success: boolean; message: string; id?: string };

export type ProbationItem = {
  id: string;
  karyawanId: string;
  karyawanNama: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  sisaHari: number;
  status: string;
  hasil: string | null;
};

export type ProbationDetail = ProbationItem & {
  hasilLabel: string | null;
  nilai: number | null;
  catatan: string | null;
  tanggalSelesaiBaru: string | null;
  diajukanPada: string | null;
  steps: Array<{ tahap: number; status: string; catatan: string | null; diprosesPada: string | null }>;
};

type Penindak = { role: string; karyawanId: string | null };

async function resolvePenindak(userId: string): Promise<Penindak> {
  if (!userId) return { role: "EMPLOYEE", karyawanId: null };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const karyawan = await prisma.karyawan.findFirst({ where: { userId }, select: { id: true } });
  return { role: user?.role ?? "EMPLOYEE", karyawanId: karyawan?.id ?? null };
}

function isHr(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN_HR";
}

async function bolehKelola(p: Penindak, karyawanId: string): Promise<boolean> {
  if (isHr(p.role)) return true;
  if (p.role !== "MANAJER" || !p.karyawanId) return false;
  const bawahan = await prisma.karyawan.findFirst({
    where: { id: karyawanId, atasanLangsungId: p.karyawanId },
    select: { id: true },
  });
  return !!bawahan;
}

const STATUS_TERBUKA: StatusProbation[] = ["DRAFT", "DIAJUKAN", "MENUNGGU_APPROVAL", "DISETUJUI"];

function toItem(r: {
  id: string;
  karyawanId: string;
  karyawan: { namaLengkap: string; nomorKaryawan: string };
  tanggalMulai: Date;
  tanggalSelesai: Date;
  status: string;
  hasil: string | null;
}): ProbationItem {
  return {
    id: r.id,
    karyawanId: r.karyawanId,
    karyawanNama: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    tanggalMulai: r.tanggalMulai.toISOString().slice(0, 10),
    tanggalSelesai: r.tanggalSelesai.toISOString().slice(0, 10),
    sisaHari: sisaHariProbation(r.tanggalSelesai),
    status: r.status,
    hasil: r.hasil,
  };
}

export async function getProbationList(userId: string): Promise<ProbationItem[]> {
  const p = await resolvePenindak(userId);
  const rows = await prisma.probationReview.findMany({
    where: !isHr(p.role) && p.karyawanId ? { karyawan: { atasanLangsungId: p.karyawanId } } : {},
    orderBy: { tanggalSelesai: "asc" },
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows.map(toItem);
}

export async function getProbationDetail(id: string, userId: string): Promise<(ProbationDetail & { hasilLabel: string | null }) | null> {
  const p = await resolvePenindak(userId);
  const r = await prisma.probationReview.findUnique({
    where: { id },
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true, atasanLangsungId: true } } },
  });
  if (!r) return null;
  if (!isHr(p.role) && r.karyawan.atasanLangsungId !== p.karyawanId) return null;
  const steps = await prisma.approvalStep.findMany({
    where: { referensiType: "PROBATION", referensiId: id },
    orderBy: { tahap: "asc" },
  });
  return {
    ...toItem(r),
    hasilLabel: r.hasil ? labelHasilProbation(r.hasil) : null,
    nilai: r.nilai,
    catatan: r.catatan,
    tanggalSelesaiBaru: r.tanggalSelesaiBaru?.toISOString().slice(0, 10) ?? null,
    diajukanPada: r.diajukanPada?.toISOString() ?? null,
    steps: steps.map((s) => ({
      tahap: s.tahap,
      status: s.status,
      catatan: s.catatan,
      diprosesPada: s.diprosesPada?.toISOString() ?? null,
    })),
  };
}

export async function getProbationMendekati(hari = 30): Promise<ProbationItem[]> {
  const batas = new Date();
  batas.setDate(batas.getDate() + hari);
  const rows = await prisma.probationReview.findMany({
    where: { status: { in: STATUS_TERBUKA }, tanggalSelesai: { lte: batas } },
    orderBy: { tanggalSelesai: "asc" },
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows.map(toItem);
}

export async function getProbationOptions(userId: string): Promise<Array<{ value: string; label: string }>> {
  const p = await resolvePenindak(userId);
  const rows = await prisma.karyawan.findMany({
    where: {
      status: "PROBASI",
      ...(!isHr(p.role) && p.karyawanId ? { atasanLangsungId: p.karyawanId } : {}),
    },
    orderBy: { namaLengkap: "asc" },
    select: { id: true, namaLengkap: true, nomorKaryawan: true },
  });
  return rows.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` }));
}

async function adaReviewTerbuka(karyawanId: string): Promise<boolean> {
  const ada = await prisma.probationReview.findFirst({
    where: { karyawanId, status: { in: STATUS_TERBUKA } },
    select: { id: true },
  });
  return !!ada;
}

export async function generateDariProbasi(userId: string): Promise<ProbationActionResult> {
  const p = await resolvePenindak(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa generate." };
  const probasi = await prisma.karyawan.findMany({
    where: { status: "PROBASI" },
    select: {
      id: true,
      tanggalMasuk: true,
      kontrakKerja: {
        where: { status: "AKTIF" },
        orderBy: { tanggalMulai: "desc" },
        take: 1,
        select: { tanggalMulai: true, tanggalSelesai: true },
      },
    },
  });
  let dibuat = 0;
  for (const k of probasi) {
    if (await adaReviewTerbuka(k.id)) continue;
    const kontrak = k.kontrakKerja[0];
    const mulai = kontrak?.tanggalMulai ?? k.tanggalMasuk;
    const selesai = kontrak?.tanggalSelesai ?? new Date(k.tanggalMasuk.getTime() + 90 * 86_400_000);
    await prisma.probationReview.create({
      data: { karyawanId: k.id, tanggalMulai: mulai, tanggalSelesai: selesai, createdById: userId },
    });
    dibuat++;
  }
  revalidatePath("/employees/probation");
  return { success: true, message: dibuat > 0 ? `${dibuat} review dibuat.` : "Semua karyawan probasi sudah punya review." };
}

export async function buatManual(
  input: { karyawanId: string; tanggalMulai: string; tanggalSelesai: string },
  userId: string,
): Promise<ProbationActionResult> {
  const p = await resolvePenindak(userId);
  if (!(await bolehKelola(p, input.karyawanId))) {
    return { success: false, message: "Anda hanya bisa membuat untuk bawahan langsung." };
  }
  const karyawan = await prisma.karyawan.findUnique({ where: { id: input.karyawanId }, select: { status: true } });
  if (!karyawan || karyawan.status !== "PROBASI") {
    return { success: false, message: "Hanya karyawan PROBASI yang bisa direview." };
  }
  if (await adaReviewTerbuka(input.karyawanId)) {
    return { success: false, message: "Sudah ada review terbuka." };
  }
  const mulai = new Date(input.tanggalMulai);
  const selesai = new Date(input.tanggalSelesai);
  if (Number.isNaN(mulai.getTime()) || Number.isNaN(selesai.getTime()) || selesai <= mulai) {
    return { success: false, message: "Rentang tanggal tidak valid." };
  }
  const created = await prisma.probationReview.create({
    data: { karyawanId: input.karyawanId, tanggalMulai: mulai, tanggalSelesai: selesai, createdById: userId },
  });
  revalidatePath("/employees/probation");
  return { success: true, message: "Review dibuat.", id: created.id };
}

export async function ajukanReview(id: string, userId: string): Promise<ProbationActionResult> {
  const p = await resolvePenindak(userId);
  const row = await prisma.probationReview.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!(await bolehKelola(p, row.karyawanId))) return { success: false, message: "Akses ditolak." };
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
  await mulaiAlurApproval("PROBATION", id);
  revalidatePath("/employees/probation");
  revalidatePath("/approval");
  return { success: true, message: "Dikirim ke atasan → HR." };
}

export async function batalkanReview(id: string, userId: string): Promise<ProbationActionResult> {
  const p = await resolvePenindak(userId);
  const row = await prisma.probationReview.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!(await bolehKelola(p, row.karyawanId))) return { success: false, message: "Akses ditolak." };
  if (!["DRAFT", "DIAJUKAN"].includes(row.status)) {
    return { success: false, message: "Status ini tidak bisa dibatalkan." };
  }
  await prisma.$transaction([
    prisma.probationReview.update({ where: { id }, data: { status: "DIBATALKAN" } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "PROBATION", referensiId: id } }),
  ]);
  revalidatePath("/employees/probation");
  return { success: true, message: "Review dibatalkan." };
}

export async function nilaiReview(
  id: string,
  input: { hasil: string; nilai: number | null; catatan: string; tanggalSelesaiBaru: string },
  userId: string,
): Promise<ProbationActionResult> {
  const p = await resolvePenindak(userId);
  const row = await prisma.probationReview.findUnique({
    where: { id },
    include: { karyawan: { select: { atasanLangsungId: true } } },
  });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  const atasan = row.karyawan.atasanLangsungId === p.karyawanId;
  if (!isHr(p.role) && !atasan) return { success: false, message: "Hanya atasan/HR yang bisa menilai." };
  if (!["DIAJUKAN", "MENUNGGU_APPROVAL"].includes(row.status)) {
    return { success: false, message: "Hanya yang sedang berjalan yang bisa dinilai." };
  }
  const err = validasiPenilaian({
    hasil: input.hasil,
    nilai: input.nilai,
    tanggalSelesai: row.tanggalSelesai,
    tanggalSelesaiBaru: input.tanggalSelesaiBaru,
  });
  if (err) return { success: false, message: err };
  await prisma.probationReview.update({
    where: { id },
    data: {
      hasil: input.hasil as never,
      nilai: input.nilai,
      catatan: input.catatan.trim() || null,
      tanggalSelesaiBaru: input.hasil === "PERPANJANG" ? toDbDate(input.tanggalSelesaiBaru) : null,
      diputuskanOlehId: userId,
      diputuskanPada: new Date(),
    },
  });
  revalidatePath("/employees/probation");
  return { success: true, message: `Penilaian tersimpan: ${labelHasilProbation(input.hasil)}.` };
}

export async function finalisasiReview(id: string, userId: string): Promise<ProbationActionResult> {
  const p = await resolvePenindak(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa finalisasi." };
  const row = await prisma.probationReview.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.status !== "DISETUJUI") return { success: false, message: "Hanya yang DISETUJUI yang bisa difinalisasi." };
  if (!row.hasil) return { success: false, message: "Belum ada hasil penilaian." };

  if (row.hasil === "LULUS") {
    await prisma.$transaction([
      prisma.karyawan.update({ where: { id: row.karyawanId }, data: { status: "AKTIF" } }),
      prisma.probationReview.update({ where: { id }, data: { status: "SELESAI" } }),
    ]);
  } else if (row.hasil === "PERPANJANG") {
    if (!row.tanggalSelesaiBaru) return { success: false, message: "Tanggal perpanjangan belum diisi." };
    await prisma.$transaction([
      prisma.probationReview.update({ where: { id }, data: { status: "SELESAI" } }),
      prisma.probationReview.create({
        data: {
          karyawanId: row.karyawanId,
          tanggalMulai: new Date(row.tanggalSelesai.getTime() + 86_400_000),
          tanggalSelesai: row.tanggalSelesaiBaru,
          createdById: userId,
        },
      }),
    ]);
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.karyawan.update({
        where: { id: row.karyawanId },
        data: { status: "DIHENTIKAN", tanggalResign: row.tanggalSelesai },
      });
      const akun = await tx.karyawan.findUnique({ where: { id: row.karyawanId }, select: { userId: true } });
      if (akun?.userId) {
        await tx.user.update({ where: { id: akun.userId }, data: { isActive: false } });
        await tx.session.deleteMany({ where: { userId: akun.userId } });
      }
      await tx.probationReview.update({ where: { id }, data: { status: "SELESAI" } });
    });
  }

  revalidatePath("/employees/probation");
  revalidatePath("/employees");
  const pesan =
    row.hasil === "LULUS"
      ? "Lulus — status menjadi AKTIF."
      : row.hasil === "PERPANJANG"
        ? "Diperpanjang — review lanjutan dibuat."
        : "Tidak lulus — status DIHENTIKAN, akun dinonaktifkan.";
  return { success: true, message: pesan };
}

export async function hapusReview(id: string, userId: string): Promise<ProbationActionResult> {
  const p = await resolvePenindak(userId);
  const row = await prisma.probationReview.findUnique({ where: { id }, select: { karyawanId: true, status: true } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!(await bolehKelola(p, row.karyawanId))) return { success: false, message: "Akses ditolak." };
  if (!["DRAFT", "DITOLAK", "DIBATALKAN"].includes(row.status)) {
    return { success: false, message: "Hanya draf/ditolak/dibatalkan yang bisa dihapus." };
  }
  await prisma.$transaction([
    prisma.probationReview.delete({ where: { id } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "PROBATION", referensiId: id } }),
  ]);
  revalidatePath("/employees/probation");
  return { success: true, message: "Review dihapus." };
}
