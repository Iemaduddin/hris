-- CreateEnum
CREATE TYPE "KategoriReimburse" AS ENUM ('TRANSPORT', 'KONSUMSI', 'PARKIR', 'TOL', 'PENGINAPAN', 'KESEHATAN', 'DINAS', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusReimburse" AS ENUM ('DRAFT', 'DIAJUKAN', 'MENUNGGU_APPROVAL', 'DISETUJUI', 'DITOLAK', 'DIBAYAR', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusUangDinas" AS ENUM ('DRAFT', 'DIAJUKAN', 'MENUNGGU_APPROVAL', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN', 'LPJ_DIAJUKAN', 'SELESAI');

-- CreateTable
CREATE TABLE "expense_claim" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "kategori" "KategoriReimburse" NOT NULL,
    "tanggalKwitansi" DATE,
    "nominal" DECIMAL(15,2) NOT NULL,
    "keterangan" TEXT NOT NULL,
    "lampiranUrl" TEXT,
    "status" "StatusReimburse" NOT NULL DEFAULT 'DRAFT',
    "diajukanPada" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "dibayarPada" TIMESTAMP(3),
    "dibayarVia" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_pembayaran" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "runId" TEXT,
    "metode" TEXT NOT NULL,
    "jumlah" DECIMAL(15,2) NOT NULL,
    "bukti" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uang_dinas" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "dinasId" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "nominalMuka" DECIMAL(15,2) NOT NULL,
    "keperluan" TEXT,
    "status" "StatusUangDinas" NOT NULL DEFAULT 'DRAFT',
    "diajukanPada" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "tanggalSerah" DATE,
    "totalRealisasi" DECIMAL(15,2),
    "lampiranLpjUrl" TEXT,
    "tanggalLpj" TIMESTAMP(3),
    "dikembalikan" DECIMAL(15,2),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uang_dinas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_claim_nomor_key" ON "expense_claim"("nomor");

-- CreateIndex
CREATE INDEX "expense_claim_karyawanId_status_idx" ON "expense_claim"("karyawanId", "status");

-- CreateIndex
CREATE INDEX "expense_pembayaran_claimId_idx" ON "expense_pembayaran"("claimId");

-- CreateIndex
CREATE INDEX "expense_pembayaran_runId_idx" ON "expense_pembayaran"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "uang_dinas_nomor_key" ON "uang_dinas"("nomor");

-- CreateIndex
CREATE UNIQUE INDEX "uang_dinas_dinasId_key" ON "uang_dinas"("dinasId");

-- CreateIndex
CREATE INDEX "uang_dinas_karyawanId_status_idx" ON "uang_dinas"("karyawanId", "status");

-- AddForeignKey
ALTER TABLE "expense_claim" ADD CONSTRAINT "expense_claim_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_pembayaran" ADD CONSTRAINT "expense_pembayaran_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "expense_claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_pembayaran" ADD CONSTRAINT "expense_pembayaran_runId_fkey" FOREIGN KEY ("runId") REFERENCES "salary_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uang_dinas" ADD CONSTRAINT "uang_dinas_dinasId_fkey" FOREIGN KEY ("dinasId") REFERENCES "dinas_wfh"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uang_dinas" ADD CONSTRAINT "uang_dinas_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
