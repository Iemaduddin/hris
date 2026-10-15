"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { canManageUsers, getCurrentSession } from "@/src/lib/auth-guard";
import { catatAudit } from "@/src/modules/audit/lib/audit";
import { kirimNotifikasi } from "@/src/modules/notifikasi/lib/notify";

export type PengumumanActionResult = { success: boolean; message: string; id?: string };

export type PengumumanItem = {
	id: string;
	judul: string;
	isi: string;
	unitNama: string | null;
	status: string;
	tayangMulai: string;
	tayangSelesai: string | null;
	diterbitkanPada: string | null;
};

/** Revalidate best-effort: di luar konteks request (E2E/CLI) Next melempar — abaikan. */
function segarkan(path: string): void {
	try {
		revalidatePath(path);
	} catch {
		// abaikan — hygiene cache, bukan logika inti
	}
}

async function boleh(): Promise<boolean> {
	try {
		return await canManageUsers();
	} catch {
		return false;
	}
}

async function actorId(): Promise<string | null> {
	try {
		const session = await getCurrentSession();
		return session?.user?.id ?? null;
	} catch {
		return null;
	}
}

function keItem(r: {
	id: string;
	judul: string;
	isi: string;
	status: string;
	tayangMulai: Date;
	tayangSelesai: Date | null;
	diterbitkanPada: Date | null;
	unitOrganisasi: { nama: string } | null;
}): PengumumanItem {
	return {
		id: r.id,
		judul: r.judul,
		isi: r.isi,
		unitNama: r.unitOrganisasi?.nama ?? null,
		status: r.status,
		tayangMulai: r.tayangMulai.toISOString(),
		tayangSelesai: r.tayangSelesai?.toISOString() ?? null,
		diterbitkanPada: r.diterbitkanPada?.toISOString() ?? null,
	};
}

export async function buatPengumumanInti(
	input: { judul: string; isi: string; unitOrganisasiId?: string; tayangSelesai?: string },
	userId: string,
): Promise<PengumumanActionResult> {
	const judul = String(input.judul ?? "").trim();
	const isi = String(input.isi ?? "").trim();
	if (!judul) return { success: false, message: "Judul wajib diisi." };
	if (!isi) return { success: false, message: "Isi wajib diisi." };
	if (input.unitOrganisasiId) {
		const unit = await prisma.unitOrganisasi.findUnique({ where: { id: input.unitOrganisasiId }, select: { id: true } });
		if (!unit) return { success: false, message: "Unit tidak ditemukan." };
	}
	let selesai: Date | null = null;
	if (input.tayangSelesai) {
		selesai = new Date(input.tayangSelesai);
		if (Number.isNaN(selesai.getTime())) return { success: false, message: "Tayang selesai tidak valid." };
	}
	const created = await prisma.pengumuman.create({
		data: {
			judul,
			isi,
			unitOrganisasiId: input.unitOrganisasiId || null,
			tayangSelesai: selesai,
			createdById: userId,
		},
		select: { id: true },
	});
	segarkan("/employees/pengumuman");
	return { success: true, message: "Draf pengumuman tersimpan.", id: created.id };
}

