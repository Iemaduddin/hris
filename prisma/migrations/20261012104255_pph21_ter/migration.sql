-- CreateEnum
CREATE TYPE "StatusPtkp" AS ENUM ('TK_0', 'TK_1', 'TK_2', 'TK_3', 'K_0', 'K_1', 'K_2', 'K_3');

-- AlterTable
ALTER TABLE "karyawan" ADD COLUMN     "statusPtkp" "StatusPtkp" NOT NULL DEFAULT 'TK_0';

-- CreateTable
CREATE TABLE "pph21_ter_tarif" (
    "id" SERIAL NOT NULL,
    "kategori" TEXT NOT NULL,
    "batasAtas" DECIMAL(15,2),
    "tarif" DECIMAL(6,4) NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pph21_ter_tarif_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pph21_ter_tarif_kategori_urutan_idx" ON "pph21_ter_tarif"("kategori", "urutan");

-- CreateIndex
CREATE UNIQUE INDEX "pph21_ter_tarif_kategori_urutan_key" ON "pph21_ter_tarif"("kategori", "urutan");
