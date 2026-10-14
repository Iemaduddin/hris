-- Sprint 6: payroll MVP (komponen, gaji karyawan, salary run, payslip).

-- CreateEnum
CREATE TYPE "KelompokKomponen" AS ENUM ('PENDAPATAN', 'TUNJANGAN', 'POTONGAN', 'IURAN');

-- CreateEnum
CREATE TYPE "TipeKomponen" AS ENUM ('NOMINAL', 'PERSEN', 'PER_HARI', 'PER_JAM_LEMBUR', 'PER_SHIFT_MALAM');

-- CreateEnum
CREATE TYPE "StatusSalaryRun" AS ENUM ('DRAF', 'DIHITUNG', 'FINAL', 'DITERBITKAN');

-- CreateTable
CREATE TABLE "komponen_gaji" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kelompok" "KelompokKomponen" NOT NULL,
    "tipe" "TipeKomponen" NOT NULL,
    "nilai" DECIMAL(15,2) NOT NULL,
    "batasAtas" DECIMAL(15,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "komponen_gaji_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "komponen_gaji_kode_key" ON "komponen_gaji"("kode");

-- CreateTable
CREATE TABLE "gaji_karyawan" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "komponenId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "gaji_karyawan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gaji_karyawan_karyawanId_komponenId_key" ON "gaji_karyawan"("karyawanId", "komponenId");

-- CreateTable
CREATE TABLE "salary_run" (
    "id" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "tanggalMulai" DATE NOT NULL,
    "tanggalSelesai" DATE NOT NULL,
    "status" "StatusSalaryRun" NOT NULL DEFAULT 'DRAF',
    "catatan" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "salary_run_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "salary_run_periode_key" ON "salary_run"("periode");

-- CreateTable
CREATE TABLE "salary_run_detail" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "gajiPokok" DECIMAL(15,2) NOT NULL,
    "totalPendapatan" DECIMAL(15,2) NOT NULL,
    "totalPotongan" DECIMAL(15,2) NOT NULL,
    "gajiBersih" DECIMAL(15,2) NOT NULL,
    "hariHadir" INTEGER NOT NULL DEFAULT 0,
    "hariAlpa" INTEGER NOT NULL DEFAULT 0,
    "jamLembur" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "rincian" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "salary_run_detail_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "salary_run_detail_runId_karyawanId_key" ON "salary_run_detail"("runId", "karyawanId");

-- CreateTable
CREATE TABLE "payslip" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payslip_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payslip_nomor_key" ON "payslip"("nomor");
CREATE UNIQUE INDEX "payslip_runId_karyawanId_key" ON "payslip"("runId", "karyawanId");

-- AddForeignKey
ALTER TABLE "gaji_karyawan" ADD CONSTRAINT "gaji_karyawan_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gaji_karyawan" ADD CONSTRAINT "gaji_karyawan_komponenId_fkey" FOREIGN KEY ("komponenId") REFERENCES "komponen_gaji"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "salary_run_detail" ADD CONSTRAINT "salary_run_detail_runId_fkey" FOREIGN KEY ("runId") REFERENCES "salary_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "salary_run_detail" ADD CONSTRAINT "salary_run_detail_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payslip" ADD CONSTRAINT "payslip_runId_fkey" FOREIGN KEY ("runId") REFERENCES "salary_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payslip" ADD CONSTRAINT "payslip_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
