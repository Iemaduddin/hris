"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { mulaiAlurApproval } from "@/src/modules/approval/lib/approval-engine";
import { adaPerubahan, labelJenisMutasi, validasiMutasi } from "@/src/modules/employee/lib/mutasi";

export type MutasiActionResult = { success: boolean; message: string; id?: string };

export type MutasiItem = {
  id: string;
  nomor: string;
  karyawanId: string;
  karyawanNama: string;
  jenis: string;
  jenisLabel: string;
  dari: string;
  ke: string;
  tanggalEfektif: string;
  status: string;
};

export type MutasiDetail = MutasiItem & {
  alasan: string;
  dariUnitNama: string | null;
  dariPosisiNama: string | null;
  dariLokasiNama: string | null;
  keUnitNama: string | null;
  kePosisiNama: string | null;
  keLokasiNama: string | null;
  keAtasanNama: string | null;
  diajukanPada: string | null;
  diterapkanPada: string | null;
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

/** Manajer hanya untuk bawahan langsung; HR untuk semua. */
async function bolehKelola(p: Penindak, karyawanId: string): Promise<boolean> {
  if (isHr(p.role)) return true;
  if (p.role !== "MANAJER" || !p.karyawanId) return false;
  const bawahan = await prisma.karyawan.findFirst({
    where: { id: karyawanId, atasanLangsungId: p.karyawanId },
    select: { id: true },
  });
  return !!bawahan;
}

function ringkasPenempatan(unit: string | null, posisi: string | null, lokasi: string | null): string {
  return [posisi, unit, lokasi].filter(Boolean).join(" • ") || "-";
}

async function penempatanAktif(karyawanId: string) {
  return prisma.posisiKaryawan.findFirst({
    where: { karyawanId, isCurrent: true },
    orderBy: { tanggalEfektif: "desc" },
    include: {
      unitOrganisasi: { select: { nama: true } },
      posisi: { select: { nama: true } },
      lokasiKerja: { select: { nama: true } },
    },
  });
}

export async function getMutasiList(userId: string): Promise<MutasiItem[]> {
  const p = await resolvePenindak(userId);
  const rows = await prisma.mutasi.findMany({
    where: !isHr(p.role) && p.karyawanId ? { karyawan: { atasanLangsungId: p.karyawanId } } : {},
    orderBy: { createdAt: "desc" },
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
      keUnit: { select: { nama: true } },
      kePosisi: { select: { nama: true } },
      keLokasi: { select: { nama: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    nomor: r.nomor,
    karyawanId: r.karyawanId,
    karyawanNama: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    jenis: r.jenis,
    jenisLabel: labelJenisMutasi(r.jenis),
    dari: ringkasPenempatan(r.dariUnitNama, r.dariPosisiNama, r.dariLokasiNama),
    ke: ringkasPenempatan(r.keUnit?.nama ?? null, r.kePosisi?.nama ?? null, r.keLokasi?.nama ?? null),
    tanggalEfektif: r.tanggalEfektif.toISOString().slice(0, 10),
    status: r.status,
  }));
}

export async function getMutasiDetail(id: string, userId: string): Promise<MutasiDetail | null> {
  const p = await resolvePenindak(userId);
  const r = await prisma.mutasi.findUnique({
    where: { id },
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true, atasanLangsungId: true } },
      keUnit: { select: { nama: true } },
      kePosisi: { select: { nama: true } },
      keLokasi: { select: { nama: true } },
      keAtasan: { select: { namaLengkap: true } },
    },
  });
  if (!r) return null;
  if (!isHr(p.role) && r.karyawan.atasanLangsungId !== p.karyawanId) return null;
  const steps = await prisma.approvalStep.findMany({
    where: { referensiType: "MUTASI", referensiId: id },
    orderBy: { tahap: "asc" },
  });
  return {
    id: r.id,
    nomor: r.nomor,
    karyawanId: r.karyawanId,
    karyawanNama: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    jenis: r.jenis,
    jenisLabel: labelJenisMutasi(r.jenis),
    dari: ringkasPenempatan(r.dariUnitNama, r.dariPosisiNama, r.dariLokasiNama),
    ke: ringkasPenempatan(r.keUnit?.nama ?? null, r.kePosisi?.nama ?? null, r.keLokasi?.nama ?? null),
    tanggalEfektif: r.tanggalEfektif.toISOString().slice(0, 10),
    status: r.status,
    alasan: r.alasan,
    dariUnitNama: r.dariUnitNama,
    dariPosisiNama: r.dariPosisiNama,
    dariLokasiNama: r.dariLokasiNama,
    keUnitNama: r.keUnit?.nama ?? null,
    kePosisiNama: r.kePosisi?.nama ?? null,
    keLokasiNama: r.keLokasi?.nama ?? null,
    keAtasanNama: r.keAtasan?.namaLengkap ?? null,
    diajukanPada: r.diajukanPada?.toISOString() ?? null,
    diterapkanPada: r.diterapkanPada?.toISOString() ?? null,
    steps: steps.map((s) => ({
      tahap: s.tahap,
      status: s.status,
      catatan: s.catatan,
      diprosesPada: s.diprosesPada?.toISOString() ?? null,
    })),
  };
}

