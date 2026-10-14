"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/src/lib/prisma";
import { buatKodeVerifikasi } from "../lib/verifikasi";
import { bagiDisburse, buildDisburseCsv } from "../lib/disburse";
import { getPengaturanPayroll, hitungGajiKaryawan, resetCachePengaturan, type AkumulasiTahunanPPh } from "../lib/calculate";
import {
	KUNCI_PEMBAGI_ALPA,
	KUNCI_TELAT_MAX,
	KUNCI_TELAT_PER_MENIT,
	PAYROLL_SETTING_DEFAULT,
	PAYROLL_SETTING_DESKRIPSI,
	parseRupiahSetting,
} from "../lib/potongan";
import {
	KUNCI_LEMBUR_DIVISOR,
	KUNCI_LEMBUR_MAX_JAM,
	KUNCI_LEMBUR_TIERED,
	LEMBUR_SETTING_DEFAULT,
	LEMBUR_SETTING_DESKRIPSI,
	parseMaxJam,
} from "../lib/lembur";
import {
	KASBON_SETTING_DEFAULT,
	KASBON_SETTING_DESKRIPSI,
	KUNCI_KASBON_MAX_NOMINAL,
	KUNCI_KASBON_MAX_TENOR,
	parseMaxNominalKasbon,
} from "../lib/kasbon";
import {
	KUNCI_SKORSING_TANPA_UPAH,
	SKORSING_SETTING_DEFAULT,
	SKORSING_SETTING_DESKRIPSI,
} from "@/src/modules/employee/lib/disiplin";

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

const KELOMPOK = ["PENDAPATAN", "TUNJANGAN", "POTONGAN", "IURAN", "BIAYA_PERUSAHAAN"];
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
		// Porsi perusahaan — info slip, tak mengurangi gaji bersih.
		{ kode: "BPJS_KES_CPY", nama: "BPJS Kesehatan (4% perusahaan)", kelompok: "BIAYA_PERUSAHAAN", tipe: "PERSEN", nilai: 4, batasAtas: 12000000, urutan: 11 },
		{ kode: "BPJS_JHT_CPY", nama: "BPJS JHT (3,70% perusahaan)", kelompok: "BIAYA_PERUSAHAAN", tipe: "PERSEN", nilai: 3.7, batasAtas: null, urutan: 12 },
		{ kode: "BPJS_JP_CPY", nama: "BPJS JP (2% perusahaan)", kelompok: "BIAYA_PERUSAHAAN", tipe: "PERSEN", nilai: 2, batasAtas: 10500000, urutan: 13 },
		{ kode: "BPJS_JKK", nama: "BPJS JKK (perusahaan, atur tarif 0,24–1,74% sesuai kelompok risiko)", kelompok: "BIAYA_PERUSAHAAN", tipe: "PERSEN", nilai: 0.54, batasAtas: null, urutan: 14 },
		{ kode: "BPJS_JKM", nama: "BPJS JKM (0,30% perusahaan)", kelompok: "BIAYA_PERUSAHAAN", tipe: "PERSEN", nilai: 0.3, batasAtas: null, urutan: 15 },
		// Denda telat per menit (tarif dari Aturan Payroll; 0 = nonaktif).
		{ kode: "POTONGAN_TELAT", nama: "Potongan Keterlambatan (per menit TERLAMBAT)", kelompok: "POTONGAN", tipe: "NOMINAL", nilai: 0, batasAtas: null, urutan: 16 },
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

export type PayrollSettingItem = {
	kunci: string;
	nilai: string;
	defaultNilai: string;
	deskripsi: string;
};

const URUTAN_SETTING = [
	KUNCI_PEMBAGI_ALPA,
	KUNCI_TELAT_PER_MENIT,
	KUNCI_TELAT_MAX,
	KUNCI_LEMBUR_TIERED,
	KUNCI_LEMBUR_DIVISOR,
	KUNCI_LEMBUR_MAX_JAM,
	KUNCI_KASBON_MAX_NOMINAL,
	KUNCI_KASBON_MAX_TENOR,
	KUNCI_SKORSING_TANPA_UPAH,
];

const DESKRIPSI_SETTING: Record<string, string> = {
	...PAYROLL_SETTING_DESKRIPSI,
	...LEMBUR_SETTING_DESKRIPSI,
	...KASBON_SETTING_DESKRIPSI,
	...SKORSING_SETTING_DESKRIPSI,
};

const DEFAULT_SETTING: Record<string, string> = {
	...PAYROLL_SETTING_DEFAULT,
	...LEMBUR_SETTING_DEFAULT,
	...KASBON_SETTING_DEFAULT,
	...SKORSING_SETTING_DEFAULT,
};

