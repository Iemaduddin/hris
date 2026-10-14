-- CreateEnum
CREATE TYPE "JenisMutasi" AS ENUM ('MUTASI', 'PROMOSI', 'DEMOSI');

-- CreateEnum
CREATE TYPE "StatusMutasi" AS ENUM ('DRAFT', 'DIAJUKAN', 'MENUNGGU_APPROVAL', 'DISETUJUI', 'DITOLAK', 'DITERAPKAN', 'DIBATALKAN');

-- CreateTable
CREATE TABLE "mutasi" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "jenis" "JenisMutasi" NOT NULL,
    "dariUnitId" TEXT,
    "dariPosisiId" TEXT,
    "dariLokasiId" TEXT,
    "dariUnitNama" TEXT,
    "dariPosisiNama" TEXT,
    "dariLokasiNama" TEXT,
    "keUnitId" TEXT,
    "kePosisiId" TEXT,
    "keLokasiId" TEXT,
    "keAtasanId" TEXT,
    "tanggalEfektif" DATE NOT NULL,
    "alasan" TEXT NOT NULL,
    "status" "StatusMutasi" NOT NULL DEFAULT 'DRAFT',
    "diajukanPada" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedNote" TEXT,
    "diterapkanPada" TIMESTAMP(3),
    "diterapkanOlehId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mutasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mutasi_nomor_key" ON "mutasi"("nomor");

-- CreateIndex
CREATE INDEX "mutasi_karyawanId_status_idx" ON "mutasi"("karyawanId", "status");

-- AddForeignKey
ALTER TABLE "mutasi" ADD CONSTRAINT "mutasi_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi" ADD CONSTRAINT "mutasi_keUnitId_fkey" FOREIGN KEY ("keUnitId") REFERENCES "unit_organisasi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi" ADD CONSTRAINT "mutasi_kePosisiId_fkey" FOREIGN KEY ("kePosisiId") REFERENCES "posisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi" ADD CONSTRAINT "mutasi_keLokasiId_fkey" FOREIGN KEY ("keLokasiId") REFERENCES "lokasi_kerja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi" ADD CONSTRAINT "mutasi_keAtasanId_fkey" FOREIGN KEY ("keAtasanId") REFERENCES "karyawan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
