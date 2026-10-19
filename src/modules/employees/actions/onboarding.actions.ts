"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { calculateProgress, validateTemplate } from "@/src/modules/employees/lib/onboarding";

export type OnboardingActionResult = { success: boolean; message: string; id?: string };

export type TemplateItem = {
  id: string;
  templateId: string;
  templateName: string;
  contractType: string | null;
  itemCount: number;
};

export type OnboardingItem = {
  id: string;
  number: string;
  employeeId: string;
  employeeName: string;
  templateName: string | null;
  status: string;
  targetDate: string | null;
  percent: number;
  requiredDone: string;
};

type Actor = { role: string; employeeId: string | null };

async function resolveActor(userId: string): Promise<Actor> {
  if (!userId) return { role: "EMPLOYEE", employeeId: null };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const employee = await prisma.karyawan.findFirst({ where: { userId }, select: { id: true } });
  return { role: user?.role ?? "EMPLOYEE", employeeId: employee?.id ?? null };
}

function isHr(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN_HR";
}

async function canManage(p: Actor, employeeId: string): Promise<boolean> {
  if (isHr(p.role)) return true;
  if (p.role !== "MANAJER" || !p.employeeId) return false;
  const subordinate = await prisma.karyawan.findFirst({
    where: { id: employeeId, atasanLangsungId: p.employeeId },
    select: { id: true },
  });
  return !!subordinate;
}

async function canVerify(p: Actor, employeeId: string): Promise<boolean> {
  return canManage(p, employeeId);
}

export async function getTemplates(): Promise<TemplateItem[]> {
  const rows = await prisma.onboardingTemplate.findMany({
    orderBy: { nama: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    templateId: r.id,
    templateName: `${r.nama}${r.isActive ? "" : " (nonaktif)"}`,
    contractType: r.jenisKontrak,
    itemCount: r._count.items,
  }));
}

