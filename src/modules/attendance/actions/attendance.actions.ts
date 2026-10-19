"use server";

import { revalidatePath } from "next/cache";
import { StatusAbsensi, SumberAbsensi, TipeAbsensi } from "@/generated/prisma/client";
import prisma from "@/src/lib/prisma";
import { getCurrentSession } from "@/src/lib/auth-guard";
import { recordAudit } from "@/src/modules/audit/lib/audit";
import { decimalKeNumber } from "@/src/lib/decimal";
import { measureDistanceMeters, validateRadius } from "../lib/geo";

export type AttendanceType = keyof typeof TipeAbsensi;
export type AttendanceSource = keyof typeof SumberAbsensi;

export type AttendanceListItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  time: string;
  eventType: string;
  source: string;
  status: string;
  note: string | null;
  /** true bila perangkat melaporkan/dicurigai GPS simulasi. */
  isMocked: boolean;
  /** Hasil validasi radius saat pencatatan (null = tidak dinilai). */
  isOutsideRadius: boolean | null;
  /** P6-5 — presensi mobile dari antrean offline yang tiba terlambat. */
  terlambatKirim: boolean;
};

export type AttendanceActionResult = {
  success: boolean;
  message: string;
  /** Hasil validasi radius lokasi (PRD mobile Bag. 5.4). null = tidak dinilai. */
  isOutsideRadius?: boolean | null;
  /** true bila perangkat melaporkan GPS simulasi/placeholder. */
  isMocked?: boolean;
  /** Jarak ke pusat lokasi kerja dalam meter, bila tersedia. */
  distanceMeters?: number | null;
  workLocationId?: string | null;
  /** P6-5 — event mobile yang dikirim lewat antrean offline (waktu perangkat). */
  terlambatKirim?: boolean;
};

const TYPE_LIST = Object.keys(TipeAbsensi) as AttendanceType[];
const SOURCE_LIST = Object.keys(SumberAbsensi) as AttendanceSource[];

/**
 * P6-5 — ambang "terlambat kirim": selisih waktu terima server vs waktu event.
 * Hanya untuk sumber MOBILE: antrean offline mengirim waktu dari perangkat,
 * sedangkan pencatatan manual HR memang boleh menunjuk waktu lampau.
 */
const TERLAMBAT_KIRIM_MS = 5 * 60 * 1000;

function hitungTerlambatKirim(source: AttendanceSource, waktu: Date): boolean {
  if (source !== "MOBILE") return false;
  return Date.now() - waktu.getTime() >= TERLAMBAT_KIRIM_MS;
}

function isValidEventType(value: string): value is AttendanceType {
  return (TYPE_LIST as string[]).includes(value);
}

export async function getDailyAttendance(date: string): Promise<AttendanceListItem[]> {
  const day = new Date(date);
  if (Number.isNaN(day.getTime())) return [];
  const from = new Date(day);
  from.setHours(0, 0, 0, 0);
  const to = new Date(day);
  to.setHours(23, 59, 59, 999);

  const rows = await prisma.absensi.findMany({
    where: { waktu: { gte: from, lte: to } },
    orderBy: { waktu: "desc" },
    include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    employeeId: r.karyawanId,
    employeeName: r.karyawan.namaLengkap,
    employeeNumber: r.karyawan.nomorKaryawan,
    time: r.waktu.toISOString(),
    eventType: r.tipe,
    source: r.sumber,
    status: r.status,
    note: r.catatan,
    isMocked: r.isMocked,
    isOutsideRadius: r.diLuarRadius,
    terlambatKirim: r.terlambatKirim,
  }));
}

