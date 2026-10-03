import "dotenv/config";
import prisma from "../src/lib/prisma";
async function main() {
  console.log("posisi:", JSON.stringify(await prisma.posisi.findMany({ take: 10, select: { id: true, nama: true } })));
  console.log("unit:", JSON.stringify(await prisma.unitOrganisasi.findMany({ take: 10, select: { id: true, nama: true } })));
}
main().finally(() => prisma.$disconnect());
