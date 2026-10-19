import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { accumulateGroups } from "./kelompok";
import {
  ALPHA_DIVISOR_KEY,
  LATE_MONTHLY_CAP_KEY,
  LATE_PER_MINUTE_KEY,
  PAYROLL_SETTING_DEFAULT,
  calculateAlphaDeduction,
  calculateLateDeduction,
  parseCurrencySetting,
  resolveAlphaDivisor,
} from "./potongan";
import { OVERTIME_DEFAULT_SETTINGS, OVERTIME_DIVISOR_KEY, OVERTIME_TIERED_KEY } from "./lembur";
import { SALARY_ADVANCE_DEFAULT_SETTINGS } from "./salary-advances";
import { calculateSalaryAdvanceDeduction } from "./salary-advances";
import { UNPAID_SUSPENSION_KEY } from "@/src/modules/employees/lib/disciplinary";
import { suspensionDaysInPeriod } from "@/src/modules/employees/lib/disciplinary";
import {
  calculateDailyOvertime,
  calculateHourlyRate,
  describeTiers,
  summarizeTiers,
  type OvertimeCategory,
} from "./lembur";
import {
  TER_FALLBACK,
  calculateDecemberPphCorrection,
  calculateMonthlyTerPph,
  terCategoryFromPtkp,
  type TerBracket,
  type StatusPtkpInput,
} from "./pph21-ter";

export type SalaryLineItem = {
  code: string;
  name: string;
  group: string;
  amount: number;
  description: string;
};

/**
 * Stored `rincian` JSONB shape (Indonesian keys — historical rows + slip
 * readers depend on it). English `SalaryLineItem` is the in-memory
 * transport; mapping happens at the persistence boundary only.
 */
export type StoredRincianItem = {
  kode: string;
  nama: string;
  kelompok: string;
  jumlah: number;
  keterangan: string;
};

export function toStoredRincian(lines: SalaryLineItem[]): StoredRincianItem[] {
  return lines.map((l) => ({
    kode: l.code,
    nama: l.name,
    kelompok: l.group,
    jumlah: Math.round(l.amount),
    keterangan: l.description,
  }));
}

export function fromStoredRincian(rincian: unknown): SalaryLineItem[] {
  if (!Array.isArray(rincian)) return [];
  return rincian.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return {
      code: String(o["kode"] ?? ""),
      name: String(o["nama"] ?? ""),
      group: String(o["kelompok"] ?? ""),
      amount: Number(o["jumlah"] ?? 0),
      description: String(o["keterangan"] ?? ""),
    };
  });
}

export type SalaryCalculation = {
  baseSalary: number;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  /** Premi ditanggung perusahaan (info slip, tak mengurangi bersih). */
  totalCompanyCost: number;
  /** Reimbursement periode ini (masuk bersih, di luar bruto PPh). */
  totalReimbursements: number;
  presentDays: number;
  absentDays: number;
  /** Menit rekap TERLAMBAT (toleransi shift dihormati). */
  totalLateMinutes: number;
  overtimeHours: number;
  nightShifts: number;
  lines: SalaryLineItem[];
  /** Rencana potongan kasbon periode ini (dibukukan salary run). */
  advanceDeductions: Array<{
    advanceId: string;
    number: string;
    amount: number;
    installmentNo: number;
    remainingAfter: number;
  }>;
  /** Klaim yang dibayar run ini (dibukukan salary run). */
  paidReimbursements: Array<{ claimId: string; number: string; amount: number }>;
};

/**
 * Aturan hitung gaji:
 * - Gapok: kontrak AKTIF terbaru. Hadir/alpa/lembur/shift dari rekap.
 * - NOMINAL tetap; PERSEN = % x min(gapok, batasAtas); PER_HARI x hariHadir;
 *   PER_JAM_LEMBUR x jam (legacy; UPAH_LEMBUR tiered bila LEMBUR_TIERED=1);
 *   PER_SHIFT_MALAM x shift malam.
 * - POTONGAN_ALPA: hari x gapok/pembagi (25/26/AKTUAL).
 * - POTONGAN_TELAT: menit TERLAMBAT x tarif (0 = mati), cap/bulan opsional.
 * - PPh 21 TER otomatis dari bruto (PP 58/2023); komponen manual POT_PPH21
 *   diabaikan. Desember: koreksi tahunan Pasal 17 (PMK 168/2023).
 * - PENDAPATAN/TUNJANGAN menambah; POTONGAN/IURAN mengurangi;
 *   BIAYA_PERUSAHAAN info slip saja.
 */

