-- CreateEnum
CREATE TYPE "StatusProbation" AS ENUM ('DRAFT', 'DIAJUKAN', 'MENUNGGU_APPROVAL', 'DISETUJUI', 'DITOLAK', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "HasilProbation" AS ENUM ('LULUS', 'PERPANJANG', 'TIDAK_LULUS');

-- CreateTable
CREATE TABLE "probation_review" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3) NOT NULL,
    "status" "StatusProbation" NOT NULL DEFAULT 'DRAFT',
    "hasil" "HasilProbation",
    "nilai" INTEGER,
    "catatan" TEXT,
    "tanggalSelesaiBaru" TIMESTAMP(3),
    "diajukanPada" TIMESTAMP(3),
    "diputuskanOlehId" TEXT,
    "diputuskanPada" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "probation_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "probation_review_karyawanId_status_idx" ON "probation_review"("karyawanId", "status");

-- AddForeignKey
ALTER TABLE "probation_review" ADD CONSTRAINT "probation_review_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
