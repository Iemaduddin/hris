"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { hitungProgres, validasiTemplate } from "@/src/modules/employee/lib/onboarding";

export type OnboardingActionResult = { success: boolean; message: string; id?: string };

export type TemplateItem = {
  id: string;
  templateId: string;
  templateNama: string;
  jenisKontrak: string | null;
  jumlahItem: number;
};

export type OnboardingItem = {
  id: string;
  nomor: string;
  karyawanId: string;
  karyawanNama: string;
  templateNama: string | null;
  status: string;
  targetSelesai: string | null;
  persen: number;
  wajibSelesai: string;
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

async function bolehVerifikasi(p: Penindak, karyawanId: string): Promise<boolean> {
  return bolehKelola(p, karyawanId);
}

export async function getTemplates(): Promise<TemplateItem[]> {
  const rows = await prisma.onboardingTemplate.findMany({
    orderBy: { nama: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    templateId: r.id,
    templateNama: `${r.nama}${r.isActive ? "" : " (nonaktif)"}`,
    jenisKontrak: r.jenisKontrak,
    jumlahItem: r._count.items,
  }));
}

export async function saveTemplate(input: {
  id?: string;
  nama: string;
  jenisKontrak: string;
  isActive: boolean;
  items: Array<{ judul: string; deskripsi: string; kategori: string; wajib: boolean }>;
}): Promise<OnboardingActionResult> {
  const err = validasiTemplate({ nama: input.nama, items: input.items });
  if (err) return { success: false, message: err };
  const jenis = input.jenisKontrak || null;

  if (input.id) {
    const dipakai = await prisma.onboarding.count({ where: { templateId: input.id } });
    if (dipakai > 0) {
      // Template terpakai: hanya nama/status yang boleh berubah (isi dikunci).
      await prisma.onboardingTemplate.update({
        where: { id: input.id },
        data: { nama: input.nama.trim(), isActive: input.isActive },
      });
    } else {
      await prisma.$transaction([
        prisma.onboardingTemplateItem.deleteMany({ where: { templateId: input.id } }),
        prisma.onboardingTemplate.update({
          where: { id: input.id },
          data: {
            nama: input.nama.trim(),
            jenisKontrak: jenis as never,
            isActive: input.isActive,
            items: {
              create: input.items.map((it, i) => ({
                judul: it.judul.trim(),
                deskripsi: it.deskripsi.trim() || null,
                kategori: it.kategori as never,
                wajib: it.wajib,
                urutan: i + 1,
              })),
            },
          },
        }),
      ]);
    }
  } else {
    await prisma.onboardingTemplate.create({
      data: {
        nama: input.nama.trim(),
        jenisKontrak: jenis as never,
        isActive: input.isActive,
        items: {
          create: input.items.map((it, i) => ({
            judul: it.judul.trim(),
            deskripsi: it.deskripsi.trim() || null,
            kategori: it.kategori as never,
            wajib: it.wajib,
            urutan: i + 1,
          })),
        },
      },
    });
  }
  revalidatePath("/employees/onboarding");
  return { success: true, message: "Template tersimpan." };
}

export async function hapusTemplate(id: string): Promise<OnboardingActionResult> {
  const dipakai = await prisma.onboarding.count({ where: { templateId: id } });
  if (dipakai > 0) return { success: false, message: "Template sudah dipakai onboarding." };
  await prisma.$transaction([
    prisma.onboardingTemplateItem.deleteMany({ where: { templateId: id } }),
    prisma.onboardingTemplate.delete({ where: { id } }),
  ]);
  revalidatePath("/employees/onboarding");
  return { success: true, message: "Template dihapus." };
}

const TEMPLATE_BAWAAN: Array<{
  nama: string;
  jenisKontrak: string | null;
  items: Array<{ judul: string; deskripsi: string; kategori: "DOKUMEN" | "AKUN" | "ASET" | "ORIENTASI" | "LAINNYA"; wajib: boolean }>;
}> = [
  {
    nama: "Onboarding PKWTT",
    jenisKontrak: "PKWTT",
    items: [
      { judul: "Tanda tangan kontrak kerja", deskripsi: "", kategori: "DOKUMEN", wajib: true },
      { judul: "Fotokopi KTP + Kartu Keluarga", deskripsi: "", kategori: "DOKUMEN", wajib: true },
      { judul: "Pembuatan akun email & HRIS", deskripsi: "", kategori: "AKUN", wajib: true },
      { judul: "Serah terima laptop + ID card", deskripsi: "", kategori: "ASET", wajib: true },
      { judul: "Orientasi divisi & tata tertib", deskripsi: "", kategori: "ORIENTASI", wajib: true },
      { judul: "Perkenalan dengan atasan langsung", deskripsi: "", kategori: "ORIENTASI", wajib: false },
    ],
  },
  {
    nama: "Onboarding PKWT",
    jenisKontrak: "PKWT",
    items: [
      { judul: "Tanda tangan kontrak PKWT", deskripsi: "", kategori: "DOKUMEN", wajib: true },
      { judul: "Fotokopi KTP", deskripsi: "", kategori: "DOKUMEN", wajib: true },
      { judul: "Pembuatan akun email & HRIS", deskripsi: "", kategori: "AKUN", wajib: true },
      { judul: "Serah terima perangkat kerja", deskripsi: "", kategori: "ASET", wajib: true },
      { judul: "Briefing tugas & target kontrak", deskripsi: "", kategori: "ORIENTASI", wajib: true },
    ],
  },
  {
    nama: "Onboarding Magang",
    jenisKontrak: "MAGANG",
    items: [
      { judul: "Surat pengantar kampus", deskripsi: "", kategori: "DOKUMEN", wajib: true },
      { judul: "Pembuatan akun email", deskripsi: "", kategori: "AKUN", wajib: true },
      { judul: "Penunjukan mentor", deskripsi: "", kategori: "ORIENTASI", wajib: true },
      { judul: "Briefing tata tertib magang", deskripsi: "", kategori: "ORIENTASI", wajib: true },
    ],
  },
];

export async function seedTemplateBawaan(): Promise<OnboardingActionResult> {
  let dibuat = 0;
  for (const t of TEMPLATE_BAWAAN) {
    const ada = await prisma.onboardingTemplate.findFirst({ where: { nama: t.nama }, select: { id: true } });
    if (ada) continue;
    await prisma.onboardingTemplate.create({
      data: {
        nama: t.nama,
        jenisKontrak: t.jenisKontrak as never,
        items: { create: t.items.map((it, i) => ({ ...it, kategori: it.kategori as never, urutan: i + 1 })) },
      },
    });
    dibuat++;
  }
  revalidatePath("/employees/onboarding");
  return { success: true, message: dibuat > 0 ? `${dibuat} template dibuat.` : "Template bawaan sudah lengkap." };
}

export async function getOnboardingList(userId: string): Promise<OnboardingItem[]> {
  const p = await resolvePenindak(userId);
  const rows = await prisma.onboarding.findMany({
    where: !isHr(p.role) && p.karyawanId ? { karyawan: { atasanLangsungId: p.karyawanId } } : {},
    orderBy: { createdAt: "desc" },
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
      items: { select: { wajib: true, status: true } },
    },
  });
  return rows.map((r) => {
    const prog = hitungProgres(r.items);
    return {
      id: r.id,
      nomor: r.id.slice(-6).toUpperCase(),
      karyawanId: r.karyawanId,
      karyawanNama: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
      templateNama: r.templateNama,
      status: r.status,
      targetSelesai: r.targetSelesai?.toISOString().slice(0, 10) ?? null,
      persen: prog.persen,
      wajibSelesai: `${prog.terverifikasiWajib}/${prog.wajib}`,
    };
  });
}

