"use server";

import prisma from "@/src/lib/prisma";
import { getCurrentSession } from "@/src/lib/auth-guard";
import { getAuditLogs } from "@/src/modules/audit/lib/audit";

export type AuditRow = {
	id: string;
	waktu: string;
	actorNama: string | null;
	actorRole: string | null;
	aksi: string;
	entityType: string;
	entityId: string | null;
	reason: string | null;
	sebelum: unknown;
	sesudah: unknown;
};

export async function getAuditLogList(filter: {
	aksi?: string;
	entityType?: string;
	q?: string;
}): Promise<AuditRow[]> {
	const session = await getCurrentSession();
	if (!session) return [];
	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { role: true },
	});
	if (!user || !["SUPER_ADMIN", "ADMIN_HR", "FINANCE"].includes(user.role)) return [];
	return getAuditLogs({
		aksi: filter.aksi || undefined,
		entityType: filter.entityType || undefined,
		q: filter.q || undefined,
		take: 200,
	});
}
