import { NextRequest } from "next/server";
import prisma from "@/src/lib/prisma";
import { fail, ok, requireApiSession, str } from "@/src/lib/api-v1";
import {
  REFERENSI_CUTI,
  REFERENSI_DINAS,
  REFERENSI_LEMBUR,
  type ReferensiType,
} from "@/src/modules/approval/lib/approval-engine";

const TIPE: Record<string, ReferensiType> = {
  [REFERENSI_CUTI]: REFERENSI_CUTI,
  [REFERENSI_LEMBUR]: REFERENSI_LEMBUR,
  [REFERENSI_DINAS]: REFERENSI_DINAS,
};

export type ApprovalStageItem = {
  stage: number;
  approverName: string | null;
  approverRole: string | null;
  status: string;
  note: string | null;
  processedAt: string | null;
};

export type RequestTimelinePayload = {
  type: ReferensiType;
  id: string;
  status: string;
  items: ApprovalStageItem[];
};

async function fetchRequestStatus(
  type: ReferensiType,
  id: string,
  karyawanId: string,
): Promise<{ status: string } | null> {
  if (type === REFERENSI_CUTI) {
    return prisma.pengajuanKetidakhadiran.findFirst({ where: { id, karyawanId }, select: { status: true } });
  }
  if (type === REFERENSI_LEMBUR) {
    return prisma.lembur.findFirst({ where: { id, karyawanId }, select: { status: true } });
  }
  return prisma.dinasWFH.findFirst({ where: { id, karyawanId }, select: { status: true } });
}

/**
 * GET: riwayat approval milik sendiri — dipakai layar detail pengajuan mobile
 * untuk menampilkan timeline status (PRD mobile Bag. 5.4).
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

  const url = new URL(request.url);
  const type = TIPE[str(url.searchParams.get("type")).toUpperCase()];
  const id = str(url.searchParams.get("id"));
  if (!type) return fail("type tidak valid (CUTI/LEMBUR/DINAS).", 422);
  if (!id) return fail("id wajib diisi.", 422);

  const pengajuan = await fetchRequestStatus(type, id, ctx.karyawanId);
  if (!pengajuan) return fail("Pengajuan bukan milik Anda.", 403);

  const steps = await prisma.approvalStep.findMany({
    where: { referensiType: type, referensiId: id },
    orderBy: { tahap: "asc" },
  });

  const approverIds = steps
    .map((s) => s.approverKaryawanId)
    .filter((x): x is string => !!x);
  const approvers = approverIds.length
    ? await prisma.karyawan.findMany({
        where: { id: { in: approverIds } },
        select: { id: true, namaLengkap: true },
      })
    : [];
  const nameMap = new Map(approvers.map((a) => [a.id, a.namaLengkap]));

  const items: ApprovalStageItem[] = steps.map((s) => ({
    stage: s.tahap,
    approverName: s.approverKaryawanId ? (nameMap.get(s.approverKaryawanId) ?? null) : null,
    approverRole: s.approverRole,
    status: s.status,
    note: s.catatan,
    processedAt: s.diprosesPada?.toISOString() ?? null,
  }));

  const payload: RequestTimelinePayload = { type, id, status: pengajuan.status, items };
  return ok(payload);
}
