"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/src/lib/prisma";
import { hitungGajiKaryawan } from "../lib/calculate";

export type PayrollActionResult = { success: boolean; message: string; id?: string };

export type KomponenItem = {
	id: string;
	kode: string;
	nama: string;
	kelompok: string;
	tipe: string;
	nilai: string;
	batasAtas: string | null;
	isActive: boolean;
	urutan: number;
};

export async function getKomponenList(): Promise<KomponenItem[]> {
	const rows = await prisma.komponenGaji.findMany({ orderBy: [{ urutan: "asc" }, { kode: "asc" }] });
	return rows.map((r) => ({
		id: r.id,
		kode: r.kode,
		nama: r.nama,
		kelompok: r.kelompok,
		tipe: r.tipe,
		nilai: r.nilai.toString(),
		batasAtas: r.batasAtas?.toString() ?? null,
		isActive: r.isActive,
		urutan: r.urutan,
	}));
}

const KELOMPOK = ["PENDAPATAN", "TUNJANGAN", "POTONGAN", "IURAN"];
const TIPE = ["NOMINAL", "PERSEN", "PER_HARI", "PER_JAM_LEMBUR", "PER_SHIFT_MALAM"];

export async function saveKomponen(formData: FormData): Promise<PayrollActionResult> {
	const id = String(formData.get("id") ?? "").trim();
	const kode = String(formData.get("kode") ?? "").trim().toUpperCase();
	const nama = String(formData.get("nama") ?? "").trim();
	const kelompok = String(formData.get("kelompok") ?? "");
	const tipe = String(formData.get("tipe") ?? "");
	const nilai = Number(String(formData.get("nilai") ?? "0"));
	const batasRaw = String(formData.get("batasAtas") ?? "").trim();
	const isActive = String(formData.get("isActive") ?? "") !== "false";

	if (!kode || !nama) return { success: false, message: "Kode dan nama wajib diisi." };
	if (!KELOMPOK.includes(kelompok)) return { success: false, message: "Kelompok tidak valid." };
	if (!TIPE.includes(tipe)) return { success: false, message: "Tipe tidak valid." };
	if (Number.isNaN(nilai) || nilai < 0) return { success: false, message: "Nilai tidak valid." };
	const batasAtas = batasRaw ? Number(batasRaw) : null;
	if (batasAtas !== null && (Number.isNaN(batasAtas) || batasAtas < 0)) {
		return { success: false, message: "Batas atas tidak valid." };
	}

	try {
		const data = {
			kode,
			nama,
			kelompok: kelompok as never,
			tipe: tipe as never,
			nilai,
			batasAtas,
			isActive,
		};
		if (id) {
			await prisma.komponenGaji.update({ where: { id }, data });
		} else {
			const maxUrutan = await prisma.komponenGaji.aggregate({ _max: { urutan: true } });
			await prisma.komponenGaji.create({ data: { ...data, urutan: (maxUrutan._max.urutan ?? 0) + 1 } });
		}
		revalidatePath("/payroll/salary-components");
		return { success: true, message: "Komponen tersimpan." };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return { success: false, message: "Kode sudah digunakan." };
		}
		return { success: false, message: "Gagal menyimpan komponen." };
	}
}

export async function deleteKomponen(id: string): Promise<PayrollActionResult> {
	try {
		await prisma.komponenGaji.delete({ where: { id } });
		revalidatePath("/payroll/salary-components");
		return { success: true, message: "Komponen dihapus." };
	} catch {
		return { success: false, message: "Gagal menghapus. Komponen sudah dipakai." };
	}
}

