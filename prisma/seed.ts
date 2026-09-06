import "dotenv/config";
import { PrismaClient, type UserRole } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const connectionString = process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const auth = betterAuth({
	database: prismaAdapter(prisma, { provider: "postgresql" }),
	emailAndPassword: { enabled: true, autoSignIn: false },
});

const USERS: Array<{ name: string; email: string; password: string; role: UserRole }> = [
	{ name: "Super Admin", email: "superadmin@example.com", password: "SuperAdmin123!", role: "SUPER_ADMIN" },
	{ name: "Admin HR", email: "admin@example.com", password: "Admin123!", role: "ADMIN_HR" },
	{ name: "Finance", email: "finance@example.com", password: "Finance123!", role: "FINANCE" },
	{ name: "Manager", email: "manager@example.com", password: "Manager123!", role: "MANAJER" },
	{ name: "Employee", email: "employee@example.com", password: "Employee123!", role: "EMPLOYEE" },
];

async function main() {
	console.log("Seeding users...");

	for (const user of USERS) {
		const existing = await prisma.user.findUnique({
			where: { email: user.email },
		});

		if (existing) {
			console.log(`  Skip: ${user.email} (already exists)`);
			continue;
		}

		await auth.api.signUpEmail({
			body: {
				name: user.name,
				email: user.email,
				password: user.password,
			},
		});

		await prisma.user.update({
			where: { email: user.email },
			data: { role: user.role },
		});

		console.log(`  Created: ${user.email} (${user.role})`);
	}

	console.log("Done!");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
