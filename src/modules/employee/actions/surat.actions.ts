"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { JENIS_SURAT, daftarPlaceholder, formatNomorSurat, renderSurat } from "@/src/modules/employee/lib/surat";
import { labelJenisMutasi } from "@/src/modules/employee/lib/mutasi";

export type SuratActionResult = { success: boolean; message: string; id?: string };

export type TemplateSuratItem = {
  id: string;
  kode: string;
  nama: string;
  judul: string;
  isActive: boolean;
};

export type SuratKeluarItem = {
  id: string;
  nomor: string;
  jenis: string;
  karyawanNama: string | null;
  createdAt: string;
};

async function requireHr(userId: string): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_HR";
}

const TEMPLATE_BAWAAN: Array<{ kode: string; nama: string; judul: string; badan: string }> = [
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

export async function getTemplates(): Promise<TemplateSuratItem[]> {
  const rows = await prisma.suratTemplate.findMany({ orderBy: { kode: "asc" } });
  return rows.map((r) => ({ id: r.id, kode: r.kode, nama: r.nama, judul: r.judul, isActive: r.isActive }));
}

export async function getTemplateDetail(id: string): Promise<{ id: string; kode: string; nama: string; judul: string; badan: string; isActive: boolean } | null> {
  return prisma.suratTemplate.findUnique({ where: { id } });
}

export async function saveTemplate(
  input: { id?: string; kode: string; nama: string; judul: string; badan: string; isActive: boolean },
  userId: string,
): Promise<SuratActionResult> {
  if (!(await requireHr(userId))) return { success: false, message: "Hanya HR." };
  if (!input.nama.trim() || !input.judul.trim() || !input.badan.trim()) {
    return { success: false, message: "Nama, judul, dan badan wajib diisi." };
  }
  const kode = input.kode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
  if (!kode) return { success: false, message: "Kode tidak valid." };
  if (input.id) {
    await prisma.suratTemplate.update({
      where: { id: input.id },
      data: { nama: input.nama.trim(), judul: input.judul.trim(), badan: input.badan, isActive: input.isActive },
    });
  } else {
    const ada = await prisma.suratTemplate.findUnique({ where: { kode }, select: { id: true } });
    if (ada) return { success: false, message: "Kode sudah dipakai." };
    await prisma.suratTemplate.create({
      data: { kode, nama: input.nama.trim(), judul: input.judul.trim(), badan: input.badan, isActive: input.isActive },
    });
  }
  revalidatePath("/settings/surat");
  return { success: true, message: "Template tersimpan." };
}

export async function hapusTemplate(id: string, userId: string): Promise<SuratActionResult> {
  if (!(await requireHr(userId))) return { success: false, message: "Hanya HR." };
  const dipakai = await prisma.suratKeluar.count({ where: { templateId: id } });
  if (dipakai > 0) return { success: false, message: "Template sudah dipakai surat terbit." };
  await prisma.suratTemplate.delete({ where: { id } });
  revalidatePath("/settings/surat");
  return { success: true, message: "Template dihapus." };
}

export async function seedTemplateBawaan(userId: string): Promise<SuratActionResult> {
  if (!(await requireHr(userId))) return { success: false, message: "Hanya HR." };
  let dibuat = 0;
  for (const t of TEMPLATE_BAWAAN) {
    const ada = await prisma.suratTemplate.findUnique({ where: { kode: t.kode }, select: { id: true } });
    if (ada) continue;
    await prisma.suratTemplate.create({ data: { ...t } });
    dibuat++;
  }
  revalidatePath("/settings/surat");
  return { success: true, message: dibuat > 0 ? `${dibuat} template dibuat.` : "Template sudah lengkap." };
}

async function seqSuratBerikut(kode: string, tahun: number): Promise<number> {
  const kunci = `SURAT.${kode}.${tahun}`;
  const rows = await prisma.$queryRaw<Array<{ terakhir: number }>>`
    INSERT INTO "penomoran" ("id", "kunci", "terakhir", "updatedAt")
    VALUES (md5(random()::text || clock_timestamp()::text), ${kunci}, 1, NOW())
    ON CONFLICT ("kunci") DO UPDATE SET "terakhir" = "penomoran"."terakhir" + 1, "updatedAt" = NOW()
    RETURNING "terakhir"`;
  return rows[0]?.terakhir ?? 1;
}

function ringkas(unit: string | null, posisi: string | null, lokasi: string | null): string {
  return [posisi, unit, lokasi].filter(Boolean).join(" • ") || "-";
}

const tgl = (d: Date) => d.toISOString().slice(0, 10);

/** Variabel otomatis dari data referensi. */
export async function varsOtomatis(
  jenis: string,
  referensiId: string,
  tambahan: Record<string, string>,
): Promise<{ karyawanId: string | null; vars: Record<string, string> } | { error: string }> {
  if (jenis === "MUT") {
    const r = await prisma.mutasi.findUnique({
      where: { id: referensiId },
      include: {
        karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
        keUnit: { select: { nama: true } },
        kePosisi: { select: { nama: true } },
        keLokasi: { select: { nama: true } },
      },
    });
    if (!r) return { error: "Data mutasi tidak ditemukan." };
    return {
      karyawanId: r.karyawanId,
      vars: {
        nama: r.karyawan.namaLengkap,
        nomorKaryawan: r.karyawan.nomorKaryawan,
        jenis: labelJenisMutasi(r.jenis).toLowerCase(),
        dari: ringkas(r.dariUnitNama, r.dariPosisiNama, r.dariLokasiNama),
        ke: ringkas(r.keUnit?.nama ?? null, r.kePosisi?.nama ?? null, r.keLokasi?.nama ?? null),
        efektif: tgl(r.tanggalEfektif),
        alasan: r.alasan,
        nomorRef: r.nomor,
        ...tambahan,
      },
    };
  }
  if (jenis === "PAK") {
    const r = await prisma.offboarding.findUnique({
      where: { id: referensiId },
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
      karyawanId: r.karyawanId,
      vars: {
        nama: r.karyawan.namaLengkap,
        nomorKaryawan: r.karyawan.nomorKaryawan,
        posisi: ringkas(p?.unitOrganisasi?.nama ?? null, p?.posisi?.nama ?? null, null),
        masuk: tgl(r.karyawan.tanggalMasuk),
        resign: tgl(r.tanggalEfektif),
        ...tambahan,
      },
    };
  }
  if (jenis === "SP") {
    const r = await prisma.suratPeringatan.findUnique({
      where: { id: referensiId },
      include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
    });
    if (!r || r.status === "DRAFT") return { error: "Surat peringatan belum terbit." };
    return {
      karyawanId: r.karyawanId,
      vars: {
        nama: r.karyawan.namaLengkap,
        nomorKaryawan: r.karyawan.nomorKaryawan,
        tingkat: r.tingkat,
        pelanggaran: r.pelanggaran,
        terbit: tgl(r.tanggalTerbit),
        berlaku: r.berlakuSampai ? ` s/d ${tgl(r.berlakuSampai)}` : "",
        ...tambahan,
      },
    };
  }
  return { error: "Jenis tidak dikenal." };
}

export async function terbitkanSurat(
  input: { jenis: string; referensiId: string; karyawanId: string; keperluan: string; templateId: string },
  userId: string,
): Promise<SuratActionResult> {
  if (!(await requireHr(userId))) return { success: false, message: "Hanya HR." };
  const jenis = JENIS_SURAT.find((j) => j.kode === input.jenis);
  if (!jenis) return { success: false, message: "Jenis tidak valid." };
  const template = await prisma.suratTemplate.findUnique({ where: { id: input.templateId } });
  if (!template || !template.isActive) return { success: false, message: "Template tidak tersedia." };

  let karyawanId: string | null = null;
  let vars: Record<string, string> = {};
  if (jenis.butuhRef) {
    if (!input.referensiId) return { success: false, message: "Referensi wajib dipilih." };
    const hasil = await varsOtomatis(input.jenis, input.referensiId, {});
    if ("error" in hasil) return { success: false, message: hasil.error };
    karyawanId = hasil.karyawanId;
    vars = hasil.vars;
  } else {
    if (!input.karyawanId) return { success: false, message: "Karyawan wajib dipilih." };
    const k = await prisma.karyawan.findUnique({
      where: { id: input.karyawanId },
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
    if (!input.keperluan.trim()) return { success: false, message: "Keperluan wajib diisi." };
    const p = k.posisiKaryawan[0];
    karyawanId = input.karyawanId;
    vars = {
      nama: k.namaLengkap,
      nomorKaryawan: k.nomorKaryawan,
      posisi: ringkas(p?.unitOrganisasi?.nama ?? null, p?.posisi?.nama ?? null, null),
      keperluan: input.keperluan.trim(),
      tanggal: new Date().toISOString().slice(0, 10),
    };
  }

  const kini = new Date();
  for (let attempt = 0; attempt < 3; attempt++) {
    const nomor = formatNomorSurat(await seqSuratBerikut(input.jenis, kini.getFullYear()), input.jenis, kini);
    try {
      const created = await prisma.suratKeluar.create({
        data: {
          nomor,
          kodeVerifikasi: randomBytes(12).toString("hex").toUpperCase(),
          templateId: template.id,
          jenis: input.jenis,
          referensiType: jenis.butuhRef ? input.jenis : null,
          referensiId: jenis.butuhRef ? input.referensiId : null,
          karyawanId,
          vars: { ...vars, nomor },
          createdById: userId,
        },
        select: { id: true },
      });
      revalidatePath("/employees/surat");
      return { success: true, message: `Surat ${nomor} terbit.`, id: created.id };
    } catch {
      // Nomor bentrok (sangat jarang) → coba sequence berikutnya.
    }
  }
  return { success: false, message: "Gagal menerbitkan nomor." };
}

export async function getSuratList(): Promise<SuratKeluarItem[]> {
  const rows = await prisma.suratKeluar.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    nomor: r.nomor,
    jenis: r.jenis,
    karyawanNama: r.karyawan ? `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})` : "-",
    createdAt: r.createdAt.toISOString().slice(0, 10),
  }));
}

export type SuratDetailView = {
  id: string;
  nomor: string;
  jenis: string;
  judul: string;
  isi: string;
  karyawanNama: string | null;
  kodeVerifikasi: string;
  verifyUrl: string;
  tanggal: string;
};

export async function getSuratDetail(id: string, baseUrl: string): Promise<SuratDetailView | null> {
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
    nomor: r.nomor,
    jenis: r.jenis,
    judul: r.template.judul,
    isi: renderSurat(r.template.badan, (r.vars as Record<string, string>) ?? {}),
    karyawanNama: r.karyawan ? `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})` : null,
    kodeVerifikasi: r.kodeVerifikasi,
    verifyUrl: `${baseUrl}/verify/surat?kode=${r.kodeVerifikasi}`,
    tanggal: r.createdAt.toISOString().slice(0, 10),
  };
}

