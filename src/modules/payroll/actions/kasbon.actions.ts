"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { getPengaturanPayroll } from "../lib/calculate";
import {
  KASBON_SETTING_DEFAULT,
  KASBON_SETTING_DESKRIPSI,
  KUNCI_KASBON_MAX_NOMINAL,
  KUNCI_KASBON_MAX_TENOR,
  hitungAngsuranKasbon,
  parseMaxNominalKasbon,
  validasiKasbon,
} from "../lib/kasbon";

export type KasbonActionResult = { success: boolean; message: string; id?: string };

/** Revalidate best-effort: di luar konteks request (E2E/CLI) Next melempar — abaikan. */
function segarkan(path: string): void {
	try {
		revalidatePath(path);
	} catch {
		// abaikan — hygiene cache, bukan logika inti
	}
}

export type KasbonItem = {
  id: string;
  nomor: string;
  karyawanId: string;
  karyawanNama: string;
  nominal: string;
  tenorBulan: number;
  angsuranPerBulan: string;
  sisaHutang: string;
  mulaiPotong: string;
  alasan: string;
  status: string;
  angsuranKe: number;
  catatan: string | null;
};

function toItem(r: {
  id: string;
  nomor: string;
  karyawanId: string;
  karyawan: { namaLengkap: string; nomorKaryawan: string };
  nominal: unknown;
  tenorBulan: number;
  angsuranPerBulan: unknown;
  sisaHutang: unknown;
  mulaiPotong: Date;
  alasan: string;
  status: string;
  catatan: string | null;
  _count: { angsuran: number };
}): KasbonItem {
  return {
    id: r.id,
    nomor: r.nomor,
    karyawanId: r.karyawanId,
    karyawanNama: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    nominal: String(r.nominal),
    tenorBulan: r.tenorBulan,
    angsuranPerBulan: String(r.angsuranPerBulan),
    sisaHutang: String(r.sisaHutang),
    mulaiPotong: r.mulaiPotong.toISOString().slice(0, 10),
    alasan: r.alasan,
    status: r.status,
    angsuranKe: r._count.angsuran,
    catatan: r.catatan,
  };
}

const kasbonInclude = {
  karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
  _count: { select: { angsuran: true } },
} as const;

export async function getKasbonList(): Promise<KasbonItem[]> {
  const rows = await prisma.kasbon.findMany({
    orderBy: { createdAt: "desc" },
    include: kasbonInclude,
  });
  return rows.map(toItem);
}

export async function getKasbonSaya(karyawanId: string): Promise<KasbonItem[]> {
  const rows = await prisma.kasbon.findMany({
    where: { karyawanId },
    orderBy: { createdAt: "desc" },
    include: kasbonInclude,
  });
  return rows.map(toItem);
}

async function batasKasbon(): Promise<{ maxNominal: number | null; maxTenor: number }> {
  const map = await getPengaturanPayroll();
  return {
    maxNominal: parseMaxNominalKasbon(map[KUNCI_KASBON_MAX_NOMINAL] ?? KASBON_SETTING_DEFAULT[KUNCI_KASBON_MAX_NOMINAL]),
    maxTenor: Math.floor(Number(map[KUNCI_KASBON_MAX_TENOR] ?? KASBON_SETTING_DEFAULT[KUNCI_KASBON_MAX_TENOR])) || 24,
  };
}

