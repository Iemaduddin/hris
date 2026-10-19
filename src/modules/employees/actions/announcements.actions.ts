"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { canManageUsers, getCurrentSession } from "@/src/lib/auth-guard";
import { recordAudit } from "@/src/modules/audit/lib/audit";
import { sendNotification } from "@/src/modules/notifications/lib/notifications";

export type AnnouncementActionResult = { success: boolean; message: string; id?: string };

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  unitName: string | null;
  status: string;
  startsAt: string;
  endsAt: string | null;
  publishedAt: string | null;
};

/** Revalidate best-effort: di luar konteks request (E2E/CLI) Next melempar — abaikan. */
function revalidateBestEffort(path: string): void {
	try {
		revalidatePath(path);
	} catch {
		// abaikan — hygiene cache, bukan logika inti
	}
}

async function allowed(): Promise<boolean> {
	try {
		return await canManageUsers();
	} catch {
		return false;
	}
}

async function actorId(): Promise<string | null> {
	try {
		const session = await getCurrentSession();
		return session?.user?.id ?? null;
	} catch {
		return null;
	}
}

function toItem(r: {
  id: string;
  judul: string;
  isi: string;
  status: string;
  tayangMulai: Date;
  tayangSelesai: Date | null;
  diterbitkanPada: Date | null;
  unitOrganisasi: { nama: string } | null;
}): AnnouncementItem {
  return {
    id: r.id,
    title: r.judul,
    body: r.isi,
    unitName: r.unitOrganisasi?.nama ?? null,
    status: r.status,
    startsAt: r.tayangMulai.toISOString(),
    endsAt: r.tayangSelesai?.toISOString() ?? null,
    publishedAt: r.diterbitkanPada?.toISOString() ?? null,
  };
}

export async function createAnnouncementCore(
  input: { title: string; body: string; orgUnitId?: string; endsAt?: string },
  userId: string,
): Promise<AnnouncementActionResult> {
  const title = String(input.title ?? "").trim();
  const body = String(input.body ?? "").trim();
  if (!title) return { success: false, message: "Judul wajib diisi." };
  if (!body) return { success: false, message: "Isi wajib diisi." };
  if (input.orgUnitId) {
    const unit = await prisma.unitOrganisasi.findUnique({ where: { id: input.orgUnitId }, select: { id: true } });
    if (!unit) return { success: false, message: "Unit tidak ditemukan." };
  }
  let endsAt: Date | null = null;
  if (input.endsAt) {
    endsAt = new Date(input.endsAt);
    if (Number.isNaN(endsAt.getTime())) return { success: false, message: "Tayang selesai tidak valid." };
  }
  const created = await prisma.pengumuman.create({
    data: {
      judul: title,
      isi: body,
      unitOrganisasiId: input.orgUnitId || null,
      tayangSelesai: endsAt,
      createdById: userId,
    },
    select: { id: true },
  });
  revalidateBestEffort("/employees/announcements");
  return { success: true, message: "Draf pengumuman tersimpan.", id: created.id };
}

/** Terbitkan + broadcast ke target (seluruh aktif / satu unit). */
export async function publishAnnouncementCore(id: string, actorUserId?: string | null): Promise<AnnouncementActionResult> {
	const row = await prisma.pengumuman.findUnique({
		where: { id },
		include: { unitOrganisasi: { select: { nama: true } } },
	});
	if (!row) return { success: false, message: "Pengumuman tidak ditemukan." };
	if (row.status === "TERBIT") return { success: false, message: "Sudah terbit." };
	if (row.status === "DIARSIPKAN") return { success: false, message: "Sudah diarsipkan." };

	await prisma.pengumuman.update({
		where: { id },
		data: { status: "TERBIT", diterbitkanOlehId: actorUserId ?? null, diterbitkanPada: new Date() },
	});

	const target = await prisma.karyawan.findMany({
		where: {
			status: { in: ["AKTIF", "PROBASI"] },
			userId: { not: null },
			...(row.unitOrganisasiId
				? { posisiKaryawan: { some: { isCurrent: true, unitOrganisasiId: row.unitOrganisasiId } } }
				: {}),
		},
		select: { userId: true },
	});
  const scope = row.unitOrganisasi ? `unit ${row.unitOrganisasi.nama}` : "seluruh karyawan";
  let sent = 0;
  for (const t of target) {
    if (!t.userId) continue;
    await sendNotification({
      userId: t.userId,
      title: `Pengumuman: ${row.judul}`,
      body: `${row.isi.slice(0, 160)}${row.isi.length > 160 ? "…" : ""}`,
      kind: "INFO",
      referenceType: "PENGUMUMAN",
      referenceId: id,
      url: "/account/announcements",
      pushData: { url: "/pengumuman", kind: "pengumuman", id },
    });
    sent++;
  }

  await recordAudit({
    actorUserId: actorUserId ?? null,
    aksi: "PENGUMUMAN.TERBIT",
    entityType: "Pengumuman",
    entityId: id,
    sebelum: { status: row.status },
    sesudah: { status: "TERBIT", target: scope, terkirim: sent },
    reason: row.judul,
  });
  revalidateBestEffort("/employees/announcements");
  revalidateBestEffort("/account/announcements");
  return { success: true, message: `Terbit ke ${scope} (${sent} penerima).` };
}