export type AnnualPphAccumulation = {
  /** Total bruto Jan–Nov tahun berjalan (tanpa bulan Des berjalan). */
  grossJanNov: number;
  /** Total PPh TER Jan–Nov yang sudah dipotong. */
  pphJanNov: number;
  /** Total iuran pengurang (JHT+JP) Jan–Nov. */
  contributionsJanNov: number;
  /** Reimburse Jan–Nov (di luar bruto). */
  reimbursementsJanNov: number;
  /** Jumlah bulan bekerja dalam tahun berjalan (1–12). */
  monthsWorked: number;
};

const terBracketCache = new Map<string, TerBracket[]>();

// Cache pengaturan 60 detik (diinvalidasi tiap save).
let settingsCacheAt = 0;
let settingsCacheMap: Record<string, string> = {};

/** Invalidasi cache pengaturan (dipanggil setiap save settings). */
export function resetSettingsCache(): void {
  settingsCacheAt = 0;
  settingsCacheMap = {};
}

const JS_DAY_TO_ENUM = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"] as const;

/**
 * Kategori hari tiap tanggal lembur (tier Kepmen 102/2004).
 * LIBUR bila di HariLibur; ada roster = KERJA; selain itu ikut kalender
 * penugasan (fallback Sab/Ming = LIBUR_5).
 */
export async function getOvertimeCategoryMap(
  employeeId: string,
  dates: Date[],
): Promise<Map<string, OvertimeCategory>> {
  const result = new Map<string, OvertimeCategory>();
  if (dates.length === 0) return result;
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const unique = [...new Set(dates.map(key))].sort();
  const rangeStart = new Date(`${unique[0]}T00:00:00.000Z`);
  const rangeEnd = new Date(`${unique[unique.length - 1]}T23:59:59.999Z`);

  const [holidayRows, rosterRows, assignments] = await Promise.all([
    prisma.hariLibur.findMany({
      where: { tanggal: { gte: rangeStart, lte: rangeEnd } },
      select: { tanggal: true },
    }),
    prisma.rosterShift.findMany({
      where: { karyawanId: employeeId, tanggal: { gte: rangeStart, lte: rangeEnd } },
      select: { tanggal: true },
    }),
    prisma.penugasanKalender.findMany({
      where: { karyawanId: employeeId },
      orderBy: { tanggalMulai: "desc" },
      select: { kalenderKerjaId: true, tanggalMulai: true, tanggalSelesai: true },
    }),
  ]);
  const holidaySet = new Set(holidayRows.map((r) => key(r.tanggal)));
  const rosterSet = new Set(rosterRows.map((r) => key(r.tanggal)));

  const calendarIds = [...new Set(assignments.map((p) => p.kalenderKerjaId))];
  const scheduleMap = new Map<number, { days: Record<string, boolean>; workdaysPerWeek: number }>();
  if (calendarIds.length > 0) {
    const calendars = await prisma.kalenderKerja.findMany({
      where: { id: { in: calendarIds } },
      select: { id: true, jadwalKerja: { select: { hari: true, isHariKerja: true } } },
    });
    for (const c of calendars) {
      const days: Record<string, boolean> = {};
      for (const j of c.jadwalKerja) days[j.hari] = j.isHariKerja;
      scheduleMap.set(c.id, { days, workdaysPerWeek: c.jadwalKerja.filter((j) => j.isHariKerja).length });
    }
  }
  const calendarFor = (dateKey: string): number | null => {
    const t = assignments.find(
      (p) => p.tanggalMulai.toISOString().slice(0, 10) <= dateKey && (!p.tanggalSelesai || p.tanggalSelesai.toISOString().slice(0, 10) >= dateKey),
    );
    return t ? t.kalenderKerjaId : null;
  };

  for (const dateKey of unique) {
    const dayEnum = JS_DAY_TO_ENUM[new Date(`${dateKey}T12:00:00.000Z`).getUTCDay()];
    if (holidaySet.has(dateKey)) {
      const calId = calendarFor(dateKey);
      const n = calId ? (scheduleMap.get(calId)?.workdaysPerWeek ?? 5) : 5;
      result.set(dateKey, n >= 6 ? "LIBUR_6" : "LIBUR_5");
    } else if (rosterSet.has(dateKey)) {
      result.set(dateKey, "KERJA");
    } else {
      const calId = calendarFor(dateKey);
      const info = calId ? scheduleMap.get(calId) : undefined;
      if (info && dayEnum in info.days) {
        result.set(dateKey, info.days[dayEnum] ? "KERJA" : info.workdaysPerWeek >= 6 ? "LIBUR_6" : "LIBUR_5");
      } else {
        const weekend = dayEnum === "SABTU" || dayEnum === "MINGGU";
        result.set(dateKey, weekend ? "LIBUR_5" : "KERJA");
      }
    }
  }
  return result;
}

