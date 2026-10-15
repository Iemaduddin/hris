import prisma from "@/src/lib/prisma";
import { getRingkasanPengajuan, type ReferensiType } from "./approval-engine";
import { kirimNotifikasi } from "@/src/modules/notifikasi/lib/notify";

/** Beritahu pemohon saat pengajuan disetujui/ditolak (best-effort). */

const SLUG_JENIS: Record<ReferensiType, string> = {
	CUTI: "cuti",
	LEMBUR: "lembur",
	DINAS: "dinas",
	MUTASI: "mutasi",
	RESIGN: "resign",
	PROBATION: "probation",
	TUKAR_SHIFT: "tukar",
	KOREKSI: "koreksi",
	UPDATE_DATA: "updatedata",
	REIMBURSE: "reimburse",
	UANGDINAS: "uangdinas",
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

		const karyawan = await prisma.karyawan.findUnique({
			where: { id: detail.karyawanId },
			select: { userId: true },
		});
		if (!karyawan?.userId) return;

		const disetujui = status === "DISETUJUI";
		const slug = SLUG_JENIS[type];
		await kirimNotifikasi({
			userId: karyawan.userId,
			judul: disetujui ? "Pengajuan Disetujui" : "Pengajuan Ditolak",
			isi: `${detail.nomor} • ${detail.ringkasan} — ${disetujui ? "disetujui" : "ditolak"}.`,
			jenis: "KEPUTUSAN",
			referensiType: type,
			referensiId: id,
			url: "/account/requests",
			pushData: {
				url: `/requests/detail?id=${encodeURIComponent(detail.id)}&jenis=${slug}`,
				jenis: slug,
				id: detail.id,
				status,
			},
		});
	} catch (error) {
		console.warn(
			"[approval-notify] Gagal mengirim notifikasi:",
			error instanceof Error ? error.message : error,
		);
	}
}
