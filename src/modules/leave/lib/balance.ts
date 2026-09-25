import prisma from "@/src/lib/prisma";
import type { HariDalamMinggu } from "@/generated/prisma/client";
import { toDbDate } from "@/src/lib/time";

/**
 * Hitung jumlah hari pengajuan: inklusif, dikurangi hari non-kerja
 * kalender default + hari libur kalender default. Tanpa kalender default,
 * fallback ke jumlah hari kalender.
 */
export async function hitungHariPengajuan(mulai: Date, selesai: Date): Promise<number> {
	const start = toDbDate(mulai);
	const end = toDbDate(selesai);
	if (end < start) return 0;

	const kalender = await prisma.kalenderKerja.findFirst({
		where: { isDefault: true, isActive: true },
		include: {
			jadwalKerja: { select: { hari: true, isHariKerja: true } },
			hariLibur: { select: { tanggal: true } },
		},
	});

	const HARI = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"] as HariDalamMinggu[];
	const liburSet = new Set((kalender?.hariLibur ?? []).map((h) => toDbDate(h.tanggal).getTime()));
	const kerjaMap = new Map((kalender?.jadwalKerja ?? []).map((j) => [j.hari, j.isHariKerja]));

	let count = 0;
	const cursor = new Date(start);
	while (cursor <= end) {
		const key = toDbDate(cursor).getTime();
		if (!liburSet.has(key)) {
			if (!kalender) {
				count++;
			} else {
				const hari = HARI[cursor.getUTCDay()];
				if (kerjaMap.get(hari) !== false) count++;
			}
		}
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}
	return count;
}

export async function getSaldo(karyawanId: string, jenisId: number, tahun: number) {
	return prisma.saldoCuti.findUnique({
		where: { karyawanId_jenisKetidakhadiranId_tahun: { karyawanId, jenisKetidakhadiranId: jenisId, tahun } },
	});
}

export async function generateSaldoTahunan(tahun: number): Promise<{ dibuat: number; dilewati: number }> {
	const [karyawan, jenisList] = await Promise.all([
		prisma.karyawan.findMany({
			where: { status: { in: ["AKTIF", "PROBASI"] } },
			select: { id: true },
		}),
		prisma.jenisKetidakhadiran.findMany({
			where: { menggunakanSaldo: true, isActive: true },
			select: { id: true, jatahTahunan: true },
		}),
	]);

	let dibuat = 0;
	let dilewati = 0;
	for (const k of karyawan) {
		for (const j of jenisList) {
			const existing = await prisma.saldoCuti.findUnique({
				where: { karyawanId_jenisKetidakhadiranId_tahun: { karyawanId: k.id, jenisKetidakhadiranId: j.id, tahun } },
			});
			if (existing) {
				dilewati++;
				continue;
			}
			const jatah = j.jatahTahunan ?? 0;
			const saldo = await prisma.saldoCuti.create({
				data: { karyawanId: k.id, jenisKetidakhadiranId: j.id, tahun, saldoAwal: jatah, saldoAkhir: jatah },
			});
			await prisma.mutasiSaldoCuti.create({
				data: { saldoCutiId: saldo.id, tipe: "PENAMBAHAN", jumlah: jatah, keterangan: `Jatah tahunan ${tahun}` },
			});
			dibuat++;
		}
	}
	return { dibuat, dilewati };
}

export async function potongSaldo(
	karyawanId: string,
	jenisId: number,
	tahun: number,
	jumlah: number,
	referensiId: string,
	keterangan: string,
): Promise<{ success: boolean; message: string }> {
	const saldo = await getSaldo(karyawanId, jenisId, tahun);
	if (!saldo) return { success: false, message: "Saldo cuti tahun berjalan belum dibuat. Minta HR generate saldo." };
	if (Number(saldo.saldoAkhir) < jumlah) {
		return { success: false, message: `Saldo tidak cukup (sisa ${saldo.saldoAkhir}, butuh ${jumlah}).` };
	}
	await prisma.$transaction(async (tx) => {
		await tx.mutasiSaldoCuti.create({
			data: { saldoCutiId: saldo.id, tipe: "PENGURANGAN", jumlah, referensiId, keterangan },
		});
		await tx.saldoCuti.update({
			where: { id: saldo.id },
			data: { saldoAkhir: Number(saldo.saldoAkhir) - jumlah },
		});
	});
	return { success: true, message: "Saldo terpotong." };
}

export async function kembalikanSaldo(
	karyawanId: string,
	jenisId: number,
	tahun: number,
	jumlah: number,
	referensiId: string,
	keterangan: string,
): Promise<void> {
	const saldo = await getSaldo(karyawanId, jenisId, tahun);
	if (!saldo) return;
	await prisma.$transaction(async (tx) => {
		await tx.mutasiSaldoCuti.create({
			data: { saldoCutiId: saldo.id, tipe: "PENAMBAHAN", jumlah, referensiId, keterangan },
		});
		await tx.saldoCuti.update({
			where: { id: saldo.id },
			data: { saldoAkhir: Number(saldo.saldoAkhir) + jumlah },
		});
	});
}
