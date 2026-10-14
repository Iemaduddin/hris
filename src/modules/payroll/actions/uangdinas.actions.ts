"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { nomorUrut } from "@/src/lib/numbering";
import { mulaiAlurApproval } from "@/src/modules/approval/lib/approval-engine";
import { hitungSelisihLpj } from "@/src/modules/payroll/lib/uang-keluar";

export type UangDinasActionResult = { success: boolean; message: string; id?: string };

export type UangDinasItem = {
  id: string;
  nomor: string;
  karyawanId: string;
  karyawanNama: string;
  dinasNomor: string;
  nominalMuka: string;
  status: string;
  selisih: string | null;
};

export type UangDinasDetail = UangDinasItem & {
  keperluan: string | null;
  tanggalSerah: string | null;
  totalRealisasi: string | null;
  lampiranLpjUrl: string | null;
  dikembalikan: string | null;
};

function isFinance(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN_HR" || role === "FINANCE";
}

async function resolveAktor(userId: string): Promise<{ role: string; karyawanId: string | null }> {
  if (!userId) return { role: "EMPLOYEE", karyawanId: null };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const karyawan = await prisma.karyawan.findFirst({ where: { userId }, select: { id: true } });
  return { role: user?.role ?? "EMPLOYEE", karyawanId: karyawan?.id ?? null };
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
}): UangDinasItem {
  const selisih =
    r.totalRealisasi === null || r.totalRealisasi === undefined
      ? null
      : String(hitungSelisihLpj(Number(r.nominalMuka), Number(r.totalRealisasi)));
  return {
    id: r.id,
    nomor: r.nomor,
    karyawanId: r.karyawanId,
    karyawanNama: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    dinasNomor: r.dinas.nomorPengajuan,
    nominalMuka: String(r.nominalMuka),
    status: r.status,
    selisih,
  };
}

export async function getUangDinasList(): Promise<UangDinasItem[]> {
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

export async function getUangDinasSaya(karyawanId: string): Promise<UangDinasItem[]> {
  const rows = await prisma.uangDinas.findMany({
    where: { karyawanId },
    orderBy: { createdAt: "desc" },
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
      dinas: { select: { nomorPengajuan: true } },
    },
  });
  return rows.map(toItem);
}

export async function getDinasApprovedOptions(karyawanId?: string): Promise<Array<{ value: string; label: string }>> {
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

export async function getUangDinasDetail(id: string, userId: string): Promise<(UangDinasDetail & { keperluan: string | null }) | null> {
  const aktor = await resolveAktor(userId);
  const r = await prisma.uangDinas.findUnique({
    where: { id },
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
      dinas: { select: { nomorPengajuan: true } },
    },
  });
  if (!r) return null;
  if (!isFinance(aktor.role) && aktor.karyawanId !== r.karyawanId) return null;
  const base = toItem(r);
  return {
    ...base,
    keperluan: r.keperluan,
    tanggalSerah: r.tanggalSerah?.toISOString().slice(0, 10) ?? null,
    totalRealisasi: r.totalRealisasi?.toString() ?? null,
    lampiranLpjUrl: r.lampiranLpjUrl,
    dikembalikan: r.dikembalikan?.toString() ?? null,
  };
}

export async function buatUangDinas(
  input: { dinasId: string; karyawanId: string; nominalMuka: number; keperluan: string },
  userId: string,
): Promise<UangDinasActionResult> {
  const aktor = await resolveAktor(userId);
  const dinas = await prisma.dinasWFH.findUnique({ where: { id: input.dinasId } });
  if (!dinas) return { success: false, message: "Dinas tidak ditemukan." };
  if (dinas.status !== "DISETUJUI") return { success: false, message: "Hanya dinas DISETUJUI." };
  const karyawanId = isFinance(aktor.role) && input.karyawanId ? input.karyawanId : aktor.karyawanId;
  if (!karyawanId || karyawanId !== dinas.karyawanId) {
    return { success: false, message: "Dinas bukan milik karyawan ini." };
  }
  if (!Number.isFinite(input.nominalMuka) || input.nominalMuka <= 0) {
    return { success: false, message: "Nominal muka harus lebih dari 0." };
  }
  const ada = await prisma.uangDinas.findUnique({ where: { dinasId: input.dinasId }, select: { id: true } });
  if (ada) return { success: false, message: "Dinas ini sudah punya uang muka." };

  const now = new Date();
  const created = await prisma.uangDinas.create({
    data: {
      nomor: await nomorUrut("UDM", now.getFullYear()),
      dinasId: input.dinasId,
      karyawanId,
      nominalMuka: Math.round(input.nominalMuka),
      keperluan: input.keperluan.trim() || null,
      createdById: userId,
    },
    select: { id: true },
  });
  revalidatePath("/payroll/uang-dinas");
  return { success: true, message: "Draf uang muka tersimpan.", id: created.id };
}

