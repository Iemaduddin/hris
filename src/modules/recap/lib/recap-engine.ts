import prisma from "@/src/lib/prisma";
import { StatusRekap, type HariDalamMinggu } from "@/generated/prisma/client";
import { addDays, dayName, startOfDay, timeToMinutes, toDbDate } from "@/src/lib/time";

export type RekapHasil = {
	karyawanId: string;
	tanggal: Date;
	sumberJadwal: string;
	acuanId: string | null;
	jamMasukSeharusnya: Date | null;
	jamKeluarSeharusnya: Date | null;
	masukAktual: Date | null;
	keluarAktual: Date | null;
	telatMenit: number;
	pulangCepatMenit: number;
	lemburMenit: number;
	status: StatusRekap;
};

function combineDayTime(day: Date, minutes: number, plusDays = 0): Date {
	const d = new Date(day);
	if (plusDays) d.setDate(d.getDate() + plusDays);
	d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
	return d;
}

function endOfDay(day: Date): Date {
	const d = new Date(day);
	d.setHours(23, 59, 59, 999);
	return d;
}

export async function hitungRekapHarian(karyawanId: string, tanggal: Date): Promise<RekapHasil | null> {
	const day = toDbDate(tanggal);

	const roster = await prisma.rosterShift.findUnique({
		where: { karyawanId_tanggal: { karyawanId, tanggal: day } },
		include: { shift: true },
	});

	let jamMasukMin: number | null = null;
	let jamKeluarMin: number | null = null;
	let plusDaysKeluar = 0;
	let toleransi = 0;
	let sumberJadwal = "";
	let acuanId: string | null = null;
	let kalenderId: number | null = null;

	if (roster && roster.shift.isActive) {
		jamMasukMin = timeToMinutes(roster.shift.jamMasuk);
		jamKeluarMin = timeToMinutes(roster.shift.jamKeluar);
		if (roster.shift.lintasHari) plusDaysKeluar = 1;
		toleransi = roster.shift.toleransiTelatMenit;
		sumberJadwal = "ROSTER";
		acuanId = roster.shiftId;
	} else {
		const penugasan = await prisma.penugasanKalender.findFirst({
			where: {
				karyawanId,
				tanggalMulai: { lte: day },
				OR: [{ tanggalSelesai: null }, { tanggalSelesai: { gte: day } }],
			},
			orderBy: { tanggalMulai: "desc" },
		});

		if (penugasan) {
			kalenderId = penugasan.kalenderKerjaId;
			sumberJadwal = "KALENDER";
			acuanId = String(penugasan.kalenderKerjaId);
		} else {
			const def = await prisma.kalenderKerja.findFirst({
				where: { isDefault: true, isActive: true },
			});
			if (!def) return null;
			kalenderId = def.id;
			sumberJadwal = "KALENDER_DEFAULT";
			acuanId = String(def.id);
		}

		const jadwal = await prisma.jadwalKerja.findUnique({
			where: { kalenderKerjaId_hari: { kalenderKerjaId: kalenderId, hari: dayName(day) as HariDalamMinggu } },
		});

		if (!jadwal || !jadwal.isHariKerja || !jadwal.jamMasuk || !jadwal.jamKeluar) {
			const kerja = await adaKehadiran(karyawanId, day, false);
			return simpanRekap({
				karyawanId,
				tanggal: day,
				sumberJadwal,
				acuanId,
				jamMasukSeharusnya: null,
				jamKeluarSeharusnya: null,
				masukAktual: kerja.masuk,
				keluarAktual: kerja.keluar,
				telatMenit: 0,
				pulangCepatMenit: 0,
				lemburMenit: kerja.masuk && kerja.keluar ? diffMenit(kerja.masuk, kerja.keluar) : 0,
				status: kerja.masuk ? StatusRekap.HADIR : StatusRekap.LIBUR,
			});
		}

		jamMasukMin = timeToMinutes(jadwal.jamMasuk);
		jamKeluarMin = timeToMinutes(jadwal.jamKeluar);
	}

	if (jamMasukMin === null || jamKeluarMin === null) return null;

	const libur = await prisma.hariLibur.findFirst({
		where: {
			tanggal: day,
			...(kalenderId ? { kalenderKerjaId: kalenderId } : {}),
		},
		select: { id: true },
	});

	if (libur) {
		const kerja = await adaKehadiran(karyawanId, day, plusDaysKeluar > 0);
		return simpanRekap({
			karyawanId,
			tanggal: day,
			sumberJadwal,
			acuanId,
			jamMasukSeharusnya: combineDayTime(day, jamMasukMin),
			jamKeluarSeharusnya: combineDayTime(day, jamKeluarMin, plusDaysKeluar),
			masukAktual: kerja.masuk,
			keluarAktual: kerja.keluar,
			telatMenit: 0,
			pulangCepatMenit: 0,
			lemburMenit: kerja.masuk && kerja.keluar ? diffMenit(kerja.masuk, kerja.keluar) : 0,
			status: kerja.masuk ? StatusRekap.HADIR : StatusRekap.LIBUR,
		});
	}

	const cuti = await prisma.pengajuanKetidakhadiran.findFirst({
		where: {
			karyawanId,
			status: "DISETUJUI",
			tanggalMulai: { lte: endOfDay(day) },
			tanggalSelesai: { gte: day },
		},
		include: { jenisKetidakhadiran: { select: { kategori: true } } },
	});

	const dinas = cuti
		? null
		: await prisma.dinasWFH.findFirst({
				where: {
					karyawanId,
					status: "DISETUJUI",
					tanggalMulai: { lte: day },
					tanggalSelesai: { gte: day },
				},
				select: { id: true },
			});

	if (dinas) {
		return simpanRekap({
			karyawanId,
			tanggal: day,
			sumberJadwal,
			acuanId,
			jamMasukSeharusnya: combineDayTime(day, jamMasukMin),
			jamKeluarSeharusnya: combineDayTime(day, jamKeluarMin, plusDaysKeluar),
			masukAktual: null,
			keluarAktual: null,
			telatMenit: 0,
			pulangCepatMenit: 0,
			lemburMenit: 0,
			status: StatusRekap.DINAS,
		});
	}

	if (cuti) {
		return simpanRekap({
			karyawanId,
			tanggal: day,
			sumberJadwal,
			acuanId,
			jamMasukSeharusnya: combineDayTime(day, jamMasukMin),
			jamKeluarSeharusnya: combineDayTime(day, jamKeluarMin, plusDaysKeluar),
			masukAktual: null,
			keluarAktual: null,
			telatMenit: 0,
			pulangCepatMenit: 0,
			lemburMenit: 0,
			status: cuti.jenisKetidakhadiran.kategori === "CUTI" ? StatusRekap.CUTI : StatusRekap.IZIN,
		});
	}

	const kerja = await adaKehadiran(karyawanId, day, plusDaysKeluar > 0);
	const expectedMasuk = combineDayTime(day, jamMasukMin);
	const expectedKeluar = combineDayTime(day, jamKeluarMin, plusDaysKeluar);

	if (!kerja.masuk) {
		return simpanRekap({
			karyawanId,
			tanggal: day,
			sumberJadwal,
			acuanId,
			jamMasukSeharusnya: expectedMasuk,
			jamKeluarSeharusnya: expectedKeluar,
			masukAktual: null,
			keluarAktual: kerja.keluar,
			telatMenit: 0,
			pulangCepatMenit: 0,
			lemburMenit: 0,
			status: StatusRekap.ALPA,
		});
	}

	const telat = Math.max(0, diffMenit(expectedMasuk, kerja.masuk));
	const pulangCepat = kerja.keluar ? Math.max(0, diffMenit(kerja.keluar, expectedKeluar)) : 0;
	const lembur = kerja.keluar ? Math.max(0, diffMenit(expectedKeluar, kerja.keluar)) : 0;

	return simpanRekap({
		karyawanId,
		tanggal: day,
		sumberJadwal,
		acuanId,
		jamMasukSeharusnya: expectedMasuk,
		jamKeluarSeharusnya: expectedKeluar,
		masukAktual: kerja.masuk,
		keluarAktual: kerja.keluar,
		telatMenit: telat,
		pulangCepatMenit: pulangCepat,
		lemburMenit: lembur,
		status: telat > toleransi ? StatusRekap.TERLAMBAT : StatusRekap.HADIR,
	});
}

