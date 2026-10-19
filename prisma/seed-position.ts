import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ============================================================
// GOLOGAN POSISI
// ============================================================
const golongan = [
	{ nama: "Staf Junior", kode: "01", deskripsi: "Posisi entry level untuk lulusan baru atau pengalaman kurang dari 1 tahun" },
	{ nama: "Staf", kode: "02", deskripsi: "Posisi staf dengan pengalaman 1-3 tahun" },
	{ nama: "Staf Senior", kode: "03", deskripsi: "Posisi staf senior dengan pengalaman 3-5 tahun" },
	{ nama: "Supervisor", kode: "04", deskripsi: "Level supervisor yang memimpin tim kecil" },
	{ nama: "Manager", kode: "05", deskripsi: "Level manager yang mengelola departemen" },
	{ nama: "Senior Manager", kode: "06", deskripsi: "Level senior manager dengan tanggung jawab lebih luas" },
	{ nama: "General Manager", kode: "07", deskripsi: "Level general manager yang mengelola divisi" },
	{ nama: "Direktur", kode: "08", deskripsi: "Level direktur anggota dewan direksi" },
	{ nama: "Office Boy / Cleaning Service", kode: "B", deskripsi: "Level support staff untuk kebersihan dan ketertiban" },
	{ nama: "Teknisi / Operator", kode: "T", deskripsi: "Level teknisi atau operator mesin produksi" },
];

// ============================================================
// LOKASI KERJA
// ============================================================
const lokasi = [
	{
		nama: "Head Office Bangkalan",
		kode: "HO-BKL",
		alamat: "Jl. Gedongan No. 10, Bangkalan, Madura",
		kota: "Bangkalan",
		provinsi: "Jawa Timur",
		kodePos: "69114",
		isActive: true,
	},
	{
		nama: "Kantor Cabang Bandung",
		kode: "CB-BDG",
		alamat: "Jl. Asia Afrika No. 133, Bandung Wetan, Bandung",
		kota: "Bandung",
		provinsi: "Jawa Barat",
		kodePos: "40111",
		isActive: true,
	},
	{
		nama: "Kantor Cabang Surabaya",
		kode: "CB-SBY",
		alamat: "Jl. Basuki Rahmat No. 70, Kedungdoro, Tegalsari, Surabaya",
		kota: "Surabaya",
		provinsi: "Jawa Timur",
		kodePos: "60261",
		isActive: true,
	},
	{
		nama: "Kantor Cabang Medan",
		kode: "CB-MDN",
		alamat: "Jl. Pemuda No. 133, Sei Kera Hilir I, Medan Perjuangan, Medan",
		kota: "Medan",
		provinsi: "Sumatera Utara",
		kodePos: "20231",
		isActive: true,
	},
	{
		nama: "Kantor Cabang Makassar",
		kode: "CB-MKS",
		alamat: "Jl. Jend. Sudirman No. 24, Kec. Makassar, Makassar",
		kota: "Makassar",
		provinsi: "Sulawesi Selatan",
		kodePos: "90113",
		isActive: true,
	},
	{
		nama: "Kantor Cabang Semarang",
		kode: "CB-SMG",
		alamat: "Jl. Pandanaran No. 103, Semarang Tengah, Semarang",
		kota: "Semarang",
		provinsi: "Jawa Tengah",
		kodePos: "50132",
		isActive: true,
	},
	{
		nama: "Kantor Cabang Yogyakarta",
		kode: "CB-JOG",
		alamat: "Jl. Malioboro No. 62, Suryatmajan, Danurejan, Yogyakarta",
		kota: "Yogyakarta",
		provinsi: "DI Yogyakarta",
		kodePos: "55213",
		isActive: true,
	},
	{
		nama: "Remote Worker - Full WFH",
		kode: "RM-WFH",
		alamat: null,
		kota: null,
		provinsi: null,
		kodePos: null,
		isActive: true,
	},
	{
		nama: "Remote Worker - Hybrid",
		kode: "RM-HYB",
		alamat: null,
		kota: null,
		provinsi: null,
		kodePos: null,
		isActive: true,
	},
];

