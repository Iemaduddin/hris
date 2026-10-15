import prisma from "@/src/lib/prisma";

export type AuditInput = {
	actorUserId?: string | null;
	aksi: string;
	entityType: string;
	entityId?: string | null;
	sebelum?: unknown;
	alasan?: string | null;
	sesudah?: unknown;
};

function keJson(value: unknown): never | undefined {
	if (value === undefined) return undefined;
	try {
		return JSON.parse(JSON.stringify(value)) as never;
	} catch {
		return undefined;
	}
}

/** Tulis jejak audit. Best-effort: kegagalan tidak menggagalkan aksi utama. */
export async function catatAudit(input: AuditInput): Promise<void> {
	try {
		let actorNama: string | null = null;
		let actorRole: string | null = null;
		if (input.actorUserId) {
			const user = await prisma.user.findUnique({
				where: { id: input.actorUserId },
				select: { name: true, role: true },
			});
			actorNama = user?.name ?? null;
			actorRole = user?.role ?? null;
		}
		await prisma.auditLog.create({
			data: {
				actorUserId: input.actorUserId ?? null,
				actorNama,
				actorRole,
				aksi: input.aksi,
				entityType: input.entityType,
				entityId: input.entityId ?? null,
				sebelum: keJson(input.sebelum),
				sesudah: keJson(input.sesudah),
				alasan: input.alasan ?? null,
			},
		});
	} catch {
		// abaikan — audit pelengkap, aksi utama lebih prioritas
	}
}

export type AuditFilter = {
	aksi?: string;
	entityType?: string;
	q?: string;
	take?: number;
};

export async function getAuditLogs(filter: AuditFilter = {}) {
	const take = Math.min(Math.max(filter.take ?? 100, 1), 500);
	const rows = await prisma.auditLog.findMany({
		where: {
			...(filter.aksi ? { aksi: filter.aksi } : {}),
			...(filter.entityType ? { entityType: filter.entityType } : {}),
			...(filter.q
				? {
						OR: [
							{ actorNama: { contains: filter.q, mode: "insensitive" } },
							{ entityId: { contains: filter.q, mode: "insensitive" } },
							{ alasan: { contains: filter.q, mode: "insensitive" } },
						],
					}
				: {}),
		},
		orderBy: { waktu: "desc" },
		take,
	});
	return rows.map((r) => ({
		id: r.id,
		waktu: r.waktu.toISOString(),
		actorNama: r.actorNama,
		actorRole: r.actorRole,
		aksi: r.aksi,
		entityType: r.entityType,
		entityId: r.entityId,
		alasan: r.alasan,
		sebelum: (r.sebelum ?? null) as unknown,
		sesudah: (r.sesudah ?? null) as unknown,
	}));
}
