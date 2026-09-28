import prisma from "@/src/lib/prisma";
import { kirimPush, type PesanPush } from "@/src/lib/push";
import { getRingkasanPengajuan, type ReferensiType } from "./approval-engine";

/**
 * Notifikasi push ke pemohon saat pengajuan disetujui/ditolak
 * (PRD mobile Bag. 5.8). Best-effort: kegagalan push tidak boleh
 * menggagalkan hasil approval — semua galat ditangkap di sini.
 */

const SLUG_JENIS: Record<ReferensiType, string> = {
	CUTI: "cuti",
	LEMBUR: "lembur",
	DINAS: "dinas",
};

export type StatusKeputusan = "DISETUJUI" | "DITOLAK";

export async function notifikasiKeputusanPengajuan(
	type: ReferensiType,
	id: string,
	status: StatusKeputusan,
): Promise<void> {
	try {
		const detail = await getRingkasanPengajuan(type, id);
		if (!detail) return;

		const devices = await prisma.perangkatKaryawan.findMany({
			where: { karyawanId: detail.karyawanId, isActive: true, pushToken: { not: null } },
			select: { pushToken: true },
		});
		const tokens = [
			...new Set(devices.map((d) => d.pushToken).filter((t): t is string => Boolean(t))),
		];
		if (tokens.length === 0) return;

		const disetujui = status === "DISETUJUI";
		const slug = SLUG_JENIS[type];
		const url = `/requests/detail?id=${encodeURIComponent(detail.id)}&jenis=${slug}`;

		const messages: PesanPush[] = tokens.map((to) => ({
			to,
			title: disetujui ? "Pengajuan Disetujui" : "Pengajuan Ditolak",
			body: `${detail.nomor} • ${detail.ringkasan} — ${disetujui ? "disetujui" : "ditolak"}.`,
			sound: "default",
			priority: "high",
			data: { url, jenis: slug, id: detail.id, status },
		}));

		await kirimPush(messages);
	} catch (error) {
		console.warn(
			"[approval-notify] Gagal mengirim notifikasi:",
			error instanceof Error ? error.message : error,
		);
	}
}