/** Terbitkan + broadcast ke target (seluruh aktif / satu unit). */
export async function terbitkanPengumumanInti(id: string, actorUserId?: string | null): Promise<PengumumanActionResult> {
	const row = await prisma.pengumuman.findUnique({
		where: { id },
		include: { unitOrganisasi: { select: { nama: true } } },
	});
	if (!row) return { success: false, message: "Pengumuman tidak ditemukan." };
	if (row.status === "TERBIT") return { success: false, message: "Sudah terbit." };
	if (row.status === "DIARSIPKAN") return { success: false, message: "Sudah diarsipkan." };

	await prisma.pengumuman.update({
		where: { id },
		data: { status: "TERBIT", diterbitkanOlehId: actorUserId ?? null, diterbitkanPada: new Date() },
	});

	const target = await prisma.karyawan.findMany({
		where: {
			status: { in: ["AKTIF", "PROBASI"] },
			userId: { not: null },
			...(row.unitOrganisasiId
				? { posisiKaryawan: { some: { isCurrent: true, unitOrganisasiId: row.unitOrganisasiId } } }
				: {}),
		},
		select: { userId: true },
	});
	const cakupan = row.unitOrganisasi ? `unit ${row.unitOrganisasi.nama}` : "seluruh karyawan";
	let terkirim = 0;
	for (const t of target) {
		if (!t.userId) continue;
		await kirimNotifikasi({
			userId: t.userId,
			judul: `Pengumuman: ${row.judul}`,
			isi: `${row.isi.slice(0, 160)}${row.isi.length > 160 ? "…" : ""}`,
			jenis: "INFO",
			referensiType: "PENGUMUMAN",
			referensiId: id,
			url: "/account/pengumuman",
			pushData: { url: "/pengumuman", jenis: "pengumuman", id },
		});
		terkirim++;
	}

	await catatAudit({
		actorUserId: actorUserId ?? null,
		aksi: "PENGUMUMAN.TERBIT",
		entityType: "Pengumuman",
		entityId: id,
		sebelum: { status: row.status },
		sesudah: { status: "TERBIT", target: cakupan, terkirim },
		alasan: row.judul,
	});
	segarkan("/employees/pengumuman");
	segarkan("/account/pengumuman");
	return { success: true, message: `Terbit ke ${cakupan} (${terkirim} penerima).` };
}

export async function arsipkanPengumumanInti(id: string, actorUserId?: string | null): Promise<PengumumanActionResult> {
	const row = await prisma.pengumuman.findUnique({ where: { id }, select: { status: true, judul: true } });
	if (!row) return { success: false, message: "Pengumuman tidak ditemukan." };
	if (row.status === "DIARSIPKAN") return { success: false, message: "Sudah diarsipkan." };
	await prisma.pengumuman.update({ where: { id }, data: { status: "DIARSIPKAN" } });
	await catatAudit({
		actorUserId: actorUserId ?? null,
		aksi: "PENGUMUMAN.ARSIP",
		entityType: "Pengumuman",
		entityId: id,
		sebelum: { status: row.status },
		sesudah: { status: "DIARSIPKAN" },
		alasan: row.judul,
	});
	segarkan("/employees/pengumuman");
	segarkan("/account/pengumuman");
	return { success: true, message: "Diarsipkan." };
}

export async function hapusPengumumanInti(id: string): Promise<PengumumanActionResult> {
	const row = await prisma.pengumuman.findUnique({ where: { id }, select: { status: true } });
	if (!row) return { success: false, message: "Pengumuman tidak ditemukan." };
	if (row.status !== "DRAFT") return { success: false, message: "Hanya draf yang bisa dihapus." };
	await prisma.pengumuman.delete({ where: { id } });
	segarkan("/employees/pengumuman");
	return { success: true, message: "Draf dihapus." };
}

export async function getPengumumanHrInti(): Promise<PengumumanItem[]> {
	const rows = await prisma.pengumuman.findMany({
		orderBy: { createdAt: "desc" },
		take: 100,
		include: { unitOrganisasi: { select: { nama: true } } },
	});
	return rows.map(keItem);
}

/** Daftar tayang untuk satu karyawan: global + unitnya sendiri. */
export async function getPengumumanSayaInti(karyawanId: string): Promise<PengumumanItem[]> {
	const saya = await prisma.karyawan.findUnique({
		where: { id: karyawanId },
		select: { posisiKaryawan: { where: { isCurrent: true }, select: { unitOrganisasiId: true } } },
	});
	const unitIds = (saya?.posisiKaryawan ?? []).map((p) => p.unitOrganisasiId).filter((x): x is string => !!x);
	const kini = new Date();
	const rows = await prisma.pengumuman.findMany({
		where: {
			status: "TERBIT",
			tayangMulai: { lte: kini },
			OR: [{ tayangSelesai: null }, { tayangSelesai: { gte: kini } }],
			AND: [{ OR: [{ unitOrganisasiId: null }, { unitOrganisasiId: { in: unitIds } }] }],
		},
		orderBy: { diterbitkanPada: "desc" },
		take: 50,
		include: { unitOrganisasi: { select: { nama: true } } },
	});
	return rows.map(keItem);
}