export type OnboardingDetailItem = {
  id: string;
  judul: string;
  kategori: string;
  wajib: boolean;
  status: string;
  catatan: string | null;
  diselesaikanPada: string | null;
  diverifikasiPada: string | null;
};

export type OnboardingDetail = {
  id: string;
  karyawanId: string;
  karyawanNama: string;
  templateNama: string | null;
  status: string;
  tanggalMulai: string;
  targetSelesai: string | null;
  selesaiPada: string | null;
  persen: number;
  bisaSelesai: boolean;
  items: OnboardingDetailItem[];
};

export async function getOnboardingDetail(id: string, userId: string): Promise<OnboardingDetail | null> {
  const p = await resolvePenindak(userId);
  const r = await prisma.onboarding.findUnique({
    where: { id },
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true, atasanLangsungId: true } },
      items: { orderBy: { urutan: "asc" } },
    },
  });
  if (!r) return null;
  const milikSendiri = p.karyawanId === r.karyawanId;
  if (!isHr(p.role) && !milikSendiri && r.karyawan.atasanLangsungId !== p.karyawanId) return null;
  const prog = hitungProgres(r.items);
  return {
    id: r.id,
    karyawanId: r.karyawanId,
    karyawanNama: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    templateNama: r.templateNama,
    status: r.status,
    tanggalMulai: r.tanggalMulai.toISOString().slice(0, 10),
    targetSelesai: r.targetSelesai?.toISOString().slice(0, 10) ?? null,
    selesaiPada: r.selesaiPada?.toISOString() ?? null,
    persen: prog.persen,
    bisaSelesai: prog.bisaSelesai && r.status === "BERJALAN",
    items: r.items.map((i) => ({
      id: i.id,
      judul: i.judul,
      kategori: i.kategori,
      wajib: i.wajib,
      status: i.status,
      catatan: i.catatan,
      diselesaikanPada: i.diselesaikanPada?.toISOString() ?? null,
      diverifikasiPada: i.diverifikasiPada?.toISOString() ?? null,
    })),
  };
}

