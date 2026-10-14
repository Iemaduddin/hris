"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { mulaiAlurApproval } from "@/src/modules/approval/lib/approval-engine";
import { CLEARANCE_BAWAAN, semuaWajibSelesai } from "@/src/modules/employee/lib/offboarding";

export type OffboardingActionResult = { success: boolean; message: string; id?: string };

export type OffboardingItem = {
  id: string;
  karyawanId: string;
  karyawanNama: string;
  tanggalRencana: string;
  status: string;
  clearanceSelesai: string;
};

export type ClearanceItem = {
  id: string;
  kategori: string;
  judul: string;
  picRole: string;
  wajib: boolean;
  status: string;
  catatan: string | null;
  bolehAksi: boolean;
};

export type OffboardingDetail = {
  id: string;
  karyawanId: string;
  karyawanNama: string;
  alasan: string;
  tanggalRencana: string;
  tanggalEfektif: string | null;
  status: string;
  diajukanPada: string | null;
  nomorPaklaring: string | null;
  selesaiPada: string | null;
  clearance: ClearanceItem[];
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

/** PIC clearance: HR semua; FINANCE/IT untuk kategorinya; atasan untuk milik bawahan. */
async function bolehClearance(p: Penindak, item: { picRole: string }, karyawanId: string, atasanId: string | null): Promise<boolean> {
  if (isHr(p.role)) return true;
  if (p.role === "FINANCE" && item.picRole === "FINANCE") return true;
  if (p.role === "MANAJER" && item.picRole === "ATASAN" && p.karyawanId === atasanId) return true;
  return false;
}

export async function getOffboardingList(): Promise<OffboardingItem[]> {
  const rows = await prisma.offboarding.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
      clearance: { select: { wajib: true, status: true } },
    },
  });
  return rows.map((r) => {
    const wajib = r.clearance.filter((c) => c.wajib);
    return {
      id: r.id,
      karyawanId: r.karyawanId,
      karyawanNama: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
      tanggalRencana: r.tanggalRencana.toISOString().slice(0, 10),
      status: r.status,
      clearanceSelesai: `${wajib.filter((c) => c.status === "SELESAI").length}/${wajib.length}`,
    };
  });
}

export async function getOffboardingDetail(id: string, userId: string): Promise<OffboardingDetail | null> {
  const p = await resolvePenindak(userId);
  const r = await prisma.offboarding.findUnique({
    where: { id },
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true, atasanLangsungId: true, userId: true } },
      clearance: { orderBy: { kategori: "asc" } },
    },
  });
  if (!r) return null;
  const milikSendiri = p.karyawanId === r.karyawanId;
  const atasan = r.karyawan.atasanLangsungId === p.karyawanId;
  if (!isHr(p.role) && !milikSendiri && !(p.role === "FINANCE") && !atasan) return null;
  return {
    id: r.id,
    karyawanId: r.karyawanId,
    karyawanNama: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    alasan: r.alasan,
    tanggalRencana: r.tanggalRencana.toISOString().slice(0, 10),
    tanggalEfektif: r.tanggalEfektif?.toISOString().slice(0, 10) ?? null,
    status: r.status,
    diajukanPada: r.diajukanPada?.toISOString() ?? null,
    nomorPaklaring: r.nomorPaklaring,
    selesaiPada: r.selesaiPada?.toISOString() ?? null,
    clearance: await Promise.all(
      r.clearance.map(async (c) => ({
        id: c.id,
        kategori: c.kategori,
        judul: c.judul,
        picRole: c.picRole,
        wajib: c.wajib,
        status: c.status,
        catatan: c.catatan,
        bolehAksi: await bolehClearance(p, c, r.karyawanId, r.karyawan.atasanLangsungId),
      })),
    ),
  };
}

export async function getOffboardingSaya(karyawanId: string) {
  const rows = await prisma.offboarding.findMany({
    where: { karyawanId },
    orderBy: { createdAt: "desc" },
    select: { id: true, tanggalRencana: true, status: true, nomorPaklaring: true },
  });
  return rows.map((r) => ({
    id: r.id,
    tanggalRencana: r.tanggalRencana.toISOString().slice(0, 10),
    status: r.status,
    nomorPaklaring: r.nomorPaklaring,
  }));
}

