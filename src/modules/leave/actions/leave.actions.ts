"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/src/lib/prisma";
import { nomorUrut } from "@/src/lib/numbering";
import { toDbDate } from "@/src/lib/time";
import { mulaiAlurApproval } from "@/src/modules/approval/lib/approval-engine";
import { generateSaldoTahunan, getSaldo, hitungHariPengajuan, kembalikanSaldo } from "../lib/balance";

export type CutiActionResult = { success: boolean; message: string; id?: string };

export type JenisCutiItem = {
	id: number;
	kode: string;
	nama: string;
	kategori: string;
	menggunakanSaldo: boolean;
	jatahTahunan: string | null;
	wajibLampiran: boolean;
	isActive: boolean;
};

export async function getJenisCutiList(): Promise<JenisCutiItem[]> {
	const rows = await prisma.jenisKetidakhadiran.findMany({ orderBy: { kode: "asc" } });
	return rows.map((r) => ({
		id: r.id,
		kode: r.kode,
		nama: r.nama,
		kategori: r.kategori,
		menggunakanSaldo: r.menggunakanSaldo,
		jatahTahunan: r.jatahTahunan?.toString() ?? null,
		wajibLampiran: r.wajibLampiran,
		isActive: r.isActive,
	}));
}

export async function saveJenisCuti(formData: FormData): Promise<CutiActionResult> {
	const idRaw = String(formData.get("id") ?? "").trim();
	const kode = String(formData.get("kode") ?? "").trim().toUpperCase();
	const nama = String(formData.get("nama") ?? "").trim();
	const kategori = String(formData.get("kategori") ?? "CUTI");
	const menggunakanSaldo = String(formData.get("menggunakanSaldo") ?? "") === "true";
	const jatahRaw = String(formData.get("jatahTahunan") ?? "").trim();
	const wajibLampiran = String(formData.get("wajibLampiran") ?? "") === "true";
	const isActive = String(formData.get("isActive") ?? "") !== "false";

	if (!kode || !nama) return { success: false, message: "Kode dan nama wajib diisi." };
	if (kategori !== "CUTI" && kategori !== "IZIN") return { success: false, message: "Kategori tidak valid." };
	const jatah = menggunakanSaldo ? Number(jatahRaw) : null;
	if (menggunakanSaldo && (Number.isNaN(jatah as number) || (jatah as number) < 0)) {
		return { success: false, message: "Jatah tahunan tidak valid." };
	}

	try {
		if (idRaw) {
			await prisma.jenisKetidakhadiran.update({
				where: { id: Number(idRaw) },
				data: { kode, nama, kategori: kategori as never, menggunakanSaldo, jatahTahunan: jatah, wajibLampiran, isActive },
			});
		} else {
			await prisma.jenisKetidakhadiran.create({
				data: { kode, nama, kategori: kategori as never, menggunakanSaldo, jatahTahunan: jatah, wajibLampiran, isActive },
			});
		}
		revalidatePath("/settings/leave-types");
		return { success: true, message: "Jenis ketidakhadiran tersimpan." };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return { success: false, message: "Kode sudah digunakan." };
		}
		return { success: false, message: "Gagal menyimpan jenis." };
	}
}

export async function deleteJenisCuti(id: number): Promise<CutiActionResult> {
	try {
		await prisma.jenisKetidakhadiran.delete({ where: { id } });
		revalidatePath("/settings/leave-types");
		return { success: true, message: "Jenis dihapus." };
	} catch {
		return { success: false, message: "Gagal menghapus. Jenis sudah dipakai pengajuan/saldo." };
	}
}

export type SaldoCutiItem = {
	id: number;
	karyawanId: string;
	karyawanNama: string;
	jenisNama: string;
	tahun: number;
	saldoAwal: string;
	saldoAkhir: string;
};