export type PeristiwaOrang = {
	namaLengkap: string;
	nomorKaryawan: string;
	jenis: "ULTAH" | "ANNIV";
	tanggal: string;
	info: string;
};

/** Ulang tahun + anniversary kerja 7 hari ke depan (on-the-fly, tanpa model). */
export async function getPeristiwaMingguIni(): Promise<PeristiwaOrang[]> {
	const semua = await prisma.karyawan.findMany({
		where: { status: { in: ["AKTIF", "PROBASI"] } },
		select: { namaLengkap: true, nomorKaryawan: true, tanggalLahir: true, tanggalMasuk: true },
		orderBy: { namaLengkap: "asc" },
	});
	const kini = new Date();
	const hasil: PeristiwaOrang[] = [];
	const dalam7Hari = (bulan: number, tanggal: number): Date | null => {
		for (let i = 0; i < 7; i++) {
			const d = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate() + i);
			if (d.getMonth() === bulan && d.getDate() === tanggal) return d;
		}
		return null;
	};
	for (const k of semua) {
		if (k.tanggalLahir) {
			const t = dalam7Hari(k.tanggalLahir.getMonth(), k.tanggalLahir.getDate());
			if (t) {
				hasil.push({
					namaLengkap: k.namaLengkap,
					nomorKaryawan: k.nomorKaryawan,
					jenis: "ULTAH",
					tanggal: t.toISOString().slice(0, 10),
					info: "Berulang tahun",
				});
			}
		}
		if (k.tanggalMasuk) {
			const t = dalam7Hari(k.tanggalMasuk.getMonth(), k.tanggalMasuk.getDate());
			const tahunKe = kini.getFullYear() - k.tanggalMasuk.getFullYear();
			if (t && tahunKe >= 1) {
				hasil.push({
					namaLengkap: k.namaLengkap,
					nomorKaryawan: k.nomorKaryawan,
					jenis: "ANNIV",
					tanggal: t.toISOString().slice(0, 10),
					info: `${tahunKe} tahun bergabung`,
				});
			}
		}
	}
	return hasil.sort((a, b) => a.tanggal.localeCompare(b.tanggal)).slice(0, 50);
}

// ============================================================
// Wrapper berizin (ADMIN_HR/SUPER_ADMIN) untuk UI.
// ============================================================

export async function buatPengumuman(
	input: { judul: string; isi: string; unitOrganisasiId?: string; tayangSelesai?: string },
	userId: string,
) {
	if (!(await boleh())) return { success: false, message: "Anda tidak memiliki izin." };
	return buatPengumumanInti(input, userId);
}

export async function terbitkanPengumuman(id: string) {
	if (!(await boleh())) return { success: false, message: "Anda tidak memiliki izin." };
	return terbitkanPengumumanInti(id, await actorId());
}

export async function arsipkanPengumuman(id: string) {
	if (!(await boleh())) return { success: false, message: "Anda tidak memiliki izin." };
	return arsipkanPengumumanInti(id, await actorId());
}

export async function hapusPengumuman(id: string) {
	if (!(await boleh())) return { success: false, message: "Anda tidak memiliki izin." };
	return hapusPengumumanInti(id);
}

export async function getPengumumanHr() {
	if (!(await boleh())) return [];
	return getPengumumanHrInti();
}

export async function getUnitOptions(): Promise<Array<{ value: string; label: string }>> {
	const rows = await prisma.unitOrganisasi.findMany({
		orderBy: { nama: "asc" },
		select: { id: true, nama: true, kode: true },
	});
	return rows.map((r) => ({ value: r.id, label: r.kode ? `${r.nama} (${r.kode})` : r.nama }));
}
