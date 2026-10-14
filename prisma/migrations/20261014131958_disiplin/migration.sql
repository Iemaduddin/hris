-- CreateEnum
CREATE TYPE "TingkatSP" AS ENUM ('SP1', 'SP2', 'SP3', 'SKORSING', 'PHK');

-- CreateEnum
CREATE TYPE "StatusSP" AS ENUM ('DRAFT', 'DITERBITKAN', 'DICABUT');

-- CreateTable
CREATE TABLE "surat_peringatan" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "tingkat" "TingkatSP" NOT NULL,
    "judul" TEXT NOT NULL,
    "pelanggaran" TEXT NOT NULL,
    "pelanggaranBerat" BOOLEAN NOT NULL DEFAULT false,
    "tanggalTerbit" DATE NOT NULL,
    "berlakuSampai" DATE,
    "tanggalSkorsingMulai" DATE,
    "tanggalSkorsingSelesai" DATE,
    "status" "StatusSP" NOT NULL DEFAULT 'DRAFT',
    "dokumenUrl" TEXT,
    "ttdKaryawanPada" TIMESTAMP(3),
    "ttdKaryawanNama" TEXT,
    "catatan" TEXT,
    "diterbitkanOlehId" TEXT,
    "diterbitkanPada" TIMESTAMP(3),
    "dicabutOlehId" TEXT,
    "dicabutPada" TIMESTAMP(3),
    "alasanCabut" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surat_peringatan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "surat_peringatan_nomor_key" ON "surat_peringatan"("nomor");

-- CreateIndex
CREATE INDEX "surat_peringatan_karyawanId_status_idx" ON "surat_peringatan"("karyawanId", "status");

-- AddForeignKey
ALTER TABLE "surat_peringatan" ADD CONSTRAINT "surat_peringatan_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