export async function getOnboardingSaya(karyawanId: string): Promise<OnboardingItem[]> {
  const rows = await prisma.onboarding.findMany({
    where: { karyawanId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
      items: { select: { wajib: true, status: true } },
    },
  });
  return rows.map((r) => {
    const prog = hitungProgres(r.items);
    return {
      id: r.id,
      nomor: r.id.slice(-6).toUpperCase(),
      karyawanId: r.karyawanId,
      karyawanNama: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
      templateNama: r.templateNama,
      status: r.status,
      targetSelesai: r.targetSelesai?.toISOString().slice(0, 10) ?? null,
      persen: prog.persen,
      wajibSelesai: `${prog.terverifikasiWajib}/${prog.wajib}`,
    };
  });
}

export async function getOnboardingOptions(userId: string): Promise<{
  karyawan: Array<{ value: string; label: string }>;
  templates: Array<{ value: string; label: string }>;
}> {
  const p = await resolvePenindak(userId);
  const [karyawan, templates] = await Promise.all([
    prisma.karyawan.findMany({
      where: {
        status: { in: ["AKTIF", "PROBASI"] },
        ...(!isHr(p.role) && p.karyawanId ? { atasanLangsungId: p.karyawanId } : {}),
      },
      orderBy: { namaLengkap: "asc" },
      select: { id: true, namaLengkap: true, nomorKaryawan: true },
    }),
    prisma.onboardingTemplate.findMany({
      where: { isActive: true },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
  ]);
  return {
    karyawan: karyawan.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` })),
    templates: templates.map((t) => ({ value: t.id, label: t.nama })),
  };
}

export async function buatOnboarding(
  input: { karyawanId: string; templateId: string; targetSelesai: string },
  userId: string,
): Promise<OnboardingActionResult> {
  const p = await resolvePenindak(userId);
  if (!(await bolehKelola(p, input.karyawanId))) {
    return { success: false, message: "Anda hanya bisa membuat onboarding bawahan langsung." };
  }
  const karyawan = await prisma.karyawan.findUnique({ where: { id: input.karyawanId }, select: { status: true } });
  if (!karyawan || !["AKTIF", "PROBASI"].includes(karyawan.status)) {
    return { success: false, message: "Karyawan tidak aktif." };
  }
  const berjalan = await prisma.onboarding.findFirst({
    where: { karyawanId: input.karyawanId, status: "BERJALAN" },
    select: { id: true },
  });
  if (berjalan) return { success: false, message: "Karyawan masih punya onboarding berjalan." };
  const template = await prisma.onboardingTemplate.findUnique({
    where: { id: input.templateId },
    include: { items: { orderBy: { urutan: "asc" } } },
  });
  if (!template || !template.isActive) return { success: false, message: "Template tidak tersedia." };

  const created = await prisma.onboarding.create({
    data: {
      karyawanId: input.karyawanId,
      templateId: template.id,
      templateNama: template.nama,
      tanggalMulai: toDbDate(new Date()),
      targetSelesai: input.targetSelesai ? toDbDate(input.targetSelesai) : null,
      createdById: userId,
      items: {
        create: template.items.map((it) => ({
          judul: it.judul,
          kategori: it.kategori,
          wajib: it.wajib,
          urutan: it.urutan,
        })),
      },
    },
    select: { id: true },
  });
  revalidatePath("/employees/onboarding");
  return { success: true, message: "Onboarding dibuat.", id: created.id };
}

export async function tambahItem(
  onboardingId: string,
  input: { judul: string; kategori: string; wajib: boolean },
  userId: string,
): Promise<OnboardingActionResult> {
  const p = await resolvePenindak(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa menambah item." };
  if (!input.judul.trim()) return { success: false, message: "Judul wajib diisi." };
  const ob = await prisma.onboarding.findUnique({ where: { id: onboardingId }, select: { status: true } });
  if (!ob || ob.status !== "BERJALAN") return { success: false, message: "Onboarding tidak berjalan." };
  const max = await prisma.onboardingItem.aggregate({ where: { onboardingId }, _max: { urutan: true } });
  await prisma.onboardingItem.create({
    data: {
      onboardingId,
      judul: input.judul.trim(),
      kategori: input.kategori as never,
      wajib: input.wajib,
      urutan: (max._max.urutan ?? 0) + 1,
    },
  });
  revalidatePath("/employees/onboarding");
  return { success: true, message: "Item ditambahkan." };
}

export async function centangItem(itemId: string, selesai: boolean, userId: string): Promise<OnboardingActionResult> {
  const p = await resolvePenindak(userId);
  const item = await prisma.onboardingItem.findUnique({
    where: { id: itemId },
    select: {
      status: true,
      onboarding: { select: { karyawanId: true, status: true, karyawan: { select: { atasanLangsungId: true } } } },
    },
  });
  if (!item || item.onboarding.status !== "BERJALAN") {
    return { success: false, message: "Item tidak tersedia." };
  }
  const milikSendiri = p.karyawanId === item.onboarding.karyawanId;
  if (!isHr(p.role) && !milikSendiri && !(await bolehKelola(p, item.onboarding.karyawanId))) {
    return { success: false, message: "Akses ditolak." };
  }
  if (item.status === "TERVERIFIKASI" && !isHr(p.role)) {
    return { success: false, message: "Sudah terverifikasi (hubungi HR untuk membuka)." };
  }
  await prisma.onboardingItem.update({
    where: { id: itemId },
    data: selesai
      ? { status: "SELESAI", diselesaikanPada: new Date() }
      : { status: "BELUM", diselesaikanPada: null, catatan: null },
  });
  revalidatePath("/employees/onboarding");
  return { success: true, message: selesai ? "Item ditandai selesai." : "Centang dibatalkan." };
}

export async function verifikasiItem(itemId: string, userId: string): Promise<OnboardingActionResult> {
  const p = await resolvePenindak(userId);
  const item = await prisma.onboardingItem.findUnique({
    where: { id: itemId },
    select: {
      status: true,
      onboardingId: true,
      onboarding: { select: { karyawanId: true } },
    },
  });
  if (!item) return { success: false, message: "Item tidak ditemukan." };
  if (!(await bolehVerifikasi(p, item.onboarding.karyawanId))) {
    return { success: false, message: "Hanya atasan/HR yang bisa verifikasi." };
  }
  if (item.status !== "SELESAI") return { success: false, message: "Hanya item SELESAI yang bisa diverifikasi." };
  await prisma.$transaction([
    prisma.onboardingItem.update({
      where: { id: itemId },
      data: { status: "TERVERIFIKASI", diverifikasiOlehId: userId, diverifikasiPada: new Date() },
    }),
  ]);
  await tutupOtomatis(item.onboardingId);
  revalidatePath("/employees/onboarding");
  return { success: true, message: "Item terverifikasi." };
}

async function tutupOtomatis(onboardingId: string): Promise<void> {
  const items = await prisma.onboardingItem.findMany({
    where: { onboardingId },
    select: { wajib: true, status: true },
  });
  if (hitungProgres(items).bisaSelesai) {
    await prisma.onboarding.update({
      where: { id: onboardingId },
      data: { status: "SELESAI", selesaiPada: new Date() },
    });
  }
}

export async function tutupOnboarding(id: string, userId: string): Promise<OnboardingActionResult> {
  const p = await resolvePenindak(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa menutup." };
  const ob = await prisma.onboarding.findUnique({
    where: { id },
    select: { status: true, items: { select: { wajib: true, status: true } } },
  });
  if (!ob || ob.status !== "BERJALAN") return { success: false, message: "Onboarding tidak berjalan." };
  if (!hitungProgres(ob.items).bisaSelesai) {
    return { success: false, message: "Masih ada item wajib belum terverifikasi." };
  }
  await prisma.onboarding.update({ where: { id }, data: { status: "SELESAI", selesaiPada: new Date() } });
  revalidatePath("/employees/onboarding");
  return { success: true, message: "Onboarding selesai." };
}

export async function batalkanOnboarding(id: string, userId: string): Promise<OnboardingActionResult> {
  const p = await resolvePenindak(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa membatalkan." };
  const ob = await prisma.onboarding.findUnique({ where: { id }, select: { status: true } });
  if (!ob || ob.status !== "BERJALAN") return { success: false, message: "Onboarding tidak berjalan." };
  await prisma.onboarding.update({ where: { id }, data: { status: "DIBATALKAN" } });
  revalidatePath("/employees/onboarding");
  return { success: true, message: "Onboarding dibatalkan." };
}

export async function hapusOnboarding(id: string, userId: string): Promise<OnboardingActionResult> {
  const p = await resolvePenindak(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa menghapus." };
  const ob = await prisma.onboarding.findUnique({ where: { id }, select: { status: true } });
  if (!ob || ob.status !== "DIBATALKAN") return { success: false, message: "Hanya yang DIBATALKAN yang bisa dihapus." };
  await prisma.$transaction([
    prisma.onboardingItem.deleteMany({ where: { onboardingId: id } }),
    prisma.onboarding.delete({ where: { id } }),
  ]);
  revalidatePath("/employees/onboarding");
  return { success: true, message: "Onboarding dihapus." };
}
