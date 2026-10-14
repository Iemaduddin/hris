import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { TER_FALLBACK, type KategoriTer } from "../src/modules/payroll/lib/pph21-ter";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

/**
 * Seed tarif TER bulanan (PP 58/2023) ke `pph21_ter_tarif`.
 * Idempoten: upsert per [kategori, urutan]. Sumber angka tunggal di
 * `src/modules/payroll/lib/pph21-ter.ts`.
 */
async function main() {
  let total = 0;
  for (const kategori of Object.keys(TER_FALLBACK) as KategoriTer[]) {
    const lapis = TER_FALLBACK[kategori];
    lapis.forEach((l, i) => {
      void l;
      void i;
    });
    for (let i = 0; i < lapis.length; i++) {
      const l = lapis[i];
      await prisma.pph21TerTarif.upsert({
        where: { kategori_urutan: { kategori, urutan: i + 1 } },
        create: { kategori, batasAtas: l.batasAtas, tarif: l.tarif, urutan: i + 1 },
        update: { batasAtas: l.batasAtas, tarif: l.tarif },
      });
      total++;
    }
    console.log(`kategori ${kategori}: ${lapis.length} lapis OK`);
  }
  console.log(`total tarif: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