export type MutasiOption = { value: string; label: string };

export async function getMutasiOptions(userId: string): Promise<{
  karyawan: MutasiOption[];
  units: MutasiOption[];
  positions: MutasiOption[];
  locations: MutasiOption[];
  atasan: MutasiOption[];
}> {
  const p = await resolvePenindak(userId);
  const [karyawan, units, positions, locations, atasan] = await Promise.all([
    prisma.karyawan.findMany({
      where: {
        status: { in: ["AKTIF", "PROBASI"] },
        ...(!isHr(p.role) && p.karyawanId ? { atasanLangsungId: p.karyawanId } : {}),
      },
      orderBy: { namaLengkap: "asc" },
      select: { id: true, namaLengkap: true, nomorKaryawan: true },
    }),
    prisma.unitOrganisasi.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
    prisma.posisi.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
    prisma.lokasiKerja.findMany({
      where: { isActive: true },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
    prisma.karyawan.findMany({
      where: { status: { in: ["AKTIF", "PROBASI"] } },
      orderBy: { namaLengkap: "asc" },
      select: { id: true, namaLengkap: true, nomorKaryawan: true },
    }),
  ]);
  return {
    karyawan: karyawan.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` })),
    units: units.map((u) => ({ value: u.id, label: u.nama })),
    positions: positions.map((x) => ({ value: x.id, label: x.nama })),
    locations: locations.map((x) => ({ value: x.id, label: x.nama })),
    atasan: atasan.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` })),
  };
}

