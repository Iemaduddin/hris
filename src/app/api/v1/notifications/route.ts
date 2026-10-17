import { NextRequest } from "next/server";
import prisma from "@/src/lib/prisma";
import { fail, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";

/**
 * GET: daftar notifikasi milik sendiri (?unread=1 untuk badge).
 * PUT: {id | "all"} tandai dibaca.
 * POST: preferensi {pushEnabled, emailEnabled} atau ambil preferensi bila kosong.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);

  const unreadOnly = request.nextUrl.searchParams.get("unread") === "1";
  const [unreadCount, items, pref] = await Promise.all([
    prisma.notifikasi.count({ where: { userId: ctx.userId, dibacaPada: null } }),
    prisma.notifikasi.findMany({
      where: { userId: ctx.userId, ...(unreadOnly ? { dibacaPada: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.preferensiNotifikasi.findUnique({ where: { userId: ctx.userId } }),
  ]);
  return ok({
    unreadCount,
    preferences: { pushEnabled: pref?.pushAktif ?? true, emailEnabled: pref?.emailAktif ?? true },
    items: items.map((n) => ({
      id: n.id,
      title: n.judul,
      body: n.isi,
      kind: n.jenis,
      referenceType: n.referensiType,
      referenceId: n.referensiId,
      url: n.url,
      isRead: n.dibacaPada !== null,
      time: n.createdAt,
    })),
  });
}

export async function PUT(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);

  const body = await readJson(request);
  const id = str(body?.["id"]);
  if (!id) return fail("id wajib diisi (atau \"all\").", 422);
  if (id === "all") {
    await prisma.notifikasi.updateMany({
      where: { userId: ctx.userId, dibacaPada: null },
      data: { dibacaPada: new Date() },
    });
  } else {
    await prisma.notifikasi.updateMany({
      where: { id, userId: ctx.userId },
      data: { dibacaPada: new Date() },
    });
  }
  return ok({ message: "Ditandai dibaca." });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);

  const body = await readJson(request);
  const pushEnabled = body?.["pushEnabled"];
  const emailEnabled = body?.["emailEnabled"];
  if (typeof pushEnabled !== "boolean" || typeof emailEnabled !== "boolean") {
    return fail("pushEnabled dan emailEnabled (boolean) wajib diisi.", 422);
  }
  await prisma.preferensiNotifikasi.upsert({
    where: { userId: ctx.userId },
    create: { userId: ctx.userId, pushAktif: pushEnabled, emailAktif: emailEnabled },
    update: { pushAktif: pushEnabled, emailAktif: emailEnabled },
  });
  return ok({ message: "Preferensi tersimpan." });
}
