"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { LETTER_TYPES, listPlaceholders, formatLetterNumber, renderLetter } from "@/src/modules/employee/lib/surat";
import { getTransferTypeLabel } from "@/src/modules/employee/lib/mutasi";

export type SuratActionResult = { success: boolean; message: string; id?: string };

export type LetterTemplateItem = {
  id: string;
  code: string;
  name: string;
  title: string;
  isActive: boolean;
};

export type OutgoingLetterItem = {
  id: string;
  number: string;
  kind: string;
  employeeName: string | null;
  createdAt: string;
};

async function requireHr(userId: string): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_HR";
}

const DEFAULT_TEMPLATES: Array<{ kode: string; nama: string; judul: string; badan: string }> = [
  {
    kode: "MUTASI",
    nama: "Keputusan Mutasi / Promosi",
    judul: "Surat Keputusan Mutasi",
    badan:
      "Berdasarkan persetujuan atasan langsung dan HR, terhitung {{efektif}} {{nama}} ({{nomorKaryawan}}) {{jenis}} dari {{dari}} menjadi {{ke}}. {{alasan}} Segala ketentuan pada penempatan baru berlaku sejak tanggal efektif. Ref: {{nomorRef}}.",
  },
  {
    kode: "PAKLARING",
    nama: "Paklaring",
    judul: "Surat Keterangan Kerja (Paklaring)",
    badan:
      "Menerangkan {{nama}} ({{nomorKaryawan}}), terakhir {{posisi}}, masa kerja {{masuk}} s/d {{resign}}, telah bekerja dengan baik tanpa tanggungan administrasi. Surat dibuat untuk dipergunakan sebagaimana mestinya.",
  },
  {
    kode: "SP",
    nama: "Peringatan / PHK",
    judul: "Surat Peringatan",
    badan:
      "Berdasarkan pelanggaran disiplin kerja, diberikan {{tingkat}} kepada {{nama}} ({{nomorKaryawan}}): {{pelanggaran}}. Berlaku {{terbit}}{{berlaku}}.",
  },
  {
    kode: "KETERANGAN",
    nama: "Keterangan Kerja",
    judul: "Surat Keterangan Kerja",
    badan:
      "Menerangkan {{nama}} ({{nomorKaryawan}}), {{posisi}}, adalah karyawan aktif perusahaan. Surat dibuat untuk keperluan: {{keperluan}}. Dikeluarkan {{tanggal}}.",
  },
];

export async function getTemplates(): Promise<LetterTemplateItem[]> {
  const rows = await prisma.suratTemplate.findMany({ orderBy: { kode: "asc" } });
  return rows.map((r) => ({ id: r.id, code: r.kode, name: r.nama, title: r.judul, isActive: r.isActive }));
}

export async function getTemplateDetail(id: string): Promise<{ id: string; code: string; name: string; title: string; body: string; isActive: boolean } | null> {
  const r = await prisma.suratTemplate.findUnique({ where: { id } });
  return r ? { id: r.id, code: r.kode, name: r.nama, title: r.judul, body: r.badan, isActive: r.isActive } : null;
}

export async function saveTemplate(
  input: { id?: string; code: string; name: string; title: string; body: string; isActive: boolean },
  userId: string,
): Promise<SuratActionResult> {
  if (!(await requireHr(userId))) return { success: false, message: "Hanya HR." };
  if (!input.name.trim() || !input.title.trim() || !input.body.trim()) {
    return { success: false, message: "Nama, judul, dan badan wajib diisi." };
  }
  const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
  if (!code) return { success: false, message: "Kode tidak valid." };
  if (input.id) {
    await prisma.suratTemplate.update({
      where: { id: input.id },
      data: { nama: input.name.trim(), judul: input.title.trim(), badan: input.body, isActive: input.isActive },
    });
  } else {
    const exists = await prisma.suratTemplate.findUnique({ where: { kode: code }, select: { id: true } });
    if (exists) return { success: false, message: "Kode sudah dipakai." };
    await prisma.suratTemplate.create({
      data: { kode: code, nama: input.name.trim(), judul: input.title.trim(), badan: input.body, isActive: input.isActive },
    });
  }
  revalidatePath("/settings/surat");
  return { success: true, message: "Template tersimpan." };
}