export async function getSaldoCutiList(tahun: number, karyawanId?: string): Promise<SaldoCutiItem[]> {
	const rows = await prisma.saldoCuti.findMany({
		where: { tahun, ...(karyawanId ? { karyawanId } : {}) },
		orderBy: [{ karyawan: { namaLengkap: "asc" } }],
		include: {
			karyawan: { select: { namaLengkap: true } },
			jenisKetidakhadiran: { select: { nama: true } },
		},
	});
	return rows.map((r) => ({
		id: r.id,
		karyawanId: r.karyawanId,
		karyawanNama: r.karyawan.namaLengkap,
		jenisNama: r.jenisKetidakhadiran.nama,
		tahun: r.tahun,
		saldoAwal: r.saldoAwal.toString(),
		saldoAkhir: r.saldoAkhir.toString(),
	}));
}

export async function getSisaSaldoSaya(karyawanId: string, tahun: number) {
	const rows = await prisma.saldoCuti.findMany({
		where: { karyawanId, tahun },
		include: { jenisKetidakhadiran: { select: { nama: true, kode: true } } },
	});
	return rows.map((r) => ({ jenis: r.jenisKetidakhadiran.nama, sisa: r.saldoAkhir.toString() }));
}

export async function generateSaldoAction(tahun: number): Promise<CutiActionResult> {
	if (!tahun || tahun < 2000 || tahun > 2100) return { success: false, message: "Tahun tidak valid." };
	const result = await generateSaldoTahunan(tahun);
	revalidatePath("/settings/leave-types");
	revalidatePath("/leave");
	return { success: true, message: `Saldo ${tahun} dibuat: ${result.dibuat} baru, ${result.dilewati} sudah ada.` };
}

export type PengajuanCutiItem = {
	id: string;
	nomor: string;
	karyawanId: string;
	karyawanNama: string;
	jenisNama: string;
	menggunakanSaldo: boolean;
	mulai: string;
	selesai: string;
	jumlahHari: string;
	status: string;
};

export async function getPengajuanCuti(filter?: { karyawanId?: string; status?: string }): Promise<PengajuanCutiItem[]> {
	const rows = await prisma.pengajuanKetidakhadiran.findMany({
		where: {
			...(filter?.karyawanId ? { karyawanId: filter.karyawanId } : {}),
			...(filter?.status ? { status: filter.status as never } : {}),
		},
		orderBy: { createdAt: "desc" },
		include: {
			karyawan: { select: { namaLengkap: true } },
			jenisKetidakhadiran: { select: { nama: true, menggunakanSaldo: true } },
		},
	});
	return rows.map((r) => ({
		id: r.id,
		nomor: r.nomorPengajuan,
		karyawanId: r.karyawanId,
		karyawanNama: r.karyawan.namaLengkap,
		jenisNama: r.jenisKetidakhadiran.nama,
		menggunakanSaldo: r.jenisKetidakhadiran.menggunakanSaldo,
		mulai: r.tanggalMulai.toISOString().slice(0, 10),
		selesai: r.tanggalSelesai.toISOString().slice(0, 10),
		jumlahHari: r.jumlahHari.toString(),
		status: r.status,
	}));
}

async function cekTumpangTindih(karyawanId: string, mulai: Date, selesai: Date, kecualiId?: string): Promise<boolean> {
	const clash = await prisma.pengajuanKetidakhadiran.findFirst({
		where: {
			karyawanId,
			...(kecualiId ? { NOT: { id: kecualiId } } : {}),
			status: { in: ["DIAJUKAN", "MENUNGGU_APPROVAL", "DISETUJUI"] as never },
			tanggalMulai: { lte: selesai },
			tanggalSelesai: { gte: mulai },
		},
		select: { id: true },
	});
	return Boolean(clash);
}

