-- CreateEnum
CREATE TYPE "StatusKasbon" AS ENUM ('DRAFT', 'DIAJUKAN', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN', 'LUNAS');

-- CreateTable
CREATE TABLE "kasbon" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "nominal" DECIMAL(15,2) NOT NULL,
    "tenorBulan" INTEGER NOT NULL,
    "angsuranPerBulan" DECIMAL(15,2) NOT NULL,
    "sisaHutang" DECIMAL(15,2) NOT NULL,
    "mulaiPotong" DATE NOT NULL,
    "alasan" TEXT NOT NULL,
    "status" "StatusKasbon" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "catatan" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kasbon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kasbon_angsuran" (
    "id" TEXT NOT NULL,
    "kasbonId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "jumlah" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kasbon_angsuran_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kasbon_nomor_key" ON "kasbon"("nomor");

-- CreateIndex
CREATE INDEX "kasbon_karyawanId_status_idx" ON "kasbon"("karyawanId", "status");

-- CreateIndex
CREATE INDEX "kasbon_angsuran_runId_idx" ON "kasbon_angsuran"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "kasbon_angsuran_kasbonId_runId_key" ON "kasbon_angsuran"("kasbonId", "runId");

-- AddForeignKey
ALTER TABLE "kasbon" ADD CONSTRAINT "kasbon_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kasbon_angsuran" ADD CONSTRAINT "kasbon_angsuran_kasbonId_fkey" FOREIGN KEY ("kasbonId") REFERENCES "kasbon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kasbon_angsuran" ADD CONSTRAINT "kasbon_angsuran_runId_fkey" FOREIGN KEY ("runId") REFERENCES "salary_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
