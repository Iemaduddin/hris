-- CreateEnum
CREATE TYPE "KategoriClearance" AS ENUM ('DOKUMEN', 'AKUN', 'ASET', 'KEUANGAN', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusOffboarding" AS ENUM ('DIAJUKAN', 'MENUNGGU_APPROVAL', 'DISETUJUI', 'DITOLAK', 'CLEARANCE', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusClearance" AS ENUM ('BELUM', 'SELESAI');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "offboarding" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "alasan" TEXT NOT NULL,
    "tanggalRencana" DATE NOT NULL,
    "tanggalEfektif" DATE,
    "status" "StatusOffboarding" NOT NULL DEFAULT 'DIAJUKAN',
    "diajukanPada" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedNote" TEXT,
    "nomorPaklaring" TEXT,
    "selesaiPada" TIMESTAMP(3),
    "selesaiOlehId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offboarding_clearance" (
    "id" TEXT NOT NULL,
    "offboardingId" TEXT NOT NULL,
    "kategori" "KategoriClearance" NOT NULL DEFAULT 'LAINNYA',
    "judul" TEXT NOT NULL,
    "picRole" TEXT NOT NULL DEFAULT 'HR',
    "wajib" BOOLEAN NOT NULL DEFAULT true,
    "status" "StatusClearance" NOT NULL DEFAULT 'BELUM',
    "catatan" TEXT,
    "diselesaikanOlehId" TEXT,
    "diselesaikanPada" TIMESTAMP(3),

    CONSTRAINT "offboarding_clearance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offboarding_nomorPaklaring_key" ON "offboarding"("nomorPaklaring");

-- CreateIndex
CREATE INDEX "offboarding_karyawanId_status_idx" ON "offboarding"("karyawanId", "status");

-- CreateIndex
CREATE INDEX "offboarding_clearance_offboardingId_idx" ON "offboarding_clearance"("offboardingId");

-- AddForeignKey
ALTER TABLE "offboarding" ADD CONSTRAINT "offboarding_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offboarding_clearance" ADD CONSTRAINT "offboarding_clearance_offboardingId_fkey" FOREIGN KEY ("offboardingId") REFERENCES "offboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