export async function ajukanUangDinas(id: string, userId: string): Promise<UangDinasActionResult> {
  const aktor = await resolveAktor(userId);
  const row = await prisma.uangDinas.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!isFinance(aktor.role) && aktor.karyawanId !== row.karyawanId) {
    return { success: false, message: "Akses ditolak." };
  }
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
  await mulaiAlurApproval("UANGDINAS", id);
  revalidatePath("/payroll/uang-dinas");
  revalidatePath("/approval");
  return { success: true, message: "Dikirim ke atasan → HR." };
}

export async function batalkanUangDinas(id: string, userId: string): Promise<UangDinasActionResult> {
  const aktor = await resolveAktor(userId);
  const row = await prisma.uangDinas.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!isFinance(aktor.role) && aktor.karyawanId !== row.karyawanId) {
    return { success: false, message: "Akses ditolak." };
  }
  if (!["DRAFT", "DIAJUKAN"].includes(row.status)) {
    return { success: false, message: "Status ini tidak bisa dibatalkan." };
  }
  await prisma.$transaction([
    prisma.uangDinas.update({ where: { id }, data: { status: "DIBATALKAN" } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "UANGDINAS", referensiId: id } }),
  ]);
  revalidatePath("/payroll/uang-dinas");
  return { success: true, message: "Dibatalkan." };
}

export async function hapusUangDinas(id: string, userId: string): Promise<UangDinasActionResult> {
  const aktor = await resolveAktor(userId);
  if (!isFinance(aktor.role)) return { success: false, message: "Hanya HR/Finance." };
  const row = await prisma.uangDinas.findUnique({ where: { id }, select: { status: true } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!["DRAFT", "DITOLAK", "DIBATALKAN"].includes(row.status)) {
    return { success: false, message: "Hanya draf/ditolak/dibatalkan yang bisa dihapus." };
  }
  await prisma.$transaction([
    prisma.uangDinas.delete({ where: { id } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "UANGDINAS", referensiId: id } }),
  ]);
  revalidatePath("/payroll/uang-dinas");
  return { success: true, message: "Dihapus." };
}

export async function catatSerah(id: string, userId: string): Promise<UangDinasActionResult> {
  const aktor = await resolveAktor(userId);
  if (!isFinance(aktor.role)) return { success: false, message: "Hanya HR/Finance." };
  const row = await prisma.uangDinas.findUnique({ where: { id }, select: { status: true } });
  if (!row || row.status !== "DISETUJUI") return { success: false, message: "Hanya yang DISETUJUI." };
  await prisma.uangDinas.update({ where: { id }, data: { tanggalSerah: toDbDate(new Date()) } });
  revalidatePath("/payroll/uang-dinas");
  return { success: true, message: "Serah uang dicatat." };
}

export async function ajukanLpj(
  id: string,
  input: { totalRealisasi: number; lampiranUrl: string },
  userId: string,
): Promise<UangDinasActionResult> {
  const aktor = await resolveAktor(userId);
  const row = await prisma.uangDinas.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!isFinance(aktor.role) && aktor.karyawanId !== row.karyawanId) {
    return { success: false, message: "Akses ditolak." };
  }
  if (row.status !== "DISETUJUI") return { success: false, message: "Hanya yang DISETUJUI bisa LPJ." };
  if (!Number.isFinite(input.totalRealisasi) || input.totalRealisasi < 0) {
    return { success: false, message: "Realisasi tidak valid." };
  }
  if (!input.lampiranUrl.trim()) return { success: false, message: "Bukti LPJ wajib dilampirkan." };
  await prisma.uangDinas.update({
    where: { id },
    data: {
      totalRealisasi: Math.round(input.totalRealisasi),
      lampiranLpjUrl: input.lampiranUrl.trim(),
      tanggalLpj: new Date(),
      status: "LPJ_DIAJUKAN",
    },
  });
  revalidatePath("/payroll/uang-dinas");
  return { success: true, message: "LPJ dikirim untuk verifikasi." };
}

