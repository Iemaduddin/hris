import prisma from "@/src/lib/prisma";
import { getTransferTypeLabel } from "@/src/modules/employee/lib/mutasi";
import { getProbationResultLabel } from "@/src/modules/employee/lib/probation";

export const REFERENSI_CUTI = "CUTI";
export const REFERENSI_LEMBUR = "LEMBUR";
export const REFERENSI_DINAS = "DINAS";
export const REFERENSI_MUTASI = "MUTASI";
export const REFERENSI_RESIGN = "RESIGN";
export const REFERENSI_PROBATION = "PROBATION";
export const REFERENSI_TUKAR = "TUKAR_SHIFT";
export const REFERENSI_KOREKSI = "KOREKSI";
export const REFERENSI_REIMBURSE = "REIMBURSE";
export const REFERENSI_UANGDINAS = "UANGDINAS";
export const REFERENSI_UPDATEDATA = "UPDATE_DATA";
export const REFERENSI_KASBON = "KASBON";

export type ReferensiType =
	| typeof REFERENSI_CUTI
	| typeof REFERENSI_LEMBUR
	| typeof REFERENSI_DINAS
	| typeof REFERENSI_MUTASI
	| typeof REFERENSI_RESIGN
	| typeof REFERENSI_PROBATION
	| typeof REFERENSI_TUKAR
	| typeof REFERENSI_KOREKSI
	| typeof REFERENSI_REIMBURSE
	| typeof REFERENSI_UANGDINAS
	| typeof REFERENSI_UPDATEDATA
	| typeof REFERENSI_KASBON;

/**
 * Tipe yang bisa diputus dari mobile (P4-4). UPDATE_DATA dikecualikan:
 * tahapnya HR-saja dan menyentuh data master — tetap via web.
 * Otorisasi tetap di engine (bolehAtasan/bolehHr per tahap).
 */
export const TIPE_APPROVAL_MOBILE: readonly ReferensiType[] = [
	REFERENSI_CUTI,
	REFERENSI_LEMBUR,
	REFERENSI_DINAS,
	REFERENSI_MUTASI,
	REFERENSI_RESIGN,
	REFERENSI_PROBATION,
	REFERENSI_TUKAR,
	REFERENSI_KOREKSI,
	REFERENSI_REIMBURSE,
	REFERENSI_UANGDINAS,
	REFERENSI_KASBON,
];

type SetStatus = (
  status: "DIAJUKAN" | "MENUNGGU_APPROVAL" | "DISETUJUI" | "DITOLAK" | "DIBATALKAN",
) => Promise<void>;

async function applyRequestStatus(type: ReferensiType, id: string, status: Parameters<SetStatus>[0]): Promise<void> {
	if (type === REFERENSI_CUTI) {
		await prisma.pengajuanKetidakhadiran.update({ where: { id }, data: { status: status as never } });
	} else if (type === REFERENSI_LEMBUR) {
		const mapped = status === "DISETUJUI" ? "DISETUJUI" : status === "DITOLAK" ? "DITOLAK" : "DIAJUKAN";
		await prisma.lembur.update({ where: { id }, data: { status: mapped as never } });
	} else if (type === REFERENSI_MUTASI) {
		await prisma.mutasi.update({ where: { id }, data: { status: status as never } });
	} else if (type === REFERENSI_RESIGN) {
		await prisma.offboarding.update({ where: { id }, data: { status: status as never } });
	} else if (type === REFERENSI_PROBATION) {
		await prisma.probationReview.update({ where: { id }, data: { status: status as never } });
	} else if (type === REFERENSI_TUKAR) {
		await prisma.tukarShift.update({ where: { id }, data: { status: status as never } });
	} else if (type === REFERENSI_KOREKSI) {
		await prisma.koreksiPresensi.update({ where: { id }, data: { status: status as never } });
	} else if (type === REFERENSI_REIMBURSE) {
		await prisma.expenseClaim.update({ where: { id }, data: { status: status as never } });
	} else if (type === REFERENSI_UANGDINAS) {
		await prisma.uangDinas.update({ where: { id }, data: { status: status as never } });
	} else if (type === REFERENSI_UPDATEDATA) {
		await prisma.updateDataRequest.update({ where: { id }, data: { status: status as never } });
	} else if (type === REFERENSI_KASBON) {
		const mapped = status === "DISETUJUI" ? "DISETUJUI" : status === "DITOLAK" ? "DITOLAK" : "DIAJUKAN";
		await prisma.kasbon.update({ where: { id }, data: { status: mapped as never } });
	} else {
		await prisma.dinasWFH.update({ where: { id }, data: { status: status as never } });
	}
}

