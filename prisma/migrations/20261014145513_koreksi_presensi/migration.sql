-- CreateTable
CREATE TABLE "koreksi_presensi" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "tipe" "TipeAbsensi" NOT NULL,
    "waktuBaru" TIMESTAMP(3) NOT NULL,
    "absensiId" TEXT,
    "alasan" TEXT NOT NULL,
    "lampiranUrl" TEXT,
    "status" "StatusPengajuanKetidakhadiran" NOT NULL DEFAULT 'DRAFT',
    "diajukanPada" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "koreksi_presensi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "koreksi_presensi_karyawanId_tanggal_idx" ON "koreksi_presensi"("karyawanId", "tanggal");

-- CreateIndex
CREATE INDEX "koreksi_presensi_status_idx" ON "koreksi_presensi"("status");

-- AddForeignKey
ALTER TABLE "koreksi_presensi" ADD CONSTRAINT "koreksi_presensi_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
