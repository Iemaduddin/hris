-- AlterEnum
ALTER TYPE "KelompokKomponen" ADD VALUE 'BIAYA_PERUSAHAAN';

-- AlterTable
ALTER TABLE "salary_run_detail" ADD COLUMN     "totalBiayaPerusahaan" DECIMAL(15,2) NOT NULL DEFAULT 0;