async function getRequesterEmployeeId(type: ReferensiType, id: string): Promise<string | null> {
	if (type === REFERENSI_CUTI) {
		const r = await prisma.pengajuanKetidakhadiran.findUnique({ where: { id }, select: { karyawanId: true } });
		return r?.karyawanId ?? null;
	}
	if (type === REFERENSI_LEMBUR) {
		const r = await prisma.lembur.findUnique({ where: { id }, select: { karyawanId: true } });
		return r?.karyawanId ?? null;
	}
	if (type === REFERENSI_MUTASI) {
		const r = await prisma.mutasi.findUnique({ where: { id }, select: { karyawanId: true } });
		return r?.karyawanId ?? null;
	}
	if (type === REFERENSI_RESIGN) {
		const r = await prisma.offboarding.findUnique({ where: { id }, select: { karyawanId: true } });
		return r?.karyawanId ?? null;
	}
	if (type === REFERENSI_PROBATION) {
		const r = await prisma.probationReview.findUnique({ where: { id }, select: { karyawanId: true } });
		return r?.karyawanId ?? null;
	}
	if (type === REFERENSI_TUKAR) {
		const r = await prisma.tukarShift.findUnique({ where: { id }, select: { pemohonKaryawanId: true } });
		return r?.pemohonKaryawanId ?? null;
	}
	if (type === REFERENSI_KOREKSI) {
		const r = await prisma.koreksiPresensi.findUnique({ where: { id }, select: { karyawanId: true } });
		return r?.karyawanId ?? null;
	}
	if (type === REFERENSI_REIMBURSE) {
		const r = await prisma.expenseClaim.findUnique({ where: { id }, select: { karyawanId: true } });
		return r?.karyawanId ?? null;
	}
	if (type === REFERENSI_UANGDINAS) {
		const r = await prisma.uangDinas.findUnique({ where: { id }, select: { karyawanId: true } });
		return r?.karyawanId ?? null;
	}
	if (type === REFERENSI_UPDATEDATA) {
		const r = await prisma.updateDataRequest.findUnique({ where: { id }, select: { karyawanId: true } });
		return r?.karyawanId ?? null;
	}
	if (type === REFERENSI_KASBON) {
		const r = await prisma.kasbon.findUnique({ where: { id }, select: { karyawanId: true } });
		return r?.karyawanId ?? null;
	}
	const r = await prisma.dinasWFH.findUnique({ where: { id }, select: { karyawanId: true } });
	return r?.karyawanId ?? null;
}

/**
 * Buka alur approval: tahap 1 atasan langsung (bila ada & bukan diri sendiri),
 * tahap final selalu peran HR. Status objek -> MENUNGGU_APPROVAL.
 */