export async function seedKomponenDefault(): Promise<PayrollActionResult> {
	const defaults: Array<{
		kode: string;
		nama: string;
		kelompok: (typeof KELOMPOK)[number];
		tipe: (typeof TIPE)[number];
		nilai: number;
		batasAtas: number | null;
		urutan: number;
	}> = [
		{ kode: "TJ_JABATAN", nama: "Tunjangan Jabatan", kelompok: "TUNJANGAN", tipe: "NOMINAL", nilai: 0, batasAtas: null, urutan: 1 },
		{ kode: "TJ_KELUARGA", nama: "Tunjangan Keluarga", kelompok: "TUNJANGAN", tipe: "NOMINAL", nilai: 0, batasAtas: null, urutan: 2 },
		{ kode: "TJ_MAKAN", nama: "Tunjangan Makan (per hari hadir)", kelompok: "TUNJANGAN", tipe: "PER_HARI", nilai: 25000, batasAtas: null, urutan: 3 },
		{ kode: "TJ_TRANSPORT", nama: "Tunjangan Transport (per hari hadir)", kelompok: "TUNJANGAN", tipe: "PER_HARI", nilai: 20000, batasAtas: null, urutan: 4 },
		{ kode: "TJ_SHIFT_MALAM", nama: "Tunjangan Shift Malam (per shift)", kelompok: "TUNJANGAN", tipe: "PER_SHIFT_MALAM", nilai: 50000, batasAtas: null, urutan: 5 },
		{ kode: "UPAH_LEMBUR", nama: "Upah Lembur (per jam)", kelompok: "PENDAPATAN", tipe: "PER_JAM_LEMBUR", nilai: 50000, batasAtas: null, urutan: 6 },
		{ kode: "BPJS_KES", nama: "BPJS Kesehatan (1% karyawan)", kelompok: "IURAN", tipe: "PERSEN", nilai: 1, batasAtas: 12000000, urutan: 7 },
		{ kode: "BPJS_JHT", nama: "BPJS JHT (2% karyawan)", kelompok: "IURAN", tipe: "PERSEN", nilai: 2, batasAtas: null, urutan: 8 },
		{ kode: "BPJS_JP", nama: "BPJS JP (1% karyawan)", kelompok: "IURAN", tipe: "PERSEN", nilai: 1, batasAtas: 10500000, urutan: 9 },
		{ kode: "POTONGAN_ALPA", nama: "Potongan Alpa (GP/26 per hari)", kelompok: "POTONGAN", tipe: "PER_HARI", nilai: 0, batasAtas: null, urutan: 10 },
	];

	let dibuat = 0;
	for (const d of defaults) {
		const existing = await prisma.komponenGaji.findUnique({ where: { kode: d.kode } });
		if (existing) continue;
		await prisma.komponenGaji.create({
			data: { ...d, kelompok: d.kelompok as never, tipe: d.tipe as never },
		});
		dibuat++;
	}
	revalidatePath("/payroll/salary-components");
	return { success: true, message: dibuat > 0 ? `${dibuat} komponen default dibuat.` : "Komponen default sudah lengkap." };
}

export type GajiKaryawanItem = {
	karyawanId: string;
	karyawanNama: string;
	komponenIds: string[];
};

export async function getGajiKaryawanMap(): Promise<GajiKaryawanItem[]> {
	const karyawan = await prisma.karyawan.findMany({
		where: { status: { in: ["AKTIF", "PROBASI"] } },
		orderBy: { namaLengkap: "asc" },
		select: { id: true, namaLengkap: true, nomorKaryawan: true },
	});
	const assigns = await prisma.gajiKaryawan.findMany({
		where: { isActive: true },
		select: { karyawanId: true, komponenId: true },
	});
	return karyawan.map((k) => ({
		karyawanId: k.id,
		karyawanNama: `${k.namaLengkap} (${k.nomorKaryawan})`,
		komponenIds: assigns.filter((a) => a.karyawanId === k.id).map((a) => a.komponenId),
	}));
}

export async function simpanGajiKaryawan(karyawanId: string, komponenIds: string[]): Promise<PayrollActionResult> {
	if (!karyawanId) return { success: false, message: "Karyawan wajib dipilih." };
	await prisma.$transaction(async (tx) => {
		await tx.gajiKaryawan.deleteMany({ where: { karyawanId } });
		if (komponenIds.length > 0) {
			await tx.gajiKaryawan.createMany({
				data: komponenIds.map((komponenId) => ({ karyawanId, komponenId })),
			});
		}
	});
	revalidatePath("/payroll/salary-components");
	return { success: true, message: "Komponen karyawan tersimpan." };
}

export type SalaryRunItem = {
	id: string;
	periode: string;
	mulai: string;
	selesai: string;
	status: string;
	jumlahKaryawan: number;
	totalBersih: string;
};

export async function getSalaryRuns(): Promise<SalaryRunItem[]> {
	const runs = await prisma.salaryRun.findMany({
		orderBy: { periode: "desc" },
		include: { detail: { select: { gajiBersih: true } } },
	});
	return runs.map((r) => ({
		id: r.id,
		periode: r.periode,
		mulai: r.tanggalMulai.toISOString().slice(0, 10),
		selesai: r.tanggalSelesai.toISOString().slice(0, 10),
		status: r.status,
		jumlahKaryawan: r.detail.length,
		totalBersih: r.detail.reduce((acc, d) => acc + Number(d.gajiBersih), 0).toString(),
	}));
}

