"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/src/lib/prisma";
import { getCurrentSession } from "@/src/lib/auth-guard";
import { recordAudit } from "@/src/modules/audit/lib/audit";
import { notifyEmployees } from "@/src/modules/notifikasi/lib/notify";
import { createVerificationCode } from "../lib/verifikasi";
import { splitDisbursement, buildDisbursementCsv } from "../lib/disburse";
import { getPayrollSettingMap, calculateEmployeeSalary, resetSettingsCache, toStoredRincian, fromStoredRincian, type AnnualPphAccumulation, type SalaryLineItem } from "../lib/calculate";
import {
  ALPHA_DIVISOR_KEY,
  LATE_MONTHLY_CAP_KEY,
  LATE_PER_MINUTE_KEY,
  PAYROLL_SETTING_DEFAULT,
  PAYROLL_SETTING_DESCRIPTIONS,
  parseCurrencySetting,
} from "../lib/potongan";
import {
  OVERTIME_DIVISOR_KEY,
  OVERTIME_MAX_HOURS_KEY,
  OVERTIME_TIERED_KEY,
  OVERTIME_DEFAULT_SETTINGS,
  OVERTIME_SETTING_DESCRIPTIONS,
  parseMaxHours,
} from "../lib/lembur";
import {
  SALARY_ADVANCE_DEFAULT_SETTINGS,
  SALARY_ADVANCE_SETTING_DESCRIPTIONS,
  SALARY_ADVANCE_MAX_AMOUNT_KEY,
  SALARY_ADVANCE_MAX_TENOR_KEY,
  parseMaxSalaryAdvanceAmount,
} from "../lib/kasbon";
import {
  UNPAID_SUSPENSION_KEY,
  SUSPENSION_DEFAULT_SETTINGS,
  SUSPENSION_SETTING_DESCRIPTIONS,
} from "@/src/modules/employee/lib/disiplin";

export type PayrollActionResult = { success: boolean; message: string; id?: string };

export type ComponentItem = {
  id: string;
  code: string;
  name: string;
  group: string;
  type: string;
  value: string;
  upperLimit: string | null;
  isActive: boolean;
  order: number;
};

export async function listComponents(): Promise<ComponentItem[]> {
	const rows = await prisma.komponenGaji.findMany({ orderBy: [{ urutan: "asc" }, { kode: "asc" }] });
	return rows.map((r) => ({
		id: r.id,
		code: r.kode,
		name: r.nama,
		group: r.kelompok,
		type: r.tipe,
		value: r.nilai.toString(),
		upperLimit: r.batasAtas?.toString() ?? null,
		isActive: r.isActive,
		order: r.urutan,
	}));
}

const GROUPS = ["PENDAPATAN", "TUNJANGAN", "POTONGAN", "IURAN", "BIAYA_PERUSAHAAN"];
const COMPONENT_TYPES = ["NOMINAL", "PERSEN", "PER_HARI", "PER_JAM_LEMBUR", "PER_SHIFT_MALAM"];

