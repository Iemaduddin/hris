import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const units = [
	{ nama: "Direktur Utama", kode: "DIR", parentKode: null },
	{ nama: "Direktur Operasional", kode: "DOP", parentKode: "DIR" },
	{ nama: "Direktur Keuangan & Administrasi", kode: "DKA", parentKode: "DIR" },
	{ nama: "Direktur Teknik", kode: "DTK", parentKode: "DIR" },
	{ nama: "Corporate Secretary", kode: "CS", parentKode: "DIR" },
	{ nama: "Divisi Operasional", kode: "OPS", parentKode: "DOP" },
	{ nama: "Divisi Marketing & Sales", kode: "MKS", parentKode: "DOP" },
	{ nama: "Divisi Keuangan", kode: "FIN", parentKode: "DKA" },
	{ nama: "Divisi Umum & Administrasi", kode: "UMUM", parentKode: "DKA" },
	{ nama: "Divisi Engineering", kode: "ENG", parentKode: "DTK" },
	{ nama: "Divisi Teknologi Informasi", kode: "TI", parentKode: "DTK" },
	{ nama: "Dept. Produksi", kode: "PROD", parentKode: "OPS" },
	{ nama: "Dept. Logistik", kode: "LOG", parentKode: "OPS" },
	{ nama: "Dept. Marketing", kode: "MKT", parentKode: "MKS" },
	{ nama: "Dept. Sales", kode: "SALES", parentKode: "MKS" },
	{ nama: "Dept. Akuntansi", kode: "ACCT", parentKode: "FIN" },
	{ nama: "Dept. Treasury", kode: "TRSY", parentKode: "FIN" },
	{ nama: "Dept. Human Resources", kode: "HR", parentKode: "UMUM" },
	{ nama: "Dept. Administration", kode: "ADM", parentKode: "UMUM" },
	{ nama: "Dept. R&D", kode: "RND", parentKode: "ENG" },
	{ nama: "Dept. Quality Assurance", kode: "QA", parentKode: "ENG" },
	{ nama: "Dept. IT Infrastructure", kode: "INFRA", parentKode: "TI" },
	{ nama: "Dept. Software Development", kode: "DEV", parentKode: "TI" },
	{ nama: "Dept. IT Support", kode: "SUPP", parentKode: "TI" },
	{ nama: "Dept. Legal & Compliance", kode: "LEGAL", parentKode: "CS" },
	{ nama: "Dept. Corporate Communication", kode: "CORCOM", parentKode: "CS" },
	{ nama: "Quality Control", kode: "QC", parentKode: "PROD" },
	{ nama: "Maintenance", kode: "MAINT", parentKode: "PROD" },
	{ nama: "Warehouse", kode: "WH", parentKode: "LOG" },
	{ nama: "Distribusi", kode: "DIST", parentKode: "LOG" },
	{ nama: "Digital Marketing", kode: "DMKT", parentKode: "MKT" },
	{ nama: "Brand Management", kode: "BM", parentKode: "MKT" },
	{ nama: "Sales Counter", kode: "SC", parentKode: "SALES" },
	{ nama: "Key Account", kode: "KA", parentKode: "SALES" },
	{ nama: "General Ledger", kode: "GL", parentKode: "ACCT" },
	{ nama: "Accounts Payable", kode: "AP", parentKode: "ACCT" },
	{ nama: "Accounts Receivable", kode: "AR", parentKode: "ACCT" },
	{ nama: "Cash Management", kode: "CM", parentKode: "TRSY" },
	{ nama: "Recruitment & Selection", kode: "REC", parentKode: "HR" },
	{ nama: "Training & Development", kode: "TND", parentKode: "HR" },
	{ nama: "Compensation & Benefits", kode: "CNB", parentKode: "HR" },
	{ nama: "Industrial Relations", kode: "IR", parentKode: "HR" },
	{ nama: "General Affairs", kode: "GA", parentKode: "ADM" },
	{ nama: "Procurement", kode: "PROC", parentKode: "ADM" },
	{ nama: "Product Development", kode: "PRDEV", parentKode: "RND" },
	{ nama: "Quality Control Engineering", kode: "QCE", parentKode: "QA" },
	{ nama: "Network & Server", kode: "NS", parentKode: "INFRA" },
	{ nama: "Frontend Development", kode: "FE", parentKode: "DEV" },
	{ nama: "Backend Development", kode: "BE", parentKode: "DEV" },
	{ nama: "Help Desk", kode: "HD", parentKode: "SUPP" },
	{ nama: "Legal", kode: "LEGAL", parentKode: "LEGAL" },
	{ nama: "Public Relations", kode: "PR", parentKode: "CORCOM" },
];

async function main() {
	console.log("🏢 Memulai seed data Struktur Organisasi...\n");

	const createdMap = new Map<string, string>();
	let created = 0;
	let skipped = 0;

	for (const unit of units) {
		const existing = await prisma.unitOrganisasi.findFirst({ where: { kode: unit.kode } });
		if (existing) {
			createdMap.set(unit.kode, existing.id);
			skipped++;
			continue;
		}

		const parentId = unit.parentKode ? createdMap.get(unit.parentKode) ?? null : null;

		const result = await prisma.unitOrganisasi.create({
			data: {
				nama: unit.nama,
				kode: unit.kode,
				parentId,
			},
		});

		createdMap.set(unit.kode, result.id);
		created++;
	}

	const total = await prisma.unitOrganisasi.count();
	console.log(`   Dibuat: ${created} unit baru`);
	console.log(`   Lewat: ${skipped} unit sudah ada`);
	console.log(`\nSelesai! Total unit organisasi: ${total}`);
}

main()
	.then(() => prisma.$disconnect())
	.catch((e) => {
		console.error("❌ Error:", e);
		return prisma.$disconnect();
	});
