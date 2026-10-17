"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { nextSerialNumber } from "@/src/lib/numbering";
import { getExpiringContracts } from "./employee.actions";
import { nextContractStart, validateExtension } from "@/src/modules/employee/lib/kontrak";

export type KontrakActionResult = { success: boolean; message: string; id?: string };

export type KontrakTandaTanganItem = {
  party: string;
  signerName: string | null;
  fileUrl: string;
  signedAt: string;
};

export type KontrakDetailView = {
  id: string;
  contractNumber: string;
  employeeId: string;
  employeeName: string;
  contractType: string;
  startDate: string;
  endDate: string | null;
  status: string;
  baseSalary: string | null;
  note: string | null;
  signatures: KontrakTandaTanganItem[];
};

async function requireHr(userId: string): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_HR";
}

export async function getContractsExpiringSoon() {
  return getExpiringContracts(60);
}

/**
 * Perpanjangan massal append-only: kontrak lama → BERAKHIR,
 * kontrak baru AKTIF bernomor otomatis mulai sehari sesudahnya.
 */
export async function extendContractsBatch(
  input: {
    contractIds: string[];
    endDate: string;
    contractType: string;
    baseSalary: string;
    note: string;
  },
  userId: string,
): Promise<KontrakActionResult> {
  if (!(await requireHr(userId))) return { success: false, message: "Hanya HR." };
  if (input.contractIds.length === 0) return { success: false, message: "Pilih minimal satu kontrak." };
  if (input.contractIds.length > 100) return { success: false, message: "Maksimal 100 kontrak per batch." };
  const basePay = input.baseSalary.trim() === "" ? null : Number(input.baseSalary);
  if (basePay !== null && (!Number.isFinite(basePay) || basePay < 0)) {
    return { success: false, message: "Gaji pokok tidak valid." };
  }

  const rows = await prisma.kontrakKerja.findMany({
    where: { id: { in: input.contractIds } },
    select: { id: true, karyawanId: true, tanggalSelesai: true, status: true, gajiPokok: true, nomorKontrak: true },
  });
  if (rows.length !== input.contractIds.length) {
    return { success: false, message: "Sebagian kontrak tidak ditemukan." };
  }
  for (const r of rows) {
    if (!["AKTIF", "AKAN_BERAKHIR"].includes(r.status)) {
      return { success: false, message: `Kontrak ${r.nomorKontrak} tidak aktif.` };
    }
    const err = validateExtension({ oldEndDate: r.tanggalSelesai, newEndDate: input.endDate });
    if (err) return { success: false, message: `${r.nomorKontrak}: ${err}` };
  }

  const tahun = new Date(input.endDate).getUTCFullYear();
  let created = 0;
  for (const r of rows) {
    const start = nextContractStart(r.tanggalSelesai);
    await prisma.$transaction([
      prisma.kontrakKerja.update({ where: { id: r.id }, data: { status: "BERAKHIR" } }),
      prisma.kontrakKerja.create({
        data: {
          karyawanId: r.karyawanId,
          nomorKontrak: await nextSerialNumber("KTR", tahun),
          jenisKontrak: (input.contractType || "PKWT") as never,
          tanggalMulai: start,
          tanggalSelesai: toDbDate(input.endDate),
          status: "AKTIF",
          gajiPokok: basePay ?? (r.gajiPokok ? Number(r.gajiPokok) : null),
          catatan: input.note.trim() ? `Perpanjangan dari ${r.nomorKontrak}. ${input.note.trim()}` : `Perpanjangan dari ${r.nomorKontrak}.`,
        },
      }),
    ]);
    created++;
  }

  revalidatePath("/employees/kontrak");
  revalidatePath("/employees");
  return { success: true, message: `${created} kontrak diperpanjang.` };
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
    contractNumber: r.nomorKontrak,
    employeeId: r.karyawan.id,
    employeeName: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    contractType: r.jenisKontrak,
    startDate: r.tanggalMulai.toISOString().slice(0, 10),
    endDate: r.tanggalSelesai?.toISOString().slice(0, 10) ?? null,
    status: r.status,
    baseSalary: r.gajiPokok?.toString() ?? null,
    note: r.catatan,
    signatures: r.tandaTangan.map((t) => ({
      party: t.pihak,
      signerName: t.namaPenanda,
      fileUrl: t.fileUrl,
      signedAt: t.ditandatanganiPada.toISOString(),
    })),
  };
}

const VALID_PARTIES = ["HRD", "KARYAWAN"];

export async function addSignature(
  input: { contractId: string; party: string; signerName: string; fileUrl: string },
  userId: string,
): Promise<KontrakActionResult> {
  if (!(await requireHr(userId))) return { success: false, message: "Hanya HR." };
  if (!VALID_PARTIES.includes(input.party)) return { success: false, message: "Pihak tidak valid." };
  if (!input.fileUrl.trim()) return { success: false, message: "File tanda tangan wajib ada." };
  const kontrak = await prisma.kontrakKerja.findUnique({ where: { id: input.contractId }, select: { id: true } });
  if (!kontrak) return { success: false, message: "Kontrak tidak ditemukan." };
  await prisma.kontrakTandaTangan.upsert({
    where: { kontrakId_pihak: { kontrakId: input.contractId, pihak: input.party as never } },
    create: {
      kontrakId: input.contractId,
      pihak: input.party as never,
      namaPenanda: input.signerName.trim() || null,
      fileUrl: input.fileUrl.trim(),
      createdById: userId,
    },
    update: {
      namaPenanda: input.signerName.trim() || null,
      fileUrl: input.fileUrl.trim(),
      ditandatanganiPada: new Date(),
      createdById: userId,
    },
  });
  revalidatePath("/employees/kontrak");
  return { success: true, message: `Tanda tangan ${input.party} tersimpan.` };
}

export async function deleteSignature(contractId: string, party: string, userId: string): Promise<KontrakActionResult> {
  if (!(await requireHr(userId))) return { success: false, message: "Hanya HR." };
  await prisma.kontrakTandaTangan.deleteMany({ where: { kontrakId: contractId, pihak: party as never } });
  revalidatePath("/employees/kontrak");
  return { success: true, message: "Tanda tangan dihapus." };
}
