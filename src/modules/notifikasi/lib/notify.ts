import prisma from "@/src/lib/prisma";
import { kirimPush, type PesanPush } from "@/src/lib/push";
import { kirimEmail } from "@/src/lib/email";

export type JenisNotifikasiInput = "PENGAJUAN_MASUK" | "KEPUTUSAN" | "INFO";

export type NotifikasiInput = {
	userId: string;
	judul: string;
	isi: string;
	jenis?: JenisNotifikasiInput;
	referensiType?: string;
	referensiId?: string;
	/** Deep-link web (mis. /approval). Mobile memakai referensiType/Id. */
	url?: string;
	/** Data push mobile (deep-link + id + status). */
	pushData?: Record<string, unknown>;
};

async function preferensi(userId: string): Promise<{ pushAktif: boolean; emailAktif: boolean }> {
	const row = await prisma.preferensiNotifikasi.findUnique({ where: { userId } });
	return { pushAktif: row?.pushAktif ?? true, emailAktif: row?.emailAktif ?? true };
}

/**
 * Tulis notifikasi terpadu: in-app selalu disimpan, push + email
 * mengikuti preferensi per-user. Best-effort: tak pernah melempar.
 */
export async function kirimNotifikasi(input: NotifikasiInput): Promise<void> {
	try {
		if (!input.userId) return;
		const user = await prisma.user.findUnique({
			where: { id: input.userId },
			select: { id: true, isActive: true, email: true },
		});
		if (!user || user.isActive === false) return;

		await prisma.notifikasi.create({
			data: {
				userId: user.id,
				judul: input.judul,
				isi: input.isi,
				jenis: (input.jenis ?? "INFO") as never,
				referensiType: input.referensiType ?? null,
				referensiId: input.referensiId ?? null,
				url: input.url ?? null,
			},
		});

		const pref = await preferensi(user.id);

		if (pref.pushAktif) {
			const karyawan = await prisma.karyawan.findFirst({
				where: { userId: user.id },
				select: { id: true },
			});
			if (karyawan) {
				const devices = await prisma.perangkatKaryawan.findMany({
					where: { karyawanId: karyawan.id, isActive: true, pushToken: { not: null } },
					select: { pushToken: true },
				});
				const tokens = [...new Set(devices.map((d) => d.pushToken).filter((t): t is string => Boolean(t)))];
				if (tokens.length > 0) {
					const messages: PesanPush[] = tokens.map((to) => ({
						to,
						title: input.judul,
						body: input.isi,
						sound: "default",
						priority: "high",
						data: input.pushData ?? { url: input.url ?? null },
					}));
					await kirimPush(messages);
				}
			}
		}

		if (pref.emailAktif && user.email) {
			await kirimEmail(user.email, `[HRIS] ${input.judul}`, `${input.isi}${input.url ? `\n\nBuka: ${input.url}` : ""}`);
		}
	} catch (error) {
		console.warn("[notifikasi] Gagal mengirim:", error instanceof Error ? error.message : error);
	}
}

/** ID user approver untuk satu tahap: personal (karyawan) atau semua HR aktif. */
export async function userApproverTahap(step: {
	approverKaryawanId: string | null;
	approverRole: string | null;
}): Promise<string[]> {
	if (step.approverKaryawanId) {
		const k = await prisma.karyawan.findUnique({
			where: { id: step.approverKaryawanId },
			select: { userId: true },
		});
		return k?.userId ? [k.userId] : [];
	}
	if (step.approverRole === "ADMIN_HR") {
		const hrs = await prisma.user.findMany({
			where: { role: { in: ["SUPER_ADMIN", "ADMIN_HR"] }, isActive: true },
			select: { id: true },
		});
		return hrs.map((h) => h.id);
	}
	return [];
}

/**
 * Beritahu semua approver tahap berjalan — dipanggil setiap pengajuan
 * masuk (semua tipe via mulaiAlurApproval + UPDATE_DATA via ajukanUpdateData).
 */
export async function beritahuApproverBaru(
	type: string,
	id: string,
	judul: string,
	isi: string,
	url: string,
	pushData?: Record<string, unknown>,
): Promise<void> {
	try {
		const steps = await prisma.approvalStep.findMany({
			where: { referensiType: type, referensiId: id, status: "MENUNGGU" },
			select: { approverKaryawanId: true, approverRole: true },
		});
		const userIds = new Set<string>();
		for (const s of steps) {
			for (const u of await userApproverTahap(s)) userIds.add(u);
		}
		for (const userId of userIds) {
			await kirimNotifikasi({
				userId,
				judul,
				isi,
				jenis: "PENGAJUAN_MASUK",
				referensiType: type,
				referensiId: id,
				url,
				pushData,
			});
		}
	} catch (error) {
		console.warn("[notifikasi] Gagal memberitahu approver:", error instanceof Error ? error.message : error);
	}
}