export async function getPayrollSettingMap(): Promise<Record<string, string>> {
  if (Date.now() - settingsCacheAt < 60_000 && Object.keys(settingsCacheMap).length > 0) {
    return settingsCacheMap;
  }
  try {
    const rows = await prisma.payrollSetting.findMany({ select: { kunci: true, nilai: true } });
    settingsCacheMap = { ...PAYROLL_SETTING_DEFAULT, ...OVERTIME_DEFAULT_SETTINGS, ...SALARY_ADVANCE_DEFAULT_SETTINGS };
    for (const r of rows) settingsCacheMap[r.kunci] = r.nilai;
  } catch {
    settingsCacheMap = { ...PAYROLL_SETTING_DEFAULT, ...OVERTIME_DEFAULT_SETTINGS, ...SALARY_ADVANCE_DEFAULT_SETTINGS };
  }
  settingsCacheAt = Date.now();
  return settingsCacheMap;
}

export async function getTerBrackets(category: "A" | "B" | "C"): Promise<TerBracket[]> {
  const cached = terBracketCache.get(category);
  if (cached) return cached;
  try {
    const rows = await prisma.pph21TerTarif.findMany({
      where: { kategori: category },
      orderBy: { urutan: "asc" },
      select: { batasAtas: true, tarif: true },
    });
    if (rows.length > 0) {
      const brackets: TerBracket[] = rows.map((r) => ({
        batasAtas: r.batasAtas ? Number(r.batasAtas) : null,
        tarif: Number(r.tarif),
      }));
      terBracketCache.set(category, brackets);
      return brackets;
    }
  } catch {
    // SwapTable belum termigrasi (mis. test) → fallback kode.
  }
  return TER_FALLBACK[category];
}

