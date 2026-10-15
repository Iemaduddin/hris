"use server";

import prisma from "@/src/lib/prisma";
import { getCurrentSession } from "@/src/lib/auth-guard";

export type NotifikasiItem = {
	id: string;
	judul: string;
	isi: string;
	jenis: string;
	url: string | null;
	dibaca: boolean;
	waktu: string;
};

export type PreferensiItem = { pushAktif: boolean; emailAktif: boolean };

async function userIdSaya(): Promise<string | null> {
	const session = await getCurrentSession();
	return session?.user?.id ?? null;
}

function keItem(r: {
	id: string;
	judul: string;
	isi: string;
	jenis: string;
	url: string | null;
	dibacaPada: Date | null;
	createdAt: Date;
}): NotifikasiItem {
	return {
		id: r.id,
		judul: r.judul,
		isi: r.isi,
		jenis: r.jenis,
		url: r.url,
		dibaca: r.dibacaPada !== null,
		waktu: r.createdAt.toISOString(),
	};
}

/** Badge topbar: jumlah belum dibaca + 5 terbaru. */
export async function getRingkasanNotifikasi(): Promise<{ belumDibaca: number; terbaru: NotifikasiItem[] }> {
	const userId = await userIdSaya();
	if (!userId) return { belumDibaca: 0, terbaru: [] };
	const [belumDibaca, rows] = await Promise.all([
		prisma.notifikasi.count({ where: { userId, dibacaPada: null } }),
		prisma.notifikasi.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
	]);
	return { belumDibaca, terbaru: rows.map(keItem) };
}

export async function getNotifikasiSaya(): Promise<NotifikasiItem[]> {
	const userId = await userIdSaya();
	if (!userId) return [];
	const rows = await prisma.notifikasi.findMany({
		where: { userId },
		orderBy: { createdAt: "desc" },
		take: 100,
	});
	return rows.map(keItem);
}

export async function tandaiNotifikasi(id: string | "semua"): Promise<{ success: boolean }> {
	const userId = await userIdSaya();
	if (!userId) return { success: false };
	if (id === "semua") {
		await prisma.notifikasi.updateMany({ where: { userId, dibacaPada: null }, data: { dibacaPada: new Date() } });
	} else {
		await prisma.notifikasi.updateMany({ where: { id, userId }, data: { dibacaPada: new Date() } });
	}
	return { success: true };
}

export async function getPreferensiSaya(): Promise<PreferensiItem> {
	const userId = await userIdSaya();
	if (!userId) return { pushAktif: true, emailAktif: true };
	const row = await prisma.preferensiNotifikasi.findUnique({ where: { userId } });
	return { pushAktif: row?.pushAktif ?? true, emailAktif: row?.emailAktif ?? true };
}

export async function simpanPreferensi(input: { pushAktif: boolean; emailAktif: boolean }): Promise<{ success: boolean; message: string }> {
	const userId = await userIdSaya();
	if (!userId) return { success: false, message: "Sesi berakhir." };
	await prisma.preferensiNotifikasi.upsert({
		where: { userId },
		create: { userId, pushAktif: input.pushAktif, emailAktif: input.emailAktif },
		update: { pushAktif: input.pushAktif, emailAktif: input.emailAktif },
	});
	return { success: true, message: "Preferensi tersimpan." };
}