export async function getPayrollSettings(): Promise<PayrollSettingItem[]> {
	const map = await getPengaturanPayroll();
	return URUTAN_SETTING.map((kunci) => ({
		kunci,
		nilai: map[kunci] ?? DEFAULT_SETTING[kunci] ?? "",
		defaultNilai: DEFAULT_SETTING[kunci] ?? "",
		deskripsi: DESKRIPSI_SETTING[kunci] ?? "",
	}));
}

export async function savePayrollSettings(input: {
	pembagiAlpa: string;
	tarifTelatPerMenit: string;
	maxTelatPerBulan: string;
	lemburTiered: string;
	lemburDivisor: string;
	lemburMaxJam: string;
	kasbonMaxNominal: string;
	kasbonMaxTenor: string;
	skorsingTanpaUpah: string;
}): Promise<PayrollActionResult> {
	const pembagi = String(input.pembagiAlpa ?? "").trim().toUpperCase();
	if (!["25", "26", "AKTUAL"].includes(pembagi)) {
		return { success: false, message: "Pembagi alpa harus 25, 26, atau AKTUAL." };
	}
	const tarifRaw = String(input.tarifTelatPerMenit ?? "").trim();
	const maxRaw = String(input.maxTelatPerBulan ?? "").trim();
	const tarif = Math.floor(Number(tarifRaw));
	if (!Number.isFinite(tarif) || tarif < 0) {
		return { success: false, message: "Tarif telat per menit tidak valid." };
	}
	if (maxRaw !== "" && parseRupiahSetting(maxRaw) === null) {
		return { success: false, message: "Batas denda telat tidak valid." };
	}
	const tiered = String(input.lemburTiered ?? "1").trim();
	if (!["0", "1"].includes(tiered)) {
		return { success: false, message: "Mode lembur harus tiered (1) atau flat (0)." };
	}
	const divisorRaw = String(input.lemburDivisor ?? "173").trim();
	const divisor = Math.floor(Number(divisorRaw));
	if (!Number.isFinite(divisor) || divisor <= 0) {
		return { success: false, message: "Pembagi upah sejam tidak valid." };
	}
	const maxJamRaw = String(input.lemburMaxJam ?? "").trim();
	if (maxJamRaw !== "" && parseMaxJam(maxJamRaw) === null) {
		return { success: false, message: "Batas jam lembur tidak valid." };
	}
	const kasbonPlafonRaw = String(input.kasbonMaxNominal ?? "").trim();
	if (kasbonPlafonRaw !== "" && parseMaxNominalKasbon(kasbonPlafonRaw) === null) {
		return { success: false, message: "Plafon kasbon tidak valid." };
	}
	const kasbonTenor = Math.floor(Number(String(input.kasbonMaxTenor ?? "24").trim()));
	if (!Number.isFinite(kasbonTenor) || kasbonTenor < 1 || kasbonTenor > 120) {
		return { success: false, message: "Tenor maksimum kasbon 1–120 bulan." };
	}
	const skorsing = String(input.skorsingTanpaUpah ?? "0").trim();
	if (!["0", "1"].includes(skorsing)) {
		return { success: false, message: "Opsi skorsing tidak valid." };
	}

	await prisma.$transaction([
		prisma.payrollSetting.upsert({
			where: { kunci: KUNCI_PEMBAGI_ALPA },
			create: { kunci: KUNCI_PEMBAGI_ALPA, nilai: pembagi, deskripsi: PAYROLL_SETTING_DESKRIPSI[KUNCI_PEMBAGI_ALPA] },
			update: { nilai: pembagi },
		}),
		prisma.payrollSetting.upsert({
			where: { kunci: KUNCI_TELAT_PER_MENIT },
			create: { kunci: KUNCI_TELAT_PER_MENIT, nilai: String(tarif), deskripsi: PAYROLL_SETTING_DESKRIPSI[KUNCI_TELAT_PER_MENIT] },
			update: { nilai: String(tarif) },
		}),
		prisma.payrollSetting.upsert({
			where: { kunci: KUNCI_TELAT_MAX },
			create: { kunci: KUNCI_TELAT_MAX, nilai: maxRaw, deskripsi: PAYROLL_SETTING_DESKRIPSI[KUNCI_TELAT_MAX] },
			update: { nilai: maxRaw },
		}),
		prisma.payrollSetting.upsert({
			where: { kunci: KUNCI_LEMBUR_TIERED },
			create: { kunci: KUNCI_LEMBUR_TIERED, nilai: tiered, deskripsi: LEMBUR_SETTING_DESKRIPSI[KUNCI_LEMBUR_TIERED] },
			update: { nilai: tiered },
		}),
		prisma.payrollSetting.upsert({
			where: { kunci: KUNCI_LEMBUR_DIVISOR },
			create: { kunci: KUNCI_LEMBUR_DIVISOR, nilai: String(divisor), deskripsi: LEMBUR_SETTING_DESKRIPSI[KUNCI_LEMBUR_DIVISOR] },
			update: { nilai: String(divisor) },
		}),
		prisma.payrollSetting.upsert({
			where: { kunci: KUNCI_LEMBUR_MAX_JAM },
			create: { kunci: KUNCI_LEMBUR_MAX_JAM, nilai: maxJamRaw, deskripsi: LEMBUR_SETTING_DESKRIPSI[KUNCI_LEMBUR_MAX_JAM] },
			update: { nilai: maxJamRaw },
		}),
		prisma.payrollSetting.upsert({
			where: { kunci: KUNCI_KASBON_MAX_NOMINAL },
			create: { kunci: KUNCI_KASBON_MAX_NOMINAL, nilai: kasbonPlafonRaw, deskripsi: KASBON_SETTING_DESKRIPSI[KUNCI_KASBON_MAX_NOMINAL] },
			update: { nilai: kasbonPlafonRaw },
		}),
		prisma.payrollSetting.upsert({
			where: { kunci: KUNCI_KASBON_MAX_TENOR },
			create: { kunci: KUNCI_KASBON_MAX_TENOR, nilai: String(kasbonTenor), deskripsi: KASBON_SETTING_DESKRIPSI[KUNCI_KASBON_MAX_TENOR] },
			update: { nilai: String(kasbonTenor) },
		}),
		prisma.payrollSetting.upsert({
			where: { kunci: KUNCI_SKORSING_TANPA_UPAH },
			create: { kunci: KUNCI_SKORSING_TANPA_UPAH, nilai: skorsing, deskripsi: SKORSING_SETTING_DESKRIPSI[KUNCI_SKORSING_TANPA_UPAH] },
			update: { nilai: skorsing },
		}),
	]);
	resetCachePengaturan();
	revalidatePath("/payroll/settings");
	revalidatePath("/payroll");
	return { success: true, message: "Aturan potongan tersimpan (berlaku untuk hitung berikutnya)." };
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
		select: { id: true, tanggalMasuk: true },
	});

	// Pulihkan angsuran kasbon milik run ini agar hitung-ulang idempoten.
	// Tx terpisah (commit dulu) supaya hitung berikutnya membaca sisa bersih.
	const angsuranLama = await prisma.kasbonAngsuran.findMany({
		where: { runId },
		select: { kasbonId: true, jumlah: true },
	});
	if (angsuranLama.length > 0) {
		await prisma.$transaction(async (tx) => {
			await tx.kasbonAngsuran.deleteMany({ where: { runId } });
			for (const a of angsuranLama) {
				const kb = await tx.kasbon.findUnique({ where: { id: a.kasbonId }, select: { status: true } });
				await tx.kasbon.update({
					where: { id: a.kasbonId },
					data: {
						sisaHutang: { increment: a.jumlah },
						...(kb?.status === "LUNAS" ? { status: "DISETUJUI" as never } : {}),
					},
				});
			}
		});
	}

	// Akumulasi Jan–Nov untuk koreksi Desember (PMK 168/2023).
	const bulanRun = run.tanggalSelesai.getUTCMonth() + 1;
	const tahunRun = run.tanggalSelesai.getUTCFullYear();
	const akumulasiMap = new Map<string, AkumulasiTahunanPPh>();
	if (bulanRun === 12) {
		const prior = await prisma.salaryRunDetail.findMany({
			where: {
				karyawanId: { in: karyawan.map((k) => k.id) },
				run: { periode: { gte: `${tahunRun}-01`, lt: `${tahunRun}-12` } },
			},
			select: { karyawanId: true, totalPendapatan: true, rincian: true },
		});
		const agg = new Map<string, { bruto: number; pph: number; iuran: number }>();
		for (const d of prior) {
			const cur = agg.get(d.karyawanId) ?? { bruto: 0, pph: 0, iuran: 0 };
			cur.bruto += Number(d.totalPendapatan);
			const rincian = d.rincian as Array<{ kode: string; jumlah: number }>;
			if (Array.isArray(rincian)) {
				for (const r of rincian) {
					if (r.kode === "POT_PPH21" || r.kode === "POTONGAN_PPH21") cur.pph += Number(r.jumlah ?? 0);
					if (r.kode === "BPJS_JHT" || r.kode === "BPJS_JP") cur.iuran += Number(r.jumlah ?? 0);
				}
			}
			agg.set(d.karyawanId, cur);
		}
		for (const k of karyawan) {
			const masuk = k.tanggalMasuk;
			const bulanMasuk =
				masuk.getUTCFullYear() < tahunRun ? 1 : Math.min(12, Math.max(1, masuk.getUTCMonth() + 1));
			const a = agg.get(k.id) ?? { bruto: 0, pph: 0, iuran: 0 };
			akumulasiMap.set(k.id, {
				brutoJanNov: Math.round(a.bruto),
				pphJanNov: Math.round(a.pph),
				iuranJanNov: Math.round(a.iuran),
				bulanKerja: Math.min(12, Math.max(1, 13 - bulanMasuk)),
			});
		}
	}

	await prisma.$transaction(async (tx) => {
		await tx.salaryRunDetail.deleteMany({ where: { runId } });
		for (const k of karyawan) {
			const hasil = await hitungGajiKaryawan(k.id, run.tanggalMulai, run.tanggalSelesai, akumulasiMap.get(k.id));
			await tx.salaryRunDetail.create({
				data: {
					runId,
					karyawanId: k.id,
					gajiPokok: hasil.gajiPokok,
					totalPendapatan: hasil.totalPendapatan,
					totalPotongan: hasil.totalPotongan,
					gajiBersih: hasil.gajiBersih,
					totalBiayaPerusahaan: hasil.totalBiayaPerusahaan,
					hariHadir: hasil.hariHadir,
					hariAlpa: hasil.hariAlpa,
					jamLembur: hasil.jamLembur,
					rincian: hasil.rincian as never,
				},
			});
			// Bukukan angsuran kasbon periode ini.
			for (const pot of hasil.kasbonPotongan) {
				await tx.kasbonAngsuran.create({
					data: { kasbonId: pot.kasbonId, runId, periode: run.periode, jumlah: pot.jumlah },
				});
				await tx.kasbon.update({
					where: { id: pot.kasbonId },
					data: {
						sisaHutang: { decrement: pot.jumlah },
						...(pot.sisaSesudah === 0 ? { status: "LUNAS" as never } : {}),
					},
				});
			}
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
					kodeVerifikasi: buatKodeVerifikasi(),
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
	// Kembalikan sisa kasbon yang sempat dibukukan run ini.
	const angsuran = await prisma.kasbonAngsuran.findMany({
		where: { runId },
		select: { kasbonId: true, jumlah: true },
	});
	if (angsuran.length > 0) {
		await prisma.$transaction(async (tx) => {
			for (const a of angsuran) {
				const kb = await tx.kasbon.findUnique({ where: { id: a.kasbonId }, select: { status: true } });
				await tx.kasbon.update({
					where: { id: a.kasbonId },
					data: {
						sisaHutang: { increment: a.jumlah },
						...(kb?.status === "LUNAS" ? { status: "DISETUJUI" as never } : {}),
					},
				});
			}
		});
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
	totalBiayaPerusahaan: string;
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
			totalBiayaPerusahaan: d.totalBiayaPerusahaan.toString(),
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
	totalBiayaPerusahaan: string;
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
		totalBiayaPerusahaan: detail.totalBiayaPerusahaan.toString(),
		hariHadir: detail.hariHadir,
		hariAlpa: detail.hariAlpa,
		rincian: detail.rincian as RunDetailItem["rincian"],
	};
}

export type SlipSayaItem = { nomor: string; periode: string; gajiBersih: string };

export type DisburseInfo = {
	filename: string;
	berita: string;
	total: string;
	siap: number;
	belum: string[];
	csv: string;
};

/** Info + CSV disbursement gaji run. */
export async function getDisburseSalaryRun(runId: string): Promise<DisburseInfo | null> {
	const { run, detail } = await getRunDetail(runId);
	if (!run) return null;
	const kary = await prisma.karyawan.findMany({
		where: { id: { in: detail.map((d) => d.karyawanId) } },
		select: { id: true, bankNama: true, bankNorek: true, bankAtasNama: true },
	});
	const bank = new Map(kary.map((k) => [k.id, k]));
	const berita = `GAJI ${run.periode}`;
	const { baris, belumLengkap, total } = bagiDisburse(
		detail.map((d) => ({
			nama: `${d.karyawanNama} (${d.nomorKaryawan})`,
			bank: bank.get(d.karyawanId)?.bankNama ?? null,
			norek: bank.get(d.karyawanId)?.bankNorek ?? null,
			atasNama: bank.get(d.karyawanId)?.bankAtasNama ?? null,
			nominal: Number(d.gajiBersih),
		})),
		berita,
	);
	return {
		filename: `disburse-gaji-${run.periode}.csv`,
		berita,
		total: String(total),
		siap: baris.length,
		belum: belumLengkap,
		csv: buildDisburseCsv(baris),
	};
}
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