export async function calculateEmployeeSalary(
  employeeId: string,
  start: Date,
  end: Date,
  annualAccumulation?: AnnualPphAccumulation,
): Promise<SalaryCalculation> {
  const rangeStart = toDbDate(start);
  const rangeEnd = toDbDate(end);

  const contract = await prisma.kontrakKerja.findFirst({
    where: { karyawanId: employeeId, status: "AKTIF" },
    orderBy: { tanggalMulai: "desc" },
    select: { gajiPokok: true },
  });
  const baseSalary = contract?.gajiPokok ? Number(contract.gajiPokok) : 0;

  const employee = await prisma.karyawan.findUnique({
    where: { id: employeeId },
    select: { statusPtkp: true, npwp: true },
  });
  const ptkp = ((employee?.statusPtkp ?? "TK_0") as StatusPtkpInput) ?? "TK_0";

  const rekap = await prisma.rekapHarian.findMany({
    where: { karyawanId: employeeId, tanggal: { gte: rangeStart, lte: rangeEnd } },
    select: { status: true, telatMenit: true },
  });
  const HADIR_SET = new Set(["HADIR", "TERLAMBAT", "CUTI", "IZIN", "DINAS"]);
  let presentDays = 0;
  let absentDays = 0;
  let totalLateMinutes = 0;
  for (const r of rekap) {
    if (r.status === "ALPA") absentDays++;
    else if (HADIR_SET.has(r.status)) presentDays++;
    // Hanya status TERLAMBAT yang didenda (toleransi shift dihormati).
    if (r.status === "TERLAMBAT") totalLateMinutes += r.telatMenit ?? 0;
  }

  const overtimeRows = await prisma.lembur.findMany({
    where: { karyawanId: employeeId, tanggal: { gte: rangeStart, lte: rangeEnd }, status: "DISETUJUI" },
    select: { tanggal: true, jumlahJam: true },
  });
  const overtimeHours = overtimeRows.reduce((acc, r) => acc + Number(r.jumlahJam), 0);

  const nightShifts = await prisma.rosterShift.count({
    where: { karyawanId: employeeId, tanggal: { gte: rangeStart, lte: rangeEnd }, shift: { lintasHari: true } },
  });

  const salaryAssignments = await prisma.gajiKaryawan.findMany({
    where: { karyawanId: employeeId, isActive: true, komponen: { isActive: true } },
    include: { komponen: true },
    orderBy: { komponen: { urutan: "asc" } },
  });

  // Aturan potongan global (pembagi alpa, tarif + cap telat).
  const settings = await getPayrollSettingMap();
  const endDate = new Date(end);
  const daysInMonth = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0)).getUTCDate();
  const absentDivisor = resolveAlphaDivisor(settings[ALPHA_DIVISOR_KEY], daysInMonth);
  const lateRate = parseCurrencySetting(settings[LATE_PER_MINUTE_KEY]) ?? 0;
  const maxLate = parseCurrencySetting(settings[LATE_MONTHLY_CAP_KEY]);

  // Upah lembur tiered (regulasi) vs flat (legacy).
  const tieredOn = (settings[OVERTIME_TIERED_KEY] ?? "1").trim() !== "0";
  const divisorRaw = Math.floor(Number(settings[OVERTIME_DIVISOR_KEY] ?? 173));
  const overtimeDivisor = Number.isFinite(divisorRaw) && divisorRaw > 0 ? divisorRaw : 173;

  const lines: SalaryLineItem[] = [];
  let totalEarnings = baseSalary;
  let totalDeductions = 0;
  let totalCompanyCost = 0;

  // Upah sebulan = gapok + tunjangan tetap nominal.
  const fixedAllowances = salaryAssignments
    .filter((a) => a.komponen.kelompok === "TUNJANGAN" && a.komponen.tipe === "NOMINAL")
    .reduce((acc, a) => acc + Number(a.komponen.nilai), 0);

  if (baseSalary > 0) {
    lines.push({ code: "GAJI_POKOK", name: "Gaji Pokok", group: "PENDAPATAN", amount: baseSalary, description: "Dari kontrak aktif" });
  }

  for (const entry of salaryAssignments) {
    const component = entry.komponen;
    // PPh 21 otomatis via TER — komponen manual diabaikan anti-ganda.
    if (component.kode === "POT_PPH21" || component.kode === "POTONGAN_PPH21") continue;
    let amount = 0;
    let note = "";
    if (component.kode === "POTONGAN_ALPA") {
      amount = calculateAlphaDeduction(baseSalary, absentDays, absentDivisor);
      note = `${absentDays} hari x GP/${absentDivisor}`;
    } else if (component.kode === "POTONGAN_TELAT") {
      const late = calculateLateDeduction(totalLateMinutes, lateRate, maxLate);
      amount = late.amount;
      note = lateRate === 0
        ? "Tarif belum diatur (nonaktif)"
        : `${totalLateMinutes} mnt x Rp${lateRate.toLocaleString("id-ID")}${late.capped ? ` (cap Rp${(maxLate ?? 0).toLocaleString("id-ID")})` : ""}`;
    } else if (component.kode === "UPAH_LEMBUR" && tieredOn) {
      // Tiered Kepmen 102/2004 — nilai komponen diabaikan.
      const monthlyWage = baseSalary + fixedAllowances;
      const hourlyRate = calculateHourlyRate(monthlyWage, overtimeDivisor);
      const categoryMap = await getOvertimeCategoryMap(
        employeeId,
        overtimeRows.map((r) => r.tanggal),
      );
      const tierTotals = new Map<number, number>();
      let total = 0;
      for (const row of overtimeRows) {
        const key = row.tanggal.toISOString().slice(0, 10);
        const dayResult = calculateDailyOvertime(Number(row.jumlahJam), hourlyRate, categoryMap.get(key) ?? "KERJA");
        total += dayResult.amount;
        summarizeTiers(dayResult.tiers, tierTotals);
      }
      amount = total;
      note =
        overtimeRows.length === 0 || monthlyWage <= 0
          ? "Tidak ada lembur/upah disetujui"
          : `${Math.round(overtimeHours * 100) / 100} jam (${describeTiers(tierTotals)}) @Rp${Math.round(hourlyRate).toLocaleString("id-ID")}/jam`;
    } else if (component.tipe === "NOMINAL") {
      amount = Number(component.nilai);
    } else if (component.tipe === "PERSEN") {
      const basis = component.batasAtas ? Math.min(baseSalary, Number(component.batasAtas)) : baseSalary;
      amount = Math.round((basis * Number(component.nilai)) / 100);
      note = `${component.nilai}% x ${basis}`;
    } else if (component.tipe === "PER_HARI") {
      amount = Math.round(Number(component.nilai) * presentDays);
      note = `${presentDays} hari`;
    } else if (component.tipe === "PER_JAM_LEMBUR") {
      amount = Math.round(Number(component.nilai) * overtimeHours);
      note = `${overtimeHours} jam`;
    } else if (component.tipe === "PER_SHIFT_MALAM") {
      amount = Math.round(Number(component.nilai) * nightShifts);
      note = `${nightShifts} shift`;
    }

    lines.push({ code: component.kode, name: component.nama, group: component.kelompok, amount, description: note });
    const acc = { earnings: totalEarnings, deductions: totalDeductions, companyCost: totalCompanyCost };
    accumulateGroups(component.kelompok, amount, acc);
    totalEarnings = acc.earnings;
    totalDeductions = acc.deductions;
    totalCompanyCost = acc.companyCost;
  }

  // Reimbursement disetujui yang belum dibayar: ikut gaji (TUNJANGAN),
  // tapi di luar bruto PPh (ganti rugi riil berkwiansi).
  const claims = await prisma.expenseClaim.findMany({
    where: { karyawanId: employeeId, status: "DISETUJUI", pembayaran: { none: {} } },
    orderBy: { createdAt: "asc" },
    select: { id: true, nomor: true, nominal: true },
  });
  let totalReimbursements = 0;
  const paidReimbursements: SalaryCalculation["paidReimbursements"] = [];
  for (const c of claims) {
    const amount = Math.max(0, Math.round(Number(c.nominal)));
    if (amount <= 0) continue;
    totalReimbursements += amount;
    paidReimbursements.push({ claimId: c.id, number: c.nomor, amount });
  }
  if (totalReimbursements > 0) {
    lines.push({
      code: "REIMBURSE",
      name: `Reimbursement (${claims.length} klaim)`,
      group: "TUNJANGAN",
      amount: totalReimbursements,
      description: paidReimbursements.map((r) => r.number).join(", "),
    });
    totalEarnings += totalReimbursements;
  }

  // PPh 21 TER otomatis (PP 58/2023). Bruto = totalEarnings tanpa reimburse.
  const gross = Math.round(totalEarnings) - totalReimbursements;
  const category = terCategoryFromPtkp(ptkp);
  const brackets = await getTerBrackets(category);
  const endMonth = new Date(end).getUTCMonth() + 1;
  let pphAmount = 0;
  let pphNote = "";
  if (endMonth === 12 && annualAccumulation) {
    const currentContributions = lines
      .filter((r) => r.code === "BPJS_JHT" || r.code === "BPJS_JP")
      .reduce((acc, r) => acc + r.amount, 0);
    const correction = calculateDecemberPphCorrection({
      ptkp,
      annualGross: annualAccumulation.grossJanNov + gross - annualAccumulation.reimbursementsJanNov,
      annualDeductions: annualAccumulation.contributionsJanNov + currentContributions,
      monthsWorked: annualAccumulation.monthsWorked,
      pphPaidJanNov: annualAccumulation.pphJanNov,
      hasNpwp: Boolean(employee?.npwp),
    });
    pphAmount = correction.decemberPph;
    pphNote = `${correction.note} (PKP ${correction.taxableIncome.toLocaleString("id-ID")})`;
  } else {
    const result = calculateMonthlyTerPph(gross, ptkp, brackets);
    pphAmount = result.pph;
    pphNote = result.note;
  }
  if (pphAmount > 0 || gross > 0) {
    lines.push({ code: "POT_PPH21", name: "PPh 21 TER", group: "POTONGAN", amount: pphAmount, description: pphNote });
    totalDeductions += pphAmount;
  }

    // Skorsing tanpa upah (pengaturan): dipotong seperti alpa.
  if ((settings[UNPAID_SUSPENSION_KEY] ?? "0").trim() === "1" && baseSalary > 0) {
    const suspensions = await prisma.suratPeringatan.findMany({
      where: { karyawanId: employeeId, tingkat: "SKORSING", status: "DITERBITKAN" },
      select: { tanggalSkorsingMulai: true, tanggalSkorsingSelesai: true },
    });
    let suspensionDays = 0;
    for (const s of suspensions) {
      suspensionDays += suspensionDaysInPeriod(s.tanggalSkorsingMulai, s.tanggalSkorsingSelesai, rangeStart, rangeEnd);
    }
    if (suspensionDays > 0) {
      const amount = Math.round((suspensionDays * baseSalary) / absentDivisor);
      lines.push({
        code: "POTONGAN_SKORSING",
        name: "Potongan Skorsing",
        group: "POTONGAN",
        amount,
        description: `${suspensionDays} hari x GP/${absentDivisor}`,
      });
      totalDeductions += amount;
    }
  }

  // Angsuran kasbon otomatis (read-only; pembukuan di salary run).
  const activeAdvances = await prisma.kasbon.findMany({
    where: {
      karyawanId: employeeId,
      status: "DISETUJUI",
      sisaHutang: { gt: 0 },
      mulaiPotong: { lte: rangeEnd },
    },
    orderBy: [{ mulaiPotong: "asc" }, { createdAt: "asc" }],
    select: { id: true, nomor: true, sisaHutang: true, angsuranPerBulan: true, _count: { select: { angsuran: true } } },
  });
  const advanceDeductions: SalaryCalculation["advanceDeductions"] = [];
  for (const advance of activeAdvances) {
    const amount = calculateSalaryAdvanceDeduction(Number(advance.sisaHutang), Number(advance.angsuranPerBulan));
    if (amount <= 0) continue;
    const remainingAfter = Math.max(0, Math.round(Number(advance.sisaHutang)) - amount);
    advanceDeductions.push({
      advanceId: advance.id,
      number: advance.nomor,
      amount,
      installmentNo: advance._count.angsuran + 1,
      remainingAfter,
    });
    lines.push({
      code: "POT_KASBON",
      name: `Angsuran Kasbon ${advance.nomor}`,
      group: "POTONGAN",
      amount,
      description: `Angsuran ke-${advance._count.angsuran + 1} (sisa Rp${remainingAfter.toLocaleString("id-ID")})`,
    });
    totalDeductions += amount;
  }

  return {
    baseSalary,
    totalEarnings,
    totalDeductions,
    netPay: totalEarnings - totalDeductions,
    totalCompanyCost,
    totalReimbursements,
    presentDays,
    absentDays,
    totalLateMinutes,
    overtimeHours,
    nightShifts,
    lines,
    advanceDeductions,
    paidReimbursements,
  };
}
