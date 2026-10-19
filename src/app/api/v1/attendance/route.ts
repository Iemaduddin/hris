import { NextRequest } from "next/server";
import { recordAttendance } from "@/src/modules/attendance/actions/attendance.actions";
import { calculateDailyRecap } from "@/src/modules/recap/lib/recap-engine";
import { fail, isHr, ok, readJson, requireApiSession, str } from "@/src/lib/api-v1";
import prisma from "@/src/lib/prisma";

const VALID_EVENT_TYPES = ["MASUK", "KELUAR", "MULAI_ISTIRAHAT", "SELESAI_ISTIRAHAT", "KELUAR_KANTOR", "KEMBALI_KANTOR"];

/**
 * P6-5 — presensi dari antrean offline membawa waktu event dari perangkat.
 * Toleransi jam perangkat yang lebih cepat, dan batas umur antrean.
 */
const SKEW_DEPAN_MS = 2 * 60 * 1000;
const MAKS_MUNDUR_MS = 7 * 24 * 60 * 60 * 1000;

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

/** Validasi waktu event dari klien → ISO string, atau pesan galat. */
function resolveEventTime(value: unknown): { ok: true; time?: string } | { ok: false; error: string } {
  const raw = str(value);
  if (!raw) return { ok: true };

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { ok: false, error: "Waktu presensi tidak valid." };

  const selisih = Date.now() - parsed.getTime();
  if (selisih < -SKEW_DEPAN_MS) {
    return { ok: false, error: "Waktu presensi tidak boleh di masa depan." };
  }
  if (selisih > MAKS_MUNDUR_MS) {
    return { ok: false, error: "Waktu presensi terlalu lama (maks 7 hari). Kirim ulang dari perangkat." };
  }
  return { ok: true, time: parsed.toISOString() };
}

/**
 * Clock-in / clock-out mandiri (mobile).
 * Non-HR hanya bisa mencatat untuk dirinya sendiri.
 */
export async function POST(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);

  const body = await readJson(request);
  const eventType = str(body?.["eventType"]).toUpperCase();
  if (!VALID_EVENT_TYPES.includes(eventType)) {
    return fail("Tipe tidak valid. Pilihan: " + VALID_EVENT_TYPES.join(", "), 422);
  }

  let employeeId = str(body?.["employeeId"]);
  if (!isHr(ctx)) {
    if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);
    employeeId = ctx.karyawanId;
  }
  if (!employeeId) return fail("employeeId wajib diisi.", 422);

  const waktuEvent = resolveEventTime(body?.["time"]);
  if (!waktuEvent.ok) return fail(waktuEvent.error, 422);

  const result = await recordAttendance({
    employeeId,
    eventType,
    source: "MOBILE",
    time: waktuEvent.time,
    deviceId: str(body?.["deviceId"]) || undefined,
    workLocationId: str(body?.["workLocationId"]) || undefined,
    note: str(body?.["note"]) || undefined,
    latitude: num(body?.["latitude"]),
    longitude: num(body?.["longitude"]),
    // PRD mobile Bag. 5.4 — deteksi GPS simulasi dilaporkan perangkat,
    // server tetap mencatat presensinya hanya dengan flag.
    isMocked: body?.["isMocked"] === true,
    deviceName: str(body?.["deviceName"]) || undefined,
    platform: str(body?.["platform"]) || undefined,
  });

  if (!result.success) return fail(result.message, 422);
  return ok(
    {
      message: result.message,
      eventType,
      time: (waktuEvent.time ?? new Date().toISOString()),
      // Hasil validasi lokasi (null = tidak dinilai: tanpa GPS / tanpa radius).
      isOutsideRadius: result.isOutsideRadius ?? null,
      isMocked: result.isMocked ?? false,
      distanceMeters: result.distanceMeters ?? null,
      // P6-5 — kiriman dari antrean offline yang tiba jauh setelah waktu event.
      terlambatKirim: result.terlambatKirim ?? false,
    },
    201,
  );
}

/**
 * Status presensi hari ini untuk karyawan login.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const recap = await calculateDailyRecap(ctx.karyawanId, new Date());
  if (!recap) return ok({ status: "TANPA_JADWAL", recap: null });

  const events = await prisma.absensi.findMany({
    where: {
      karyawanId: ctx.karyawanId,
      waktu: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
      status: { in: ["VALID", "DIKOREKSI"] },
    },
    orderBy: { waktu: "asc" },
    select: { tipe: true, waktu: true, sumber: true, diLuarRadius: true, isMocked: true, terlambatKirim: true },
  });

  return ok({
    status: recap.status,
    lateMinutes: recap.telatMenit,
    actualCheckIn: recap.masukAktual?.toISOString() ?? null,
    actualCheckOut: recap.keluarAktual?.toISOString() ?? null,
    events: events.map((e) => ({
      eventType: e.tipe,
      time: e.waktu.toISOString(),
      source: e.sumber,
      isOutsideRadius: e.diLuarRadius,
      isMocked: e.isMocked,
      terlambatKirim: e.terlambatKirim,
    })),
  });
}
