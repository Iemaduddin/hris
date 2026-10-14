"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { defaultBerlakuSampai, TINGKAT_LABEL, validasiEskalasi } from "@/src/modules/employee/lib/disiplin";

export type DisiplinActionResult = { success: boolean; message: string; id?: string };

export type DisiplinItem = {
  id: string;
  nomor: string;
  karyawanId: string;
  karyawanNama: string;
  tingkat: string;
  tingkatLabel: string;
  judul: string;
  tanggalTerbit: string;
  berlakuSampai: string | null;
  aktif: boolean;
  status: string;
};

export type DisiplinDetail = DisiplinItem & {
  pelanggaran: string;
  pelanggaranBerat: boolean;
  tanggalSkorsingMulai: string | null;
  tanggalSkorsingSelesai: string | null;
  dokumenUrl: string | null;
  ttdKaryawanPada: string | null;
  ttdKaryawanNama: string | null;
  catatan: string | null;
  alasanCabut: string | null;
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

function awalHari(): Date {
  const kini = new Date();
  return new Date(kini.getFullYear(), kini.getMonth(), kini.getDate());
}

function keAktif(r: { status: string; berlakuSampai: Date | null }): boolean {
  return r.status === "DITERBITKAN" && (!r.berlakuSampai || r.berlakuSampai.getTime() >= awalHari().getTime());
}

export async function getDisiplinList(userId: string): Promise<DisiplinItem[]> {
  const p = await resolvePenindak(userId);
  const rows = await prisma.suratPeringatan.findMany({
    where: !isHr(p.role) && p.karyawanId ? { karyawan: { atasanLangsungId: p.karyawanId } } : {},
    orderBy: { tanggalTerbit: "desc" },
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    nomor: r.nomor,
    karyawanId: r.karyawanId,
    karyawanNama: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    tingkat: r.tingkat,
    tingkatLabel: TINGKAT_LABEL[r.tingkat] ?? r.tingkat,
    judul: r.judul,
    tanggalTerbit: r.tanggalTerbit.toISOString().slice(0, 10),
    berlakuSampai: r.berlakuSampai?.toISOString().slice(0, 10) ?? null,
    aktif: keAktif(r),
    status: r.status,
  }));
}

export async function getDisiplinDetail(id: string, userId: string): Promise<DisiplinDetail | null> {
  const p = await resolvePenindak(userId);
  const r = await prisma.suratPeringatan.findUnique({
    where: { id },
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true, atasanLangsungId: true } } },
  });
  if (!r) return null;
  const milikSendiri = p.karyawanId === r.karyawanId;
  if (!isHr(p.role) && !milikSendiri && r.karyawan.atasanLangsungId !== p.karyawanId) return null;
  return {
    id: r.id,
    nomor: r.nomor,
    karyawanId: r.karyawanId,
    karyawanNama: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    tingkat: r.tingkat,
    tingkatLabel: TINGKAT_LABEL[r.tingkat] ?? r.tingkat,
    judul: r.judul,
    tanggalTerbit: r.tanggalTerbit.toISOString().slice(0, 10),
    berlakuSampai: r.berlakuSampai?.toISOString().slice(0, 10) ?? null,
    aktif: keAktif(r),
    status: r.status,
    pelanggaran: r.pelanggaran,
    pelanggaranBerat: r.pelanggaranBerat,
    tanggalSkorsingMulai: r.tanggalSkorsingMulai?.toISOString().slice(0, 10) ?? null,
    tanggalSkorsingSelesai: r.tanggalSkorsingSelesai?.toISOString().slice(0, 10) ?? null,
    dokumenUrl: r.dokumenUrl,
    ttdKaryawanPada: r.ttdKaryawanPada?.toISOString() ?? null,
    ttdKaryawanNama: r.ttdKaryawanNama,
    catatan: r.catatan,
    alasanCabut: r.alasanCabut,
  };
}