export async function buatPengajuanCuti(input: {
	karyawanId: string;
	jenisId: number;
	mulai: string;
	selesai: string;
	alasan?: string;
	alamat?: string;
	telpDarurat?: string;
	lampiran?: string;
}): Promise<CutiActionResult> {
	const mulai = toDbDate(input.mulai);
	const selesai = toDbDate(input.selesai);
	if (!(mulai <= selesai)) return { success: false, message: "Rentang tanggal tidak valid." };

	const jenis = await prisma.jenisKetidakhadiran.findUnique({ where: { id: input.jenisId } });
	if (!jenis || !jenis.isActive) return { success: false, message: "Jenis ketidakhadiran tidak valid." };
	if (jenis.wajibLampiran && !input.lampiran) {
		return { success: false, message: "Jenis ini mewajibkan lampiran." };
	}
	if (await cekTumpangTindih(input.karyawanId, mulai, selesai)) {
		return { success: false, message: "Bertabrakan dengan pengajuan aktif lain." };
	}

	const jumlahHari = await hitungHariPengajuan(mulai, selesai);
	if (jumlahHari <= 0) return { success: false, message: "Periode hanya berisi hari libur." };

	const nomor = await nomorUrut("CUTI", mulai.getUTCFullYear());
	const created = await prisma.pengajuanKetidakhadiran.create({
		data: {
			nomorPengajuan: nomor,
			karyawanId: input.karyawanId,
			jenisKetidakhadiranId: input.jenisId,
			tanggalMulai: mulai,
			tanggalSelesai: selesai,
			jumlahHari: jumlahHari,
			alasan: input.alasan || null,
			alamatSelamaTidakHadir: input.alamat || null,
			nomorTeleponDarurat: input.telpDarurat || null,
			urlLampiran: input.lampiran || null,
			status: "DRAFT",
		},
	});

	revalidatePath("/leave");
	return { success: true, message: `Draf tersimpan (${jumlahHari} hari).`, id: created.id };
}

export async function ajukanCuti(id: string): Promise<CutiActionResult> {
	const pengajuan = await prisma.pengajuanKetidakhadiran.findUnique({
		where: { id },
		include: { jenisKetidakhadiran: { select: { menggunakanSaldo: true } } },
	});
	if (!pengajuan || pengajuan.status !== "DRAFT") {
		return { success: false, message: "Hanya draf yang bisa diajukan." };
	}

	if (pengajuan.jenisKetidakhadiran.menggunakanSaldo) {
		const tahun = new Date(pengajuan.tanggalMulai).getUTCFullYear();
		const saldo = await getSaldo(pengajuan.karyawanId, pengajuan.jenisKetidakhadiranId, tahun);
		if (!saldo || Number(saldo.saldoAkhir) < Number(pengajuan.jumlahHari)) {
			return { success: false, message: `Saldo tidak cukup (sisa ${saldo?.saldoAkhir ?? 0}).` };
		}
	}

	await mulaiAlurApproval("CUTI", id);
	revalidatePath("/leave");
	return { success: true, message: "Pengajuan dikirim ke atasan." };
}

export async function batalCuti(id: string, isHr: boolean): Promise<CutiActionResult> {
	const pengajuan = await prisma.pengajuanKetidakhadiran.findUnique({ where: { id } });
	if (!pengajuan) return { success: false, message: "Pengajuan tidak ditemukan." };

	if (["DIAJUKAN", "MENUNGGU_APPROVAL", "DRAFT"].includes(pengajuan.status as string)) {
		await prisma.pengajuanKetidakhadiran.update({ where: { id }, data: { status: "DIBATALKAN" } });
		await prisma.approvalStep.deleteMany({ where: { referensiType: "CUTI", referensiId: id } });
		revalidatePath("/leave");
		return { success: true, message: "Pengajuan dibatalkan." };
	}

	if (pengajuan.status === "DISETUJUI" && isHr) {
		const tahun = new Date(pengajuan.tanggalMulai).getUTCFullYear();
		await kembalikanSaldo(
			pengajuan.karyawanId,
			pengajuan.jenisKetidakhadiranId,
			tahun,
			Number(pengajuan.jumlahHari),
			id,
			`Pembatalan ${pengajuan.nomorPengajuan}`,
		);
		await prisma.pengajuanKetidakhadiran.update({ where: { id }, data: { status: "DIBATALKAN" } });
		revalidatePath("/leave");
		return { success: true, message: "Dibatalkan dan saldo dikembalikan." };
	}

	return { success: false, message: "Status ini tidak bisa dibatalkan." };
}