export async function buatKasbon(
  input: {
    karyawanId: string;
    nominal: number;
    tenorBulan: number;
    mulaiPotong: string;
    alasan: string;
  },
  createdById?: string,
): Promise<KasbonActionResult> {
  const karyawan = await prisma.karyawan.findUnique({
    where: { id: input.karyawanId },
    select: { id: true, status: true },
  });
  if (!karyawan) return { success: false, message: "Karyawan tidak ditemukan." };
  if (!["AKTIF", "PROBASI"].includes(karyawan.status)) {
    return { success: false, message: "Hanya karyawan aktif/probasi yang bisa berkasbon." };
  }
  const { maxNominal, maxTenor } = await batasKasbon();
  const err = validasiKasbon({ nominal: input.nominal, tenorBulan: Math.floor(input.tenorBulan), maxNominal, maxTenor });
  if (err) return { success: false, message: err };
  if (!input.alasan.trim()) return { success: false, message: "Alasan wajib diisi." };
  const tgl = toDbDate(input.mulaiPotong);
  if (Number.isNaN(tgl.getTime())) return { success: false, message: "Tanggal mulai potong tidak valid." };

  const nominal = Math.round(input.nominal);
  const tenor = Math.floor(input.tenorBulan);
  const created = await prisma.kasbon.create({
    data: {
      nomor: `KSB-${tgl.getUTCFullYear()}-${input.karyawanId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      karyawanId: input.karyawanId,
      nominal,
      tenorBulan: tenor,
      angsuranPerBulan: hitungAngsuranKasbon(nominal, tenor),
      sisaHutang: nominal,
      mulaiPotong: tgl,
      alasan: input.alasan.trim(),
      createdById,
    },
  });
  segarkan("/payroll/kasbon");
  return { success: true, message: `Draf kasbon ${created.nomor} tersimpan.`, id: created.id };
}

export async function ajukanKasbon(id: string, karyawanId?: string): Promise<KasbonActionResult> {
  const row = await prisma.kasbon.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Kasbon tidak ditemukan." };
  if (karyawanId && row.karyawanId !== karyawanId) return { success: false, message: "Bukan milik Anda." };
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
  await prisma.kasbon.update({ where: { id }, data: { status: "DIAJUKAN" } });
  segarkan("/payroll/kasbon");
  return { success: true, message: "Kasbon diajukan ke Finance." };
}

export async function setujuiKasbon(id: string, approverId?: string): Promise<KasbonActionResult> {
  const row = await prisma.kasbon.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Kasbon tidak ditemukan." };
  if (row.status !== "DIAJUKAN") return { success: false, message: "Hanya pengajuan DIAJUKAN yang bisa disetujui." };
  await prisma.kasbon.update({
    where: { id },
    data: { status: "DISETUJUI", approvedById: approverId ?? null, approvedAt: new Date() },
  });
  segarkan("/payroll/kasbon");
  return { success: true, message: `Kasbon ${row.nomor} disetujui, dicicil otomatis tiap salary run.` };
}

export async function tolakKasbon(id: string, catatan: string, approverId?: string): Promise<KasbonActionResult> {
  const row = await prisma.kasbon.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Kasbon tidak ditemukan." };
  if (row.status !== "DIAJUKAN") return { success: false, message: "Hanya pengajuan DIAJUKAN yang bisa ditolak." };
  await prisma.kasbon.update({
    where: { id },
    data: { status: "DITOLAK", catatan: catatan.trim() || null, approvedById: approverId ?? null, approvedAt: new Date() },
  });
  segarkan("/payroll/kasbon");
  return { success: true, message: "Kasbon ditolak." };
}

export async function batalkanKasbon(id: string, karyawanId?: string): Promise<KasbonActionResult> {
  const row = await prisma.kasbon.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Kasbon tidak ditemukan." };
  if (karyawanId && row.karyawanId !== karyawanId) return { success: false, message: "Bukan milik Anda." };
  if (!["DRAFT", "DIAJUKAN"].includes(row.status)) {
    return { success: false, message: "Kasbon yang sudah disetujui tidak bisa dibatalkan." };
  }
  await prisma.kasbon.update({ where: { id }, data: { status: "DIBATALKAN" } });
  segarkan("/payroll/kasbon");
  return { success: true, message: "Kasbon dibatalkan." };
}

export async function hapusKasbon(id: string): Promise<KasbonActionResult> {
  const row = await prisma.kasbon.findUnique({ where: { id }, include: { _count: { select: { angsuran: true } } } });
  if (!row) return { success: false, message: "Kasbon tidak ditemukan." };
  if (row._count.angsuran > 0 || row.status === "DISETUJUI" || row.status === "LUNAS") {
    return { success: false, message: "Kasbon yang sudah berjalan tidak bisa dihapus." };
  }
  await prisma.kasbon.delete({ where: { id } });
  segarkan("/payroll/kasbon");
  return { success: true, message: "Kasbon dihapus." };
}