export async function startApprovalFlow(type: ReferensiType, id: string): Promise<void> {
  const employeeId = await getRequesterEmployeeId(type, id);
  if (!employeeId) throw new Error("Data pengajuan tidak ditemukan.");

  const requester = await prisma.karyawan.findUnique({
    where: { id: employeeId },
    select: { atasanLangsungId: true },
  });

  await prisma.approvalStep.deleteMany({ where: { referensiType: type, referensiId: id } });

  let stage = 1;
  if (requester?.atasanLangsungId && requester.atasanLangsungId !== employeeId) {
    await prisma.approvalStep.create({
      data: { referensiType: type, referensiId: id, tahap: stage, approverKaryawanId: requester.atasanLangsungId },
    });
    stage++;
  }
  await prisma.approvalStep.create({
    data: { referensiType: type, referensiId: id, tahap: stage, approverRole: "ADMIN_HR" },
  });

  await applyRequestStatus(type, id, "MENUNGGU_APPROVAL");
	if (type === REFERENSI_CUTI) {
		await prisma.pengajuanKetidakhadiran.update({ where: { id }, data: { diajukanPada: new Date() } });
	} else if (type === REFERENSI_DINAS) {
		await prisma.dinasWFH.update({ where: { id }, data: { diajukanPada: new Date() } });
	} else if (type === REFERENSI_MUTASI) {
		await prisma.mutasi.update({ where: { id }, data: { diajukanPada: new Date() } });
	} else if (type === REFERENSI_RESIGN) {
		await prisma.offboarding.update({ where: { id }, data: { diajukanPada: new Date() } });
	} else if (type === REFERENSI_PROBATION) {
		await prisma.probationReview.update({ where: { id }, data: { diajukanPada: new Date() } });
	} else if (type === REFERENSI_KOREKSI) {
		await prisma.koreksiPresensi.update({ where: { id }, data: { diajukanPada: new Date() } });
	} else if (type === REFERENSI_REIMBURSE) {
		await prisma.expenseClaim.update({ where: { id }, data: { diajukanPada: new Date() } });
	} else if (type === REFERENSI_UANGDINAS) {
		await prisma.uangDinas.update({ where: { id }, data: { diajukanPada: new Date() } });
	}

	// P4-3: beritahu approver tahap berjalan (in-app + push + email per preferensi).
  try {
    const { notifyNewApprover } = await import("@/src/modules/notifikasi/lib/notify");
    const detail = await getRequestSummary(type, id);
    if (detail) {
      await notifyNewApprover(
        type,
        id,
        `Pengajuan ${getTypeName(type)} Baru`,
        `${detail.number} • ${detail.employeeName} (${detail.employeeNumber}) — ${detail.summary}`,
        "/approval",
			);
		}
	} catch {
		// abaikan — notifikasi pelengkap
	}
}

export type ProcessApprovalInput = {
  type: ReferensiType;
  id: string;
  approverUserId: string;
  approverRole: string;
  approverEmployeeId: string | null;
  decision: "SETUJU" | "TOLAK";
  note?: string;
  onFinalApproval?: () => Promise<{ success: boolean; message: string }>;
};

export type ApprovalProcessResult = {
  success: boolean;
  message: string;
  /** Terisi bila keputusan final — pengajuan selesai (DISETUJUI/DITOLAK). */
  outcome?: "DISETUJUI" | "DITOLAK";
};

export async function processApproval(input: ProcessApprovalInput): Promise<ApprovalProcessResult> {
  const current = await prisma.approvalStep.findFirst({
    where: { referensiType: input.type, referensiId: input.id, status: "MENUNGGU" },
    orderBy: { tahap: "asc" },
  });
  if (!current) {
    return { success: false, message: "Tidak ada tahap approval yang menunggu." };
  }

  const isHr = input.approverRole === "SUPER_ADMIN" || input.approverRole === "ADMIN_HR";
  const canLead = current.approverKaryawanId !== null && input.approverEmployeeId === current.approverKaryawanId;
  const canHr = current.approverRole === "ADMIN_HR" && isHr;
  // Kasbon: tahap akhir (peran ADMIN_HR) juga boleh diputus FINANCE —
  // pemutus historisnya di web, aksinya kini lewat engine yang sama.
  const canFinance =
    input.type === REFERENSI_KASBON && current.approverRole === "ADMIN_HR" && input.approverRole === "FINANCE";
  if (!canLead && !canHr && !canFinance) {
    return { success: false, message: "Anda bukan approver tahap ini." };
  }

  await prisma.approvalStep.update({
    where: { id: current.id },
    data: {
      status: input.decision === "SETUJU" ? "DISETUJUI" : "DITOLAK",
      catatan: input.note || null,
      diprosesOlehId: input.approverUserId,
      diprosesPada: new Date(),
    },
  });

  if (input.decision === "TOLAK") {
    await applyRequestStatus(input.type, input.id, "DITOLAK");
    return { success: true, message: "Pengajuan ditolak.", outcome: "DITOLAK" };
  }

  const remaining = await prisma.approvalStep.count({
    where: { referensiType: input.type, referensiId: input.id, status: "MENUNGGU" },
  });
  if (remaining > 0) {
    await applyRequestStatus(input.type, input.id, "MENUNGGU_APPROVAL");
    return { success: true, message: "Disetujui. Diteruskan ke tahap berikutnya." };
  }

  if (input.onFinalApproval) {
    const final = await input.onFinalApproval();
    if (!final.success) {
      await prisma.approvalStep.update({
        where: { id: current.id },
        data: { status: "MENUNGGU", catatan: null, diprosesOlehId: null, diprosesPada: null },
      });
      return final;
    }
  }

  await applyRequestStatus(input.type, input.id, "DISETUJUI");
  return { success: true, message: "Pengajuan disetujui final.", outcome: "DISETUJUI" };
}

