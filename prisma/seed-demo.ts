import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

/**
 * Skenario demo end-to-end untuk dokumentasi:
 * - 1 pengajuan cuti (MENUNGGU_APPROVAL, tahap 1 atasan + final HR)
 * - 1 lembur (DIAJUKAN + tahap approval)
 * - 1 dinas WFH (MENUNGGU_APPROVAL + tahap approval)
 * - 1 pasang absensi MASUK/KELUAR
 * Idempoten: tiap skenario dikenali via penanda teks, aman dijalankan berulang.
 * Prasyarat: seed:karyawan (Budi + Sinta) dan seed:cuti (jenis CUTI_TAHUNAN).
 */
const TANDA = "Demo dokumentasi";
const d = (tgl: string, jam = "00:00:00") => new Date(`${tgl}T${jam}Z`);

async function nomorBerikut(prefix: string, tahun: number): Promise<string> {
	const kunci = `${prefix}.${tahun}`;
	const rows = await prisma.$queryRaw<Array<{ terakhir: number }>>`
		INSERT INTO "penomoran" ("id", "kunci", "terakhir", "updatedAt")
		VALUES (md5(random()::text || clock_timestamp()::text), ${kunci}, 1, NOW())
		ON CONFLICT ("kunci") DO UPDATE SET "terakhir" = "penomoran"."terakhir" + 1, "updatedAt" = NOW()
		RETURNING "terakhir"`;
	const seq = rows[0]?.terakhir ?? 1;
	return `${kunci}.${String(seq).padStart(5, "0")}`;
}

/** Replika mulaiAlurApproval: tahap 1 atasan, final peran HR. */
async function bukaAlur(type: "CUTI" | "LEMBUR" | "DINAS", id: string, atasanId: string | null) {
	await prisma.approvalStep.deleteMany({ where: { referensiType: type, referensiId: id } });
	let tahap = 1;
	if (atasanId) {
		await prisma.approvalStep.create({ data: { referensiType: type, referensiId: id, tahap, approverKaryawanId: atasanId } });
		tahap++;
	}
	await prisma.approvalStep.create({ data: { referensiType: type, referensiId: id, tahap, approverRole: "ADMIN_HR" } });
}

async function main() {
	const budi = await prisma.karyawan.findUnique({ where: { nomorKaryawan: "DEMO-2026-002" }, select: { id: true, atasanLangsungId: true } });
	const sinta = await prisma.karyawan.findUnique({ where: { nomorKaryawan: "DEMO-2026-001" }, select: { id: true } });
	if (!budi || !sinta) throw new Error("Karyawan demo belum ada — jalankan seed:karyawan dulu.");
	const atasanId = budi.atasanLangsungId ?? sinta.id;

	// 1. Pengajuan cuti.
	const cutiAda = await prisma.pengajuanKetidakhadiran.findFirst({ where: { karyawanId: budi.id, alasan: { contains: TANDA } }, select: { id: true, nomorPengajuan: true } });
	if (cutiAda) {
		console.log(`cuti demo sudah ada: ${cutiAda.nomorPengajuan}`);
	} else {
		const jenis = await prisma.jenisKetidakhadiran.findFirst({ where: { kode: "CUTI_TAHUNAN" }, select: { id: true } });
		if (!jenis) throw new Error("Jenis CUTI_TAHUNAN belum ada — jalankan seed:cuti dulu.");
		const cuti = await prisma.pengajuanKetidakhadiran.create({
			data: {
				nomorPengajuan: await nomorBerikut("CUTI", 2026),
				karyawanId: budi.id,
				jenisKetidakhadiranId: jenis.id,
				tanggalMulai: d("2026-12-22"),
				tanggalSelesai: d("2026-12-24"),
				jumlahHari: 3,
				alasan: `${TANDA} — cuti tahunan akhir tahun.`,
				status: "MENUNGGU_APPROVAL",
				diajukanPada: new Date(),
			},
			select: { id: true, nomorPengajuan: true },
		});
		await bukaAlur("CUTI", cuti.id, atasanId);
		console.log(`cuti demo dibuat: ${cuti.nomorPengajuan} (menunggu approval)`);
	}

	// 2. Lembur.
	const lemburAda = await prisma.lembur.findFirst({ where: { karyawanId: budi.id, alasan: { contains: TANDA } }, select: { id: true } });
	if (lemburAda) {
		console.log("lembur demo sudah ada");
	} else {
		const lembur = await prisma.lembur.create({
			data: {
				karyawanId: budi.id,
				tanggal: d("2026-10-08"),
				jamMulai: d("2026-10-08", "10:00:00"),
				jamSelesai: d("2026-10-08", "12:00:00"),
				jumlahJam: 2,
				alasan: `${TANDA} — lembur tutup periode.`,
				status: "DIAJUKAN",
			},
			select: { id: true },
		});
		await bukaAlur("LEMBUR", lembur.id, atasanId);
		console.log("lembur demo dibuat (diajukan)");
	}

	// 3. Dinas WFH.
	const dinasAda = await prisma.dinasWFH.findFirst({ where: { karyawanId: budi.id, keperluan: { contains: TANDA } }, select: { id: true, nomorPengajuan: true } });
	if (dinasAda) {
		console.log(`dinas demo sudah ada: ${dinasAda.nomorPengajuan}`);
	} else {
		const dinas = await prisma.dinasWFH.create({
			data: {
				nomorPengajuan: await nomorBerikut("DINAS", 2026),
				karyawanId: budi.id,
				jenis: "WFH",
				tanggalMulai: d("2026-10-14"),
				tanggalSelesai: d("2026-10-15"),
				lokasi: "Rumah",
				keperluan: `${TANDA} — WFH fokus tutup periode.`,
				status: "MENUNGGU_APPROVAL",
				diajukanPada: new Date(),
			},
			select: { id: true, nomorPengajuan: true },
		});
		await bukaAlur("DINAS", dinas.id, atasanId);
		console.log(`dinas demo dibuat: ${dinas.nomorPengajuan} (menunggu approval)`);
	}

	// 4. Sepasang absensi MASUK/KELUAR.
	const lokasi = await prisma.lokasiKerja.findFirst({ select: { id: true, latitude: true, longitude: true } });
	for (const [tipe, jam] of [["MASUK", "08:03:00"], ["KELUAR", "17:06:00"]] as const) {
		const waktu = d("2026-10-09", jam);
		const ada = await prisma.absensi.findFirst({
			where: { karyawanId: budi.id, tipe, waktu: { gte: d("2026-10-09"), lt: d("2026-10-10") } },
			select: { id: true },
		});
		if (ada) {
			console.log(`absensi ${tipe} demo sudah ada`);
			continue;
		}
		await prisma.absensi.create({
			data: {
				karyawanId: budi.id,
				waktu,
				tipe,
				sumber: "MOBILE",
				lokasiKerjaId: lokasi?.id ?? null,
				latitude: lokasi?.latitude ?? undefined,
				longitude: lokasi?.longitude ?? undefined,
				diLuarRadius: false,
				isMocked: false,
				status: "VALID",
				catatan: TANDA,
			},
		});
		console.log(`absensi ${tipe} demo dibuat`);
	}

	const menunggu = await prisma.approvalStep.count({ where: { status: "MENUNGGU" } });
	console.log(`tahap approval MENUNGGU total: ${menunggu}`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
