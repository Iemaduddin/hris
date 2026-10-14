-- AlterTable
ALTER TABLE "karyawan" ADD COLUMN "bankNama" TEXT,
ADD COLUMN "bankNorek" TEXT,
ADD COLUMN "bankAtasNama" TEXT;

-- AlterTable
ALTER TABLE "payslip" ADD COLUMN "kodeVerifikasi" TEXT;

-- AlterTable
ALTER TABLE "thr_detail" ADD COLUMN "kodeVerifikasi" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payslip_kodeVerifikasi_key" ON "payslip"("kodeVerifikasi");

-- CreateIndex
CREATE UNIQUE INDEX "thr_detail_kodeVerifikasi_key" ON "thr_detail"("kodeVerifikasi");
