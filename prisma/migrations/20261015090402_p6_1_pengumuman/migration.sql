-- CreateEnum
CREATE TYPE "StatusPengumuman" AS ENUM ('DRAFT', 'TERBIT', 'DIARSIPKAN');

-- CreateTable
CREATE TABLE "pengumuman" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "unitOrganisasiId" TEXT,
    "status" "StatusPengumuman" NOT NULL DEFAULT 'DRAFT',
    "tayangMulai" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tayangSelesai" TIMESTAMP(3),
    "diterbitkanOlehId" TEXT,
    "diterbitkanPada" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengumuman_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pengumuman_status_idx" ON "pengumuman"("status");

-- AddForeignKey
ALTER TABLE "pengumuman" ADD CONSTRAINT "pengumuman_unitOrganisasiId_fkey" FOREIGN KEY ("unitOrganisasiId") REFERENCES "unit_organisasi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