export async function saveTemplate(input: {
  id?: string;
  name: string;
  contractType: string;
  isActive: boolean;
  items: Array<{ title: string; description: string; category: string; required: boolean }>;
}): Promise<OnboardingActionResult> {
  const err = validateTemplate({ name: input.name, items: input.items });
  if (err) return { success: false, message: err };
  const contractType = input.contractType || null;

  if (input.id) {
    const inUse = await prisma.onboarding.count({ where: { templateId: input.id } });
    if (inUse > 0) {
      // Template terpakai: hanya nama/status yang boleh berubah (isi dikunci).
      await prisma.onboardingTemplate.update({
        where: { id: input.id },
        data: { nama: input.name.trim(), isActive: input.isActive },
      });
    } else {
      await prisma.$transaction([
        prisma.onboardingTemplateItem.deleteMany({ where: { templateId: input.id } }),
        prisma.onboardingTemplate.update({
          where: { id: input.id },
          data: {
            nama: input.name.trim(),
            jenisKontrak: contractType as never,
            isActive: input.isActive,
            items: {
              create: input.items.map((it, i) => ({
                judul: it.title.trim(),
                deskripsi: it.description.trim() || null,
                kategori: it.category as never,
                wajib: it.required,
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
        nama: input.name.trim(),
        jenisKontrak: contractType as never,
        isActive: input.isActive,
        items: {
          create: input.items.map((it, i) => ({
            judul: it.title.trim(),
            deskripsi: it.description.trim() || null,
            kategori: it.category as never,
            wajib: it.required,
            urutan: i + 1,
          })),
        },
      },
    });
  }
  revalidatePath("/employees/onboarding");
  return { success: true, message: "Template tersimpan." };
}

export async function deleteTemplate(id: string): Promise<OnboardingActionResult> {
  const inUse = await prisma.onboarding.count({ where: { templateId: id } });
  if (inUse > 0) return { success: false, message: "Template sudah dipakai onboarding." };
  await prisma.$transaction([
    prisma.onboardingTemplateItem.deleteMany({ where: { templateId: id } }),
    prisma.onboardingTemplate.delete({ where: { id } }),
  ]);
  revalidatePath("/employees/onboarding");
  return { success: true, message: "Template dihapus." };
}

const DEFAULT_TEMPLATES: Array<{
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

export async function seedDefaultTemplates(): Promise<OnboardingActionResult> {
  let created = 0;
  for (const t of DEFAULT_TEMPLATES) {
    const exists = await prisma.onboardingTemplate.findFirst({ where: { nama: t.nama }, select: { id: true } });
    if (exists) continue;
    await prisma.onboardingTemplate.create({
      data: {
        nama: t.nama,
        jenisKontrak: t.jenisKontrak as never,
        items: { create: t.items.map((it, i) => ({ ...it, kategori: it.kategori as never, urutan: i + 1 })) },
      },
    });
    created++;
  }
  revalidatePath("/employees/onboarding");
  return { success: true, message: created > 0 ? `${created} template dibuat.` : "Template bawaan sudah lengkap." };
}

export async function getOnboardingList(userId: string): Promise<OnboardingItem[]> {
  const p = await resolveActor(userId);
  const rows = await prisma.onboarding.findMany({
    where: !isHr(p.role) && p.employeeId ? { karyawan: { atasanLangsungId: p.employeeId } } : {},
    orderBy: { createdAt: "desc" },
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
      items: { select: { wajib: true, status: true } },
    },
  });
  return rows.map((r) => {
    const progress = calculateProgress(r.items.map((i) => ({ required: i.wajib, status: i.status })));
    return {
      id: r.id,
      number: r.id.slice(-6).toUpperCase(),
      employeeId: r.karyawanId,
      employeeName: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
      templateName: r.templateNama,
      status: r.status,
      targetDate: r.targetSelesai?.toISOString().slice(0, 10) ?? null,
      percent: progress.percent,
      requiredDone: `${progress.verifiedRequired}/${progress.required}`,
    };
  });
}

export type OnboardingChecklistItem = {
  id: string;
  title: string;
  category: string;
  required: boolean;
  status: string;
  note: string | null;
  completedAt: string | null;
  verifiedAt: string | null;
};

export type OnboardingDetail = {
  id: string;
  employeeId: string;
  employeeName: string;
  templateName: string | null;
  status: string;
  startDate: string;
  targetDate: string | null;
  completedAt: string | null;
  percent: number;
  canComplete: boolean;
  items: OnboardingChecklistItem[];
};

export async function getOnboardingDetail(id: string, userId: string): Promise<OnboardingDetail | null> {
  const p = await resolveActor(userId);
  const r = await prisma.onboarding.findUnique({
    where: { id },
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true, atasanLangsungId: true } },
      items: { orderBy: { urutan: "asc" } },
    },
  });
  if (!r) return null;
  const isOwner = p.employeeId === r.karyawanId;
  if (!isHr(p.role) && !isOwner && r.karyawan.atasanLangsungId !== p.employeeId) return null;
  const progress = calculateProgress(r.items.map((i) => ({ required: i.wajib, status: i.status })));
  return {
    id: r.id,
    employeeId: r.karyawanId,
    employeeName: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
    templateName: r.templateNama,
    status: r.status,
    startDate: r.tanggalMulai.toISOString().slice(0, 10),
    targetDate: r.targetSelesai?.toISOString().slice(0, 10) ?? null,
    completedAt: r.selesaiPada?.toISOString() ?? null,
    percent: progress.percent,
    canComplete: progress.canComplete && r.status === "BERJALAN",
    items: r.items.map((i) => ({
      id: i.id,
      title: i.judul,
      category: i.kategori,
      required: i.wajib,
      status: i.status,
      note: i.catatan,
      completedAt: i.diselesaikanPada?.toISOString() ?? null,
      verifiedAt: i.diverifikasiPada?.toISOString() ?? null,
    })),
  };
}

export async function getMyOnboarding(employeeId: string): Promise<OnboardingItem[]> {
  const rows = await prisma.onboarding.findMany({
    where: { karyawanId: employeeId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
      items: { select: { wajib: true, status: true } },
    },
  });
  return rows.map((r) => {
    const progress = calculateProgress(r.items.map((i) => ({ required: i.wajib, status: i.status })));
    return {
      id: r.id,
      number: r.id.slice(-6).toUpperCase(),
      employeeId: r.karyawanId,
      employeeName: `${r.karyawan.namaLengkap} (${r.karyawan.nomorKaryawan})`,
      templateName: r.templateNama,
      status: r.status,
      targetDate: r.targetSelesai?.toISOString().slice(0, 10) ?? null,
      percent: progress.percent,
      requiredDone: `${progress.verifiedRequired}/${progress.required}`,
    };
  });
}

export async function getOnboardingOptions(userId: string): Promise<{
  employees: Array<{ value: string; label: string }>;
  templates: Array<{ value: string; label: string }>;
}> {
  const p = await resolveActor(userId);
  const [employees, templates] = await Promise.all([
    prisma.karyawan.findMany({
      where: {
        status: { in: ["AKTIF", "PROBASI"] },
        ...(!isHr(p.role) && p.employeeId ? { atasanLangsungId: p.employeeId } : {}),
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
    employees: employees.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` })),
    templates: templates.map((t) => ({ value: t.id, label: t.nama })),
  };
}

export async function createOnboarding(
  input: { employeeId: string; templateId: string; targetDate: string },
  userId: string,
): Promise<OnboardingActionResult> {
  const p = await resolveActor(userId);
  if (!(await canManage(p, input.employeeId))) {
    return { success: false, message: "Anda hanya bisa membuat onboarding bawahan langsung." };
  }
  const employee = await prisma.karyawan.findUnique({ where: { id: input.employeeId }, select: { status: true } });
  if (!employee || !["AKTIF", "PROBASI"].includes(employee.status)) {
    return { success: false, message: "Employee tidak aktif." };
  }
  const active = await prisma.onboarding.findFirst({
    where: { karyawanId: input.employeeId, status: "BERJALAN" },
    select: { id: true },
  });
  if (active) return { success: false, message: "Employee masih punya onboarding berjalan." };
  const template = await prisma.onboardingTemplate.findUnique({
    where: { id: input.templateId },
    include: { items: { orderBy: { urutan: "asc" } } },
  });
  if (!template || !template.isActive) return { success: false, message: "Template tidak tersedia." };

  const created = await prisma.onboarding.create({
    data: {
      karyawanId: input.employeeId,
      templateId: template.id,
      templateNama: template.nama,
      tanggalMulai: toDbDate(new Date()),
      targetSelesai: input.targetDate ? toDbDate(input.targetDate) : null,
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

export async function addItem(
  onboardingId: string,
  input: { title: string; category: string; required: boolean },
  userId: string,
): Promise<OnboardingActionResult> {
  const p = await resolveActor(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa menambah item." };
  if (!input.title.trim()) return { success: false, message: "Judul wajib diisi." };
  const ob = await prisma.onboarding.findUnique({ where: { id: onboardingId }, select: { status: true } });
  if (!ob || ob.status !== "BERJALAN") return { success: false, message: "Onboarding tidak berjalan." };
  const max = await prisma.onboardingItem.aggregate({ where: { onboardingId }, _max: { urutan: true } });
  await prisma.onboardingItem.create({
    data: {
      onboardingId,
      judul: input.title.trim(),
      kategori: input.category as never,
      wajib: input.required,
      urutan: (max._max.urutan ?? 0) + 1,
    },
  });
  revalidatePath("/employees/onboarding");
  return { success: true, message: "Item ditambahkan." };
}

export async function toggleChecklistItem(itemId: string, done: boolean, userId: string): Promise<OnboardingActionResult> {
  const p = await resolveActor(userId);
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
  const isOwner = p.employeeId === item.onboarding.karyawanId;
  if (!isHr(p.role) && !isOwner && !(await canManage(p, item.onboarding.karyawanId))) {
    return { success: false, message: "Akses ditolak." };
  }
  if (item.status === "TERVERIFIKASI" && !isHr(p.role)) {
    return { success: false, message: "Sudah terverifikasi (hubungi HR untuk membuka)." };
  }
  await prisma.onboardingItem.update({
    where: { id: itemId },
    data: done
      ? { status: "SELESAI", diselesaikanPada: new Date() }
      : { status: "BELUM", diselesaikanPada: null, catatan: null },
  });
  revalidatePath("/employees/onboarding");
  return { success: true, message: done ? "Item ditandai selesai." : "Centang dibatalkan." };
}

export async function verifyItem(itemId: string, userId: string): Promise<OnboardingActionResult> {
  const p = await resolveActor(userId);
  const item = await prisma.onboardingItem.findUnique({
    where: { id: itemId },
    select: {
      status: true,
      onboardingId: true,
      onboarding: { select: { karyawanId: true } },
    },
  });
  if (!item) return { success: false, message: "Item tidak ditemukan." };
  if (!(await canVerify(p, item.onboarding.karyawanId))) {
    return { success: false, message: "Hanya atasan/HR yang bisa verifikasi." };
  }
  if (item.status !== "SELESAI") return { success: false, message: "Hanya item SELESAI yang bisa diverifikasi." };
  await prisma.$transaction([
    prisma.onboardingItem.update({
      where: { id: itemId },
      data: { status: "TERVERIFIKASI", diverifikasiOlehId: userId, diverifikasiPada: new Date() },
    }),
  ]);
  await autoClose(item.onboardingId);
  revalidatePath("/employees/onboarding");
  return { success: true, message: "Item terverifikasi." };
}

async function autoClose(onboardingId: string): Promise<void> {
  const items = await prisma.onboardingItem.findMany({
    where: { onboardingId },
    select: { wajib: true, status: true },
  });
  if (calculateProgress(items.map((i) => ({ required: i.wajib, status: i.status }))).canComplete) {
    await prisma.onboarding.update({
      where: { id: onboardingId },
      data: { status: "SELESAI", selesaiPada: new Date() },
    });
  }
}

export async function closeOnboarding(id: string, userId: string): Promise<OnboardingActionResult> {
  const p = await resolveActor(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa menutup." };
  const ob = await prisma.onboarding.findUnique({
    where: { id },
    select: { status: true, items: { select: { wajib: true, status: true } } },
  });
  if (!ob || ob.status !== "BERJALAN") return { success: false, message: "Onboarding tidak berjalan." };
  if (!calculateProgress(ob.items.map((i) => ({ required: i.wajib, status: i.status }))).canComplete) {
    return { success: false, message: "Masih ada item wajib belum terverifikasi." };
  }
  await prisma.onboarding.update({ where: { id }, data: { status: "SELESAI", selesaiPada: new Date() } });
  revalidatePath("/employees/onboarding");
  return { success: true, message: "Onboarding selesai." };
}

export async function cancelOnboarding(id: string, userId: string): Promise<OnboardingActionResult> {
  const p = await resolveActor(userId);
  if (!isHr(p.role)) return { success: false, message: "Hanya HR yang bisa membatalkan." };
  const ob = await prisma.onboarding.findUnique({ where: { id }, select: { status: true } });
  if (!ob || ob.status !== "BERJALAN") return { success: false, message: "Onboarding tidak berjalan." };
  await prisma.onboarding.update({ where: { id }, data: { status: "DIBATALKAN" } });
  revalidatePath("/employees/onboarding");
  return { success: true, message: "Onboarding dibatalkan." };
}

export async function deleteOnboarding(id: string, userId: string): Promise<OnboardingActionResult> {
  const p = await resolveActor(userId);
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
