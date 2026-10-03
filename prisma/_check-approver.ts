import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });

const KARYAWAN_ID = "cmuugt0s60000qcuo43xi14xg";

async function main() {
	const k = await prisma.karyawan.findUnique({
		where: { id: KARYAWAN_ID },
		select: { namaLengkap: true, atasanLangsungId: true, userId: true },
	});
	console.log("pemohon :", JSON.stringify(k));

	if (k?.atasanLangsungId) {
		const atasan = await prisma.karyawan.findUnique({
			where: { id: k.atasanLangsungId },
			select: { id: true, namaLengkap: true, userId: true, user: { select: { email: true, role: true } } },
		});
		console.log("atasan  :", JSON.stringify(atasan));
	} else {
		console.log("atasan  : (tidak ada — tahap 1 langsung HR)");
	}

	const steps = await prisma.approvalStep.findMany({ orderBy: { createdAt: "desc" }, take: 6 });
	console.log("steps   :", JSON.stringify(steps, null, 1));

	const users = await prisma.user.findMany({
		where: { role: { in: ["SUPER_ADMIN", "ADMIN_HR", "MANAJER"] } },
		select: { email: true, role: true, karyawan: { select: { id: true, namaLengkap: true } } },
	});
	console.log("approver:", JSON.stringify(users, null, 1));
}

main().finally(() => prisma.$disconnect());
