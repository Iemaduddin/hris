import prisma from "@/src/lib/prisma";
import { labelJenisMutasi } from "@/src/modules/employee/lib/mutasi";
import { labelHasilProbation } from "@/src/modules/employee/lib/probation";

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
  | typeof REFERENSI_UANGDINAS;

type SetStatus = (
  status: "DIAJUKAN" | "MENUNGGU_APPROVAL" | "DISETUJUI" | "DITOLAK" | "DIBATALKAN",
) => Promise<void>;

async function terapkanStatusPengajuan(type: ReferensiType, id: string, status: Parameters<SetStatus>[0]): Promise<void> {
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
	} else {
		await prisma.dinasWFH.update({ where: { id }, data: { status: status as never } });
	}
}

async function getPemohonKaryawanId(type: ReferensiType, id: string): Promise<string | null> {
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
	const r = await prisma.dinasWFH.findUnique({ where: { id }, select: { karyawanId: true } });
	return r?.karyawanId ?? null;
}

/**
 * Buka alur approval: tahap 1 atasan langsung (bila ada & bukan diri sendiri),
 * tahap final selalu peran HR. Status objek -> MENUNGGU_APPROVAL.
 */
export async function mulaiAlurApproval(type: ReferensiType, id: string): Promise<void> {
	const karyawanId = await getPemohonKaryawanId(type, id);
	if (!karyawanId) throw new Error("Data pengajuan tidak ditemukan.");

	const pemohon = await prisma.karyawan.findUnique({
		where: { id: karyawanId },
		select: { atasanLangsungId: true },
	});

	await prisma.approvalStep.deleteMany({ where: { referensiType: type, referensiId: id } });

	let tahap = 1;
	if (pemohon?.atasanLangsungId && pemohon.atasanLangsungId !== karyawanId) {
		await prisma.approvalStep.create({
			data: { referensiType: type, referensiId: id, tahap, approverKaryawanId: pemohon.atasanLangsungId },
		});
		tahap++;
	}
	await prisma.approvalStep.create({
		data: { referensiType: type, referensiId: id, tahap, approverRole: "ADMIN_HR" },
	});

	await terapkanStatusPengajuan(type, id, "MENUNGGU_APPROVAL");
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
}

export type ProsesApprovalInput = {
	type: ReferensiType;
	id: string;
	approverUserId: string;
	approverRole: string;
	approverKaryawanId: string | null;
	keputusan: "SETUJU" | "TOLAK";
	catatan?: string;
	onFinalApprove?: () => Promise<{ success: boolean; message: string }>;
};

export type HasilProsesApproval = {
	success: boolean;
	message: string;
	/** Terisi bila keputusan final — pengajuan selesai (DISETUJUI/DITOLAK). */
	selesai?: "DISETUJUI" | "DITOLAK";
};

export async function prosesApproval(input: ProsesApprovalInput): Promise<HasilProsesApproval> {
	const current = await prisma.approvalStep.findFirst({
		where: { referensiType: input.type, referensiId: input.id, status: "MENUNGGU" },
		orderBy: { tahap: "asc" },
	});
	if (!current) {
		return { success: false, message: "Tidak ada tahap approval yang menunggu." };
	}

	const isHr = input.approverRole === "SUPER_ADMIN" || input.approverRole === "ADMIN_HR";
	const bolehAtasan = current.approverKaryawanId !== null && input.approverKaryawanId === current.approverKaryawanId;
	const bolehHr = current.approverRole === "ADMIN_HR" && isHr;
	if (!bolehAtasan && !bolehHr) {
		return { success: false, message: "Anda bukan approver tahap ini." };
	}

	await prisma.approvalStep.update({
		where: { id: current.id },
		data: {
			status: input.keputusan === "SETUJU" ? "DISETUJUI" : "DITOLAK",
			catatan: input.catatan || null,
			diprosesOlehId: input.approverUserId,
			diprosesPada: new Date(),
		},
	});

	if (input.keputusan === "TOLAK") {
		await terapkanStatusPengajuan(input.type, input.id, "DITOLAK");
		return { success: true, message: "Pengajuan ditolak.", selesai: "DITOLAK" };
	}

	const remaining = await prisma.approvalStep.count({
		where: { referensiType: input.type, referensiId: input.id, status: "MENUNGGU" },
	});
	if (remaining > 0) {
		await terapkanStatusPengajuan(input.type, input.id, "MENUNGGU_APPROVAL");
		return { success: true, message: "Disetujui. Diteruskan ke tahap berikutnya." };
	}

	if (input.onFinalApprove) {
		const final = await input.onFinalApprove();
		if (!final.success) {
			await prisma.approvalStep.update({
				where: { id: current.id },
				data: { status: "MENUNGGU", catatan: null, diprosesOlehId: null, diprosesPada: null },
			});
			return final;
		}
	}

	await terapkanStatusPengajuan(input.type, input.id, "DISETUJUI");
	return { success: true, message: "Pengajuan disetujui final.", selesai: "DISETUJUI" };
}

export type AntrianItem = {
	type: ReferensiType;
	id: string;
	nomor: string;
	karyawanId: string;
	karyawanNama: string;
	nomorKaryawan: string;
	ringkasan: string;
	tahap: number;
	diajukanPada: string | null;
};

function namaJenis(type: ReferensiType): string {
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
				: type === REFERENSI_REIMBURSE
					? "Reimbursement"
					: type === REFERENSI_UANGDINAS
						? "Uang Dinas"
						: "Dinas/WFH";
}

