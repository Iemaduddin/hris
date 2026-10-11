import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

/**
 * Master Karyawan contoh untuk dokumentasi & demo.
 * Idempoten: baris dikenali via nomorKaryawan, aman dijalankan berulang.
 * - Sinta Manajer (atasan, tertaut ke user manager@example.com bila ada)
 * - Budi Karyawan (bawahan Sinta + data keluarga, pendidikan, kontrak)
 * - Dewi Finance (bawahan Sinta + kontrak)
 * - Agus Resign (status RESIGN + kontrak BERAKHIR, untuk demo laporan turnover)
 */
const DEMO = [
	{
		nomor: "DEMO-2026-001",
		nama: "Sinta Manajer",
		gender: "PEREMPUAN" as const,
		status: "AKTIF" as const,
		nik: "3273015505830001",
		telepon: "0811-0000-0001",
		email: "sinta.manajer@example.com",
		masuk: "2024-03-01",
		resign: null as string | null,
		atasanNomor: null as string | null,
		tautanUser: "manager@example.com",
		gajiPokok: 12_000_000,
		kontrakStatus: "AKTIF" as const,
	},
	{
		nomor: "DEMO-2026-002",
		nama: "Budi Karyawan",
		gender: "LAKI_LAKI" as const,
		status: "AKTIF" as const,
		nik: "3273011507900002",
		telepon: "0811-0000-0002",
		email: "budi.karyawan@example.com",
		masuk: "2024-07-15",
		resign: null as string | null,
		atasanNomor: "DEMO-2026-001",
		tautanUser: null as string | null,
		gajiPokok: 7_000_000,
		kontrakStatus: "AKTIF" as const,
	},
	{
		nomor: "DEMO-2026-003",
		nama: "Dewi Finance",
		gender: "PEREMPUAN" as const,
		status: "AKTIF" as const,
		nik: "3273012205880003",
		telepon: "0811-0000-0003",
		email: "dewi.finance@example.com",
		masuk: "2023-01-10",
		resign: null as string | null,
		atasanNomor: "DEMO-2026-001",
		tautanUser: null as string | null,
		gajiPokok: 6_500_000,
		kontrakStatus: "AKTIF" as const,
	},
	{
		nomor: "DEMO-2026-004",
		nama: "Agus Resign",
		gender: "LAKI_LAKI" as const,
		status: "RESIGN" as const,
		nik: "3273011012850004",
		telepon: "0811-0000-0004",
		email: "agus.resign@example.com",
		masuk: "2022-05-01",
		resign: "2026-08-31",
		atasanNomor: "DEMO-2026-001",
		tautanUser: null as string | null,
		gajiPokok: 5_500_000,
		kontrakStatus: "BERAKHIR" as const,
	},
];

const d = (tgl: string) => new Date(`${tgl}T00:00:00Z`);

