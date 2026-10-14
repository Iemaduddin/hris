-- Unifikasi penugasan: PenugasanJadwal (tak ada pembaca) dilebur ke
-- PenugasanKalender via relasi jadwal_kerja -> kalender_kerja.
INSERT INTO "penugasan_kalender" ("karyawanId", "kalenderKerjaId", "tanggalMulai", "tanggalSelesai", "createdAt", "updatedAt")
SELECT DISTINCT pj."karyawanId", jk."kalenderKerjaId", pj."tanggalMulai", pj."tanggalSelesai", NOW(), NOW()
FROM "penugasan_jadwal" pj
JOIN "jadwal_kerja" jk ON jk."id" = pj."jadwalKerjaId"
WHERE NOT EXISTS (
    SELECT 1 FROM "penugasan_kalender" pk
    WHERE pk."karyawanId" = pj."karyawanId"
      AND pk."kalenderKerjaId" = jk."kalenderKerjaId"
      AND pk."tanggalMulai" = pj."tanggalMulai"
);

-- CreateEnum
CREATE TYPE "StatusTukarShift" AS ENUM ('DRAFT', 'DIAJUKAN', 'MENUNGGU_APPROVAL', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN');

-- CreateTable
CREATE TABLE "tukar_shift" (
    "id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "pemohonKaryawanId" TEXT NOT NULL,
    "pasanganKaryawanId" TEXT NOT NULL,
    "shiftPemohonId" TEXT,
    "shiftPasanganId" TEXT,
    "alasan" TEXT NOT NULL,
    "status" "StatusTukarShift" NOT NULL DEFAULT 'DRAFT',
    "diajukanPada" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tukar_shift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tukar_shift_pemohonKaryawanId_status_idx" ON "tukar_shift"("pemohonKaryawanId", "status");
CREATE INDEX "tukar_shift_pasanganKaryawanId_status_idx" ON "tukar_shift"("pasanganKaryawanId", "status");
CREATE INDEX "tukar_shift_tanggal_idx" ON "tukar_shift"("tanggal");

-- AddForeignKey
ALTER TABLE "tukar_shift" ADD CONSTRAINT "tukar_shift_pemohonKaryawanId_fkey" FOREIGN KEY ("pemohonKaryawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tukar_shift" ADD CONSTRAINT "tukar_shift_pasanganKaryawanId_fkey" FOREIGN KEY ("pasanganKaryawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable (tak dipakai lagi)
DROP TABLE "penugasan_jadwal";
