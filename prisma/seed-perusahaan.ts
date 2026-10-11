import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

/**
 * Profil perusahaan contoh untuk dokumentasi & demo.
 * Idempoten: hanya dibuat bila tabel masih kosong.
 */
async function main() {
	const ada = await prisma.perusahaan.findFirst({ select: { id: true, nama: true } });
	if (ada) {
		console.log(`perusahaan sudah ada: ${ada.nama}`);
		return;
	}
	const dibuat = await prisma.perusahaan.create({
		data: {
			nama: "PT Maju Bersama Sejahtera",
			npwp: "01.234.567.8-901.234",
			telepon: "(031) 555-0123",
			email: "info@majubersama.example.com",
			website: "https://majubersama.example.com",
			alamat: "Jl. Raya Industri No. 88, Gresik, Jawa Timur",
			kodePos: "61121",
		},
		select: { id: true, nama: true },
	});
	console.log(`perusahaan dibuat: ${dibuat.nama}`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