export type QueueItem = {
  type: ReferensiType;
  id: string;
  number: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  summary: string;
  /** Tanggal relevan pengajuan (YYYY-MM-DD) untuk ringkasan; null bila tak relevan. */
  date: string | null;
  /** Nominal rupiah bila pengajuan bernilai uang. */
  amount: number | null;
  stage: number;
  submittedAt: string | null;
};

function getTypeName(type: ReferensiType): string {
	return type === REFERENSI_CUTI
		? "Cuti/Izin"
		: type === REFERENSI_LEMBUR
			? "Lembur"
			: type === REFERENSI_MUTASI
				? "Mutasi"
			: type === REFERENSI_RESIGN
				? "Resign"
			: type === REFERENSI_PROBATION
				? "Probation"
			: type === REFERENSI_TUKAR
				? "Tukar Shift"
		: type === REFERENSI_KOREKSI
			? "Koreksi Presensi"
			: type === REFERENSI_UPDATEDATA
				? "Update Data"
				: type === REFERENSI_REIMBURSE
					? "Reimbursement"
					: type === REFERENSI_UANGDINAS
						? "Uang Dinas"
						: type === REFERENSI_KASBON
							? "Kasbon"
							: "Dinas/WFH";
}

export async function getApprovalQueue(
  approverEmployeeId: string | null,
  isHr: boolean,
  /** FINANCE: hanya melihat tahap akhir KASBON (pemutus historis di web, kini juga mobile). */
  canFinance = false,
): Promise<QueueItem[]> {
  const steps = await prisma.approvalStep.findMany({
    where: { status: "MENUNGGU" },
    orderBy: [{ createdAt: "asc" }],
  });

  const result: QueueItem[] = [];
  for (const step of steps) {
    const mine =
      (step.approverKaryawanId !== null && step.approverKaryawanId === approverEmployeeId) ||
      (step.approverRole === "ADMIN_HR" &&
        (isHr || (canFinance && step.referensiType === REFERENSI_KASBON)));
    if (!mine) continue;

    const earlierPending = await prisma.approvalStep.count({
      where: {
        referensiType: step.referensiType,
        referensiId: step.referensiId,
        status: "MENUNGGU",
        tahap: { lt: step.tahap },
      },
    });
    if (earlierPending > 0) continue;

    const detail = await getRequestSummary(step.referensiType as ReferensiType, step.referensiId);
    if (detail) result.push({ ...detail, type: step.referensiType as ReferensiType, stage: step.tahap });
  }
  return result;
}

