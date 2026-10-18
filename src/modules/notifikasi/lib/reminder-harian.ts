import prisma from "@/src/lib/prisma";
import { sendNotification } from "./notify";
import { getExpiringContracts } from "@/src/modules/employee/actions/employee.actions";
import { getUpcomingProbation } from "@/src/modules/employee/actions/probation.actions";

/**
 * Pengingat harian (dijalankan penjadwal, lihat `npm run reminder:harian`):
 * - Digest ke HR: kontrak H-30, probation H-30, ultah & ulang tahun kerja hari ini.
 * - Sapaan pribadi ke karyawan yang berulang tahun / genap tahun masa kerja.
 *
 * Idempoten per hari: tiap penerima hanya menerima satu notifikasi per tanggal
 * (dicek lewat referensiType + referensiId), jadi job boleh dijalankan berkali-kali.
 */

export type ReminderHarianResult = {
	tanggal: string;
	kontrakH30: number;
	probationH30: number;
	ulangTahun: number;
	ulangTahunKerja: number;
	digestTerkirim: number;
	sapaanTerkirim: number;
	digestSudahAda: boolean;
};

const REF_DIGEST = "PENGINGAT_HARIAN";
const REF_PRIBADI = "PENGINGAT_PRIBADI";

function samaHari(a: Date, b: Date): boolean {
	return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
}

function daftarRingkas(baris: string[], maks = 3): string {
	if (baris.length <= maks) return baris.join(", ");
	return `${baris.slice(0, maks).join(", ")} +${baris.length - maks} lainnya`;
}

async function sudahDikirim(userId: string, referensiType: string, referensiId: string): Promise<boolean> {
	const ada = await prisma.notifikasi.findFirst({
		where: { userId, referensiType, referensiId },
		select: { id: true },
	});
	return Boolean(ada);
}

export async function jalankanPengingatHarian(referensi = new Date()): Promise<ReminderHarianResult> {
	const tanggal = new Date(referensi);
	const tanggalIso = `${tanggal.getFullYear()}-${String(tanggal.getMonth() + 1).padStart(2, "0")}-${String(
		tanggal.getDate(),
	).padStart(2, "0")}`;

	const [kontrak, probation, karyawan] = await Promise.all([
		getExpiringContracts(30),
		getUpcomingProbation(30),
		prisma.karyawan.findMany({
			where: { status: { in: ["AKTIF", "PROBASI"] } },
			select: { id: true, namaLengkap: true, userId: true, tanggalLahir: true, tanggalMasuk: true },
		}),
	]);

	const ultah = karyawan.filter((k) => k.tanggalLahir && samaHari(k.tanggalLahir, tanggal));
	const ulangTahunKerja = karyawan
		.filter((k) => k.tanggalMasuk && samaHari(k.tanggalMasuk, tanggal))
		.map((k) => ({ ...k, tahun: tanggal.getFullYear() - k.tanggalMasuk!.getFullYear() }))
		.filter((k) => k.tahun > 0);

	let sapaanTerkirim = 0;
	for (const k of ultah) {
		if (!k.userId) continue;
		if (await sudahDikirim(k.userId, REF_PRIBADI, `ultah-${tanggalIso}`)) continue;
		await sendNotification({
			userId: k.userId,
			title: "Selamat ulang tahun",
			body: `Selamat ulang tahun, ${k.namaLengkap}. Semoga tahun ini menyenangkan.`,
			kind: "INFO",
			referenceType: REF_PRIBADI,
			referenceId: `ultah-${tanggalIso}`,
		});
		sapaanTerkirim += 1;
	}
	for (const k of ulangTahunKerja) {
		if (!k.userId) continue;
		if (await sudahDikirim(k.userId, REF_PRIBADI, `anniv-${tanggalIso}`)) continue;
		await sendNotification({
			userId: k.userId,
			title: "Selamat ulang tahun kerja",
			body: `${k.tahun} tahun bersama perusahaan hari ini. Terima kasih, ${k.namaLengkap}.`,
			kind: "INFO",
			referenceType: REF_PRIBADI,
			referenceId: `anniv-${tanggalIso}`,
		});
		sapaanTerkirim += 1;
	}

	const baris: string[] = [];
	if (kontrak.length) {
		baris.push(
			`Kontrak berakhir ≤30 hari (${kontrak.length}): ${daftarRingkas(
				kontrak.map((k) => `${k.employeeName} H-${k.remainingDays}`),
			)}`,
		);
	}
	if (probation.length) {
		baris.push(
			`Probation ≤30 hari (${probation.length}): ${daftarRingkas(probation.map((p) => `${p.employeeName} H-${p.remainingDays}`))}`,
		);
	}
	if (ultah.length) baris.push(`Ulang tahun hari ini (${ultah.length}): ${daftarRingkas(ultah.map((k) => k.namaLengkap))}`);
	if (ulangTahunKerja.length) {
		baris.push(
			`Ulang tahun kerja hari ini (${ulangTahunKerja.length}): ${daftarRingkas(
				ulangTahunKerja.map((k) => `${k.namaLengkap} ${k.tahun} th`),
			)}`,
		);
	}

	let digestTerkirim = 0;
	let digestSudahAda = false;
	if (baris.length) {
		const hr = await prisma.user.findMany({
			where: { role: { in: ["SUPER_ADMIN", "ADMIN_HR"] }, isActive: true },
			select: { id: true },
		});
		for (const user of hr) {
			if (await sudahDikirim(user.id, REF_DIGEST, tanggalIso)) {
				digestSudahAda = true;
				continue;
			}
			await sendNotification({
				userId: user.id,
				title: `Pengingat HR ${tanggalIso}`,
				body: baris.join("\n"),
				kind: "INFO",
				referenceType: REF_DIGEST,
				referenceId: tanggalIso,
				url: "/",
			});
			digestTerkirim += 1;
		}
	}

	return {
		tanggal: tanggalIso,
		kontrakH30: kontrak.length,
		probationH30: probation.length,
		ulangTahun: ultah.length,
		ulangTahunKerja: ulangTahunKerja.length,
		digestTerkirim,
		sapaanTerkirim,
		digestSudahAda,
	};
}