export async function deleteTemplate(id: string, userId: string): Promise<SuratActionResult> {
  if (!(await requireHr(userId))) return { success: false, message: "Hanya HR." };
  const inUse = await prisma.suratKeluar.count({ where: { templateId: id } });
  if (inUse > 0) return { success: false, message: "Template sudah dipakai surat terbit." };
  await prisma.suratTemplate.delete({ where: { id } });
  revalidatePath("/settings/surat");
  return { success: true, message: "Template dihapus." };
}

export async function seedDefaultTemplates(userId: string): Promise<SuratActionResult> {
  if (!(await requireHr(userId))) return { success: false, message: "Hanya HR." };
  let created = 0;
  for (const t of DEFAULT_TEMPLATES) {
    const exists = await prisma.suratTemplate.findUnique({ where: { kode: t.kode }, select: { id: true } });
    if (exists) continue;
    await prisma.suratTemplate.create({ data: { ...t } });
    created++;
  }
  revalidatePath("/settings/surat");
  return { success: true, message: created > 0 ? `${created} template dibuat.` : "Template sudah lengkap." };
}

async function nextLetterSequence(kode: string, tahun: number): Promise<number> {
  const kunci = `SURAT.${kode}.${tahun}`;
  const rows = await prisma.$queryRaw<Array<{ terakhir: number }>>`
    INSERT INTO "penomoran" ("id", "kunci", "terakhir", "updatedAt")
    VALUES (md5(random()::text || clock_timestamp()::text), ${kunci}, 1, NOW())
    ON CONFLICT ("kunci") DO UPDATE SET "terakhir" = "penomoran"."terakhir" + 1, "updatedAt" = NOW()
    RETURNING "terakhir"`;
  return rows[0]?.terakhir ?? 1;
}

function summarize(unit: string | null, posisi: string | null, lokasi: string | null): string {
  return [posisi, unit, lokasi].filter(Boolean).join(" • ") || "-";
}

const formatDateOnly = (d: Date) => d.toISOString().slice(0, 10);