export async function archiveAnnouncementCore(id: string, actorUserId?: string | null): Promise<AnnouncementActionResult> {
  const row = await prisma.pengumuman.findUnique({ where: { id }, select: { status: true, judul: true } });
  if (!row) return { success: false, message: "Pengumuman tidak ditemukan." };
  if (row.status === "DIARSIPKAN") return { success: false, message: "Sudah diarsipkan." };
  await prisma.pengumuman.update({ where: { id }, data: { status: "DIARSIPKAN" } });
  await recordAudit({
    actorUserId: actorUserId ?? null,
    aksi: "PENGUMUMAN.ARSIP",
    entityType: "Pengumuman",
    entityId: id,
    sebelum: { status: row.status },
    sesudah: { status: "DIARSIPKAN" },
    reason: row.judul,
  });
  revalidateBestEffort("/employees/announcements");
  revalidateBestEffort("/account/announcements");
  return { success: true, message: "Diarsipkan." };
}

export async function deleteAnnouncementCore(id: string): Promise<AnnouncementActionResult> {
  const row = await prisma.pengumuman.findUnique({ where: { id }, select: { status: true } });
  if (!row) return { success: false, message: "Pengumuman tidak ditemukan." };
  if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa dihapus." };
  await prisma.pengumuman.delete({ where: { id } });
  revalidateBestEffort("/employees/announcements");
  return { success: true, message: "Draf dihapus." };
}

export async function listHrAnnouncementsCore(): Promise<AnnouncementItem[]> {
  const rows = await prisma.pengumuman.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { unitOrganisasi: { select: { nama: true } } },
  });
  return rows.map(toItem);
}

/** Daftar tayang untuk satu karyawan: global + unitnya sendiri. */
export async function getMyAnnouncementsCore(employeeId: string): Promise<AnnouncementItem[]> {
  const me = await prisma.karyawan.findUnique({
    where: { id: employeeId },
    select: { posisiKaryawan: { where: { isCurrent: true }, select: { unitOrganisasiId: true } } },
  });
  const unitIds = (me?.posisiKaryawan ?? []).map((p) => p.unitOrganisasiId).filter((x): x is string => !!x);
  const now = new Date();
  const rows = await prisma.pengumuman.findMany({
    where: {
      status: "TERBIT",
      tayangMulai: { lte: now },
      OR: [{ tayangSelesai: null }, { tayangSelesai: { gte: now } }],
      AND: [{ OR: [{ unitOrganisasiId: null }, { unitOrganisasiId: { in: unitIds } }] }],
    },
    orderBy: { diterbitkanPada: "desc" },
    take: 50,
    include: { unitOrganisasi: { select: { nama: true } } },
  });
  return rows.map(toItem);
}

export type PersonEvent = {
  fullName: string;
  employeeNumber: string;
  kind: "ULTAH" | "ANNIV";
  date: string;
  info: string;
};

/** Ulang tahun + anniversary kerja 7 hari ke depan (on-the-fly, tanpa model). */
export async function getThisWeekEvents(): Promise<PersonEvent[]> {
  const employees = await prisma.karyawan.findMany({
    where: { status: { in: ["AKTIF", "PROBASI"] } },
    select: { namaLengkap: true, nomorKaryawan: true, tanggalLahir: true, tanggalMasuk: true },
    orderBy: { namaLengkap: "asc" },
  });
  const now = new Date();
  const events: PersonEvent[] = [];
  const within7Days = (month: number, day: number): Date | null => {
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      if (d.getMonth() === month && d.getDate() === day) return d;
    }
    return null;
  };
  for (const k of employees) {
    if (k.tanggalLahir) {
      const match = within7Days(k.tanggalLahir.getMonth(), k.tanggalLahir.getDate());
      if (match) {
        events.push({
          fullName: k.namaLengkap,
          employeeNumber: k.nomorKaryawan,
          kind: "ULTAH",
          date: match.toISOString().slice(0, 10),
          info: "Berulang tahun",
        });
      }
    }
    if (k.tanggalMasuk) {
      const match = within7Days(k.tanggalMasuk.getMonth(), k.tanggalMasuk.getDate());
      const yearsOfService = now.getFullYear() - k.tanggalMasuk.getFullYear();
      if (match && yearsOfService >= 1) {
        events.push({
          fullName: k.namaLengkap,
          employeeNumber: k.nomorKaryawan,
          kind: "ANNIV",
          date: match.toISOString().slice(0, 10),
          info: `${yearsOfService} tahun bergabung`,
        });
      }
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 50);
}

// ============================================================
// Wrapper berizin (ADMIN_HR/SUPER_ADMIN) untuk UI.
// ============================================================

export async function createAnnouncement(
  input: { title: string; body: string; orgUnitId?: string; endsAt?: string },
  userId: string,
) {
  if (!(await allowed())) return { success: false, message: "Anda tidak memiliki izin." };
  return createAnnouncementCore(input, userId);
}

export async function publishAnnouncement(id: string) {
  if (!(await allowed())) return { success: false, message: "Anda tidak memiliki izin." };
  return publishAnnouncementCore(id, await actorId());
}

export async function archiveAnnouncement(id: string) {
  if (!(await allowed())) return { success: false, message: "Anda tidak memiliki izin." };
  return archiveAnnouncementCore(id, await actorId());
}

export async function deleteAnnouncement(id: string) {
  if (!(await allowed())) return { success: false, message: "Anda tidak memiliki izin." };
  return deleteAnnouncementCore(id);
}

export async function listHrAnnouncements() {
  if (!(await allowed())) return [];
  return listHrAnnouncementsCore();
}

export async function getUnitOptions(): Promise<Array<{ value: string; label: string }>> {
	const rows = await prisma.unitOrganisasi.findMany({
		orderBy: { nama: "asc" },
		select: { id: true, nama: true, kode: true },
	});
	return rows.map((r) => ({ value: r.id, label: r.kode ? `${r.nama} (${r.kode})` : r.nama }));
}