export async function getVerifikasiSurat(kode: string): Promise<
  | { valid: true; nomor: string; jenis: string; karyawanNama: string | null; tanggal: string }
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
    nomor: r.nomor,
    jenis: r.jenis,
    karyawanNama: r.karyawan ? `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})` : null,
    tanggal: r.createdAt.toISOString().slice(0, 10),
  };
}

export async function hapusSurat(id: string, userId: string): Promise<SuratActionResult> {
  if (!(await requireHr(userId))) return { success: false, message: "Hanya HR." };
  await prisma.suratKeluar.delete({ where: { id } });
  revalidatePath("/employees/surat");
  return { success: true, message: "Surat dihapus." };
}

export type OpsiRef = { value: string; label: string };

/** Referensi terbaru per jenis + karyawan aktif (untuk KET) + template aktif. */
export async function getTerbitOptions(): Promise<{
  refs: Record<string, OpsiRef[]>;
  karyawans: OpsiRef[];
  templates: Array<{ value: string; label: string; kode: string }>;
}> {
  const [mutasi, offboarding, sp, karyawan, templates] = await Promise.all([
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
    karyawans: karyawan.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` })),
    templates: templates.map((t) => ({ value: t.id, label: `${t.kode} — ${t.nama}`, kode: t.kode })),
  };
}

export { JENIS_SURAT, daftarPlaceholder };