export async function recordAttendance(input: {
  employeeId: string;
  eventType: string;
  source?: string;
  deviceId?: string;
  workLocationId?: string;
  note?: string;
  time?: string;
  latitude?: number;
  longitude?: number;
  isMocked?: boolean;
  deviceName?: string;
  platform?: string;
}): Promise<AttendanceActionResult> {
  if (!input.employeeId) return { success: false, message: "Employee wajib dipilih." };
  if (!isValidEventType(input.eventType)) return { success: false, message: "Tipe presensi tidak valid." };

  const source = (SOURCE_LIST as string[]).includes(input.source ?? "")
    ? (input.source as AttendanceSource)
    : "MANUAL";

  const time = input.time ? new Date(input.time) : new Date();
  if (Number.isNaN(time.getTime())) return { success: false, message: "Waktu tidak valid." };

  const employee = await prisma.karyawan.findUnique({
    where: { id: input.employeeId },
    select: {
      id: true,
      posisiKaryawan: {
        where: { isCurrent: true },
        take: 1,
        select: { lokasiKerjaId: true },
      },
    },
  });
  if (!employee) return { success: false, message: "Employee tidak ditemukan." };

  // PRD mobile Bag. 5.4 — lokasi acuan diambil dari penempatan aktif karyawan
  // agar tidak dapat diklaim sembarang klien; fallback ke input (kasus HR).
  const placement = employee.posisiKaryawan[0] ?? null;
  const workLocationId = placement?.lokasiKerjaId ?? input.workLocationId ?? null;

  const rawLocation = workLocationId
    ? await prisma.lokasiKerja.findUnique({
        where: { id: workLocationId },
        select: { latitude: true, longitude: true, radiusMeter: true },
      })
    : null;
  // Decimal Prisma dinormalkan dulu agar cocok dengan util geo berbasis number.
  const site = rawLocation
    ? {
        latitude: decimalKeNumber(rawLocation.latitude),
        longitude: decimalKeNumber(rawLocation.longitude),
        radiusMeters: rawLocation.radiusMeter,
      }
    : null;

  const latitude =
    typeof input.latitude === "number" && Number.isFinite(input.latitude) ? input.latitude : null;
  const longitude =
    typeof input.longitude === "number" && Number.isFinite(input.longitude) ? input.longitude : null;

  // PRD mobile Bag. 5.4 — di luar radius tetap dicatat, hanya ditandai.
  const isOutsideRadius = validateRadius({ latitude, longitude, site });
  const distanceMeters =
    latitude != null && longitude != null && site?.latitude != null && site?.longitude != null
      ? Math.round(
          measureDistanceMeters(latitude, longitude, Number(site.latitude), Number(site.longitude)),
        )
      : null;

  // Registrasi perangkat (PRD mobile Bag. 7-B5). Kegagalan tidak boleh
  // menggagalkan pencatatan presensi — presensi lebih prioritas.
  if (input.deviceId) {
    try {
      await prisma.perangkatKaryawan.upsert({
        where: { karyawanId_deviceId: { karyawanId: input.employeeId, deviceId: input.deviceId } },
        create: {
          karyawanId: input.employeeId,
          deviceId: input.deviceId,
          namaPerangkat: input.deviceName || null,
          platform: input.platform || null,
          lastSeenAt: new Date(),
        },
        update: {
          lastSeenAt: new Date(),
          ...(input.deviceName ? { namaPerangkat: input.deviceName } : {}),
          ...(input.platform ? { platform: input.platform } : {}),
        },
      });
    } catch {
      // abaikan — audit device bersifat pelengkap
    }
  }

  // P6-5 — antrean offline mobile mengirim waktu event dari perangkat, jadi
  // selisih waktu terima ditandai agar HR dapat meninjau.
  const terlambatKirim = hitungTerlambatKirim(source, time);

  await prisma.absensi.create({
    data: {
      karyawanId: input.employeeId,
      waktu: time,
      tipe: input.eventType,
      sumber: source,
      deviceId: input.deviceId || null,
      lokasiKerjaId: workLocationId,
      latitude,
      longitude,
      diLuarRadius: isOutsideRadius,
      isMocked: input.isMocked === true,
      terlambatKirim,
      status: StatusAbsensi.VALID,
      catatan: input.note || null,
    },
  });

  // P0-9: pencatatan manual HR teraudit (sebelum=null, sesudah=snapshot event).
  try {
    const session = await getCurrentSession();
    await recordAudit({
      actorUserId: session?.user?.id ?? null,
      aksi: "PRESENSI.CATAT_MANUAL",
      entityType: "Absensi",
      entityId: input.employeeId,
      sebelum: null,
      sesudah: {
        karyawanId: input.employeeId,
        tipe: input.eventType,
        sumber: source,
        waktu: time.toISOString(),
        lokasiKerjaId: workLocationId,
        catatan: input.note || null,
      },
      reason: input.note || null,
    });
  } catch {
    // abaikan
  }

  revalidatePath("/attendance");
  return {
    success: true,
    message: "Presensi tercatat.",
    isOutsideRadius,
    isMocked: input.isMocked === true,
    distanceMeters,
    workLocationId,
    terlambatKirim,
  };
}

export async function rejectDirectCorrection(
  id: string,
  status: "DIKOREKSI" | "DIBATALKAN",
  note: string,
): Promise<AttendanceActionResult> {
  if (!id) return { success: false, message: "ID presensi tidak valid." };
  // P0-9: koreksi langsung ditutup — wajib lewat pengajuan ESS + ApprovalStep
  // (P2-4: /account/attendance-corrections → atasan → HR). Upaya langsung dicatat di audit.
  try {
    const session = await getCurrentSession();
    const previous = await prisma.absensi.findUnique({
      where: { id },
      select: { karyawanId: true, status: true, tipe: true, waktu: true },
    });
    await recordAudit({
      actorUserId: session?.user?.id ?? null,
      aksi: "PRESENSI.KOREKSI_LANGSUNG_DITOLAK",
      entityType: "Absensi",
      entityId: id,
      sebelum: previous,
      sesudah: { diminta: status },
      reason: note || null,
    });
  } catch {
    // abaikan
  }
  return {
    success: false,
    message: "Koreksi langsung ditutup. Ajukan via Koreksi Presensi (/account/attendance-corrections) — diproses atasan → HR.",
  };
}