export async function getAntrianApproval(
	approverKaryawanId: string | null,
	isHr: boolean,
): Promise<AntrianItem[]> {
	const steps = await prisma.approvalStep.findMany({
		where: { status: "MENUNGGU" },
		orderBy: [{ createdAt: "asc" }],
	});

	const hasil: AntrianItem[] = [];
	for (const step of steps) {
		const mine =
			(step.approverKaryawanId !== null && step.approverKaryawanId === approverKaryawanId) ||
			(step.approverRole === "ADMIN_HR" && isHr);
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

		const detail = await getRingkasanPengajuan(step.referensiType as ReferensiType, step.referensiId);
		if (detail) hasil.push({ ...detail, type: step.referensiType as ReferensiType, tahap: step.tahap });
	}
	return hasil;
}

export async function getRingkasanPengajuan(
	type: ReferensiType,
	id: string,
): Promise<Omit<AntrianItem, "type" | "tahap"> | null> {
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
			nomor: r.nomorPengajuan,
			karyawanId: r.karyawanId,
			karyawanNama: r.karyawan.namaLengkap,
			nomorKaryawan: r.karyawan.nomorKaryawan,
			ringkasan: `${r.jenisKetidakhadiran.nama} • ${r.tanggalMulai.toISOString().slice(0, 10)} s/d ${r.tanggalSelesai.toISOString().slice(0, 10)} • ${r.jumlahHari} hari`,
			diajukanPada: r.diajukanPada?.toISOString() ?? null,
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
			nomor: r.tanggal.toISOString().slice(0, 10),
			karyawanId: r.karyawanId,
			karyawanNama: r.karyawan.namaLengkap,
			nomorKaryawan: r.karyawan.nomorKaryawan,
			ringkasan: `Lembur ${r.jumlahJam} jam • ${r.alasan}`,
			diajukanPada: r.createdAt.toISOString(),
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
		const dari = r.dariPosisiNama ?? r.dariUnitNama ?? "-";
		const ke = r.kePosisi?.nama ?? r.keUnit?.nama ?? r.keLokasi?.nama ?? "-";
		return {
			id: r.id,
			nomor: r.nomor,
			karyawanId: r.karyawanId,
			karyawanNama: r.karyawan.namaLengkap,
			nomorKaryawan: r.karyawan.nomorKaryawan,
			ringkasan: `${labelJenisMutasi(r.jenis)} • ${dari} → ${ke} • efektif ${r.tanggalEfektif.toISOString().slice(0, 10)}`,
			diajukanPada: r.diajukanPada?.toISOString() ?? null,
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
			nomor: `RSG-${r.id.slice(-6).toUpperCase()}`,
			karyawanId: r.karyawanId,
			karyawanNama: r.karyawan.namaLengkap,
			nomorKaryawan: r.karyawan.nomorKaryawan,
			ringkasan: `Resign • rencana ${r.tanggalRencana.toISOString().slice(0, 10)} • ${r.alasan}`,
			diajukanPada: r.diajukanPada?.toISOString() ?? null,
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
			nomor: `PRB-${r.id.slice(-6).toUpperCase()}`,
			karyawanId: r.karyawanId,
			karyawanNama: r.karyawan.namaLengkap,
			nomorKaryawan: r.karyawan.nomorKaryawan,
			ringkasan: `Probation s/d ${r.tanggalSelesai.toISOString().slice(0, 10)}${r.hasil ? ` • ${labelHasilProbation(r.hasil)}` : ""}`,
			diajukanPada: r.diajukanPada?.toISOString() ?? null,
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
			nomor: r.tanggal.toISOString().slice(0, 10),
			karyawanId: r.pemohonKaryawanId,
			karyawanNama: r.pemohon.namaLengkap,
			nomorKaryawan: r.pemohon.nomorKaryawan,
			ringkasan: `Tukar ${r.tanggal.toISOString().slice(0, 10)} ↔ ${r.pasangan.namaLengkap}`,
			diajukanPada: r.diajukanPada?.toISOString() ?? null,
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
			nomor: r.tanggal.toISOString().slice(0, 10),
			karyawanId: r.karyawanId,
			karyawanNama: r.karyawan.namaLengkap,
			nomorKaryawan: r.karyawan.nomorKaryawan,
			ringkasan: `Koreksi ${r.tipe} → ${r.waktuBaru.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} • ${r.alasan}`,
			diajukanPada: r.diajukanPada?.toISOString() ?? null,
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
			nomor: r.nomor,
			karyawanId: r.karyawanId,
			karyawanNama: r.karyawan.namaLengkap,
			nomorKaryawan: r.karyawan.nomorKaryawan,
			ringkasan: `Reimburse ${r.kategori} Rp${Number(r.nominal).toLocaleString("id-ID")} • ${r.keterangan}`,
			diajukanPada: r.diajukanPada?.toISOString() ?? null,
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
			nomor: r.nomor,
			karyawanId: r.karyawanId,
			karyawanNama: r.karyawan.namaLengkap,
			nomorKaryawan: r.karyawan.nomorKaryawan,
			ringkasan: `Uang muka Rp${Number(r.nominalMuka).toLocaleString("id-ID")}`,
			diajukanPada: r.diajukanPada?.toISOString() ?? null,
		};
	}
	const r = await prisma.dinasWFH.findUnique({
		where: { id },
		include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
	});
	if (!r) return null;
	return {
		id: r.id,
		nomor: r.nomorPengajuan,
		karyawanId: r.karyawanId,
		karyawanNama: r.karyawan.namaLengkap,
		nomorKaryawan: r.karyawan.nomorKaryawan,
		ringkasan: `${r.jenis === "DINAS_LUAR" ? "Dinas Luar" : "WFH"} • ${r.tanggalMulai.toISOString().slice(0, 10)} s/d ${r.tanggalSelesai.toISOString().slice(0, 10)}`,
		diajukanPada: r.diajukanPada?.toISOString() ?? null,
	};
}

export { namaJenis };