// ============================================================
// POSISI (akan diisi setelah golongan dan lokasi dibuat)
// ============================================================
const posisiByDept: Record<string, { nama: string; kode: string; deskripsi: string; golonganKode: string }[]> = {
	"HR": [
		{ nama: "Head of HR", kode: "HR01", deskripsi: "Kepala departemen HR, bertanggung jawab atas seluruh strategi SDM", golonganKode: "06" },
		{ nama: "HR Manager", kode: "HR02", deskripsi: "Mengelola operasional HR sehari-hari", golonganKode: "05" },
		{ nama: "Recruitment Officer", kode: "HR03", deskripsi: "Menangani proses rekrutmen dan seleksi karyawan", golonganKode: "03" },
		{ nama: "Training & Development Officer", kode: "HR04", deskripsi: "Mengelola program pelatihan dan pengembangan SDM", golonganKode: "03" },
		{ nama: "Payroll Officer", kode: "HR05", deskripsi: "Menangani penggajian dan tunjangan karyawan", golonganKode: "03" },
		{ nama: "HR Staff", kode: "HR06", deskripsi: "Staff umum HR untuk administrasi kepegawaian", golonganKode: "02" },
	],
	"ACCT": [
		{ nama: "Head of Accounting", kode: "AC01", deskripsi: "Kepala departemen akuntansi", golonganKode: "05" },
		{ nama: "Senior Accountant", kode: "AC02", deskripsi: "Akuntan senior untuk pembukuan dan pelaporan", golonganKode: "03" },
		{ nama: "Accountant", kode: "AC03", deskripsi: "Akuntan untuk pencatatan transaksi harian", golonganKode: "02" },
		{ nama: "AP Staff", kode: "AC04", deskripsi: "Menangani pembayaran ke vendor dan hutang", golonganKode: "02" },
		{ nama: "AR Staff", kode: "AC05", deskripsi: "Menangani penagihan dan piutang", golonganKode: "02" },
		{ nama: "Junior Accountant", kode: "AC06", deskripsi: "Akuntan junior untuk dukungan operasional", golonganKode: "01" },
	],
	"FIN": [
		{ nama: "Finance Director", kode: "FN01", deskripsi: "Direktur keuangan, anggota dewan direksi", golonganKode: "08" },
		{ nama: "Finance Manager", kode: "FN02", deskripsi: "Mengelola operasional keuangan perusahaan", golonganKode: "05" },
		{ nama: "Treasury Officer", kode: "FN03", deskripsi: "Mengelola kas, investasi, dan pembiayaan", golonganKode: "03" },
	],
	"PROD": [
		{ nama: "Production Manager", kode: "PD01", deskripsi: "Mengelola seluruh operasional produksi", golonganKode: "05" },
		{ nama: "Production Supervisor", kode: "PD02", deskripsi: "Supervisor lantai produksi", golonganKode: "04" },
		{ nama: "Quality Control Staff", kode: "PD03", deskripsi: "QC untuk inspeksi kualitas produk", golonganKode: "02" },
		{ nama: "Operator Produksi", kode: "PD04", deskripsi: "Operator mesin produksi", golonganKode: "T" },
		{ nama: "Maintenance Technician", kode: "PD05", deskripsi: "Teknisi perawatan mesin dan fasilitas", golonganKode: "T" },
	],
	"MKT": [
		{ nama: "Marketing Manager", kode: "MK01", deskripsi: "Mengelola strategi pemasaran dan brand", golonganKode: "05" },
		{ nama: "Digital Marketing Specialist", kode: "MK02", deskripsi: "Spesialis pemasaran digital dan social media", golonganKode: "03" },
		{ nama: "Content Creator", kode: "MK03", deskripsi: "Membuat konten untuk marketing dan komunikasi", golonganKode: "02" },
		{ nama: "Brand Executive", kode: "MK04", deskripsi: "Mengelola manajemen brand dan positioning", golonganKode: "03" },
	],
	"SALES": [
		{ nama: "Sales Manager", kode: "SL01", deskripsi: "Mengelola tim sales dan pencapaian target", golonganKode: "05" },
		{ nama: "Key Account Manager", kode: "SL02", deskripsi: "Menangani klien-klien besar dan strategis", golonganKode: "04" },
		{ nama: "Sales Executive", kode: "SL03", deskripsi: "Sales lapangan untuk pengembangan bisnis", golonganKode: "02" },
		{ nama: "Sales Counter Staff", kode: "SL04", deskripsi: "Staff penjualan di outlet/counter", golonganKode: "01" },
	],
	"DEV": [
		{ nama: "Head of Software Development", kode: "IT01", deskripsi: "Kepala divisi pengembangan software", golonganKode: "06" },
		{ nama: "Frontend Developer", kode: "IT02", deskripsi: "Developer untuk antarmuka web dan mobile", golonganKode: "03" },
		{ nama: "Backend Developer", kode: "IT03", deskripsi: "Developer untuk server, API, dan database", golonganKode: "03" },
		{ nama: "Junior Developer", kode: "IT04", deskripsi: "Developer junior untuk dukungan proyek", golonganKode: "01" },
	],
	"INFRA": [
		{ nama: "IT Infrastructure Manager", kode: "INF01", deskripsi: "Mengelola infrastruktur IT dan jaringan", golonganKode: "05" },
		{ nama: "System Administrator", kode: "INF02", deskripsi: "Admin server, cloud, dan keamanan IT", golonganKode: "03" },
		{ nama: "Network Engineer", kode: "INF03", deskripsi: "Engineer jaringan dan koneksi", golonganKode: "03" },
	],
	"SUPP": [
		{ nama: "IT Support Lead", kode: "SUP01", deskripsi: "Lead tim IT support dan help desk", golonganKode: "04" },
		{ nama: "IT Help Desk", kode: "SUP02", deskripsi: "Staff help desk untuk support pengguna", golonganKode: "02" },
	],
	"ADM": [
		{ nama: "GA Manager", kode: "GA01", deskripsi: "Mengelola umum dan administrasi perusahaan", golonganKode: "05" },
		{ nama: "GA Staff", kode: "GA02", deskripsi: "Staff umum dan administrasi", golonganKode: "02" },
		{ nama: "Procurement Staff", kode: "GA03", deskripsi: "Staff pengadaan barang dan jasa", golonganKode: "02" },
	],
	"LOG": [
		{ nama: "Logistics Manager", kode: "LOG01", deskripsi: "Mengelola logistik dan rantai pasok", golonganKode: "05" },
		{ nama: "Warehouse Staff", kode: "LOG02", deskripsi: "Staff gudang untuk pergudangan", golonganKode: "02" },
		{ nama: "Warehouse Boy", kode: "LOG03", deskripsi: "Tenaga bantu gudang dan distribusi", golonganKode: "B" },
	],
	"LEGAL": [
		{ nama: "Legal Manager", kode: "LG01", deskripsi: "Mengelola urusan hukum dan compliance", golonganKode: "05" },
		{ nama: "Legal Staff", kode: "LG02", deskripsi: "Staff hukum untuk kontrak dan dokumen legal", golonganKode: "02" },
	],
	"RND": [
		{ nama: "R&D Manager", kode: "RD01", deskripsi: "Mengelola riset dan pengembangan produk", golonganKode: "05" },
		{ nama: "Product Development Staff", kode: "RD02", deskripsi: "Staff pengembangan produk baru", golonganKode: "03" },
	],
};