export async function verifikasiLpj(
  id: string,
  input: { setuju: boolean; catatan: string; pilihanSisa: string },
  userId: string,
): Promise<UangDinasActionResult> {
  const aktor = await resolveAktor(userId);
  if (!isFinance(aktor.role)) return { success: false, message: "Hanya HR/Finance." };
  const row = await prisma.uangDinas.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.status !== "LPJ_DIAJUKAN" || row.totalRealisasi === null) {
    return { success: false, message: "Belum ada LPJ." };
  }
  if (!input.setuju) {
    await prisma.uangDinas.update({
      where: { id },
      data: { status: "DISETUJUI", totalRealisasi: null, lampiranLpjUrl: null, tanggalLpj: null },
    });
    revalidatePath("/payroll/uang-dinas");
    return { success: true, message: `LPJ ditolak, kembali: ${input.catatan || "-"}` };
  }

  const selisih = hitungSelisihLpj(Number(row.nominalMuka), Number(row.totalRealisasi));
  const kini = new Date();
  const awalBulan = new Date(Date.UTC(kini.getUTCFullYear(), kini.getUTCMonth(), 1));

  if (selisih > 0 && input.pilihanSisa === "POTONG_GAJI") {
    // Sisa dipotong gaji: jadikan kasbon tenor 1 yang langsung disetujui.
    await prisma.$transaction([
      prisma.kasbon.create({
        data: {
          nomor: await nomorUrut("KSB", kini.getUTCFullYear()),
          karyawanId: row.karyawanId,
          nominal: selisih,
          tenorBulan: 1,
          angsuranPerBulan: selisih,
          sisaHutang: selisih,
          mulaiPotong: awalBulan,
          alasan: `Sisa uang dinas ${row.nomor}`,
          status: "DISETUJUI",
          approvedById: userId,
          approvedAt: kini,
          createdById: userId,
        },
      }),
      prisma.uangDinas.update({
        where: { id },
        data: { status: "SELESAI", dikembalikan: 0 },
      }),
    ]);
    revalidatePath("/payroll/uang-dinas");
    revalidatePath("/payroll/kasbon");
    return { success: true, message: `Selesai. Sisa Rp${selisih.toLocaleString("id-ID")} dipotong gaji.` };
  }

  if (selisih < 0) {
    // Kurang: perusahaan menutup via reimbursement yang langsung disetujui.
    const kurang = -selisih;
    await prisma.$transaction([
      prisma.expenseClaim.create({
        data: {
          nomor: await nomorUrut("RMB", kini.getFullYear()),
          karyawanId: row.karyawanId,
          kategori: "DINAS",
          nominal: kurang,
          keterangan: `Kekurangan uang dinas ${row.nomor}`,
          lampiranUrl: row.lampiranLpjUrl,
          status: "DISETUJUI",
          diajukanPada: kini,
          approvedById: userId,
          approvedAt: kini,
          createdById: userId,
        },
      }),
      prisma.uangDinas.update({ where: { id }, data: { status: "SELESAI" } }),
    ]);
    revalidatePath("/payroll/uang-dinas");
    revalidatePath("/payroll/reimbursement");
    return { success: true, message: `Selesai. Kurang Rp${kurang.toLocaleString("id-ID")} jadi reimbursement.` };
  }

  await prisma.uangDinas.update({ where: { id }, data: { status: "SELESAI" } });
  revalidatePath("/payroll/uang-dinas");
  if (selisih === 0) return { success: true, message: "Selesai, pas." };
  return { success: true, message: `Selesai. Sisa Rp${selisih.toLocaleString("id-ID")} — catat pengembaliannya via tombol Kembali.` };
}

export async function catatKembali(id: string, userId: string): Promise<UangDinasActionResult> {
  const aktor = await resolveAktor(userId);
  if (!isFinance(aktor.role)) return { success: false, message: "Hanya HR/Finance." };
  const row = await prisma.uangDinas.findUnique({ where: { id } });
  if (!row || row.status !== "SELESAI" || row.totalRealisasi === null) {
    return { success: false, message: "Tidak ada sisa untuk dicatat." };
  }
  const selisih = hitungSelisihLpj(Number(row.nominalMuka), Number(row.totalRealisasi));
  if (selisih <= 0) return { success: false, message: "Tidak ada sisa." };
  if (row.dikembalikan !== null) return { success: false, message: "Sudah dicatat." };
  await prisma.uangDinas.update({ where: { id }, data: { dikembalikan: selisih } });
  revalidatePath("/payroll/uang-dinas");
  return { success: true, message: `Pengembalian Rp${selisih.toLocaleString("id-ID")} dicatat.` };
}