/** Variabel otomatis dari data referensi. */
export async function automaticVars(
  kind: string,
  referenceId: string,
  extras: Record<string, string>,
): Promise<{ employeeId: string | null; vars: Record<string, string> } | { error: string }> {
  if (kind === "MUT") {
    const r = await prisma.mutasi.findUnique({
      where: { id: referenceId },
      include: {
        karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
        keUnit: { select: { nama: true } },
        kePosisi: { select: { nama: true } },
        keLokasi: { select: { nama: true } },
      },
    });
    if (!r) return { error: "Data mutasi tidak ditemukan." };
    return {
      employeeId: r.karyawanId,
      vars: {
        nama: r.karyawan.namaLengkap,
        nomorKaryawan: r.karyawan.nomorKaryawan,
        jenis: getTransferTypeLabel(r.jenis).toLowerCase(),
        dari: summarize(r.dariUnitNama, r.dariPosisiNama, r.dariLokasiNama),
        ke: summarize(r.keUnit?.nama ?? null, r.kePosisi?.nama ?? null, r.keLokasi?.nama ?? null),
        efektif: formatDateOnly(r.tanggalEfektif),
        alasan: r.alasan,
        nomorRef: r.nomor,
        ...extras,
      },
    };
  }
  if (kind === "PAK") {
    const r = await prisma.offboarding.findUnique({
      where: { id: referenceId },
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
    if (!r || r.status !== "SELESAI" || !r.tanggalEfektif) return { error: "Offboarding belum selesai." };
    const p = r.karyawan.posisiKaryawan[0];
    return {
      employeeId: r.karyawanId,
      vars: {
        nama: r.karyawan.namaLengkap,
        nomorKaryawan: r.karyawan.nomorKaryawan,
        posisi: summarize(p?.unitOrganisasi?.nama ?? null, p?.posisi?.nama ?? null, null),
        masuk: formatDateOnly(r.karyawan.tanggalMasuk),
        resign: formatDateOnly(r.tanggalEfektif),
        ...extras,
      },
    };
  }
  if (kind === "SP") {
    const r = await prisma.suratPeringatan.findUnique({
      where: { id: referenceId },
      include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
    });
    if (!r || r.status === "DRAFT") return { error: "Surat peringatan belum terbit." };
    return {
      employeeId: r.karyawanId,
      vars: {
        nama: r.karyawan.namaLengkap,
        nomorKaryawan: r.karyawan.nomorKaryawan,
        tingkat: r.tingkat,
        pelanggaran: r.pelanggaran,
        terbit: formatDateOnly(r.tanggalTerbit),
        berlaku: r.berlakuSampai ? ` s/d ${formatDateOnly(r.berlakuSampai)}` : "",
        ...extras,
      },
    };
  }
  return { error: "Jenis tidak dikenal." };
}

export async function publishLetter(
  input: { kind: string; referenceId: string; employeeId: string; purpose: string; templateId: string },
  userId: string,
): Promise<SuratActionResult> {
  if (!(await requireHr(userId))) return { success: false, message: "Hanya HR." };
  const letterType = LETTER_TYPES.find((j) => j.code === input.kind);
  if (!letterType) return { success: false, message: "Jenis tidak valid." };
  const template = await prisma.suratTemplate.findUnique({ where: { id: input.templateId } });
  if (!template || !template.isActive) return { success: false, message: "Template tidak tersedia." };

  let employeeId: string | null = null;
  let vars: Record<string, string> = {};
  if (letterType.needsRef) {
    if (!input.referenceId) return { success: false, message: "Referensi wajib dipilih." };
    const result = await automaticVars(input.kind, input.referenceId, {});
    if ("error" in result) return { success: false, message: result.error };
    employeeId = result.employeeId;
    vars = result.vars;
  } else {
    if (!input.employeeId) return { success: false, message: "Karyawan wajib dipilih." };
    const k = await prisma.karyawan.findUnique({
      where: { id: input.employeeId },
      select: {
        namaLengkap: true,
        nomorKaryawan: true,
        posisiKaryawan: {
          where: { isCurrent: true },
          take: 1,
          select: { posisi: { select: { nama: true } }, unitOrganisasi: { select: { nama: true } } },
        },
      },
    });
    if (!k) return { success: false, message: "Karyawan tidak ditemukan." };
    if (!input.purpose.trim()) return { success: false, message: "Keperluan wajib diisi." };
    const p = k.posisiKaryawan[0];
    employeeId = input.employeeId;
    vars = {
      nama: k.namaLengkap,
      nomorKaryawan: k.nomorKaryawan,
      posisi: summarize(p?.unitOrganisasi?.nama ?? null, p?.posisi?.nama ?? null, null),
      keperluan: input.purpose.trim(),
      tanggal: new Date().toISOString().slice(0, 10),
    };
  }

  const now = new Date();
  for (let attempt = 0; attempt < 3; attempt++) {
    const number = formatLetterNumber(await nextLetterSequence(input.kind, now.getFullYear()), input.kind, now);
    try {
      const created = await prisma.suratKeluar.create({
        data: {
          nomor: number,
          kodeVerifikasi: randomBytes(12).toString("hex").toUpperCase(),
          templateId: template.id,
          jenis: input.kind,
          referensiType: letterType.needsRef ? input.kind : null,
          referensiId: letterType.needsRef ? input.referenceId : null,
          karyawanId: employeeId,
          vars: { ...vars, nomor: number },
          createdById: userId,
        },
        select: { id: true },
      });
      revalidatePath("/employees/surat");
      return { success: true, message: `Surat ${number} terbit.`, id: created.id };
    } catch {
      // Nomor bentrok (sangat jarang) → coba sequence berikutnya.
    }
  }
  return { success: false, message: "Gagal menerbitkan nomor." };
}

export async function listLetters(): Promise<OutgoingLetterItem[]> {
  const rows = await prisma.suratKeluar.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    number: r.nomor,
    kind: r.jenis,
    employeeName: r.karyawan ? `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})` : "-",
    createdAt: r.createdAt.toISOString().slice(0, 10),
  }));
}

