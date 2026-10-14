-- CreateTable
CREATE TABLE "thr_run" (
    "id" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "namaHariRaya" TEXT NOT NULL,
    "tanggalHariRaya" DATE NOT NULL,
    "tanggalBayar" DATE NOT NULL,
    "status" "StatusSalaryRun" NOT NULL DEFAULT 'DRAF',
    "catatan" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thr_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thr_detail" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "masaKerjaBulan" INTEGER NOT NULL DEFAULT 0,
    "upahSebulan" DECIMAL(15,2) NOT NULL,
    "bruto" DECIMAL(15,2) NOT NULL,
    "pph21" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bersih" DECIMAL(15,2) NOT NULL,
    "rincian" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thr_detail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "thr_run_tahun_idx" ON "thr_run"("tahun");

-- CreateIndex
CREATE UNIQUE INDEX "thr_run_tahun_namaHariRaya_key" ON "thr_run"("tahun", "namaHariRaya");

-- CreateIndex
CREATE UNIQUE INDEX "thr_detail_nomor_key" ON "thr_detail"("nomor");

-- CreateIndex
CREATE INDEX "thr_detail_karyawanId_idx" ON "thr_detail"("karyawanId");

-- CreateIndex
CREATE UNIQUE INDEX "thr_detail_runId_karyawanId_key" ON "thr_detail"("runId", "karyawanId");

-- AddForeignKey
ALTER TABLE "thr_detail" ADD CONSTRAINT "thr_detail_runId_fkey" FOREIGN KEY ("runId") REFERENCES "thr_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thr_detail" ADD CONSTRAINT "thr_detail_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