export async function getRequestSummary(
  type: ReferensiType,
  id: string,
): Promise<Omit<QueueItem, "type" | "stage"> | null> {
  if (type === REFERENSI_CUTI) {
    const r = await prisma.pengajuanKetidakhadiran.findUnique({
      where: { id },
      include: {
        karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
        jenisKetidakhadiran: { select: { nama: true } },
      },
    });
    if (!r) return null;
    return {
      id: r.id,
      number: r.nomorPengajuan,
      employeeId: r.karyawanId,
      employeeName: r.karyawan.namaLengkap,
      employeeNumber: r.karyawan.nomorKaryawan,
      summary: `${r.jenisKetidakhadiran.nama} • ${r.tanggalMulai.toISOString().slice(0, 10)} s/d ${r.tanggalSelesai.toISOString().slice(0, 10)} • ${r.jumlahHari} hari`,
      date: r.tanggalMulai.toISOString().slice(0, 10),
      amount: null,
      submittedAt: r.diajukanPada?.toISOString() ?? null,
    };
  }
  if (type === REFERENSI_LEMBUR) {
    const r = await prisma.lembur.findUnique({
      where: { id },
      include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
    });
    if (!r) return null;
    return {
      id: r.id,
      number: r.tanggal.toISOString().slice(0, 10),
      employeeId: r.karyawanId,
      employeeName: r.karyawan.namaLengkap,
      employeeNumber: r.karyawan.nomorKaryawan,
      summary: `Lembur ${r.jumlahJam} jam • ${r.alasan}`,
      date: r.tanggal.toISOString().slice(0, 10),
      amount: null,
      submittedAt: r.createdAt.toISOString(),
    };
  }
	if (type === REFERENSI_MUTASI) {
		const r = await prisma.mutasi.findUnique({
			where: { id },
			include: {
				karyawan: { select: { namaLengkap: true, nomorKaryawan: true } },
				kePosisi: { select: { nama: true } },
				keUnit: { select: { nama: true } },
				keLokasi: { select: { nama: true } },
			},
		});
    if (!r) return null;
    const from = r.dariPosisiNama ?? r.dariUnitNama ?? "-";
    const to = r.kePosisi?.nama ?? r.keUnit?.nama ?? r.keLokasi?.nama ?? "-";
    return {
      id: r.id,
      number: r.nomor,
      employeeId: r.karyawanId,
      employeeName: r.karyawan.namaLengkap,
      employeeNumber: r.karyawan.nomorKaryawan,
      summary: `${getTransferTypeLabel(r.jenis)} • ${from} → ${to} • efektif ${r.tanggalEfektif.toISOString().slice(0, 10)}`,
      date: r.tanggalEfektif.toISOString().slice(0, 10),
      amount: null,
      submittedAt: r.diajukanPada?.toISOString() ?? null,
    };
  }
	if (type === REFERENSI_RESIGN) {
		const r = await prisma.offboarding.findUnique({
			where: { id },
			include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
		});
    if (!r) return null;
    return {
      id: r.id,
      number: `RSG-${r.id.slice(-6).toUpperCase()}`,
      employeeId: r.karyawanId,
      employeeName: r.karyawan.namaLengkap,
      employeeNumber: r.karyawan.nomorKaryawan,
      summary: `Resign • rencana ${r.tanggalRencana.toISOString().slice(0, 10)} • ${r.alasan}`,
      date: r.tanggalRencana.toISOString().slice(0, 10),
      amount: null,
      submittedAt: r.diajukanPada?.toISOString() ?? null,
    };
  }
	if (type === REFERENSI_PROBATION) {
		const r = await prisma.probationReview.findUnique({
			where: { id },
			include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
		});
    if (!r) return null;
    return {
      id: r.id,
      number: `PRB-${r.id.slice(-6).toUpperCase()}`,
      employeeId: r.karyawanId,
      employeeName: r.karyawan.namaLengkap,
      employeeNumber: r.karyawan.nomorKaryawan,
      summary: `Probation s/d ${r.tanggalSelesai.toISOString().slice(0, 10)}${r.hasil ? ` • ${getProbationResultLabel(r.hasil)}` : ""}`,
      date: r.tanggalSelesai.toISOString().slice(0, 10),
      amount: null,
      submittedAt: r.diajukanPada?.toISOString() ?? null,
    };
  }
	if (type === REFERENSI_TUKAR) {
		const r = await prisma.tukarShift.findUnique({
			where: { id },
			include: {
				pemohon: { select: { namaLengkap: true, nomorKaryawan: true } },
				pasangan: { select: { namaLengkap: true } },
			},
		});
    if (!r) return null;
    return {
      id: r.id,
      number: r.tanggal.toISOString().slice(0, 10),
      employeeId: r.pemohonKaryawanId,
      employeeName: r.pemohon.namaLengkap,
      employeeNumber: r.pemohon.nomorKaryawan,
      summary: `Tukar ${r.tanggal.toISOString().slice(0, 10)} ↔ ${r.pasangan.namaLengkap}`,
      date: r.tanggal.toISOString().slice(0, 10),
      amount: null,
      submittedAt: r.diajukanPada?.toISOString() ?? null,
    };
  }
	if (type === REFERENSI_KOREKSI) {
		const r = await prisma.koreksiPresensi.findUnique({
			where: { id },
			include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
		});
    if (!r) return null;
    return {
      id: r.id,
      number: r.tanggal.toISOString().slice(0, 10),
      employeeId: r.karyawanId,
      employeeName: r.karyawan.namaLengkap,
      employeeNumber: r.karyawan.nomorKaryawan,
      summary: `Koreksi ${r.tipe} → ${r.waktuBaru.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} • ${r.alasan}`,
      date: r.tanggal.toISOString().slice(0, 10),
      amount: null,
      submittedAt: r.diajukanPada?.toISOString() ?? null,
    };
  }
	if (type === REFERENSI_REIMBURSE) {
		const r = await prisma.expenseClaim.findUnique({
			where: { id },
			include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
		});
    if (!r) return null;
    return {
      id: r.id,
      number: r.nomor,
      employeeId: r.karyawanId,
      employeeName: r.karyawan.namaLengkap,
      employeeNumber: r.karyawan.nomorKaryawan,
      summary: `Reimburse ${r.kategori} Rp${Number(r.nominal).toLocaleString("id-ID")} • ${r.keterangan}`,
      date: r.tanggalKwitansi?.toISOString().slice(0, 10) ?? null,
      amount: Number(r.nominal),
      submittedAt: r.diajukanPada?.toISOString() ?? null,
    };
  }
	if (type === REFERENSI_UPDATEDATA) {
		const r = await prisma.updateDataRequest.findUnique({
			where: { id },
			include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
		});
		if (!r) return null;
    const { summarizeDataUpdate, getCategoryLabel } = await import("@/src/modules/employee/lib/updatedata");
    return {
      id: r.id,
      number: r.nomor,
      employeeId: r.karyawanId,
      employeeName: r.karyawan.namaLengkap,
      employeeNumber: r.karyawan.nomorKaryawan,
      summary: `${getCategoryLabel(r.kategori)} • ${summarizeDataUpdate(r.kategori, (r.dataBaru ?? {}) as Record<string, unknown>)}`,
      date: r.diajukanPada?.toISOString().slice(0, 10) ?? null,
      amount: null,
      submittedAt: r.diajukanPada?.toISOString() ?? null,
    };
  }
	if (type === REFERENSI_UANGDINAS) {
		const r = await prisma.uangDinas.findUnique({
			where: { id },
			include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
		});
    if (!r) return null;
    return {
      id: r.id,
      number: r.nomor,
      employeeId: r.karyawanId,
      employeeName: r.karyawan.namaLengkap,
      employeeNumber: r.karyawan.nomorKaryawan,
      summary: `Uang muka Rp${Number(r.nominalMuka).toLocaleString("id-ID")}`,
      date: (r.tanggalSerah ?? r.diajukanPada)?.toISOString().slice(0, 10) ?? null,
      amount: Number(r.nominalMuka),
      submittedAt: r.diajukanPada?.toISOString() ?? null,
    };
  }
	if (type === REFERENSI_KASBON) {
		const r = await prisma.kasbon.findUnique({
			where: { id },
			include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
		});
		if (!r) return null;
		return {
			id: r.id,
			number: r.nomor,
			employeeId: r.karyawanId,
			employeeName: r.karyawan.namaLengkap,
			employeeNumber: r.karyawan.nomorKaryawan,
			summary: `Kasbon Rp${Number(r.nominal).toLocaleString("id-ID")} • ${r.tenorBulan}x Rp${Number(r.angsuranPerBulan).toLocaleString("id-ID")} • potong mulai ${r.mulaiPotong.toISOString().slice(0, 10)}`,
			date: r.mulaiPotong.toISOString().slice(0, 10),
			amount: Number(r.nominal),
			submittedAt: r.createdAt.toISOString(),
		};
	}
	const r = await prisma.dinasWFH.findUnique({
		where: { id },
		include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
	});
  if (!r) return null;
  return {
    id: r.id,
    number: r.nomorPengajuan,
    employeeId: r.karyawanId,
    employeeName: r.karyawan.namaLengkap,
    employeeNumber: r.karyawan.nomorKaryawan,
    summary: `${r.jenis === "DINAS_LUAR" ? "Dinas Luar" : "WFH"} • ${r.tanggalMulai.toISOString().slice(0, 10)} s/d ${r.tanggalSelesai.toISOString().slice(0, 10)}`,
    submittedAt: r.diajukanPada?.toISOString() ?? null,
    date: r.tanggalMulai.toISOString().slice(0, 10),
    amount: null,
  };
}

export { getTypeName };
