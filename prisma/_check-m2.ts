import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });

const KARYAWAN_ID = "cmuugt0s60000qcuo43xi14xg";

async function main() {
	console.log("JenisKetidakhadiran  :", await prisma.jenisKetidakhadiran.count());
	console.log("  sample             :", JSON.stringify(await prisma.jenisKetidakhadiran.findMany({ take: 3 })));
	console.log("PengajuanKetidakhadiran:", await prisma.pengajuanKetidakhadiran.count());
	console.log("SaldoCuti            :", await prisma.saldoCuti.count());
	console.log("  milik uji          :", JSON.stringify(await prisma.saldoCuti.findMany({ where: { karyawanId: KARYAWAN_ID } })));
	console.log("Lembur               :", await prisma.lembur.count());
	console.log("DinasWFH             :", await prisma.dinasWFH.count());
	console.log("ApprovalStep         :", await prisma.approvalStep.count());
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