export async function buatMutasi(
  input: {
    karyawanId: string;
    jenis: string;
    keUnitId: string;
    kePosisiId: string;
    keLokasiId: string;
    keAtasanId: string;
    tanggalEfektif: string;
    alasan: string;
  },
  userId: string,
): Promise<MutasiActionResult> {
  const p = await resolvePenindak(userId);
  if (!(await bolehKelola(p, input.karyawanId))) {
    return { success: false, message: "Anda hanya bisa mengusulkan mutasi bawahan langsung." };
  }
  const karyawan = await prisma.karyawan.findUnique({
    where: { id: input.karyawanId },
    select: { id: true, status: true },
  });
  if (!karyawan || !["AKTIF", "PROBASI"].includes(karyawan.status)) {
    return { success: false, message: "Karyawan tidak aktif." };
  }

  const aktif = await penempatanAktif(input.karyawanId);
  const err = validasiMutasi({
    jenis: input.jenis,
    dari: {
      unitId: aktif?.unitOrganisasiId ?? "",
      posisiId: aktif?.posisiId ?? "",
      lokasiId: aktif?.lokasiKerjaId ?? "",
    },
    ke: { unitId: input.keUnitId, posisiId: input.kePosisiId, lokasiId: input.keLokasiId },
    tanggalEfektif: input.tanggalEfektif,
    alasan: input.alasan,
  });
  if (err) return { success: false, message: err };

  if (input.keAtasanId) {
    if (input.keAtasanId === input.karyawanId) return { success: false, message: "Atasan baru tidak boleh diri sendiri." };
    const ada = await prisma.karyawan.findUnique({ where: { id: input.keAtasanId }, select: { id: true } });
    if (!ada) return { success: false, message: "Atasan baru tidak ditemukan." };
  }
  for (const [kunci, model] of [
    ["Unit", prisma.unitOrganisasi],
    ["Posisi", prisma.posisi],
    ["Lokasi", prisma.lokasiKerja],
  ] as const) {
    const id = kunci === "Unit" ? input.keUnitId : kunci === "Posisi" ? input.kePosisiId : input.keLokasiId;
    if (id && !(await (model as typeof prisma.unitOrganisasi).findUnique({ where: { id }, select: { id: true } }))) {
      return { success: false, message: `Tujuan ${kunci} tidak ditemukan.` };
    }
  }

  const tgl = toDbDate(input.tanggalEfektif);
  const created = await prisma.mutasi.create({
    data: {
      nomor: `MTS-${tgl.getUTCFullYear()}-${input.karyawanId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      karyawanId: input.karyawanId,
      jenis: input.jenis as never,
      dariUnitId: aktif?.unitOrganisasiId ?? null,
      dariPosisiId: aktif?.posisiId ?? null,
      dariLokasiId: aktif?.lokasiKerjaId ?? null,
      dariUnitNama: aktif?.unitOrganisasi?.nama ?? null,
      dariPosisiNama: aktif?.posisi?.nama ?? null,
      dariLokasiNama: aktif?.lokasiKerja?.nama ?? null,
      keUnitId: input.keUnitId || null,
      kePosisiId: input.kePosisiId || null,
      keLokasiId: input.keLokasiId || null,
      keAtasanId: input.keAtasanId || null,
      tanggalEfektif: tgl,
      alasan: input.alasan.trim(),
      createdById: userId,
    },
  });
  revalidatePath("/employees/mutasi");
  return { success: true, message: `Draf ${created.nomor} tersimpan.`, id: created.id };
}

export async function ajukanMutasi(id: string, userId: string): Promise<MutasiActionResult> {
  const p = await resolvePenindak(userId);
  const row = await prisma.mutasi.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Mutasi tidak ditemukan." };
  if (!(await bolehKelola(p, row.karyawanId))) return { success: false, message: "Akses ditolak." };
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
  // Validasi ulang tujuan vs penempatan terkini (bisa berubah sejak draf dibuat).
  const aktif = await penempatanAktif(row.karyawanId);
  if (
    !adaPerubahan(
      {
        unitId: aktif?.unitOrganisasiId ?? "",
        posisiId: aktif?.posisiId ?? "",
        lokasiId: aktif?.lokasiKerjaId ?? "",
      },
      { unitId: row.keUnitId ?? "", posisiId: row.kePosisiId ?? "", lokasiId: row.keLokasiId ?? "" },
    )
  ) {
    return { success: false, message: "Penempatan sudah sama dengan tujuan (tidak ada perubahan)." };
  }
  await mulaiAlurApproval("MUTASI", id);
  revalidatePath("/employees/mutasi");
  revalidatePath("/approval");
  return { success: true, message: "Mutasi dikirim ke atasan → HR." };
}

export async function batalkanMutasi(id: string, userId: string): Promise<MutasiActionResult> {
  const p = await resolvePenindak(userId);
  const row = await prisma.mutasi.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Mutasi tidak ditemukan." };
  if (!(await bolehKelola(p, row.karyawanId))) return { success: false, message: "Akses ditolak." };
  if (!["DRAFT", "DIAJUKAN"].includes(row.status)) {
    return { success: false, message: "Status ini tidak bisa dibatalkan." };
  }
  await prisma.$transaction([
    prisma.mutasi.update({ where: { id }, data: { status: "DIBATALKAN" } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "MUTASI", referensiId: id } }),
  ]);
  revalidatePath("/employees/mutasi");
  return { success: true, message: "Mutasi dibatalkan." };
}

export async function terapkanMutasi(id: string, userId: string): Promise<MutasiActionResult> {
  const p = await resolvePenindak(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa menerapkan mutasi." };
  const row = await prisma.mutasi.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Mutasi tidak ditemukan." };
  if (row.status !== "DISETUJUI") return { success: false, message: "Hanya yang DISETUJUI yang bisa diterapkan." };

  const sehari = 24 * 60 * 60 * 1000;
  const tutupPada = new Date(row.tanggalEfektif.getTime() - sehari);

  await prisma.$transaction(async (tx) => {
    const aktif = await tx.posisiKaryawan.findMany({
      where: { karyawanId: row.karyawanId, isCurrent: true },
      select: { id: true, isPrimary: true },
    });
    for (const a of aktif) {
      await tx.posisiKaryawan.update({
        where: { id: a.id },
        data: { isCurrent: false, tanggalBerakhir: tutupPada },
      });
    }
    await tx.posisiKaryawan.create({
      data: {
        karyawanId: row.karyawanId,
        unitOrganisasiId: row.keUnitId,
        posisiId: row.kePosisiId,
        lokasiKerjaId: row.keLokasiId,
        isPrimary: aktif[0]?.isPrimary ?? true,
        isCurrent: true,
        tanggalEfektif: row.tanggalEfektif,
        catatan: `Mutasi ${row.nomor} (${labelJenisMutasi(row.jenis)})`,
      },
    });
    if (row.keAtasanId) {
      await tx.karyawan.update({ where: { id: row.karyawanId }, data: { atasanLangsungId: row.keAtasanId } });
    }
    await tx.mutasi.update({
      where: { id },
      data: { status: "DITERAPKAN", diterapkanPada: new Date(), diterapkanOlehId: userId },
    });
  });

  revalidatePath("/employees/mutasi");
  revalidatePath("/employees");
  return { success: true, message: `Mutasi ${row.nomor} diterapkan ke penempatan.` };
}

export async function hapusMutasi(id: string, userId: string): Promise<MutasiActionResult> {
  const p = await resolvePenindak(userId);
  const row = await prisma.mutasi.findUnique({ where: { id }, select: { karyawanId: true, status: true } });
  if (!row) return { success: false, message: "Mutasi tidak ditemukan." };
  if (!(await bolehKelola(p, row.karyawanId))) return { success: false, message: "Akses ditolak." };
  if (!["DRAFT", "DITOLAK", "DIBATALKAN"].includes(row.status)) {
    return { success: false, message: "Mutasi yang sudah berjalan tidak bisa dihapus." };
  }
  await prisma.$transaction([
    prisma.mutasi.delete({ where: { id } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "MUTASI", referensiId: id } }),
  ]);
  revalidatePath("/employees/mutasi");
  return { success: true, message: "Mutasi dihapus." };
}