export async function buatSalaryRun(periode: string, createdById?: string): Promise<PayrollActionResult> {
	const match = /^(\d{4})-(\d{2})$/.exec(periode.trim());
	if (!match) return { success: false, message: "Periode format YYYY-MM." };
	const tahun = Number(match[1]);
	const bulan = Number(match[2]);
	if (bulan < 1 || bulan > 12) return { success: false, message: "Bulan tidak valid." };

	const mulai = new Date(Date.UTC(tahun, bulan - 1, 1));
	const last = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
	const selesai = new Date(Date.UTC(tahun, bulan - 1, last));

	try {
		const created = await prisma.salaryRun.create({
			data: { periode: `${tahun}-${String(bulan).padStart(2, "0")}`, tanggalMulai: mulai, tanggalSelesai: selesai, createdById },
		});
		revalidatePath("/payroll");
		return { success: true, message: "Salary run dibuat.", id: created.id };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return { success: false, message: "Periode sudah ada." };
		}
		return { success: false, message: "Gagal membuat salary run." };
	}
}

export async function hitungSalaryRun(runId: string): Promise<PayrollActionResult> {
	const run = await prisma.salaryRun.findUnique({ where: { id: runId } });
	if (!run) return { success: false, message: "Run tidak ditemukan." };
	if (run.status === "FINAL" || run.status === "DITERBITKAN") {
		return { success: false, message: "Run sudah final, tidak bisa dihitung ulang." };
	}

	const karyawan = await prisma.karyawan.findMany({
		where: { status: { in: ["AKTIF", "PROBASI"] } },
		select: { id: true },
	});

	await prisma.$transaction(async (tx) => {
		await tx.salaryRunDetail.deleteMany({ where: { runId } });
		for (const k of karyawan) {
			const hasil = await hitungGajiKaryawan(k.id, run.tanggalMulai, run.tanggalSelesai);
			await tx.salaryRunDetail.create({
				data: {
					runId,
					karyawanId: k.id,
					gajiPokok: hasil.gajiPokok,
					totalPendapatan: hasil.totalPendapatan,
					totalPotongan: hasil.totalPotongan,
					gajiBersih: hasil.gajiBersih,
					hariHadir: hasil.hariHadir,
					hariAlpa: hasil.hariAlpa,
					jamLembur: hasil.jamLembur,
					rincian: hasil.rincian as never,
				},
			});
		}
		await tx.salaryRun.update({ where: { id: runId }, data: { status: "DIHITUNG" } });
	});

	revalidatePath("/payroll");
	return { success: true, message: `Dihitung untuk ${karyawan.length} karyawan.` };
}

export async function finalisasiRun(runId: string): Promise<PayrollActionResult> {
	const run = await prisma.salaryRun.findUnique({ where: { id: runId }, include: { _count: { select: { detail: true } } } });
	if (!run) return { success: false, message: "Run tidak ditemukan." };
	if (run.status !== "DIHITUNG") return { success: false, message: "Hitung dulu sebelum finalisasi." };
	if (run._count.detail === 0) return { success: false, message: "Belum ada detail." };
	await prisma.salaryRun.update({ where: { id: runId }, data: { status: "FINAL" } });
	revalidatePath("/payroll");
	return { success: true, message: "Run dikunci (FINAL)." };
}

export async function terbitkanRun(runId: string): Promise<PayrollActionResult> {
	const run = await prisma.salaryRun.findUnique({
		where: { id: runId },
		include: { detail: { select: { karyawanId: true } } },
	});
	if (!run) return { success: false, message: "Run tidak ditemukan." };
	if (run.status !== "FINAL") return { success: false, message: "Finalisasi dulu sebelum terbit." };

	await prisma.$transaction(async (tx) => {
		for (const d of run.detail) {
			await tx.payslip.upsert({
				where: { runId_karyawanId: { runId, karyawanId: d.karyawanId } },
				update: {},
				create: {
					nomor: `SLIP-${run.periode}-${d.karyawanId.slice(-6).toUpperCase()}`,
					runId,
					karyawanId: d.karyawanId,
				},
			});
		}
		await tx.salaryRun.update({ where: { id: runId }, data: { status: "DITERBITKAN" } });
	});

	revalidatePath("/payroll");
	return { success: true, message: "Payslip diterbitkan." };
}