async function main() {
	// Referensi master (pakai yang ada; null bila belum di-seed).
	const unit = await prisma.unitOrganisasi.findFirst({ where: { nama: { contains: "Human Resources" } }, select: { id: true } })
		?? await prisma.unitOrganisasi.findFirst({ select: { id: true } });
	const posisi = await prisma.posisi.findFirst({ where: { nama: { contains: "Staff" } }, select: { id: true } })
		?? await prisma.posisi.findFirst({ select: { id: true } });
	const lokasi = await prisma.lokasiKerja.findFirst({ select: { id: true } });
	const idByNomor = new Map<string, string>();

	for (const k of DEMO) {
		let row = await prisma.karyawan.findUnique({ where: { nomorKaryawan: k.nomor }, select: { id: true } });
		if (!row) {
			let userId: string | undefined;
			if (k.tautanUser) {
				const user = await prisma.user.findUnique({ where: { email: k.tautanUser }, select: { id: true } });
				if (user) {
					const sudahTaut = await prisma.karyawan.findUnique({ where: { userId: user.id }, select: { id: true } });
					if (!sudahTaut) userId = user.id;
				}
			}
			row = await prisma.karyawan.create({
				data: {
					nomorKaryawan: k.nomor,
					namaLengkap: k.nama,
					gender: k.gender,
					status: k.status,
					nik: k.nik,
					telepon: k.telepon,
					email: k.email,
					tanggalMasuk: d(k.masuk),
					tanggalResign: k.resign ? d(k.resign) : null,
					userId,
				},
				select: { id: true },
			});
			console.log(`karyawan ${k.nomor} dibuat (${k.nama})`);
		} else {
			console.log(`karyawan ${k.nomor} sudah ada`);
		}
		idByNomor.set(k.nomor, row.id);
	}

	// Atasan langsung (tahap 2 setelah semua baris ada).
	for (const k of DEMO) {
		if (!k.atasanNomor) continue;
		const atasanId = idByNomor.get(k.atasanNomor);
		if (!atasanId) continue;
		await prisma.karyawan.update({
			where: { id: idByNomor.get(k.nomor) },
			data: { atasanLangsungId: atasanId },
		});
	}
	console.log("atasan langsung: OK");

	// Penempatan primary.
	for (const k of DEMO) {
		const karyawanId = idByNomor.get(k.nomor)!;
		const ada = await prisma.posisiKaryawan.findFirst({ where: { karyawanId, isCurrent: true }, select: { id: true } });
		if (ada) continue;
		await prisma.posisiKaryawan.create({
			data: {
				karyawanId,
				unitOrganisasiId: unit?.id ?? null,
				posisiId: posisi?.id ?? null,
				lokasiKerjaId: lokasi?.id ?? null,
				isPrimary: true,
				isCurrent: true,
				tanggalEfektif: d(k.masuk),
			},
		});
	}
	console.log("penempatan: OK");

	// Kontrak.
	for (const k of DEMO) {
		const karyawanId = idByNomor.get(k.nomor)!;
		const ada = await prisma.kontrakKerja.findFirst({ where: { karyawanId }, select: { id: true } });
		if (ada) continue;
		await prisma.kontrakKerja.create({
			data: {
				karyawanId,
				nomorKontrak: `KTR-${k.nomor}`,
				jenisKontrak: "PKWTT",
				status: k.kontrakStatus,
				tanggalMulai: d(k.masuk),
				tanggalSelesai: k.resign ? d(k.resign) : null,
				gajiPokok: k.gajiPokok,
			},
		});
	}
	console.log("kontrak: OK");

	// Keluarga + pendidikan contoh (Budi saja, untuk dokumentasi).
	const budiId = idByNomor.get("DEMO-2026-002")!;
	if ((await prisma.keluargaKaryawan.count({ where: { karyawanId: budiId } })) === 0) {
		await prisma.keluargaKaryawan.createMany({
			data: [
				{ karyawanId: budiId, nama: "Sari Karyawan", hubungan: "PASANGAN", gender: "PEREMPUAN", pekerjaan: "Guru" },
				{ karyawanId: budiId, nama: "Nadia Karyawan", hubungan: "ANAK", gender: "PEREMPUAN", tanggalLahir: d("2018-06-12") },
			],
		});
		console.log("keluarga Budi: +2");
	}
	if ((await prisma.pendidikanKaryawan.count({ where: { karyawanId: budiId } })) === 0) {
		await prisma.pendidikanKaryawan.create({
			data: { karyawanId: budiId, gelar: "S1", institusi: "Universitas Contoh", jurusan: "Manajemen", tahunMulai: 2008, tahunLulus: 2012, ipk: 3.4, isHighest: true },
		});
		console.log("pendidikan Budi: +1");
	}

	// Saldo cuti tahunan 2026 untuk yang aktif.
	const jenis = await prisma.jenisKetidakhadiran.findFirst({ where: { kode: "CUTI_TAHUNAN" }, select: { id: true } });
	if (jenis) {
		for (const nomor of ["DEMO-2026-001", "DEMO-2026-002", "DEMO-2026-003"]) {
			await prisma.saldoCuti.upsert({
				where: { karyawanId_jenisKetidakhadiranId_tahun: { karyawanId: idByNomor.get(nomor)!, jenisKetidakhadiranId: jenis.id, tahun: 2026 } },
				create: { karyawanId: idByNomor.get(nomor)!, jenisKetidakhadiranId: jenis.id, tahun: 2026, saldoAwal: 12, saldoAkhir: 12 },
				update: {},
			});
		}
		console.log("saldo cuti 2026: OK");
	} else {
		console.log("saldo cuti: LEWAT (jenis CUTI_TAHUNAN belum ada — jalankan seed M2 dulu)");
	}

	console.log(`total karyawan: ${await prisma.karyawan.count()}`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
