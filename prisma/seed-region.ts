import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

type WilayahRow = { kode: string; nama: string };

function parseWilayahSql(sql: string): WilayahRow[] {
	const rows: WilayahRow[] = [];
	const regex = /\('(\d+(?:\.\d+)*)','([^']+)'\)/g;
	let match;
	while ((match = regex.exec(sql)) !== null) {
		rows.push({ kode: match[1], nama: match[2] });
	}
	return rows;
}

function getLevel(kode: string): "provinsi" | "kota" | "kecamatan" | "desa" {
	const parts = kode.split(".");
	if (parts.length === 1) return "provinsi";
	if (parts.length === 2) return "kota";
	if (parts.length === 3) return "kecamatan";
	return "desa";
}

function getParentKode(kode: string): string {
	const parts = kode.split(".");
	parts.pop();
	return parts.join(".");
}

async function main() {
	console.log("🚀 Memulai import data wilayah...\n");

	// Baca file SQL (hardcoded path relatif)
	const fs = await import("fs");
	const path = await import("path");
	const sqlPath = path.resolve(__dirname, "../../db/wilayah.sql");

	if (!fs.existsSync(sqlPath)) {
		console.error("❌ File wilayah.sql tidak ditemukan di:", sqlPath);
		console.error("   Silakan download dari: https://github.com/cahyadsn/wilayah");
		console.error("   Letakkan di folder db/wilayah.sql");
		process.exit(1);
	}

	const sql = fs.readFileSync(sqlPath, "utf-8");
	const rows = parseWilayahSql(sql);
	console.log(`📄 Ditemukan ${rows.length} data wilayah dari SQL\n`);

	// Kelompokkan berdasarkan level
	const provinsiList = rows.filter((r) => getLevel(r.kode) === "provinsi");
	const kotaList = rows.filter((r) => getLevel(r.kode) === "kota");
	const kecamatanList = rows.filter((r) => getLevel(r.kode) === "kecamatan");
	const desaList = rows.filter((r) => getLevel(r.kode) === "desa");

	console.log(`   Provinsi  : ${provinsiList.length}`);
	console.log(`   Kota      : ${kotaList.length}`);
	console.log(`   Kecamatan : ${kecamatanList.length}`);
	console.log(`   Desa      : ${desaList.length}\n`);

	// Map kode → id untuk foreign key
	const provinsiMap = new Map<string, string>();
	const kotaMap = new Map<string, string>();
	const kecamatanMap = new Map<string, string>();

	// ============================================================
	// 1. PROVINSI
	// ============================================================
	console.log("📍 Import Provinsi...");
	for (const item of provinsiList) {
		const existing = await prisma.provinsi.findUnique({ where: { id: item.kode } });
		if (existing) {
			provinsiMap.set(item.kode, existing.id);
			continue;
		}
		const created = await prisma.provinsi.create({
			data: { id: item.kode, nama: item.nama },
		});
		provinsiMap.set(item.kode, created.id);
	}
	console.log(`   ✅ ${provinsiList.length} provinsi siap\n`);

	// ============================================================
	// 2. KOTA / KABUPATEN
	// ============================================================
	console.log("🏙️  Import Kota/Kabupaten...");
	for (const item of kotaList) {
		const parentKode = getParentKode(item.kode);
		const provinsiId = provinsiMap.get(parentKode);
		if (!provinsiId) {
			console.warn(`   ⚠️  Provinsi tidak ditemukan untuk ${item.kode} (${item.nama}), skip`);
			continue;
		}
		const existing = await prisma.kota.findUnique({ where: { id: item.kode } });
		if (existing) {
			kotaMap.set(item.kode, existing.id);
			continue;
		}
		const created = await prisma.kota.create({
			data: { id: item.kode, nama: item.nama, provinsiId },
		});
		kotaMap.set(item.kode, created.id);
	}
	console.log(`   ✅ ${kotaList.length} kota/kabupaten siap\n`);

	// ============================================================
	// 3. KECAMATAN
	// ============================================================
	console.log("🏘️  Import Kecamatan...");
	for (const item of kecamatanList) {
		const parentKode = getParentKode(item.kode);
		const kotaId = kotaMap.get(parentKode);
		if (!kotaId) {
			console.warn(`   ⚠️  Kota tidak ditemukan untuk ${item.kode} (${item.nama}), skip`);
			continue;
		}
		const existing = await prisma.kecamatan.findUnique({ where: { id: item.kode } });
		if (existing) {
			kecamatanMap.set(item.kode, existing.id);
			continue;
		}
		const created = await prisma.kecamatan.create({
			data: { id: item.kode, nama: item.nama, kotaId },
		});
		kecamatanMap.set(item.kode, created.id);
	}
	console.log(`   ✅ ${kecamatanList.length} kecamatan siap\n`);

	// ============================================================
	// 4. DESA / KELURAHAN
	// ============================================================
	console.log("🏡 Import Desa/Kelurahan...");
	let desaCount = 0;
	for (const item of desaList) {
		const parentKode = getParentKode(item.kode);
		const kecamatanId = kecamatanMap.get(parentKode);
		if (!kecamatanId) {
			continue;
		}
		const existing = await prisma.desa.findUnique({ where: { id: item.kode } });
		if (existing) continue;
		await prisma.desa.create({
			data: { id: item.kode, nama: item.nama, kecamatanId },
		});
		desaCount++;
	}
	console.log(`   ✅ ${desaCount} desa/kelurahan baru diimport\n`);

	console.log("🎉 Import data wilayah selesai!");
}

main()
	.catch((e) => {
		console.error("❌ Gagal import:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