export async function getOffboardingOptions(): Promise<Array<{ value: string; label: string }>> {
  const karyawan = await prisma.karyawan.findMany({
    where: { status: { in: ["AKTIF", "PROBASI"] } },
    orderBy: { namaLengkap: "asc" },
    select: { id: true, namaLengkap: true, nomorKaryawan: true },
  });
  return karyawan.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` }));
}

export async function buatOffboarding(
  input: { karyawanId: string; tanggalRencana: string; alasan: string },
  userId: string,
): Promise<OffboardingActionResult> {
  const p = await resolvePenindak(userId);
  const milikSendiri = p.karyawanId === input.karyawanId;
  if (!isHr(p.role) && !milikSendiri) {
    return { success: false, message: "Hanya untuk diri sendiri (HR bisa buatkan)." };
  }
  const karyawan = await prisma.karyawan.findUnique({
    where: { id: input.karyawanId },
    select: { status: true },
  });
  if (!karyawan || !["AKTIF", "PROBASI"].includes(karyawan.status)) {
    return { success: false, message: "Karyawan tidak aktif." };
  }
  if (!input.alasan.trim()) return { success: false, message: "Alasan wajib diisi." };
  const tgl = toDbDate(input.tanggalRencana);
  if (Number.isNaN(tgl.getTime())) return { success: false, message: "Tanggal rencana tidak valid." };
  const aktif = await prisma.offboarding.findFirst({
    where: { karyawanId: input.karyawanId, status: { in: ["DIAJUKAN", "MENUNGGU_APPROVAL", "DISETUJUI", "CLEARANCE"] } },
    select: { id: true },
  });
  if (aktif) return { success: false, message: "Sudah ada pengajuan berjalan." };

  const created = await prisma.offboarding.create({
    data: {
      karyawanId: input.karyawanId,
      alasan: input.alasan.trim(),
      tanggalRencana: tgl,
      createdById: userId,
    },
    select: { id: true },
  });
  revalidatePath("/employees/offboarding");
  return { success: true, message: "Pengajuan resign tersimpan sebagai draf.", id: created.id };
}

export async function ajukanOffboarding(id: string, userId: string): Promise<OffboardingActionResult> {
  const p = await resolvePenindak(userId);
  const row = await prisma.offboarding.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  const milikSendiri = p.karyawanId === row.karyawanId;
  if (!isHr(p.role) && !milikSendiri) return { success: false, message: "Akses ditolak." };
  if (row.status !== "DIAJUKAN") return { success: false, message: "Hanya draf yang bisa diajukan." };
  await mulaiAlurApproval("RESIGN", id);
  revalidatePath("/employees/offboarding");
  revalidatePath("/approval");
  return { success: true, message: "Dikirim ke atasan → HR." };
}

export async function batalkanOffboarding(id: string, userId: string): Promise<OffboardingActionResult> {
  const p = await resolvePenindak(userId);
  const row = await prisma.offboarding.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  const milikSendiri = p.karyawanId === row.karyawanId;
  if (!isHr(p.role) && !milikSendiri) return { success: false, message: "Akses ditolak." };
  if (!["DIAJUKAN", "MENUNGGU_APPROVAL"].includes(row.status)) {
    return { success: false, message: "Status ini tidak bisa dibatalkan." };
  }
  await prisma.$transaction([
    prisma.offboarding.update({ where: { id }, data: { status: "DIBATALKAN" } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "RESIGN", referensiId: id } }),
  ]);
  revalidatePath("/employees/offboarding");
  return { success: true, message: "Pengajuan dibatalkan." };
}

/** Dipanggil otomatis saat DISETUJUI final: buka fase clearance + cek kasbon. */
export async function bukaClearance(offboardingId: string): Promise<void> {
  const ob = await prisma.offboarding.findUnique({
    where: { id: offboardingId },
    select: { karyawanId: true, status: true },
  });
  if (!ob || ob.status !== "DISETUJUI") return;
  const ada = await prisma.offboardingClearance.count({ where: { offboardingId } });
  if (ada > 0) return;

  const kasbonAktif = await prisma.kasbon.findMany({
    where: { karyawanId: ob.karyawanId, status: "DISETUJUI", sisaHutang: { gt: 0 } },
    select: { nomor: true, sisaHutang: true },
  });
  const kasbonLunas = kasbonAktif.length === 0;

  await prisma.$transaction([
    prisma.offboardingClearance.createMany({
      data: CLEARANCE_BAWAAN.map((c) => ({
        offboardingId,
        kategori: c.kategori as never,
        judul: c.judul,
        picRole: c.picRole,
        wajib: c.wajib,
        ...(c.otomatis && kasbonLunas
          ? { status: "SELESAI" as never, catatan: "Otomatis: tidak ada kasbon berjalan." }
          : {}),
      })),
    }),
    prisma.offboarding.update({ where: { id: offboardingId }, data: { status: "CLEARANCE" } }),
  ]);
}

export async function selesaikanClearance(
  itemId: string,
  selesai: boolean,
  catatan: string,
  userId: string,
): Promise<OffboardingActionResult> {
  const p = await resolvePenindak(userId);
  const item = await prisma.offboardingClearance.findUnique({
    where: { id: itemId },
    include: { offboarding: { select: { karyawanId: true, status: true, karyawan: { select: { atasanLangsungId: true } } } } },
  });
  if (!item || item.offboarding.status !== "CLEARANCE") {
    return { success: false, message: "Item tidak tersedia." };
  }
  if (!(await bolehClearance(p, item, item.offboarding.karyawanId, item.offboarding.karyawan.atasanLangsungId))) {
    return { success: false, message: "Hanya PIC terkait/HR yang bisa menandai." };
  }
  await prisma.offboardingClearance.update({
    where: { id: itemId },
    data: selesai
      ? { status: "SELESAI", catatan: catatan.trim() || null, diselesaikanOlehId: userId, diselesaikanPada: new Date() }
      : { status: "BELUM", catatan: null, diselesaikanOlehId: null, diselesaikanPada: null },
  });
  revalidatePath("/employees/offboarding");
  return { success: true, message: selesai ? "Clearance ditandai selesai." : "Dikembalikan ke belum." };
}

export async function selesaikanOffboarding(
  id: string,
  tanggalEfektif: string,
  userId: string,
): Promise<OffboardingActionResult> {
  const p = await resolvePenindak(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa menyelesaikan." };
  const ob = await prisma.offboarding.findUnique({
    where: { id },
    include: { clearance: { select: { wajib: true, status: true } } },
  });
  if (!ob || ob.status !== "CLEARANCE") return { success: false, message: "Belum fase clearance." };
  if (!semuaWajibSelesai(ob.clearance)) {
    return { success: false, message: "Masih ada clearance wajib belum selesai." };
  }
  const tgl = toDbDate(tanggalEfektif);
  if (Number.isNaN(tgl.getTime())) return { success: false, message: "Tanggal efektif tidak valid." };

  const nomor = `PAK-${tgl.getUTCFullYear()}-${ob.karyawanId.slice(-6).toUpperCase()}`;
  await prisma.$transaction(async (tx) => {
    await tx.karyawan.update({
      where: { id: ob.karyawanId },
      data: { status: "RESIGN", tanggalResign: tgl },
    });
    const akun = await tx.karyawan.findUnique({ where: { id: ob.karyawanId }, select: { userId: true } });
    if (akun?.userId) {
      await tx.user.update({ where: { id: akun.userId }, data: { isActive: false } });
      await tx.session.deleteMany({ where: { userId: akun.userId } });
    }
    await tx.offboarding.update({
      where: { id },
      data: { status: "SELESAI", tanggalEfektif: tgl, nomorPaklaring: nomor, selesaiPada: new Date(), selesaiOlehId: userId },
    });
  });

  revalidatePath("/employees/offboarding");
  revalidatePath("/employees");
  return { success: true, message: `Selesai. Paklaring ${nomor} terbit, akun dinonaktifkan.` };
}

export async function hapusOffboarding(id: string, userId: string): Promise<OffboardingActionResult> {
  const p = await resolvePenindak(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa menghapus." };
  const ob = await prisma.offboarding.findUnique({ where: { id }, select: { status: true } });
  if (!ob || !["DITOLAK", "DIBATALKAN"].includes(ob.status)) {
    return { success: false, message: "Hanya yang ditolak/dibatalkan yang bisa dihapus." };
  }
  await prisma.$transaction([
    prisma.offboardingClearance.deleteMany({ where: { offboardingId: id } }),
    prisma.offboarding.delete({ where: { id } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "RESIGN", referensiId: id } }),
  ]);
  revalidatePath("/employees/offboarding");
  return { success: true, message: "Data dihapus." };
}

export type PaklaringView = {
  nomor: string;
  karyawanNama: string;
  nomorKaryawan: string;
  tanggalMasuk: string;
  tanggalResign: string;
  posisiTerakhir: string;
  alasan: string;
};

export async function getPaklaring(id: string, userId: string): Promise<PaklaringView | null> {
  const p = await resolvePenindak(userId);
  if (!isHr(p.role) && p.role !== "MANAJER") return null;
  const ob = await prisma.offboarding.findUnique({
    where: { id },
    include: {
      karyawan: {
        select: {
          namaLengkap: true,
          nomorKaryawan: true,
          tanggalMasuk: true,
          posisiKaryawan: {
            orderBy: { tanggalEfektif: "desc" },
            take: 1,
            select: { posisi: { select: { nama: true } }, unitOrganisasi: { select: { nama: true } } },
          },
        },
      },
    },
  });
  if (!ob || ob.status !== "SELESAI" || !ob.nomorPaklaring || !ob.tanggalEfektif) return null;
  const latest = ob.karyawan.posisiKaryawan[0];
  return {
    nomor: ob.nomorPaklaring,
    karyawanNama: ob.karyawan.namaLengkap,
    nomorKaryawan: ob.karyawan.nomorKaryawan,
    tanggalMasuk: ob.karyawan.tanggalMasuk.toISOString().slice(0, 10),
    tanggalResign: ob.tanggalEfektif.toISOString().slice(0, 10),
    posisiTerakhir: [latest?.posisi?.nama, latest?.unitOrganisasi?.nama].filter(Boolean).join(" • ") || "-",
    alasan: ob.alasan,
  };
}