async function main() {
	console.log("🏢 Memulai seed Golongan, Posisi, dan Lokasi Kerja...\n");

	// ---- GOLOGAN POSISI ----
	console.log("📋 Golongan Posisi:");
	const golonganMap = new Map<string, string>();
	let golCreated = 0;
	let golSkipped = 0;

	for (const g of golongan) {
		const existing = await prisma.golonganPosisi.findFirst({ where: { kode: g.kode } });
		if (existing) {
			golonganMap.set(g.kode, existing.id);
			golSkipped++;
			continue;
		}
		const created = await prisma.golonganPosisi.create({ data: g });
		golonganMap.set(g.kode, created.id);
		golCreated++;
		console.log(`   ✅ ${g.nama} (${g.kode})`);
	}
	console.log(`   → ${golCreated} dibuat, ${golSkipped} dilewati\n`);

	// ---- LOKASI KERJA ----
	console.log("📍 Lokasi Kerja:");
	let lokCreated = 0;
	let lokSkipped = 0;

	for (const l of lokasi) {
		const existing = await prisma.lokasiKerja.findFirst({ where: { kode: l.kode } });
		if (existing) {
			lokSkipped++;
			continue;
		}
		await prisma.lokasiKerja.create({ data: l });
		lokCreated++;
		console.log(`   ✅ ${l.nama} (${l.kode})`);
	}
	console.log(`   → ${lokCreated} dibuat, ${lokSkipped} dilewati\n`);

	// ---- POSISI ----
	console.log("💼 Posisi:");
	let posCreated = 0;
	let posSkipped = 0;

	for (const [deptKode, posisiList] of Object.entries(posisiByDept)) {
		const dept = await prisma.unitOrganisasi.findFirst({ where: { kode: deptKode } });
		if (!dept) {
			console.log(`   ⚠️  Dept ${deptKode} tidak ditemukan, dilewati`);
			continue;
		}

		for (const p of posisiList) {
			const existing = await prisma.posisi.findFirst({ where: { kode: p.kode } });
			if (existing) {
				posSkipped++;
				continue;
			}

			const golId = golonganMap.get(p.golonganKode) ?? null;

			await prisma.posisi.create({
				data: {
					nama: p.nama,
					kode: p.kode,
					deskripsi: p.deskripsi,
					unitOrganisasiId: dept.id,
					golonganPosisiId: golId,
				},
			});
			posCreated++;
			console.log(`   ✅ ${p.nama} (${p.kode}) - ${deptKode}`);
		}
	}
	console.log(`   → ${posCreated} dibuat, ${posSkipped} dilewati\n`);

	// ---- SUMMARY ----
	const [totalGol, totalLok, totalPos] = await Promise.all([
		prisma.golonganPosisi.count(),
		prisma.lokasiKerja.count(),
		prisma.posisi.count(),
	]);

	console.log("	Selesai!");
	console.log(`   Golongan Posisi : ${totalGol}`);
	console.log(`   Lokasi Kerja   : ${totalLok}`);
	console.log(`   Posisi         : ${totalPos}`);
}

main()
	.then(() => prisma.$disconnect())
	.catch((e) => {
		console.error("❌ Error:", e);
		return prisma.$disconnect();
	});
