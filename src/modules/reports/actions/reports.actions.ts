"use server";

import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { getCurrentSession } from "@/src/lib/auth-guard";

const REPORT_KINDS = ["attendance", "leave", "overtime", "turnover", "contracts", "late", "balance"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export type ReportResult = {
  columns: string[];
  rows: string[][];
};

/** Manajer hanya melihat bawahan langsung; peran lain tanpa batas. */
async function scopeEmployeeIds(): Promise<string[] | null> {
  try {
    const session = await getCurrentSession();
    if (!session) return [];
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (!user || user.role !== "MANAJER") return null;
    const me = await prisma.karyawan.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!me) return [];
    const team = await prisma.karyawan.findMany({
      where: { atasanLangsungId: me.id },
      select: { id: true },
    });
    return team.map((t) => t.id);
  } catch {
    return [];
  }
}

export async function getReports(kind: string, start: string, end: string): Promise<ReportResult> {
  if (!(REPORT_KINDS as readonly string[]).includes(kind)) {
    return { columns: [], rows: [] };
  }
  const rangeStart = toDbDate(start);
  const rangeEnd = toDbDate(end);
  if (!(rangeStart <= rangeEnd)) return { columns: [], rows: [] };
  const scope = await scopeEmployeeIds();
  const owned = scope ? { karyawanId: { in: scope } } : {};

  if (kind === "attendance") {
    const rows = await prisma.rekapHarian.findMany({
      where: { tanggal: { gte: rangeStart, lte: rangeEnd }, ...owned },
      orderBy: [{ tanggal: "asc" }],
      include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
      take: 2000,
    });
    return {
      columns: ["Tanggal", "Nomor", "Nama", "Status", "Telat (m)", "Pulang Cepat (m)", "Lembur (m)"],
      rows: rows.map((r) => [
        r.tanggal.toISOString().slice(0, 10),
        r.karyawan.nomorKaryawan,
        r.karyawan.namaLengkap,
        r.status,
        String(r.telatMenit),
        String(r.pulangCepatMenit),
        String(r.lemburMenit),
      ]),
    };
  }

  if (kind === "leave") {
    const rows = await prisma.pengajuanKetidakhadiran.findMany({
      where: { tanggalMulai: { lte: rangeEnd }, tanggalSelesai: { gte: rangeStart }, ...owned },
      orderBy: [{ tanggalMulai: "asc" }],
      include: {
        karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
        jenisKetidakhadiran: { select: { nama: true } },
      },
      take: 2000,
    });
    return {
      columns: ["Nomor", "Nama", "Jenis", "Mulai", "Selesai", "Hari", "Status"],
      rows: rows.map((r) => [
        r.nomorPengajuan,
        r.karyawan.namaLengkap,
        r.jenisKetidakhadiran.nama,
        r.tanggalMulai.toISOString().slice(0, 10),
        r.tanggalSelesai.toISOString().slice(0, 10),
        r.jumlahHari.toString(),
        r.status,
      ]),
    };
  }

  if (kind === "overtime") {
    const rows = await prisma.lembur.findMany({
      where: { tanggal: { gte: rangeStart, lte: rangeEnd }, ...owned },
      orderBy: [{ tanggal: "asc" }],
      include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
      take: 2000,
    });
    return {
      columns: ["Tanggal", "Nomor", "Nama", "Jam", "Alasan", "Status"],
      rows: rows.map((r) => [
        r.tanggal.toISOString().slice(0, 10),
        r.karyawan.nomorKaryawan,
        r.karyawan.namaLengkap,
        r.jumlahJam.toString(),
        r.alasan,
        r.status,
      ]),
    };
  }

  if (kind === "turnover") {
    const filter = scope ? { id: { in: scope } } : {};
    const joined = await prisma.karyawan.findMany({
      where: { tanggalMasuk: { gte: rangeStart, lte: rangeEnd }, ...filter },
      select: { nomorKaryawan: true, namaLengkap: true, tanggalMasuk: true },
    });
    const left = await prisma.karyawan.findMany({
      where: { tanggalResign: { gte: rangeStart, lte: rangeEnd }, ...filter },
      select: { nomorKaryawan: true, namaLengkap: true, tanggalResign: true, status: true },
    });
    return {
      columns: ["Pergerakan", "Nomor", "Nama", "Tanggal", "Status"],
      rows: [
        ...joined.map((k) => ["MASUK", k.nomorKaryawan, k.namaLengkap, k.tanggalMasuk.toISOString().slice(0, 10), ""]),
        ...left.map((k) => ["KELUAR", k.nomorKaryawan, k.namaLengkap, k.tanggalResign?.toISOString().slice(0, 10) ?? "", k.status]),
      ],
    };
  }

  if (kind === "contracts") {
    const rows = await prisma.kontrakKerja.findMany({
      where: { tanggalSelesai: { gte: rangeStart, lte: rangeEnd }, ...(scope ? { karyawanId: { in: scope } } : {}) },
      orderBy: [{ tanggalSelesai: "asc" }],
      include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
      take: 2000,
    });
    return {
      columns: ["Nomor Kontrak", "Nama", "Jenis", "Mulai", "Selesai", "Status"],
      rows: rows.map((r) => [
        r.nomorKontrak,
        r.karyawan.namaLengkap,
        r.jenisKontrak,
        r.tanggalMulai.toISOString().slice(0, 10),
        r.tanggalSelesai?.toISOString().slice(0, 10) ?? "-",
        r.status,
      ]),
    };
  }

  if (kind === "late") {
    const rows = await prisma.rekapHarian.findMany({
      where: { tanggal: { gte: rangeStart, lte: rangeEnd }, status: "TERLAMBAT", ...owned },
      include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
      take: 2000,
    });
    const totals = new Map<string, { number: string; name: string; days: number; minutes: number }>();
    for (const r of rows) {
      const cur = totals.get(r.karyawanId) ?? { number: r.karyawan.nomorKaryawan, name: r.karyawan.namaLengkap, days: 0, minutes: 0 };
      cur.days++;
      cur.minutes += r.telatMenit;
      totals.set(r.karyawanId, cur);
    }
    return {
      columns: ["Nomor", "Nama", "Hari Telat", "Total Menit"],
      rows: [...totals.values()]
        .sort((a, b) => b.minutes - a.minutes)
        .map((a) => [a.number, a.name, String(a.days), String(a.minutes)]),
    };
  }

  const year = rangeStart.getUTCFullYear();
  const balances = await prisma.saldoCuti.findMany({
    where: { tahun: year, ...(scope ? { karyawanId: { in: scope } } : {}) },
    orderBy: [{ karyawan: { namaLengkap: "asc" } }],
    include: {
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
      jenisKetidakhadiran: { select: { nama: true } },
    },
    take: 2000,
  });
  return {
    columns: ["Nomor", "Nama", "Jenis", "Tahun", "Sisa"],
    rows: balances.map((s) => [
      s.karyawan.nomorKaryawan,
      s.karyawan.namaLengkap,
      s.jenisKetidakhadiran.nama,
      String(s.tahun),
      s.saldoAkhir.toString(),
    ]),
  };
}