async function adaKehadiran(
	karyawanId: string,
	day: Date,
	lewatTengahMalam: boolean,
): Promise<{ masuk: Date | null; keluar: Date | null }> {
	const from = startOfDay(day);
	const to = lewatTengahMalam ? combineDayTime(addDays(day, 1), 12 * 60) : endOfDay(day);

	const events = await prisma.absensi.findMany({
		where: {
			karyawanId,
			waktu: { gte: from, lte: to },
			status: { in: ["VALID", "DIKOREKSI"] },
		},
		orderBy: { waktu: "asc" },
		select: { waktu: true, tipe: true },
	});

	const masukList = events.filter((e) => e.tipe === "MASUK").map((e) => e.waktu);
	const keluarList = events.filter((e) => e.tipe === "KELUAR").map((e) => e.waktu);

	return {
		masuk: masukList.length ? masukList[0] : null,
		keluar: keluarList.length ? keluarList[keluarList.length - 1] : null,
	};
}

function diffMenit(from: Date, to: Date): number {
	return Math.round((to.getTime() - from.getTime()) / 60000);
}

async function simpanRekap(hasil: RekapHasil): Promise<RekapHasil> {
	await prisma.rekapHarian.upsert({
		where: { karyawanId_tanggal: { karyawanId: hasil.karyawanId, tanggal: hasil.tanggal } },
		update: {
			sumberJadwal: hasil.sumberJadwal,
			acuanId: hasil.acuanId,
			jamMasukSeharusnya: hasil.jamMasukSeharusnya,
			jamKeluarSeharusnya: hasil.jamKeluarSeharusnya,
			masukAktual: hasil.masukAktual,
			keluarAktual: hasil.keluarAktual,
			telatMenit: hasil.telatMenit,
			pulangCepatMenit: hasil.pulangCepatMenit,
			lemburMenit: hasil.lemburMenit,
			status: hasil.status,
		},
		create: {
			karyawanId: hasil.karyawanId,
			tanggal: hasil.tanggal,
			sumberJadwal: hasil.sumberJadwal,
			acuanId: hasil.acuanId,
			jamMasukSeharusnya: hasil.jamMasukSeharusnya,
			jamKeluarSeharusnya: hasil.jamKeluarSeharusnya,
			masukAktual: hasil.masukAktual,
			keluarAktual: hasil.keluarAktual,
			telatMenit: hasil.telatMenit,
			pulangCepatMenit: hasil.pulangCepatMenit,
			lemburMenit: hasil.lemburMenit,
			status: hasil.status,
		},
	});
	return hasil;
}

export async function hitungRekapPeriode(karyawanIds: string[], mulai: Date, selesai: Date): Promise<RekapHasil[]> {
	const hasil: RekapHasil[] = [];
	let cursor = toDbDate(mulai);
	const end = toDbDate(selesai);
	while (cursor <= end) {
		for (const karyawanId of karyawanIds) {
			const r = await hitungRekapHarian(karyawanId, cursor);
			if (r) hasil.push(r);
		}
		cursor = addDays(cursor, 1);
	}
	return hasil;
}
