"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { getLapisTer } from "../lib/calculate";
import {
  hitungPPhMarginalTer,
  kategoriTerDariPtkp,
  type StatusPtkpInput,
} from "../lib/pph21-ter";
import { hitungMasaKerjaBulan, hitungNominalThr, terlambatBayarThr } from "../lib/thr";
import { buatKodeVerifikasi } from "../lib/verifikasi";
import { bagiDisburse, buildDisburseCsv } from "../lib/disburse";

export type ThrActionResult = { success: boolean; message: string; id?: string };

export type ThrRunItem = {
  id: string;
  tahun: number;
  namaHariRaya: string;
  tanggalHariRaya: string;
  tanggalBayar: string;
  status: string;
  terlambat: boolean;
  jumlahKaryawan: number;
  totalBersih: string;
};

export async function getThrRuns(): Promise<ThrRunItem[]> {
  const runs = await prisma.thrRun.findMany({
    orderBy: [{ tahun: "desc" }, { tanggalHariRaya: "desc" }],
    include: { detail: { select: { bersih: true } } },
  });
  return runs.map((r) => ({
    id: r.id,
    tahun: r.tahun,
    namaHariRaya: r.namaHariRaya,
    tanggalHariRaya: r.tanggalHariRaya.toISOString().slice(0, 10),
    tanggalBayar: r.tanggalBayar.toISOString().slice(0, 10),
    status: r.status,
    terlambat: terlambatBayarThr(r.tanggalBayar, r.tanggalHariRaya),
    jumlahKaryawan: r.detail.length,
    totalBersih: r.detail.reduce((acc, d) => acc + Number(d.bersih), 0).toString(),
  }));
}

export async function buatThrRun(
  input: {
    tahun: number;
    namaHariRaya: string;
    tanggalHariRaya: string;
    tanggalBayar: string;
    catatan?: string;
  },
  createdById?: string,
): Promise<ThrActionResult> {
  const tahun = Math.floor(Number(input.tahun));
  const namaHariRaya = String(input.namaHariRaya ?? "").trim();
  if (!Number.isFinite(tahun) || tahun < 2000 || tahun > 2100) {
    return { success: false, message: "Tahun tidak valid." };
  }
  if (!namaHariRaya) return { success: false, message: "Nama hari raya wajib diisi." };
  const tglRaya = toDbDate(input.tanggalHariRaya);
  const tglBayar = toDbDate(input.tanggalBayar);
  if (Number.isNaN(tglRaya.getTime()) || Number.isNaN(tglBayar.getTime())) {
    return { success: false, message: "Tanggal hari raya / bayar tidak valid." };
  }
  if (tglRaya.getUTCFullYear() !== tahun) {
    return { success: false, message: "Tanggal hari raya harus di tahun yang sama." };
  }

  try {
    const created = await prisma.thrRun.create({
      data: {
        tahun,
        namaHariRaya,
        tanggalHariRaya: tglRaya,
        tanggalBayar: tglBayar,
        catatan: input.catatan?.trim() ? input.catatan.trim() : null,
        createdById,
      },
    });
    revalidatePath("/payroll/thr");
    const pesanTerlambat = terlambatBayarThr(tglBayar, tglRaya)
      ? " Perhatian: tanggal bayar melewati H-7 (denda 5% bila terlambat bayar)."
      : "";
    return { success: true, message: `THR ${namaHariRaya} ${tahun} dibuat.${pesanTerlambat}`, id: created.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, message: "THR hari raya ini di tahun tersebut sudah ada." };
    }
    return { success: false, message: "Gagal membuat THR run." };
  }
}

