-- Sprint 5: dinas/WFH + jejak approval generik.

-- CreateEnum
CREATE TYPE "JenisDinas" AS ENUM ('DINAS_LUAR', 'WFH');

-- CreateEnum
CREATE TYPE "StatusApproval" AS ENUM ('MENUNGGU', 'DISETUJUI', 'DITOLAK');

-- CreateTable
CREATE TABLE "dinas_wfh" (
    "id" TEXT NOT NULL,
    "nomorPengajuan" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "jenis" "JenisDinas" NOT NULL,
    "tanggalMulai" DATE NOT NULL,
    "tanggalSelesai" DATE NOT NULL,
    "lokasi" TEXT,
    "keperluan" TEXT,
    "urlLampiran" TEXT,
    "status" "StatusPengajuanKetidakhadiran" NOT NULL DEFAULT 'DRAFT',
    "diajukanPada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dinas_wfh_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dinas_wfh_nomorPengajuan_key" ON "dinas_wfh"("nomorPengajuan");
CREATE INDEX "dinas_wfh_karyawanId_tanggalMulai_idx" ON "dinas_wfh"("karyawanId", "tanggalMulai");
CREATE INDEX "dinas_wfh_status_idx" ON "dinas_wfh"("status");

-- CreateTable
CREATE TABLE "approval_step" (
    "id" TEXT NOT NULL,
    "referensiType" TEXT NOT NULL,
    "referensiId" TEXT NOT NULL,
    "tahap" INTEGER NOT NULL DEFAULT 1,
    "approverKaryawanId" TEXT,
    "approverRole" TEXT,
    "status" "StatusApproval" NOT NULL DEFAULT 'MENUNGGU',
    "catatan" TEXT,
    "diprosesOlehId" TEXT,
    "diprosesPada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_step_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "approval_step_referensiType_referensiId_idx" ON "approval_step"("referensiType", "referensiId");

-- AddForeignKey
ALTER TABLE "dinas_wfh" ADD CONSTRAINT "dinas_wfh_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
