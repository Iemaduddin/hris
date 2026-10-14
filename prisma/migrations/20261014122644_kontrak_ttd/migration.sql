-- CreateEnum
CREATE TYPE "PihakTandaTangan" AS ENUM ('HRD', 'KARYAWAN');

-- CreateTable
CREATE TABLE "kontrak_tanda_tangan" (
    "id" TEXT NOT NULL,
    "kontrakId" TEXT NOT NULL,
    "pihak" "PihakTandaTangan" NOT NULL,
    "namaPenanda" TEXT,
    "fileUrl" TEXT NOT NULL,
    "ditandatanganiPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kontrak_tanda_tangan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kontrak_tanda_tangan_kontrakId_pihak_key" ON "kontrak_tanda_tangan"("kontrakId", "pihak");

-- AddForeignKey
ALTER TABLE "kontrak_tanda_tangan" ADD CONSTRAINT "kontrak_tanda_tangan_kontrakId_fkey" FOREIGN KEY ("kontrakId") REFERENCES "kontrak_kerja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