export async function hitungThrRun(runId: string): Promise<ThrActionResult> {
  const run = await prisma.thrRun.findUnique({ where: { id: runId } });
  if (!run) return { success: false, message: "THR run tidak ditemukan." };
  if (run.status === "FINAL" || run.status === "DITERBITKAN") {
    return { success: false, message: "THR run sudah final, tidak bisa dihitung ulang." };
  }

  const karyawan = await prisma.karyawan.findMany({
    where: { status: { in: ["AKTIF", "PROBASI"] } },
    select: { id: true, tanggalMasuk: true, statusPtkp: true },
  });

  // Acuan gaji bulan pembayaran untuk PPh marginal TER (PMK 168/2023).
  const periodeBayar = `${run.tanggalBayar.getUTCFullYear()}-${String(run.tanggalBayar.getUTCMonth() + 1).padStart(2, "0")}`;
  const gajiAcuan = await prisma.salaryRunDetail.findMany({
    where: { run: { periode: periodeBayar } },
    select: { karyawanId: true, totalPendapatan: true },
  });
  const acuanMap = new Map(gajiAcuan.map((g) => [g.karyawanId, Number(g.totalPendapatan)]));

  await prisma.$transaction(async (tx) => {
    await tx.thrDetail.deleteMany({ where: { runId } });
    for (const k of karyawan) {
      const kontrak = await tx.kontrakKerja.findFirst({
        where: { karyawanId: k.id, status: "AKTIF" },
        orderBy: { tanggalMulai: "desc" },
        select: { gajiPokok: true },
      });
      const gapok = kontrak?.gajiPokok ? Number(kontrak.gajiPokok) : 0;

      const tetapAgg = await tx.gajiKaryawan.findMany({
        where: {
          karyawanId: k.id,
          isActive: true,
          komponen: { isActive: true, kelompok: "TUNJANGAN", tipe: "NOMINAL" },
        },
        select: { komponen: { select: { nilai: true } } },
      });
      const tunjanganTetap = tetapAgg.reduce((acc, a) => acc + Number(a.komponen.nilai), 0);

      const ptkp = (k.statusPtkp ?? "TK_0") as StatusPtkpInput;
      const upah = gapok + tunjanganTetap;
      const masa = hitungMasaKerjaBulan(k.tanggalMasuk, run.tanggalHariRaya);
      const bruto = hitungNominalThr(upah, masa);

      const lapis = await getLapisTer(kategoriTerDariPtkp(ptkp));
      const acuan = acuanMap.get(k.id) ?? 0;
      const pphHasil = hitungPPhMarginalTer(acuan, bruto, ptkp, lapis);
      const pph = bruto > 0 ? pphHasil.pph : 0;

      await tx.thrDetail.create({
        data: {
          nomor: `THR-${run.tahun}-${k.id.slice(-6).toUpperCase()}`,
          runId,
          karyawanId: k.id,
          masaKerjaBulan: masa,
          upahSebulan: upah,
          bruto,
          pph21: pph,
          bersih: bruto - pph,
          rincian: [
            { kode: "GAJI_POKOK", nama: "Gaji Pokok (kontrak aktif)", kelompok: "PENDAPATAN", jumlah: gapok, keterangan: "" },
            { kode: "TJ_TETAP", nama: "Tunjangan Tetap (nominal)", kelompok: "TUNJANGAN", jumlah: tunjanganTetap, keterangan: "" },
            {
              kode: "THR_BRUTO",
              nama: "THR Bruto",
              kelompok: "PENDAPATAN",
              jumlah: bruto,
              keterangan: masa >= 12 ? "1x upah (>=12 bln)" : masa >= 1 ? `Prorata ${masa}/12 x upah` : "Masa kerja < 1 bulan",
            },
            { kode: "POT_PPH21", nama: "PPh 21 TER (marginal)", kelompok: "POTONGAN", jumlah: pph, keterangan: pphHasil.keterangan },
          ] as never,
        },
      });
    }
    await tx.thrRun.update({ where: { id: runId }, data: { status: "DIHITUNG" } });
  });

  revalidatePath("/payroll/thr");
  return { success: true, message: `THR dihitung untuk ${karyawan.length} karyawan.` };
}

