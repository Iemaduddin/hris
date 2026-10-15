-- CreateEnum
CREATE TYPE "KategoriUpdateData" AS ENUM ('ALAMAT', 'KONTAK', 'KELUARGA', 'PENDIDIKAN', 'DOKUMEN');

-- CreateTable
CREATE TABLE "update_data_request" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "kategori" "KategoriUpdateData" NOT NULL,
    "targetId" TEXT,
    "dataLama" JSONB,
    "dataBaru" JSONB NOT NULL,
    "alasan" TEXT NOT NULL,
    "lampiranUrl" TEXT,
    "status" "StatusPengajuanKetidakhadiran" NOT NULL DEFAULT 'DRAFT',
    "diajukanPada" TIMESTAMP(3),
    "diputuskanOlehId" TEXT,
    "diputuskanPada" TIMESTAMP(3),
    "catatanPutusan" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "update_data_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "update_data_request_nomor_key" ON "update_data_request"("nomor");

-- CreateIndex
CREATE INDEX "update_data_request_karyawanId_status_idx" ON "update_data_request"("karyawanId", "status");

-- CreateIndex
CREATE INDEX "update_data_request_status_idx" ON "update_data_request"("status");

-- AddForeignKey
ALTER TABLE "update_data_request" ADD CONSTRAINT "update_data_request_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