export async function saveComponent(formData: FormData): Promise<PayrollActionResult> {
	const id = String(formData.get("id") ?? "").trim();
	const code = String(formData.get("code") ?? "").trim().toUpperCase();
	const name = String(formData.get("name") ?? "").trim();
	const group = String(formData.get("group") ?? "");
	const type = String(formData.get("type") ?? "");
	const value = Number(String(formData.get("value") ?? "0"));
	const upperRaw = String(formData.get("upperLimit") ?? "").trim();
	const isActive = String(formData.get("isActive") ?? "") !== "false";

	if (!code || !name) return { success: false, message: "Kode dan nama wajib diisi." };
	if (!GROUPS.includes(group)) return { success: false, message: "Kelompok tidak valid." };
	if (!COMPONENT_TYPES.includes(type)) return { success: false, message: "Tipe tidak valid." };
	if (Number.isNaN(value) || value < 0) return { success: false, message: "Nilai tidak valid." };
	const upperLimit = upperRaw ? Number(upperRaw) : null;
	if (upperLimit !== null && (Number.isNaN(upperLimit) || upperLimit < 0)) {
		return { success: false, message: "Batas atas tidak valid." };
	}

	try {
		const data = {
			kode: code,
			nama: name,
			kelompok: group as never,
			tipe: type as never,
			nilai: value,
			batasAtas: upperLimit,
			isActive,
		};
		if (id) {
			await prisma.komponenGaji.update({ where: { id }, data });
		} else {
			const maxOrder = await prisma.komponenGaji.aggregate({ _max: { urutan: true } });
			await prisma.komponenGaji.create({ data: { ...data, urutan: (maxOrder._max.urutan ?? 0) + 1 } });
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

export async function deleteComponent(id: string): Promise<PayrollActionResult> {
	try {
		await prisma.komponenGaji.delete({ where: { id } });
		revalidatePath("/payroll/salary-components");
		return { success: true, message: "Komponen dihapus." };
	} catch {
		return { success: false, message: "Gagal menghapus. Komponen sudah dipakai." };
	}
}

export async function seedDefaultComponents(): Promise<PayrollActionResult> {
	const defaults: Array<{
		kode: string;
		nama: string;
		kelompok: (typeof GROUPS)[number];
		tipe: (typeof COMPONENT_TYPES)[number];
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

	let created = 0;
	for (const item of defaults) {
		const existing = await prisma.komponenGaji.findUnique({ where: { kode: item.kode } });
		if (existing) continue;
		await prisma.komponenGaji.create({
			data: { ...item, kelompok: item.kelompok as never, tipe: item.tipe as never },
		});
		created++;
	}
	revalidatePath("/payroll/salary-components");
	return { success: true, message: created > 0 ? `${created} komponen default dibuat.` : "Komponen default sudah lengkap." };
}

export type PayrollSettingItem = {
	key: string;
	value: string;
	defaultValue: string;
	description: string;
};

const SETTING_ORDER = [
	ALPHA_DIVISOR_KEY,
	LATE_PER_MINUTE_KEY,
	LATE_MONTHLY_CAP_KEY,
	OVERTIME_TIERED_KEY,
	OVERTIME_DIVISOR_KEY,
	OVERTIME_MAX_HOURS_KEY,
	SALARY_ADVANCE_MAX_AMOUNT_KEY,
	SALARY_ADVANCE_MAX_TENOR_KEY,
	UNPAID_SUSPENSION_KEY,
];

const SETTING_DESCRIPTIONS: Record<string, string> = {
	...PAYROLL_SETTING_DESCRIPTIONS,
	...OVERTIME_SETTING_DESCRIPTIONS,
	...SALARY_ADVANCE_SETTING_DESCRIPTIONS,
	...SUSPENSION_SETTING_DESCRIPTIONS,
};

const DEFAULT_SETTINGS: Record<string, string> = {
	...PAYROLL_SETTING_DEFAULT,
	...OVERTIME_DEFAULT_SETTINGS,
	...SALARY_ADVANCE_DEFAULT_SETTINGS,
	...SUSPENSION_DEFAULT_SETTINGS,
};

export async function listPayrollSettings(): Promise<PayrollSettingItem[]> {
	const map = await getPayrollSettingMap();
	return SETTING_ORDER.map((key) => ({
		key,
		value: map[key] ?? DEFAULT_SETTINGS[key] ?? "",
		defaultValue: DEFAULT_SETTINGS[key] ?? "",
		description: SETTING_DESCRIPTIONS[key] ?? "",
	}));
}

export async function savePayrollSettings(input: {
	alphaDivisor: string;
	lateRatePerMinute: string;
	lateMonthlyCap: string;
	overtimeTiered: string;
	overtimeDivisor: string;
	overtimeMaxHours: string;
	advanceMaxAmount: string;
	advanceMaxTenor: string;
	unpaidSuspension: string;
}): Promise<PayrollActionResult> {
	const divisor = String(input.alphaDivisor ?? "").trim().toUpperCase();
	if (!["25", "26", "AKTUAL"].includes(divisor)) {
		return { success: false, message: "Pembagi alpa harus 25, 26, atau AKTUAL." };
	}
	const rateRaw = String(input.lateRatePerMinute ?? "").trim();
	const capRaw = String(input.lateMonthlyCap ?? "").trim();
	const rate = Math.floor(Number(rateRaw));
	if (!Number.isFinite(rate) || rate < 0) {
		return { success: false, message: "Tarif telat per menit tidak valid." };
	}
	if (capRaw !== "" && parseCurrencySetting(capRaw) === null) {
		return { success: false, message: "Batas denda telat tidak valid." };
	}
	const tiered = String(input.overtimeTiered ?? "1").trim();
	if (!["0", "1"].includes(tiered)) {
		return { success: false, message: "Mode lembur harus tiered (1) atau flat (0)." };
	}
	const divisorRaw = String(input.overtimeDivisor ?? "173").trim();
	const hourlyDivisor = Math.floor(Number(divisorRaw));
	if (!Number.isFinite(hourlyDivisor) || hourlyDivisor <= 0) {
		return { success: false, message: "Pembagi upah sejam tidak valid." };
	}
	const maxHoursRaw = String(input.overtimeMaxHours ?? "").trim();
	if (maxHoursRaw !== "" && parseMaxHours(maxHoursRaw) === null) {
		return { success: false, message: "Batas jam lembur tidak valid." };
	}
	const advanceCapRaw = String(input.advanceMaxAmount ?? "").trim();
	if (advanceCapRaw !== "" && parseMaxSalaryAdvanceAmount(advanceCapRaw) === null) {
		return { success: false, message: "Plafon kasbon tidak valid." };
	}
	const advanceTenor = Math.floor(Number(String(input.advanceMaxTenor ?? "24").trim()));
	if (!Number.isFinite(advanceTenor) || advanceTenor < 1 || advanceTenor > 120) {
		return { success: false, message: "Tenor maksimum kasbon 1–120 bulan." };
	}
	const suspension = String(input.unpaidSuspension ?? "0").trim();
	if (!["0", "1"].includes(suspension)) {
		return { success: false, message: "Opsi skorsing tidak valid." };
	}

	// P0-9: snapshot sebelum untuk histori audit perubahan aturan.
	const beforeRows = await prisma.payrollSetting.findMany({ select: { kunci: true, nilai: true } });
	const before = Object.fromEntries(beforeRows.map((r) => [r.kunci, r.nilai]));

	await prisma.$transaction([
		prisma.payrollSetting.upsert({
			where: { kunci: ALPHA_DIVISOR_KEY },
			create: { kunci: ALPHA_DIVISOR_KEY, nilai: divisor, deskripsi: PAYROLL_SETTING_DESCRIPTIONS[ALPHA_DIVISOR_KEY] },
			update: { nilai: divisor },
		}),
		prisma.payrollSetting.upsert({
			where: { kunci: LATE_PER_MINUTE_KEY },
			create: { kunci: LATE_PER_MINUTE_KEY, nilai: String(rate), deskripsi: PAYROLL_SETTING_DESCRIPTIONS[LATE_PER_MINUTE_KEY] },
			update: { nilai: String(rate) },
		}),
		prisma.payrollSetting.upsert({
			where: { kunci: LATE_MONTHLY_CAP_KEY },
			create: { kunci: LATE_MONTHLY_CAP_KEY, nilai: capRaw, deskripsi: PAYROLL_SETTING_DESCRIPTIONS[LATE_MONTHLY_CAP_KEY] },
			update: { nilai: capRaw },
		}),
		prisma.payrollSetting.upsert({
			where: { kunci: OVERTIME_TIERED_KEY },
			create: { kunci: OVERTIME_TIERED_KEY, nilai: tiered, deskripsi: OVERTIME_SETTING_DESCRIPTIONS[OVERTIME_TIERED_KEY] },
			update: { nilai: tiered },
		}),
		prisma.payrollSetting.upsert({
			where: { kunci: OVERTIME_DIVISOR_KEY },
			create: { kunci: OVERTIME_DIVISOR_KEY, nilai: String(hourlyDivisor), deskripsi: OVERTIME_SETTING_DESCRIPTIONS[OVERTIME_DIVISOR_KEY] },
			update: { nilai: String(hourlyDivisor) },
		}),
		prisma.payrollSetting.upsert({
			where: { kunci: OVERTIME_MAX_HOURS_KEY },
			create: { kunci: OVERTIME_MAX_HOURS_KEY, nilai: maxHoursRaw, deskripsi: OVERTIME_SETTING_DESCRIPTIONS[OVERTIME_MAX_HOURS_KEY] },
			update: { nilai: maxHoursRaw },
		}),
		prisma.payrollSetting.upsert({
			where: { kunci: SALARY_ADVANCE_MAX_AMOUNT_KEY },
			create: { kunci: SALARY_ADVANCE_MAX_AMOUNT_KEY, nilai: advanceCapRaw, deskripsi: SALARY_ADVANCE_SETTING_DESCRIPTIONS[SALARY_ADVANCE_MAX_AMOUNT_KEY] },
			update: { nilai: advanceCapRaw },
		}),
		prisma.payrollSetting.upsert({
			where: { kunci: SALARY_ADVANCE_MAX_TENOR_KEY },
			create: { kunci: SALARY_ADVANCE_MAX_TENOR_KEY, nilai: String(advanceTenor), deskripsi: SALARY_ADVANCE_SETTING_DESCRIPTIONS[SALARY_ADVANCE_MAX_TENOR_KEY] },
			update: { nilai: String(advanceTenor) },
		}),
		prisma.payrollSetting.upsert({
			where: { kunci: UNPAID_SUSPENSION_KEY },
			create: { kunci: UNPAID_SUSPENSION_KEY, nilai: suspension, deskripsi: SUSPENSION_SETTING_DESCRIPTIONS[UNPAID_SUSPENSION_KEY] },
			update: { nilai: suspension },
		}),
	]);
	resetSettingsCache();
	// P0-9: histori perubahan aturan payroll (gabungan sisa P0-4).
	try {
		const session = await getCurrentSession();
		await recordAudit({
			actorUserId: session?.user?.id ?? null,
			aksi: "PAYROLL.SETTING_UBAH",
			entityType: "PayrollSetting",
			entityId: "global",
			sebelum: before,
			sesudah: {
				[ALPHA_DIVISOR_KEY]: divisor,
				[LATE_PER_MINUTE_KEY]: String(rate),
				[LATE_MONTHLY_CAP_KEY]: capRaw,
				[OVERTIME_TIERED_KEY]: tiered,
				[OVERTIME_DIVISOR_KEY]: String(hourlyDivisor),
				[OVERTIME_MAX_HOURS_KEY]: maxHoursRaw,
				[SALARY_ADVANCE_MAX_AMOUNT_KEY]: advanceCapRaw,
				[SALARY_ADVANCE_MAX_TENOR_KEY]: String(advanceTenor),
				[UNPAID_SUSPENSION_KEY]: suspension,
			},
			alasan: null,
		});
	} catch {
		// abaikan
	}
	revalidatePath("/payroll/settings");
	revalidatePath("/payroll");
	return { success: true, message: "Aturan potongan tersimpan (berlaku untuk hitung berikutnya)." };
}

export type EmployeeSalaryItem = {
	employeeId: string;
	employeeName: string;
	componentIds: string[];
};

export async function getEmployeeSalaryMap(): Promise<EmployeeSalaryItem[]> {
	const employees = await prisma.karyawan.findMany({
		where: { status: { in: ["AKTIF", "PROBASI"] } },
		orderBy: { namaLengkap: "asc" },
		select: { id: true, namaLengkap: true, nomorKaryawan: true },
	});
	const assigns = await prisma.gajiKaryawan.findMany({
		where: { isActive: true },
		select: { karyawanId: true, komponenId: true },
	});
	return employees.map((k) => ({
		employeeId: k.id,
		employeeName: `${k.namaLengkap} (${k.nomorKaryawan})`,
		componentIds: assigns.filter((a) => a.karyawanId === k.id).map((a) => a.komponenId),
	}));
}

export async function saveEmployeeSalaries(employeeId: string, componentIds: string[]): Promise<PayrollActionResult> {
	if (!employeeId) return { success: false, message: "Karyawan wajib dipilih." };
	await prisma.$transaction(async (tx) => {
		await tx.gajiKaryawan.deleteMany({ where: { karyawanId: employeeId } });
		if (componentIds.length > 0) {
			await tx.gajiKaryawan.createMany({
				data: componentIds.map((komponenId) => ({ karyawanId: employeeId, komponenId })),
			});
		}
	});
	revalidatePath("/payroll/salary-components");
	return { success: true, message: "Komponen karyawan tersimpan." };
}

export type SalaryRunItem = {
	id: string;
	periode: string;
	startDate: string;
	endDate: string;
	status: string;
	employeeCount: number;
	totalNet: string;
};

export async function getSalaryRuns(): Promise<SalaryRunItem[]> {
	const runs = await prisma.salaryRun.findMany({
		orderBy: { periode: "desc" },
		include: { detail: { select: { gajiBersih: true } } },
	});
	return runs.map((r) => ({
		id: r.id,
		periode: r.periode,
		startDate: r.tanggalMulai.toISOString().slice(0, 10),
		endDate: r.tanggalSelesai.toISOString().slice(0, 10),
		status: r.status,
		employeeCount: r.detail.length,
		totalNet: r.detail.reduce((acc, d) => acc + Number(d.gajiBersih), 0).toString(),
	}));
}

export async function createSalaryRun(periode: string, createdById?: string): Promise<PayrollActionResult> {
	const match = /^(\d{4})-(\d{2})$/.exec(periode.trim());
	if (!match) return { success: false, message: "Periode format YYYY-MM." };
	const year = Number(match[1]);
	const month = Number(match[2]);
	if (month < 1 || month > 12) return { success: false, message: "Bulan tidak valid." };

	const start = new Date(Date.UTC(year, month - 1, 1));
	const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
	const end = new Date(Date.UTC(year, month - 1, last));

	try {
		const created = await prisma.salaryRun.create({
			data: { periode: `${year}-${String(month).padStart(2, "0")}`, tanggalMulai: start, tanggalSelesai: end, createdById },
		});
		const session = await getCurrentSession();
		await recordAudit({
			actorUserId: session?.user?.id ?? createdById ?? null,
			aksi: "PAYROLL.RUN_BUAT",
			entityType: "SalaryRun",
			entityId: created.id,
			sebelum: null,
			sesudah: { periode: created.periode },
			alasan: null,
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

export async function calculateSalaryRun(runId: string): Promise<PayrollActionResult> {
	const run = await prisma.salaryRun.findUnique({ where: { id: runId } });
	if (!run) return { success: false, message: "Run tidak ditemukan." };
	if (run.status === "FINAL" || run.status === "DITERBITKAN") {
		return { success: false, message: "Run sudah final, tidak bisa dihitung ulang." };
	}

	const employees = await prisma.karyawan.findMany({
		where: { status: { in: ["AKTIF", "PROBASI"] } },
		select: { id: true, tanggalMasuk: true },
	});

	// Pulihkan angsuran kasbon + pembayaran reimbursement milik run ini
	// agar hitung-ulang idempoten. Tx terpisah (commit dulu) supaya hitung
	// berikutnya membaca sisa bersih.
	const oldInstallments = await prisma.kasbonAngsuran.findMany({
		where: { runId },
		select: { kasbonId: true, jumlah: true },
	});
	if (oldInstallments.length > 0) {
		await prisma.$transaction(async (tx) => {
			await tx.kasbonAngsuran.deleteMany({ where: { runId } });
			for (const a of oldInstallments) {
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
	const oldPayments = await prisma.expensePembayaran.findMany({
		where: { runId },
		select: { claimId: true },
	});
	if (oldPayments.length > 0) {
		await prisma.$transaction(async (tx) => {
			await tx.expensePembayaran.deleteMany({ where: { runId } });
			for (const b of oldPayments) {
				await tx.expenseClaim.update({
					where: { id: b.claimId },
					data: { status: "DISETUJUI", dibayarPada: null, dibayarVia: null },
				});
			}
		});
	}

	// Akumulasi Jan–Nov untuk koreksi Desember (PMK 168/2023).
	const runMonth = run.tanggalSelesai.getUTCMonth() + 1;
	const runYear = run.tanggalSelesai.getUTCFullYear();
	const accumulationMap = new Map<string, AnnualPphAccumulation>();
	if (runMonth === 12) {
		const prior = await prisma.salaryRunDetail.findMany({
			where: {
				karyawanId: { in: employees.map((k) => k.id) },
				run: { periode: { gte: `${runYear}-01`, lt: `${runYear}-12` } },
			},
			select: { karyawanId: true, totalPendapatan: true, rincian: true },
		});
		const totals = new Map<string, { gross: number; pph: number; contributions: number; reimbursements: number }>();
		for (const d of prior) {
			const cur = totals.get(d.karyawanId) ?? { gross: 0, pph: 0, contributions: 0, reimbursements: 0 };
			cur.gross += Number(d.totalPendapatan);
			const stored = d.rincian as Array<{ kode: string; jumlah: number }>;
			if (Array.isArray(stored)) {
				for (const r of stored) {
					if (r.kode === "POT_PPH21" || r.kode === "POTONGAN_PPH21") cur.pph += Number(r.jumlah ?? 0);
					if (r.kode === "BPJS_JHT" || r.kode === "BPJS_JP") cur.contributions += Number(r.jumlah ?? 0);
					if (r.kode === "REIMBURSE") cur.reimbursements += Number(r.jumlah ?? 0);
				}
			}
			totals.set(d.karyawanId, cur);
		}
		for (const k of employees) {
			const joined = k.tanggalMasuk;
			const joinMonth =
				joined.getUTCFullYear() < runYear ? 1 : Math.min(12, Math.max(1, joined.getUTCMonth() + 1));
			const a = totals.get(k.id) ?? { gross: 0, pph: 0, contributions: 0, reimbursements: 0 };
			accumulationMap.set(k.id, {
				grossJanNov: Math.round(a.gross),
				pphJanNov: Math.round(a.pph),
				contributionsJanNov: Math.round(a.contributions),
				reimbursementsJanNov: Math.round(a.reimbursements),
				monthsWorked: Math.min(12, Math.max(1, 13 - joinMonth)),
			});
		}
	}

	await prisma.$transaction(async (tx) => {
		await tx.salaryRunDetail.deleteMany({ where: { runId } });
		for (const k of employees) {
			const result = await calculateEmployeeSalary(k.id, run.tanggalMulai, run.tanggalSelesai, accumulationMap.get(k.id));
			await tx.salaryRunDetail.create({
				data: {
					runId,
					karyawanId: k.id,
					gajiPokok: result.baseSalary,
					totalPendapatan: result.totalEarnings,
					totalPotongan: result.totalDeductions,
					gajiBersih: result.netPay,
					totalBiayaPerusahaan: result.totalCompanyCost,
					hariHadir: result.presentDays,
					hariAlpa: result.absentDays,
					jamLembur: result.overtimeHours,
					rincian: toStoredRincian(result.lines) as never,
				},
			});
			// Bukukan angsuran kasbon periode ini.
			for (const deduction of result.advanceDeductions) {
				await tx.kasbonAngsuran.create({
					data: { kasbonId: deduction.advanceId, runId, periode: run.periode, jumlah: deduction.amount },
				});
				await tx.kasbon.update({
					where: { id: deduction.advanceId },
					data: {
						sisaHutang: { decrement: deduction.amount },
						...(deduction.remainingAfter === 0 ? { status: "LUNAS" as never } : {}),
					},
				});
			}
			// Bukukan pembayaran reimbursement periode ini.
			for (const payment of result.paidReimbursements) {
				await tx.expensePembayaran.create({
					data: { claimId: payment.claimId, runId, metode: "PAYROLL", jumlah: payment.amount },
				});
				await tx.expenseClaim.update({
					where: { id: payment.claimId },
					data: { status: "DIBAYAR", dibayarPada: new Date(), dibayarVia: `PAYROLL ${run.periode}` },
				});
			}
		}
		await tx.salaryRun.update({ where: { id: runId }, data: { status: "DIHITUNG" } });
	});

	const calcSession = await getCurrentSession();
	await recordAudit({
		actorUserId: calcSession?.user?.id ?? null,
		aksi: "PAYROLL.RUN_HITUNG",
		entityType: "SalaryRun",
		entityId: runId,
		sebelum: { periode: run.periode, status: run.status },
		sesudah: { periode: run.periode, status: "DIHITUNG", jumlahKaryawan: employees.length },
		alasan: null,
	});

	revalidatePath("/payroll");
	return { success: true, message: `Dihitung untuk ${employees.length} karyawan.` };
}

export async function finalizeRun(runId: string): Promise<PayrollActionResult> {
	const run = await prisma.salaryRun.findUnique({ where: { id: runId }, include: { _count: { select: { detail: true } } } });
	if (!run) return { success: false, message: "Run tidak ditemukan." };
	if (run.status !== "DIHITUNG") return { success: false, message: "Hitung dulu sebelum finalisasi." };
	if (run._count.detail === 0) return { success: false, message: "Belum ada detail." };
	await prisma.salaryRun.update({ where: { id: runId }, data: { status: "FINAL" } });
	const finalizeSession = await getCurrentSession();
	await recordAudit({
		actorUserId: finalizeSession?.user?.id ?? null,
		aksi: "PAYROLL.RUN_FINAL",
		entityType: "SalaryRun",
		entityId: runId,
		sebelum: { periode: run.periode, status: run.status },
		sesudah: { periode: run.periode, status: "FINAL" },
		alasan: null,
	});
	revalidatePath("/payroll");
	return { success: true, message: "Run dikunci (FINAL)." };
}

export async function publishRun(runId: string): Promise<PayrollActionResult> {
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
					kodeVerifikasi: createVerificationCode(),
				},
			});
		}
		await tx.salaryRun.update({ where: { id: runId }, data: { status: "DITERBITKAN" } });
	});

	const publishSession = await getCurrentSession();
	await recordAudit({
		actorUserId: publishSession?.user?.id ?? null,
		aksi: "PAYROLL.RUN_TERBIT",
		entityType: "SalaryRun",
		entityId: runId,
		sebelum: { periode: run.periode, status: run.status },
		sesudah: { periode: run.periode, status: "DITERBITKAN", jumlahSlip: run.detail.length },
		alasan: null,
	});

	revalidatePath("/payroll");
	await notifyEmployees(
		run.detail.map((d) => d.karyawanId),
		{
			title: "Slip gaji terbit",
			body: `Slip gaji periode ${run.periode} sudah dapat diunduh di aplikasi.`,
			kind: "INFO",
			referenceType: "PAYSLIP",
			referenceId: runId,
			url: "/account/payslip",
		},
	);
	return { success: true, message: "Payslip diterbitkan." };
}

export async function deleteRun(runId: string): Promise<PayrollActionResult> {
	const run = await prisma.salaryRun.findUnique({ where: { id: runId }, select: { status: true } });
	if (!run) return { success: false, message: "Run tidak ditemukan." };
	if (run.status === "FINAL" || run.status === "DITERBITKAN") {
		return { success: false, message: "Run final tidak bisa dihapus." };
	}
	// Kembalikan sisa kasbon yang sempat dibukukan run ini.
	const installments = await prisma.kasbonAngsuran.findMany({
		where: { runId },
		select: { kasbonId: true, jumlah: true },
	});
	if (installments.length > 0) {
		await prisma.$transaction(async (tx) => {
			for (const a of installments) {
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
	// Kembalikan klaim yang sempat dibayar run ini.
	const paid = await prisma.expensePembayaran.findMany({
		where: { runId },
		select: { claimId: true },
	});
	if (paid.length > 0) {
		await prisma.$transaction(async (tx) => {
			for (const b of paid) {
				await tx.expenseClaim.update({
					where: { id: b.claimId },
					data: { status: "DISETUJUI", dibayarPada: null, dibayarVia: null },
				});
			}
		});
	}
	await prisma.salaryRun.delete({ where: { id: runId } });
	const deleteSession = await getCurrentSession();
	await recordAudit({
		actorUserId: deleteSession?.user?.id ?? null,
		aksi: "PAYROLL.RUN_HAPUS",
		entityType: "SalaryRun",
		entityId: runId,
		sebelum: { status: run.status },
		sesudah: null,
		alasan: null,
	});
	revalidatePath("/payroll");
	return { success: true, message: "Run dihapus." };
}

export type RunDetailItem = {
	id: string;
	employeeId: string;
	employeeName: string;
	employeeNumber: string;
	baseSalary: string;
	totalEarnings: string;
	totalDeductions: string;
	netPay: string;
	totalCompanyCost: string;
	presentDays: number;
	absentDays: number;
	lines: SalaryLineItem[];
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
			startDate: run.tanggalMulai.toISOString().slice(0, 10),
			endDate: run.tanggalSelesai.toISOString().slice(0, 10),
			status: run.status,
			employeeCount: run.detail.length,
			totalNet: run.detail.reduce((acc, d) => acc + Number(d.gajiBersih), 0).toString(),
		},
		detail: run.detail.map((d) => ({
			id: d.id,
			employeeId: d.karyawanId,
			employeeName: d.karyawan.namaLengkap,
			employeeNumber: d.karyawan.nomorKaryawan,
			baseSalary: d.gajiPokok.toString(),
			totalEarnings: d.totalPendapatan.toString(),
			totalDeductions: d.totalPotongan.toString(),
			netPay: d.gajiBersih.toString(),
			totalCompanyCost: d.totalBiayaPerusahaan.toString(),
			presentDays: d.hariHadir,
			absentDays: d.hariAlpa,
			lines: fromStoredRincian(d.rincian),
		})),
	};
}

export type PayslipView = {
	number: string;
	periode: string;
	employeeName: string;
	employeeNumber: string;
	baseSalary: string;
	totalEarnings: string;
	totalDeductions: string;
	netPay: string;
	totalCompanyCost: string;
	presentDays: number;
	absentDays: number;
	lines: SalaryLineItem[];
};

export async function getPayslip(number: string, onlyEmployeeId?: string): Promise<PayslipView | null> {
	const slip = await prisma.payslip.findUnique({
		where: { nomor: number },
		include: {
			run: { select: { periode: true } },
			karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
		},
	});
	if (!slip) return null;
	if (onlyEmployeeId && slip.karyawanId !== onlyEmployeeId) return null;
	const detail = await prisma.salaryRunDetail.findUnique({
		where: { runId_karyawanId: { runId: slip.runId, karyawanId: slip.karyawanId } },
	});
	if (!detail) return null;
	return {
		number: slip.nomor,
		periode: slip.run.periode,
		employeeName: slip.karyawan.namaLengkap,
		employeeNumber: slip.karyawan.nomorKaryawan,
		baseSalary: detail.gajiPokok.toString(),
		totalEarnings: detail.totalPendapatan.toString(),
		totalDeductions: detail.totalPotongan.toString(),
		netPay: detail.gajiBersih.toString(),
		totalCompanyCost: detail.totalBiayaPerusahaan.toString(),
		presentDays: detail.hariHadir,
		absentDays: detail.hariAlpa,
		lines: fromStoredRincian(detail.rincian),
	};
}

export type MySlipItem = { number: string; periode: string; netPay: string };

export type DisburseInfo = {
	filename: string;
	remark: string;
	total: string;
	ready: number;
	incomplete: string[];
	csv: string;
};

/** Info + CSV disbursement gaji run. */
export async function getDisburseSalaryRun(runId: string): Promise<DisburseInfo | null> {
	const { run, detail } = await getRunDetail(runId);
	if (!run) return null;
	const employees = await prisma.karyawan.findMany({
		where: { id: { in: detail.map((d) => d.employeeId) } },
		select: { id: true, bankNama: true, bankNorek: true, bankAtasNama: true },
	});
	const bank = new Map(employees.map((k) => [k.id, k]));
	const remark = `GAJI ${run.periode}`;
	const { rows, incomplete, total } = splitDisbursement(
		detail.map((d) => ({
			name: `${d.employeeName} (${d.employeeNumber})`,
			bank: bank.get(d.employeeId)?.bankNama ?? null,
			accountNumber: bank.get(d.employeeId)?.bankNorek ?? null,
			accountName: bank.get(d.employeeId)?.bankAtasNama ?? null,
			amount: Number(d.netPay),
		})),
		remark,
	);
	return {
		filename: `disburse-gaji-${run.periode}.csv`,
		remark,
		total: String(total),
		ready: rows.length,
		incomplete,
		csv: buildDisbursementCsv(rows),
	};
}
export async function getMySlip(employeeId: string): Promise<MySlipItem[]> {
	const slips = await prisma.payslip.findMany({
		where: { karyawanId: employeeId, run: { status: "DITERBITKAN" } },
		orderBy: { run: { periode: "desc" } },
		include: {
			run: { select: { periode: true } },
			karyawan: { select: { id: true } },
		},
	});
	const out: MySlipItem[] = [];
	for (const s of slips) {
		const detail = await prisma.salaryRunDetail.findUnique({
			where: { runId_karyawanId: { runId: s.runId, karyawanId: employeeId } },
			select: { gajiBersih: true },
		});
		out.push({ number: s.nomor, periode: s.run.periode, netPay: detail?.gajiBersih.toString() ?? "0" });
	}
	return out;
}
