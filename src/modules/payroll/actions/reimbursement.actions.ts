"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { nomorUrut } from "@/src/lib/numbering";
import { mulaiAlurApproval } from "@/src/modules/approval/lib/approval-engine";
import { KATEGORI_REIMBURSE, cekPlafon, kunciPlafon, parsePlafon } from "@/src/modules/payroll/lib/uang-keluar";

export type ReimburseActionResult = { success: boolean; message: string; id?: string };

/** Revalidate best-effort: di luar konteks request (E2E/CLI) Next melempar — abaikan. */
function segarkan(path: string): void {
	try {
		revalidatePath(path);
	} catch {
		// abaikan — hygiene cache, bukan logika inti
	}
}

export type ReimburseItem = {
  id: string;
  nomor: string;
  karyawanId: string;
  karyawanNama: string;
  kategori: string;
  nominal: string;
  keterangan: string;
  status: string;
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

export async function getPlafonList(): Promise<Array<{ kategori: string; nilai: string }>> {
  const rows = await prisma.payrollSetting.findMany({
    where: { kunci: { in: KATEGORI_REIMBURSE.map(kunciPlafon) } },
    select: { kunci: true, nilai: true },
  });
  const map = new Map(rows.map((r) => [r.kunci, r.nilai]));
  return KATEGORI_REIMBURSE.map((k) => ({ kategori: k, nilai: map.get(kunciPlafon(k)) ?? "" }));
}

export async function savePlafon(input: Record<string, string>, userId: string): Promise<ReimburseActionResult> {
  const aktor = await resolveAktor(userId);
  if (!isFinance(aktor.role)) return { success: false, message: "Hanya HR/Finance." };
  for (const k of KATEGORI_REIMBURSE) {
    const raw = (input[k] ?? "").trim();
    if (raw !== "" && parsePlafon(raw) === null) {
      return { success: false, message: `Plafon ${k} tidak valid.` };
    }
  }
  await prisma.$transaction(
    KATEGORI_REIMBURSE.map((k) =>
      prisma.payrollSetting.upsert({
        where: { kunci: kunciPlafon(k) },
        create: { kunci: kunciPlafon(k), nilai: (input[k] ?? "").trim(), deskripsi: `Plafon reimbursement ${k} (Rp). Kosong = tanpa batas.` },
        update: { nilai: (input[k] ?? "").trim() },
      }),
    ),
  );
  segarkan("/payroll/reimbursement");
  return { success: true, message: "Plafon tersimpan." };
}

async function plafonUntuk(kategori: string): Promise<number | null> {
  const row = await prisma.payrollSetting.findUnique({
    where: { kunci: kunciPlafon(kategori) },
    select: { nilai: true },
  });
  return parsePlafon(row?.nilai ?? "");
}

export async function getReimburseList(): Promise<ReimburseItem[]> {
  const rows = await prisma.expenseClaim.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows.map(toItem);
}

export async function getReimburseSaya(karyawanId: string): Promise<ReimburseItem[]> {
  const rows = await prisma.expenseClaim.findMany({
    where: { karyawanId },
    orderBy: { createdAt: "desc" },
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows.map(toItem);
}

function toItem(r: {
  id: string;
  nomor: string;
  karyawanId: string;
  karyawan: { namaLengkap: string; nomorKaryawan: string };
  kategori: string;
  nominal: unknown;
  keterangan: string;
  status: string;
}): ReimburseItem {
  return {
    id: r.id,
    nomor: r.nomor,
    karyawanId: r.karyawanId,
    karyawanNama: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    kategori: r.kategori,
    nominal: String(r.nominal),
    keterangan: r.keterangan,
    status: r.status,
  };
}

export async function buatReimburse(
  input: {
    karyawanId: string;
    kategori: string;
    tanggalKwitansi: string;
    nominal: number;
    keterangan: string;
    lampiranUrl: string;
  },
  userId: string,
): Promise<ReimburseActionResult> {
  const aktor = await resolveAktor(userId);
  const karyawanId = isFinance(aktor.role) && input.karyawanId ? input.karyawanId : aktor.karyawanId;
  if (!karyawanId) return { success: false, message: "Karyawan tidak ditemukan." };
  if (!(KATEGORI_REIMBURSE as readonly string[]).includes(input.kategori)) {
    return { success: false, message: "Kategori tidak valid." };
  }
  if (!input.lampiranUrl.trim()) return { success: false, message: "Foto/struk wajib dilampirkan." };
  if (!input.keterangan.trim()) return { success: false, message: "Keterangan wajib diisi." };
  const karyawan = await prisma.karyawan.findUnique({ where: { id: karyawanId }, select: { status: true } });
  if (!karyawan || !["AKTIF", "PROBASI"].includes(karyawan.status)) {
    return { success: false, message: "Karyawan tidak aktif." };
  }
  const err = cekPlafon(input.nominal, await plafonUntuk(input.kategori));
  if (err) return { success: false, message: err };

  const now = new Date();
  const created = await prisma.expenseClaim.create({
    data: {
      nomor: await nomorUrut("RMB", now.getFullYear()),
      karyawanId,
      kategori: input.kategori as never,
      tanggalKwitansi: input.tanggalKwitansi ? toDbDate(input.tanggalKwitansi) : null,
      nominal: Math.round(input.nominal),
      keterangan: input.keterangan.trim(),
      lampiranUrl: input.lampiranUrl.trim(),
      createdById: userId,
    },
    select: { id: true },
  });
  segarkan("/payroll/reimbursement");
  segarkan("/account/reimbursement");
  return { success: true, message: "Draf klaim tersimpan.", id: created.id };
}

export async function ajukanReimburse(id: string, userId: string): Promise<ReimburseActionResult> {
  const aktor = await resolveAktor(userId);
  const row = await prisma.expenseClaim.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!isFinance(aktor.role) && aktor.karyawanId !== row.karyawanId) {
    return { success: false, message: "Akses ditolak." };
  }
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
  await mulaiAlurApproval("REIMBURSE", id);
  segarkan("/payroll/reimbursement");
  segarkan("/approval");
  return { success: true, message: "Dikirim ke atasan → HR." };
}

export async function batalkanReimburse(id: string, userId: string): Promise<ReimburseActionResult> {
  const aktor = await resolveAktor(userId);
  const row = await prisma.expenseClaim.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (!isFinance(aktor.role) && aktor.karyawanId !== row.karyawanId) {
    return { success: false, message: "Akses ditolak." };
  }
  if (!["DRAFT", "DIAJUKAN"].includes(row.status)) {
    return { success: false, message: "Status ini tidak bisa dibatalkan." };
  }
  await prisma.$transaction([
    prisma.expenseClaim.update({ where: { id }, data: { status: "DIBATALKAN" } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "REIMBURSE", referensiId: id } }),
  ]);
  segarkan("/payroll/reimbursement");
  return { success: true, message: "Klaim dibatalkan." };
}

export async function hapusReimburse(id: string, userId: string): Promise<ReimburseActionResult> {
  const aktor = await resolveAktor(userId);
  if (!isFinance(aktor.role)) return { success: false, message: "Hanya HR/Finance." };
  const row = await prisma.expenseClaim.findUnique({
    where: { id },
    select: { status: true, pembayaran: { select: { id: true } } },
  });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.pembayaran.length > 0) return { success: false, message: "Sudah ada pembayaran." };
  if (!["DRAFT", "DITOLAK", "DIBATALKAN"].includes(row.status)) {
    return { success: false, message: "Hanya draf/ditolak/dibatalkan yang bisa dihapus." };
  }
  await prisma.$transaction([
    prisma.expenseClaim.delete({ where: { id } }),
    prisma.approvalStep.deleteMany({ where: { referensiType: "REIMBURSE", referensiId: id } }),
  ]);
  segarkan("/payroll/reimbursement");
  return { success: true, message: "Klaim dihapus." };
}

/** Bayar tunai/transfer manual (di luar payroll). */
export async function bayarTunai(
  id: string,
  input: { bukti: string },
  userId: string,
): Promise<ReimburseActionResult> {
  const aktor = await resolveAktor(userId);
  if (!isFinance(aktor.role)) return { success: false, message: "Hanya HR/Finance." };
  const row = await prisma.expenseClaim.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Data tidak ditemukan." };
  if (row.status !== "DISETUJUI") return { success: false, message: "Hanya yang DISETUJUI yang bisa dibayar." };
  await prisma.$transaction([
    prisma.expensePembayaran.create({
      data: { claimId: id, runId: null, metode: "TUNAI", jumlah: row.nominal, bukti: input.bukti.trim() || null, createdById: userId },
    }),
    prisma.expenseClaim.update({
      where: { id },
      data: { status: "DIBAYAR", dibayarPada: new Date(), dibayarVia: "TUNAI" },
    }),
  ]);
  segarkan("/payroll/reimbursement");
  return { success: true, message: "Dibayar tunai." };
}