export async function finalisasiThrRun(runId: string): Promise<ThrActionResult> {
  const run = await prisma.thrRun.findUnique({ where: { id: runId }, include: { _count: { select: { detail: true } } } });
  if (!run) return { success: false, message: "THR run tidak ditemukan." };
  if (run.status !== "DIHITUNG") return { success: false, message: "Hitung dulu sebelum finalisasi." };
  if (run._count.detail === 0) return { success: false, message: "Belum ada detail." };
  await prisma.thrRun.update({ where: { id: runId }, data: { status: "FINAL" } });
  revalidatePath("/payroll/thr");
  return { success: true, message: "THR run dikunci (FINAL)." };
}

export async function terbitkanThrRun(runId: string): Promise<ThrActionResult> {
  const run = await prisma.thrRun.findUnique({
    where: { id: runId },
    select: { status: true, detail: { select: { id: true, kodeVerifikasi: true } } },
  });
  if (!run) return { success: false, message: "THR run tidak ditemukan." };
  if (run.status !== "FINAL") return { success: false, message: "Finalisasi dulu sebelum terbit." };
  await prisma.$transaction(async (tx) => {
    for (const d of run.detail) {
      if (!d.kodeVerifikasi) {
        await tx.thrDetail.update({ where: { id: d.id }, data: { kodeVerifikasi: buatKodeVerifikasi() } });
      }
    }
    await tx.thrRun.update({ where: { id: runId }, data: { status: "DITERBITKAN" } });
  });
  revalidatePath("/payroll/thr");
  return { success: true, message: "Slip THR diterbitkan." };
}

export async function hapusThrRun(runId: string): Promise<ThrActionResult> {
  const run = await prisma.thrRun.findUnique({ where: { id: runId }, select: { status: true } });
  if (!run) return { success: false, message: "THR run tidak ditemukan." };
  if (run.status === "FINAL" || run.status === "DITERBITKAN") {
    return { success: false, message: "THR run final tidak bisa dihapus." };
  }
  await prisma.thrRun.delete({ where: { id: runId } });
  revalidatePath("/payroll/thr");
  return { success: true, message: "THR run dihapus." };
}

export type ThrDetailItem = {
  id: string;
  nomor: string;
  karyawanId: string;
  karyawanNama: string;
  nomorKaryawan: string;
  masaKerjaBulan: number;
  upahSebulan: string;
  bruto: string;
  pph21: string;
  bersih: string;
  rincian: Array<{ kode: string; nama: string; kelompok: string; jumlah: number; keterangan: string }>;
};

export async function getThrDetail(runId: string): Promise<{ run: ThrRunItem | null; detail: ThrDetailItem[] }> {
  const run = await prisma.thrRun.findUnique({
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
      tahun: run.tahun,
      namaHariRaya: run.namaHariRaya,
      tanggalHariRaya: run.tanggalHariRaya.toISOString().slice(0, 10),
      tanggalBayar: run.tanggalBayar.toISOString().slice(0, 10),
      status: run.status,
      terlambat: terlambatBayarThr(run.tanggalBayar, run.tanggalHariRaya),
      jumlahKaryawan: run.detail.length,
      totalBersih: run.detail.reduce((acc, d) => acc + Number(d.bersih), 0).toString(),
    },
    detail: run.detail.map((d) => ({
      id: d.id,
      nomor: d.nomor,
      karyawanId: d.karyawanId,
      karyawanNama: d.karyawan.namaLengkap,
      nomorKaryawan: d.karyawan.nomorKaryawan,
      masaKerjaBulan: d.masaKerjaBulan,
      upahSebulan: d.upahSebulan.toString(),
      bruto: d.bruto.toString(),
      pph21: d.pph21.toString(),
      bersih: d.bersih.toString(),
      rincian: d.rincian as ThrDetailItem["rincian"],
    })),
  };
}

