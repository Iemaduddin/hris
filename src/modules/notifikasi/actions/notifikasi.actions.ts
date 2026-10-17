"use server";

import prisma from "@/src/lib/prisma";
import { getCurrentSession } from "@/src/lib/auth-guard";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  kind: string;
  url: string | null;
  isRead: boolean;
  time: string;
};

export type PreferencesItem = { pushEnabled: boolean; emailEnabled: boolean };

async function currentUserId(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.user?.id ?? null;
}

function toItem(r: {
  id: string;
  judul: string;
  isi: string;
  jenis: string;
  url: string | null;
  dibacaPada: Date | null;
  createdAt: Date;
}): NotificationItem {
  return {
    id: r.id,
    title: r.judul,
    body: r.isi,
    kind: r.jenis,
    url: r.url,
    isRead: r.dibacaPada !== null,
    time: r.createdAt.toISOString(),
  };
}

/** Badge topbar: jumlah belum dibaca + 5 terbaru. */
export async function getNotificationSummary(): Promise<{ unreadCount: number; latest: NotificationItem[] }> {
  const userId = await currentUserId();
  if (!userId) return { unreadCount: 0, latest: [] };
  const [unreadCount, rows] = await Promise.all([
    prisma.notifikasi.count({ where: { userId, dibacaPada: null } }),
    prisma.notifikasi.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  return { unreadCount, latest: rows.map(toItem) };
}

export async function getMyNotifications(): Promise<NotificationItem[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const rows = await prisma.notifikasi.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(toItem);
}

export async function markNotifications(id: string | "all"): Promise<{ success: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { success: false };
  if (id === "all") {
    await prisma.notifikasi.updateMany({ where: { userId, dibacaPada: null }, data: { dibacaPada: new Date() } });
  } else {
    await prisma.notifikasi.updateMany({ where: { id, userId }, data: { dibacaPada: new Date() } });
  }
  return { success: true };
}

export async function getMyPreferences(): Promise<PreferencesItem> {
  const userId = await currentUserId();
  if (!userId) return { pushEnabled: true, emailEnabled: true };
  const row = await prisma.preferensiNotifikasi.findUnique({ where: { userId } });
  return { pushEnabled: row?.pushAktif ?? true, emailEnabled: row?.emailAktif ?? true };
}

export async function savePreferences(input: { pushEnabled: boolean; emailEnabled: boolean }): Promise<{ success: boolean; message: string }> {
  const userId = await currentUserId();
  if (!userId) return { success: false, message: "Sesi berakhir." };
  await prisma.preferensiNotifikasi.upsert({
    where: { userId },
    create: { userId, pushAktif: input.pushEnabled, emailAktif: input.emailEnabled },
    update: { pushAktif: input.pushEnabled, emailAktif: input.emailEnabled },
  });
  return { success: true, message: "Preferensi tersimpan." };
}