export async function hapusRun(runId: string): Promise<PayrollActionResult> {
	const run = await prisma.salaryRun.findUnique({ where: { id: runId }, select: { status: true } });
	if (!run) return { success: false, message: "Run tidak ditemukan." };
	if (run.status === "FINAL" || run.status === "DITERBITKAN") {
		return { success: false, message: "Run final tidak bisa dihapus." };
	}
	await prisma.salaryRun.delete({ where: { id: runId } });
	revalidatePath("/payroll");
	return { success: true, message: "Run dihapus." };
}

export type RunDetailItem = {
	id: string;
	karyawanId: string;
	karyawanNama: string;
	nomorKaryawan: string;
	gajiPokok: string;
	totalPendapatan: string;
	totalPotongan: string;
	gajiBersih: string;
	hariHadir: number;
	hariAlpa: number;
	rincian: Array<{ kode: string; nama: string; kelompok: string; jumlah: number; keterangan: string }>;
};

export async function getRunDetail(runId: string): Promise<{ run: SalaryRunItem | null; detail: RunDetailItem[] }> {
	const run = await prisma.salaryRun.findUnique({
		where: { id: runId },
		include: {
			detail: {
				orderBy: { karyawan: { namaLengkap: "asc" } },
				include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
			},
		},
	});
	if (!run) return { run: null, detail: [] };
	return {
		run: {
			id: run.id,
			periode: run.periode,
			mulai: run.tanggalMulai.toISOString().slice(0, 10),
			selesai: run.tanggalSelesai.toISOString().slice(0, 10),
			status: run.status,
			jumlahKaryawan: run.detail.length,
			totalBersih: run.detail.reduce((acc, d) => acc + Number(d.gajiBersih), 0).toString(),
		},
		detail: run.detail.map((d) => ({
			id: d.id,
			karyawanId: d.karyawanId,
			karyawanNama: d.karyawan.namaLengkap,
			nomorKaryawan: d.karyawan.nomorKaryawan,
			gajiPokok: d.gajiPokok.toString(),
			totalPendapatan: d.totalPendapatan.toString(),
			totalPotongan: d.totalPotongan.toString(),
			gajiBersih: d.gajiBersih.toString(),
			hariHadir: d.hariHadir,
			hariAlpa: d.hariAlpa,
			rincian: d.rincian as RunDetailItem["rincian"],
		})),
	};
}

export type PayslipView = {
	nomor: string;
	periode: string;
	karyawanNama: string;
	nomorKaryawan: string;
	gajiPokok: string;
	totalPendapatan: string;
	totalPotongan: string;
	gajiBersih: string;
	hariHadir: number;
	hariAlpa: number;
	rincian: RunDetailItem["rincian"];
};

export async function getPayslip(nomor: string, onlyKaryawanId?: string): Promise<PayslipView | null> {
	const slip = await prisma.payslip.findUnique({
		where: { nomor },
		include: {
			run: { select: { periode: true } },
			karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
		},
	});
	if (!slip) return null;
	if (onlyKaryawanId && slip.karyawanId !== onlyKaryawanId) return null;
	const detail = await prisma.salaryRunDetail.findUnique({
		where: { runId_karyawanId: { runId: slip.runId, karyawanId: slip.karyawanId } },
	});
	if (!detail) return null;
	return {
		nomor: slip.nomor,
		periode: slip.run.periode,
		karyawanNama: slip.karyawan.namaLengkap,
		nomorKaryawan: slip.karyawan.nomorKaryawan,
		gajiPokok: detail.gajiPokok.toString(),
		totalPendapatan: detail.totalPendapatan.toString(),
		totalPotongan: detail.totalPotongan.toString(),
		gajiBersih: detail.gajiBersih.toString(),
		hariHadir: detail.hariHadir,
		hariAlpa: detail.hariAlpa,
		rincian: detail.rincian as RunDetailItem["rincian"],
	};
}

export type SlipSayaItem = { nomor: string; periode: string; gajiBersih: string };

export async function getSlipSaya(karyawanId: string): Promise<SlipSayaItem[]> {
	const slips = await prisma.payslip.findMany({
		where: { karyawanId, run: { status: "DITERBITKAN" } },
		orderBy: { run: { periode: "desc" } },
		include: {
			run: { select: { periode: true } },
			karyawan: { select: { id: true } },
		},
	});
	const out: SlipSayaItem[] = [];
	for (const s of slips) {
		const detail = await prisma.salaryRunDetail.findUnique({
			where: { runId_karyawanId: { runId: s.runId, karyawanId } },
			select: { gajiBersih: true },
		});
		out.push({ nomor: s.nomor, periode: s.run.periode, gajiBersih: detail?.gajiBersih.toString() ?? "0" });
	}
	return out;
}