export async function getDisiplinSaya(karyawanId: string): Promise<DisiplinItem[]> {
  const rows = await prisma.suratPeringatan.findMany({
    where: { karyawanId, status: { in: ["DITERBITKAN", "DICABUT"] } },
    orderBy: { tanggalTerbit: "desc" },
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    nomor: r.nomor,
    karyawanId: r.karyawanId,
    karyawanNama: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    tingkat: r.tingkat,
    tingkatLabel: TINGKAT_LABEL[r.tingkat] ?? r.tingkat,
    judul: r.judul,
    tanggalTerbit: r.tanggalTerbit.toISOString().slice(0, 10),
    berlakuSampai: r.berlakuSampai?.toISOString().slice(0, 10) ?? null,
    aktif: keAktif(r),
    status: r.status,
  }));
}

export async function getSPAktif(): Promise<DisiplinItem[]> {
  const rows = await prisma.suratPeringatan.findMany({
    where: { status: "DITERBITKAN" },
    orderBy: { tanggalTerbit: "desc" },
    take: 20,
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows
    .filter(keAktif)
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      nomor: r.nomor,
      karyawanId: r.karyawanId,
      karyawanNama: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
      tingkat: r.tingkat,
      tingkatLabel: TINGKAT_LABEL[r.tingkat] ?? r.tingkat,
      judul: r.judul,
      tanggalTerbit: r.tanggalTerbit.toISOString().slice(0, 10),
      berlakuSampai: r.berlakuSampai?.toISOString().slice(0, 10) ?? null,
      aktif: true,
      status: r.status,
    }));
}

