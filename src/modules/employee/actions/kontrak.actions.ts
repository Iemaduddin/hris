"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { nomorUrut } from "@/src/lib/numbering";
import { getKontrakMasaBerakhir } from "./employee.actions";
import { awalKontrakLanjutan, validasiPerpanjangan } from "@/src/modules/employee/lib/kontrak";

export type KontrakActionResult = { success: boolean; message: string; id?: string };

export type KontrakTandaTanganItem = {
  pihak: string;
  namaPenanda: string | null;
  fileUrl: string;
  ditandatanganiPada: string;
};

export type KontrakDetailView = {
  id: string;
  nomorKontrak: string;
  karyawanId: string;
  karyawanNama: string;
  jenisKontrak: string;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  status: string;
  gajiPokok: string | null;
  catatan: string | null;
  tandaTangan: KontrakTandaTanganItem[];
};

async function requireHr(userId: string): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_HR";
}

export async function getKontrakAkanBerakhir() {
  return getKontrakMasaBerakhir(60);
}

/**
 * Perpanjangan massal append-only: kontrak lama → BERAKHIR,
 * kontrak baru AKTIF bernomor otomatis mulai sehari sesudahnya.
 */
export async function perpanjangKontrakBatch(
  input: {
    kontrakIds: string[];
    tanggalSelesai: string;
    jenisKontrak: string;
    gajiPokok: string;
    catatan: string;
  },
  userId: string,
): Promise<KontrakActionResult> {
  if (!(await requireHr(userId))) return { success: false, message: "Hanya HR." };
  if (input.kontrakIds.length === 0) return { success: false, message: "Pilih minimal satu kontrak." };
  if (input.kontrakIds.length > 100) return { success: false, message: "Maksimal 100 kontrak per batch." };
  const gapok = input.gajiPokok.trim() === "" ? null : Number(input.gajiPokok);
  if (gapok !== null && (!Number.isFinite(gapok) || gapok < 0)) {
    return { success: false, message: "Gaji pokok tidak valid." };
  }

  const rows = await prisma.kontrakKerja.findMany({
    where: { id: { in: input.kontrakIds } },
    select: { id: true, karyawanId: true, tanggalSelesai: true, status: true, gajiPokok: true, nomorKontrak: true },
  });
  if (rows.length !== input.kontrakIds.length) {
    return { success: false, message: "Sebagian kontrak tidak ditemukan." };
  }
  for (const r of rows) {
    if (!["AKTIF", "AKAN_BERAKHIR"].includes(r.status)) {
      return { success: false, message: `Kontrak ${r.nomorKontrak} tidak aktif.` };
    }
    const err = validasiPerpanjangan({ tanggalSelesaiLama: r.tanggalSelesai, tanggalSelesaiBaru: input.tanggalSelesai });
    if (err) return { success: false, message: `${r.nomorKontrak}: ${err}` };
  }

  const tahun = new Date(input.tanggalSelesai).getUTCFullYear();
  let dibuat = 0;
  for (const r of rows) {
    const mulai = awalKontrakLanjutan(r.tanggalSelesai);
    await prisma.$transaction([
      prisma.kontrakKerja.update({ where: { id: r.id }, data: { status: "BERAKHIR" } }),
      prisma.kontrakKerja.create({
        data: {
          karyawanId: r.karyawanId,
          nomorKontrak: await nomorUrut("KTR", tahun),
          jenisKontrak: (input.jenisKontrak || "PKWT") as never,
          tanggalMulai: mulai,
          tanggalSelesai: toDbDate(input.tanggalSelesai),
          status: "AKTIF",
          gajiPokok: gapok ?? (r.gajiPokok ? Number(r.gajiPokok) : null),
          catatan: input.catatan.trim() ? `Perpanjangan dari ${r.nomorKontrak}. ${input.catatan.trim()}` : `Perpanjangan dari ${r.nomorKontrak}.`,
        },
      }),
    ]);
    dibuat++;
  }

  revalidatePath("/employees/kontrak");
  revalidatePath("/employees");
  return { success: true, message: `${dibuat} kontrak diperpanjang.` };
}

export async function getKontrakDetail(id: string): Promise<KontrakDetailView | null> {
  const r = await prisma.kontrakKerja.findUnique({
    where: { id },
    include: {
      karyawan: { select: { id: true, namaLengkap: true, nomorKaryawan: true } },
      tandaTangan: { orderBy: { pihak: "asc" } },
    },
  });
  if (!r) return null;
  return {
    id: r.id,
    nomorKontrak: r.nomorKontrak,
    karyawanId: r.karyawan.id,
    karyawanNama: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    jenisKontrak: r.jenisKontrak,
    tanggalMulai: r.tanggalMulai.toISOString().slice(0, 10),
    tanggalSelesai: r.tanggalSelesai?.toISOString().slice(0, 10) ?? null,
    status: r.status,
    gajiPokok: r.gajiPokok?.toString() ?? null,
    catatan: r.catatan,
    tandaTangan: r.tandaTangan.map((t) => ({
      pihak: t.pihak,
      namaPenanda: t.namaPenanda,
      fileUrl: t.fileUrl,
      ditandatanganiPada: t.ditandatanganiPada.toISOString(),
    })),
  };
}

const PIHAK_VALID = ["HRD", "KARYAWAN"];

export async function tambahTandaTangan(
  input: { kontrakId: string; pihak: string; namaPenanda: string; fileUrl: string },
  userId: string,
): Promise<KontrakActionResult> {
  if (!(await requireHr(userId))) return { success: false, message: "Hanya HR." };
  if (!PIHAK_VALID.includes(input.pihak)) return { success: false, message: "Pihak tidak valid." };
  if (!input.fileUrl.trim()) return { success: false, message: "File tanda tangan wajib ada." };
  const kontrak = await prisma.kontrakKerja.findUnique({ where: { id: input.kontrakId }, select: { id: true } });
  if (!kontrak) return { success: false, message: "Kontrak tidak ditemukan." };
  await prisma.kontrakTandaTangan.upsert({
    where: { kontrakId_pihak: { kontrakId: input.kontrakId, pihak: input.pihak as never } },
    create: {
      kontrakId: input.kontrakId,
      pihak: input.pihak as never,
      namaPenanda: input.namaPenanda.trim() || null,
      fileUrl: input.fileUrl.trim(),
      createdById: userId,
    },
    update: {
      namaPenanda: input.namaPenanda.trim() || null,
      fileUrl: input.fileUrl.trim(),
      ditandatanganiPada: new Date(),
      createdById: userId,
    },
  });
  revalidatePath("/employees/kontrak");
  return { success: true, message: `Tanda tangan ${input.pihak} tersimpan.` };
}

export async function hapusTandaTangan(kontrakId: string, pihak: string, userId: string): Promise<KontrakActionResult> {
  if (!(await requireHr(userId))) return { success: false, message: "Hanya HR." };
  await prisma.kontrakTandaTangan.deleteMany({ where: { kontrakId, pihak: pihak as never } });
  revalidatePath("/employees/kontrak");
  return { success: true, message: "Tanda tangan dihapus." };
}