export type LetterDetailView = {
  id: string;
  number: string;
  kind: string;
  title: string;
  body: string;
  employeeName: string | null;
  kodeVerifikasi: string;
  verifyUrl: string;
  date: string;
};

export async function getLetterDetail(id: string, baseUrl: string): Promise<LetterDetailView | null> {
  const r = await prisma.suratKeluar.findUnique({
    where: { id },
    include: {
      template: { select: { judul: true, badan: true } },
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
    },
  });
  if (!r || !r.template || !r.kodeVerifikasi) return null;
  return {
    id: r.id,
    number: r.nomor,
    kind: r.jenis,
    title: r.template.judul,
    body: renderLetter(r.template.badan, (r.vars as Record<string, string>) ?? {}),
    employeeName: r.karyawan ? `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})` : null,
    kodeVerifikasi: r.kodeVerifikasi,
    verifyUrl: `${baseUrl}/verify/surat?kode=${r.kodeVerifikasi}`,
    date: r.createdAt.toISOString().slice(0, 10),
  };
}

export async function verifyLetter(kode: string): Promise<
  | { valid: true; number: string; kind: string; employeeName: string | null; date: string }
  | { valid: false }
> {
  const k = kode.trim().toUpperCase();
  if (!k) return { valid: false };
  const r = await prisma.suratKeluar.findUnique({
    where: { kodeVerifikasi: k },
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  if (!r) return { valid: false };
  return {
    valid: true,
    number: r.nomor,
    kind: r.jenis,
    employeeName: r.karyawan ? `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})` : null,
    date: r.createdAt.toISOString().slice(0, 10),
  };
}

export async function deleteLetter(id: string, userId: string): Promise<SuratActionResult> {
  if (!(await requireHr(userId))) return { success: false, message: "Hanya HR." };
  await prisma.suratKeluar.delete({ where: { id } });
  revalidatePath("/employees/surat");
  return { success: true, message: "Surat dihapus." };
}

export type RefOption = { value: string; label: string };

/** Referensi terbaru per jenis + karyawan aktif (untuk KET) + template aktif. */
export async function getPublishOptions(): Promise<{
  refs: Record<string, RefOption[]>;
  employees: RefOption[];
  templates: Array<{ value: string; label: string; code: string }>;
}> {
  const [mutasi, offboarding, sp, employees, templates] = await Promise.all([
    prisma.mutasi.findMany({
      where: { status: { in: ["DISETUJUI", "DITERAPKAN"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { karyawan: { select: { namaLengkap: true } } },
    }),
    prisma.offboarding.findMany({
      where: { status: "SELESAI" },
      orderBy: { selesaiPada: "desc" },
      take: 50,
      include: { karyawan: { select: { namaLengkap: true } } },
    }),
    prisma.suratPeringatan.findMany({
      where: { status: "DITERBITKAN" },
      orderBy: { tanggalTerbit: "desc" },
      take: 50,
      include: { karyawan: { select: { namaLengkap: true } } },
    }),
    prisma.karyawan.findMany({
      where: { status: { in: ["AKTIF", "PROBASI"] } },
      orderBy: { namaLengkap: "asc" },
      select: { id: true, namaLengkap: true, nomorKaryawan: true },
    }),
    prisma.suratTemplate.findMany({
      where: { isActive: true },
      orderBy: { kode: "asc" },
      select: { id: true, kode: true, nama: true },
    }),
  ]);
  return {
    refs: {
      MUT: mutasi.map((r) => ({ value: r.id, label: `${r.nomor} • ${r.karyawan.namaLengkap}` })),
      PAK: offboarding.map((r) => ({ value: r.id, label: `${r.karyawan.namaLengkap}` })),
      SP: sp.map((r) => ({ value: r.id, label: `${r.nomor} • ${r.karyawan.namaLengkap}` })),
    },
    employees: employees.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` })),
    templates: templates.map((t) => ({ value: t.id, label: `${t.kode} — ${t.nama}`, code: t.kode })),
  };
}
