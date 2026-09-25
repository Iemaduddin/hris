"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { nomorUrut } from "@/src/lib/numbering";
import { toDbDate } from "@/src/lib/time";
import { mulaiAlurApproval } from "@/src/modules/approval/lib/approval-engine";

export type DinasActionResult = { success: boolean; message: string; id?: string };

export type DinasItem = {
	id: string;
	nomor: string;
	karyawanId: string;
	karyawanNama: string;
	jenis: string;
	mulai: string;
	selesai: string;
	lokasi: string | null;
	status: string;
};

export async function getDinasList(filter?: { karyawanId?: string; status?: string }): Promise<DinasItem[]> {
	const rows = await prisma.dinasWFH.findMany({
		where: {
			...(filter?.karyawanId ? { karyawanId: filter.karyawanId } : {}),
			...(filter?.status ? { status: filter.status as never } : {}),
		},
		orderBy: { createdAt: "desc" },
		include: { karyawan: { select: { namaLengkap: true } } },
	});
	return rows.map((r) => ({
		id: r.id,
		nomor: r.nomorPengajuan,
		karyawanId: r.karyawanId,
		karyawanNama: r.karyawan.namaLengkap,
		jenis: r.jenis,
		mulai: r.tanggalMulai.toISOString().slice(0, 10),
		selesai: r.tanggalSelesai.toISOString().slice(0, 10),
		lokasi: r.lokasi,
		status: r.status,
	}));
}

export async function buatDinas(input: {
	karyawanId: string;
	jenis: string;
	mulai: string;
	selesai: string;
	lokasi?: string;
	keperluan?: string;
	lampiran?: string;
}): Promise<DinasActionResult> {
	const mulai = toDbDate(input.mulai);
	const selesai = toDbDate(input.selesai);
	if (!(mulai <= selesai)) return { success: false, message: "Rentang tanggal tidak valid." };
	if (input.jenis !== "DINAS_LUAR" && input.jenis !== "WFH") {
		return { success: false, message: "Jenis tidak valid." };
	}
	if (!input.keperluan?.trim()) return { success: false, message: "Keperluan wajib diisi." };

	const nomor = await nomorUrut("DINAS", mulai.getUTCFullYear());
	const created = await prisma.dinasWFH.create({
		data: {
			nomorPengajuan: nomor,
			karyawanId: input.karyawanId,
			jenis: input.jenis as never,
			tanggalMulai: mulai,
			tanggalSelesai: selesai,
			lokasi: input.lokasi || null,
			keperluan: input.keperluan.trim(),
			urlLampiran: input.lampiran || null,
			status: "DRAFT",
		},
	});
	revalidatePath("/duty");
	return { success: true, message: "Draf tersimpan.", id: created.id };
}

export async function ajukanDinas(id: string): Promise<DinasActionResult> {
	const row = await prisma.dinasWFH.findUnique({ where: { id } });
	if (!row || row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
	await mulaiAlurApproval("DINAS", id);
	revalidatePath("/duty");
	return { success: true, message: "Dikirim ke atasan." };
}

export async function batalDinas(id: string, isHr: boolean): Promise<DinasActionResult> {
	const row = await prisma.dinasWFH.findUnique({ where: { id } });
	if (!row) return { success: false, message: "Data tidak ditemukan." };
	const boleh =
		["DRAFT", "DIAJUKAN", "MENUNGGU_APPROVAL"].includes(row.status as string) ||
		(row.status === "DISETUJUI" && isHr);
	if (!boleh) return { success: false, message: "Status ini tidak bisa dibatalkan." };
	await prisma.dinasWFH.update({ where: { id }, data: { status: "DIBATALKAN" } });
	await prisma.approvalStep.deleteMany({ where: { referensiType: "DINAS", referensiId: id } });
	revalidatePath("/duty");
	return { success: true, message: "Dibatalkan." };
}