export type ThrSlipView = {
  nomor: string;
  tahun: number;
  namaHariRaya: string;
  tanggalHariRaya: string;
  tanggalBayar: string;
  karyawanNama: string;
  nomorKaryawan: string;
  masaKerjaBulan: number;
  upahSebulan: string;
  bruto: string;
  pph21: string;
  bersih: string;
  rincian: ThrDetailItem["rincian"];
};

export async function getThrSlip(nomor: string, onlyKaryawanId?: string): Promise<ThrSlipView | null> {
  const d = await prisma.thrDetail.findUnique({
    where: { nomor },
    include: {
      run: { select: { tahun: true, namaHariRaya: true, tanggalHariRaya: true, tanggalBayar: true, status: true } },
      karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
    },
  });
  if (!d) return null;
  if (onlyKaryawanId && d.karyawanId !== onlyKaryawanId) return null;
  // Slip THR hanya terlihat setelah diterbitkan; Finance boleh pratinjau saat FINAL.
  if (d.run.status !== "DITERBITKAN" && (onlyKaryawanId || d.run.status !== "FINAL")) return null;
  return {
    nomor: d.nomor,
    tahun: d.run.tahun,
    namaHariRaya: d.run.namaHariRaya,
    tanggalHariRaya: d.run.tanggalHariRaya.toISOString().slice(0, 10),
    tanggalBayar: d.run.tanggalBayar.toISOString().slice(0, 10),
    karyawanNama: d.karyawan.namaLengkap,
    nomorKaryawan: d.karyawan.nomorKaryawan,
    masaKerjaBulan: d.masaKerjaBulan,
    upahSebulan: d.upahSebulan.toString(),
    bruto: d.bruto.toString(),
    pph21: d.pph21.toString(),
    bersih: d.bersih.toString(),
    rincian: d.rincian as ThrDetailItem["rincian"],
  };
}

export type ThrSayaItem = { nomor: string; tahun: number; namaHariRaya: string; bersih: string };

export type DisburseThrInfo = {
  filename: string;
  berita: string;
  total: string;
  siap: number;
  belum: string[];
  csv: string;
};

/** Info + CSV disbursement THR run. */
export async function getDisburseThrRun(runId: string): Promise<DisburseThrInfo | null> {
  const { run, detail } = await getThrDetail(runId);
  if (!run) return null;
  const kary = await prisma.karyawan.findMany({
    where: { id: { in: detail.map((d) => d.karyawanId) } },
    select: { id: true, bankNama: true, bankNorek: true, bankAtasNama: true },
  });
  const bank = new Map(kary.map((k) => [k.id, k]));
  const berita = `THR ${run.namaHariRaya} ${run.tahun}`.toUpperCase();
  const { baris, belumLengkap, total } = bagiDisburse(
    detail.map((d) => ({
      nama: `${d.karyawanNama} (${d.nomorKaryawan})`,
      bank: bank.get(d.karyawanId)?.bankNama ?? null,
      norek: bank.get(d.karyawanId)?.bankNorek ?? null,
      atasNama: bank.get(d.karyawanId)?.bankAtasNama ?? null,
      nominal: Number(d.bersih),
    })),
    berita,
  );
  return {
    filename: `disburse-thr-${run.tahun}-${run.namaHariRaya.toLowerCase().replace(/\s+/g, "-")}.csv`,
    berita,
    total: String(total),
    siap: baris.length,
    belum: belumLengkap,
    csv: buildDisburseCsv(baris),
  };
}

export async function getThrSaya(karyawanId: string): Promise<ThrSayaItem[]> {
  const rows = await prisma.thrDetail.findMany({
    where: { karyawanId, run: { status: "DITERBITKAN" } },
    orderBy: [{ run: { tahun: "desc" } }, { run: { tanggalHariRaya: "desc" } }],
    include: { run: { select: { tahun: true, namaHariRaya: true } } },
  });
  return rows.map((r) => ({ nomor: r.nomor, tahun: r.run.tahun, namaHariRaya: r.run.namaHariRaya, bersih: r.bersih.toString() }));
}
