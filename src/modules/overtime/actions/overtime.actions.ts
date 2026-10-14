"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { toTimeValue } from "@/src/lib/time";
import { mulaiAlurApproval } from "@/src/modules/approval/lib/approval-engine";
import { getPengaturanPayroll } from "@/src/modules/payroll/lib/calculate";
import {
  KUNCI_LEMBUR_MAX_JAM,
  cekCapLembur,
  parseMaxJam,
} from "@/src/modules/payroll/lib/lembur";

export type LemburActionResult = { success: boolean; message: string; id?: string };

export type LemburItem = {
	id: string;
	karyawanId: string;
	karyawanNama: string;
	tanggal: string;
	jamMulai: string;
	jamSelesai: string;
	jumlahJam: string;
	alasan: string;
	status: string;
};

export async function getLemburList(filter?: { karyawanId?: string; status?: string }): Promise<LemburItem[]> {
	const rows = await prisma.lembur.findMany({
		where: {
			...(filter?.karyawanId ? { karyawanId: filter.karyawanId } : {}),
			...(filter?.status ? { status: filter.status as never } : {}),
		},
		orderBy: { tanggal: "desc" },
		include: { karyawan: { select: { namaLengkap: true } } },
	});
	const fmt = (d: Date | null) => {
		if (!d) return "-";
		const p = (n: number) => String(n).padStart(2, "0");
		return `${p(d.getHours())}:${p(d.getMinutes())}`;
	};
	return rows.map((r) => ({
		id: r.id,
		karyawanId: r.karyawanId,
		karyawanNama: r.karyawan.namaLengkap,
		tanggal: r.tanggal.toISOString().slice(0, 10),
		jamMulai: fmt(r.jamMulai),
		jamSelesai: fmt(r.jamSelesai),
		jumlahJam: r.jumlahJam.toString(),
		alasan: r.alasan,
		status: r.status,
	}));
}

function hitungJam(mulai: string, selesai: string): number | null {
	const m = /^(\d{1,2}):(\d{2})$/.exec(mulai);
	const s = /^(\d{1,2}):(\d{2})$/.exec(selesai);
	if (!m || !s) return null;
	const start = Number(m[1]) * 60 + Number(m[2]);
	const end0 = Number(s[1]) * 60 + Number(s[2]);
	const end = end0 <= start ? end0 + 24 * 60 : end0;
	const diff = (end - start) / 60;
	if (diff <= 0 || diff > 12) return null;
	return Math.round(diff * 100) / 100;
}

export async function buatLembur(input: {
	karyawanId: string;
	tanggal: string;
	jamMulai: string;
	jamSelesai: string;
	alasan: string;
}): Promise<LemburActionResult> {
	const jumlah = hitungJam(input.jamMulai, input.jamSelesai);
	if (jumlah === null) return { success: false, message: "Rentang jam tidak valid (maks 12 jam)." };
	if (!input.alasan.trim()) return { success: false, message: "Alasan wajib diisi." };

	// Cap jam lembur per bulan (pengajuan + berjalan + disetujui).
	const tgl = new Date(`${input.tanggal}T00:00:00`);
	if (Number.isNaN(tgl.getTime())) return { success: false, message: "Tanggal tidak valid." };
	const awalBulan = new Date(tgl.getFullYear(), tgl.getMonth(), 1);
	const akhirBulan = new Date(tgl.getFullYear(), tgl.getMonth() + 1, 0, 23, 59, 59, 999);
	const pengaturan = await getPengaturanPayroll();
	const maxJam = parseMaxJam(pengaturan[KUNCI_LEMBUR_MAX_JAM]);
	if (maxJam !== null) {
		const agg = await prisma.lembur.aggregate({
			where: {
				karyawanId: input.karyawanId,
				tanggal: { gte: awalBulan, lte: akhirBulan },
				status: { in: ["DRAFT", "DIAJUKAN", "DISETUJUI"] as never },
			},
			_sum: { jumlahJam: true },
		});
		const berjalan = Number(agg._sum.jumlahJam ?? 0);
		if (!cekCapLembur(berjalan, jumlah, maxJam)) {
			return {
				success: false,
				message: `Melebihi batas ${maxJam} jam/bulan (berjalan ${berjalan} jam + ${jumlah} jam).`,
			};
		}
	}

	const created = await prisma.lembur.create({
		data: {
			karyawanId: input.karyawanId,
			tanggal: new Date(input.tanggal),
			jamMulai: toTimeValue(input.jamMulai),
			jamSelesai: toTimeValue(input.jamSelesai),
			jumlahJam: jumlah,
			alasan: input.alasan.trim(),
			status: "DRAFT",
		},
	});
	revalidatePath("/overtime");
	return { success: true, message: `Draf lembur ${jumlah} jam tersimpan.`, id: created.id };
}

export async function ajukanLembur(id: string): Promise<LemburActionResult> {
	const row = await prisma.lembur.findUnique({ where: { id } });
	if (!row || row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa diajukan." };
	await prisma.lembur.update({ where: { id }, data: { status: "DIAJUKAN" } });
	await mulaiAlurApproval("LEMBUR", id);
	revalidatePath("/overtime");
	return { success: true, message: "Lembur dikirim ke atasan." };
}

export async function batalLembur(id: string): Promise<LemburActionResult> {
	const row = await prisma.lembur.findUnique({ where: { id } });
	if (!row || !["DRAFT", "DIAJUKAN"].includes(row.status as string)) {
		return { success: false, message: "Status ini tidak bisa dibatalkan." };
	}
	await prisma.lembur.delete({ where: { id } });
	await prisma.approvalStep.deleteMany({ where: { referensiType: "LEMBUR", referensiId: id } });
	revalidatePath("/overtime");
	return { success: true, message: "Pengajuan lembur dibatalkan." };
}