export async function buatDisiplin(
  input: {
    karyawanId: string;
    tingkat: string;
    judul: string;
    pelanggaran: string;
    pelanggaranBerat: boolean;
    tanggalTerbit: string;
    berlakuSampai: string;
    skorsingMulai: string;
    skorsingSelesai: string;
    dokumenUrl: string;
    catatan: string;
  },
  userId: string,
): Promise<DisiplinActionResult> {
  const p = await resolvePenindak(userId);
  if (!(await bolehKelola(p, input.karyawanId))) {
    return { success: false, message: "Anda hanya bisa mengusulkan untuk bawahan langsung." };
  }
  const karyawan = await prisma.karyawan.findUnique({ where: { id: input.karyawanId }, select: { status: true } });
  if (!karyawan || !["AKTIF", "PROBASI"].includes(karyawan.status)) {
    return { success: false, message: "Karyawan tidak aktif." };
  }
  if (!(TINGKAT_LABEL as Record<string, string>)[input.tingkat]) {
    return { success: false, message: "Tingkat tidak valid." };
  }
  if (!input.judul.trim() || !input.pelanggaran.trim()) {
    return { success: false, message: "Judul dan pelanggaran wajib diisi." };
  }
  const tgl = toDbDate(input.tanggalTerbit);
  if (Number.isNaN(tgl.getTime())) return { success: false, message: "Tanggal terbit tidak valid." };
  let berlaku: Date | null = null;
  if (input.berlakuSampai.trim()) {
    berlaku = toDbDate(input.berlakuSampai);
    if (Number.isNaN(berlaku.getTime())) return { success: false, message: "Berlaku sampai tidak valid." };
  }
  let skMulai: Date | null = null;
  let skSelesai: Date | null = null;
  if (input.tingkat === "SKORSING") {
    if (!input.skorsingMulai || !input.skorsingSelesai) {
      return { success: false, message: "Skorsing wajib ada rentang tanggal." };
    }
    skMulai = toDbDate(input.skorsingMulai);
    skSelesai = toDbDate(input.skorsingSelesai);
    if (Number.isNaN(skMulai.getTime()) || Number.isNaN(skSelesai.getTime()) || skSelesai < skMulai) {
      return { success: false, message: "Rentang skorsing tidak valid." };
    }
  }

  const created = await prisma.suratPeringatan.create({
    data: {
      nomor: `SP-${tgl.getUTCFullYear()}-${input.karyawanId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      karyawanId: input.karyawanId,
      tingkat: input.tingkat as never,
      judul: input.judul.trim(),
      pelanggaran: input.pelanggaran.trim(),
      pelanggaranBerat: input.pelanggaranBerat,
      tanggalTerbit: tgl,
      berlakuSampai: berlaku,
      tanggalSkorsingMulai: skMulai,
      tanggalSkorsingSelesai: skSelesai,
      dokumenUrl: input.dokumenUrl.trim() || null,
      catatan: input.catatan.trim() || null,
      createdById: userId,
    },
    select: { id: true },
  });
  revalidatePath("/employees/disiplin");
  return { success: true, message: "Draf surat tersimpan.", id: created.id };
}

async function tingkatAktif(karyawanId: string): Promise<string[]> {
  const rows = await prisma.suratPeringatan.findMany({
    where: { karyawanId, status: "DITERBITKAN" },
    select: { tingkat: true, berlakuSampai: true, status: true },
  });
  return rows.filter(keAktif).map((r) => r.tingkat);
}

export async function terbitkanDisiplin(id: string, userId: string): Promise<DisiplinActionResult> {
  const p = await resolvePenindak(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa menerbitkan." };
  const row = await prisma.suratPeringatan.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diterbitkan." };
  const err = validasiEskalasi(row.tingkat, await tingkatAktif(row.karyawanId), row.pelanggaranBerat);
  if (err) return { success: false, message: err };
  await prisma.suratPeringatan.update({
    where: { id },
    data: {
      status: "DITERBITKAN",
      berlakuSampai: row.berlakuSampai ?? defaultBerlakuSampai(row.tanggalTerbit),
      diterbitkanOlehId: userId,
      diterbitkanPada: new Date(),
    },
  });
  revalidatePath("/employees/disiplin");
  return { success: true, message: `${row.nomor} diterbitkan.` };
}

export async function cabutDisiplin(id: string, alasan: string, userId: string): Promise<DisiplinActionResult> {
  const p = await resolvePenindak(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa mencabut." };
  const row = await prisma.suratPeringatan.findUnique({ where: { id }, select: { status: true } });
  if (!row || row.status !== "DITERBITKAN") return { success: false, message: "Hanya yang terbit yang bisa dicabut." };
  if (!alasan.trim()) return { success: false, message: "Alasan pencabutan wajib diisi." };
  await prisma.suratPeringatan.update({
    where: { id },
    data: { status: "DICABUT", alasanCabut: alasan.trim(), dicabutOlehId: userId, dicabutPada: new Date() },
  });
  revalidatePath("/employees/disiplin");
  return { success: true, message: "Surat dicabut." };
}

export async function hapusDisiplin(id: string, userId: string): Promise<DisiplinActionResult> {
  const p = await resolvePenindak(userId);
  const row = await prisma.suratPeringatan.findUnique({ where: { id }, select: { karyawanId: true, status: true } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!(await bolehKelola(p, row.karyawanId))) return { success: false, message: "Akses ditolak." };
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa dihapus." };
  await prisma.suratPeringatan.delete({ where: { id } });
  revalidatePath("/employees/disiplin");
  return { success: true, message: "Draf dihapus." };
}

export async function ackDisiplin(id: string, userId: string): Promise<DisiplinActionResult> {
  const p = await resolvePenindak(userId);
  const row = await prisma.suratPeringatan.findUnique({
    where: { id },
    select: { karyawanId: true, status: true, ttdKaryawanPada: true, karyawan: { select: { namaLengkap: true } } },
  });
  if (!row || row.status !== "DITERBITKAN") return { success: false, message: "Surat tidak tersedia." };
  if (p.karyawanId !== row.karyawanId) return { success: false, message: "Hanya untuk karyawan bersangkutan." };
  if (row.ttdKaryawanPada) return { success: false, message: "Sudah ditandatangani." };
  await prisma.suratPeringatan.update({
    where: { id },
    data: { ttdKaryawanPada: new Date(), ttdKaryawanNama: row.karyawan.namaLengkap },
  });
  revalidatePath("/account/disiplin");
  return { success: true, message: "Tercatat sudah dibaca." };
}
