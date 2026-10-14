"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { mulaiAlurApproval } from "@/src/modules/approval/lib/approval-engine";
import { validasiKoreksi, waktuKoreksi } from "@/src/modules/attendance/lib/koreksi";

export type KoreksiActionResult = { success: boolean; message: string; id?: string };

export type KoreksiItem = {
  id: string;
  tanggal: string;
  tipe: string;
  waktuBaru: string;
  alasan: string;
  status: string;
};

async function karyawanDariUser(userId: string): Promise<string | null> {
  if (!userId) return null;
  const k = await prisma.karyawan.findFirst({ where: { userId }, select: { id: true } });
  return k?.id ?? null;
}

export async function getKoreksiSaya(userId: string): Promise<KoreksiItem[]> {
  const saya = await karyawanDariUser(userId);
  if (!saya) return [];
  const rows = await prisma.koreksiPresensi.findMany({
    where: { karyawanId: saya },
    orderBy: { tanggal: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    tanggal: r.tanggal.toISOString().slice(0, 10),
    tipe: r.tipe,
    waktuBaru: r.waktuBaru.toISOString().slice(11, 16),
    alasan: r.alasan,
    status: r.status,
  }));
}

export async function buatKoreksi(
  input: { tanggal: string; tipe: string; jam: string; alasan: string; lampiranUrl: string },
  userId: string,
): Promise<KoreksiActionResult> {
  const saya = await karyawanDariUser(userId);
  if (!saya) return { success: false, message: "Akun belum tertaut ke karyawan." };
  const err = validasiKoreksi(input);
  if (err) return { success: false, message: err };
  const tgl = toDbDate(input.tanggal);
  const dobel = await prisma.koreksiPresensi.findFirst({
    where: { karyawanId: saya, tanggal: tgl, tipe: input.tipe as never, status: { in: ["DRAFT", "DIAJUKAN", "MENUNGGU_APPROVAL"] } },
    select: { id: true },
  });
  if (dobel) return { success: false, message: "Sudah ada pengajuan aktif untuk itu." };

  const created = await prisma.koreksiPresensi.create({
    data: {
      karyawanId: saya,
      tanggal: tgl,
      tipe: input.tipe as never,
      waktuBaru: waktuKoreksi(input.tanggal, input.jam),
      alasan: input.alasan.trim(),
      lampiranUrl: input.lampiranUrl.trim() || null,
      createdById: userId,
    },
    select: { id: true },
  });
  revalidatePath("/account/koreksi");
  return { success: true, message: "Draf koreksi tersimpan.", id: created.id };
}

export async function ajukanKoreksi(id: string, userId: string): Promise<KoreksiActionResult> {
  const saya = await karyawanDariUser(userId);
  const row = await prisma.koreksiPresensi.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.karyawanId !== saya) return { success: false, message: "Hanya milik sendiri." };
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
  await mulaiAlurApproval("KOREKSI", id);
  revalidatePath("/account/koreksi");
  revalidatePath("/approval");
  return { success: true, message: "Dikirim ke atasan → HR." };
}

export async function batalkanKoreksi(id: string, userId: string): Promise<KoreksiActionResult> {
  const saya = await karyawanDariUser(userId);
  const row = await prisma.koreksiPresensi.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.karyawanId !== saya) return { success: false, message: "Hanya milik sendiri." };
  if (!["DRAFT", "DIAJUKAN"].includes(row.status)) {
    return { success: false, message: "Status ini tidak bisa dibatalkan." };
  }
  await prisma.$transaction([
    prisma.koreksiPresensi.update({ where: { id }, data: { status: "DIBATALKAN" } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "KOREKSI", referensiId: id } }),
  ]);
  revalidatePath("/account/koreksi");
  return { success: true, message: "Pengajuan dibatalkan." };
}

/**
 * Terapkan koreksi saat final approve (dipanggil sebagai onFinalApprove):
 * event lama (bila ada) dibatalkan, event MANUAL/DIKOREKSI dibuat.
 * Rekap menghitung ulang otomatis saat dibaca berikutnya.
 */
export async function terapkanKoreksi(id: string): Promise<{ success: boolean; message: string }> {
  const row = await prisma.koreksiPresensi.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  const hariMulai = new Date(row.tanggal);
  const hariSelesai = new Date(row.tanggal.getTime() + 86_400_000);
  const lama = await prisma.absensi.findFirst({
    where: {
      karyawanId: row.karyawanId,
      tipe: row.tipe,
      waktu: { gte: hariMulai, lt: hariSelesai },
      status: { in: ["VALID", "DIKOREKSI"] },
    },
    orderBy: { waktu: "desc" },
  });
  await prisma.$transaction([
    ...(lama
      ? [
          prisma.absensi.update({
            where: { id: lama.id },
            data: { status: "DIBATALKAN", catatan: `Digantikan koreksi ${row.id.slice(-6).toUpperCase()}` },
          }),
        ]
      : []),
    prisma.absensi.create({
      data: {
        karyawanId: row.karyawanId,
        waktu: row.waktuBaru,
        tipe: row.tipe,
        sumber: "MANUAL",
        status: "DIKOREKSI",
        catatan: `Koreksi mandiri disetujui (${row.alasan})`,
      },
    }),
    prisma.koreksiPresensi.update({ where: { id }, data: { absensiId: lama?.id ?? null } }),
  ]);
  return { success: true, message: "Koreksi diterapkan." };
}
