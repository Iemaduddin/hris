-- Sprint 4: shift bergilir/malam, roster, penugasan kalender, snapshot rekap harian.

-- CreateEnum
CREATE TYPE "StatusRekap" AS ENUM ('HADIR', 'TERLAMBAT', 'ALPA', 'CUTI', 'IZIN', 'SAKIT', 'DINAS', 'LIBUR');

-- CreateTable
CREATE TABLE "shift" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jamMasuk" TIME NOT NULL,
    "jamKeluar" TIME NOT NULL,
    "lintasHari" BOOLEAN NOT NULL DEFAULT false,
    "toleransiTelatMenit" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "shift_kode_key" ON "shift"("kode");

-- CreateTable
CREATE TABLE "roster_shift" (
    "id" SERIAL NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "shiftId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roster_shift_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "roster_shift_karyawanId_tanggal_key" ON "roster_shift"("karyawanId", "tanggal");
CREATE INDEX "roster_shift_tanggal_idx" ON "roster_shift"("tanggal");

-- CreateTable
CREATE TABLE "penugasan_kalender" (
    "id" SERIAL NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "kalenderKerjaId" INTEGER NOT NULL,
    "tanggalMulai" DATE NOT NULL,
    "tanggalSelesai" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "penugasan_kalender_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "penugasan_kalender_karyawanId_idx" ON "penugasan_kalender"("karyawanId");

-- CreateTable
CREATE TABLE "rekap_harian" (
    "id" SERIAL NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "sumberJadwal" TEXT NOT NULL,
    "acuanId" TEXT,
    "jamMasukSeharusnya" TIME,
    "jamKeluarSeharusnya" TIME,
    "masukAktual" TIMESTAMP(3),
    "keluarAktual" TIMESTAMP(3),
    "telatMenit" INTEGER NOT NULL DEFAULT 0,
    "pulangCepatMenit" INTEGER NOT NULL DEFAULT 0,
    "lemburMenit" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusRekap" NOT NULL,
    "dihitungPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rekap_harian_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rekap_harian_karyawanId_tanggal_key" ON "rekap_harian"("karyawanId", "tanggal");
CREATE INDEX "rekap_harian_tanggal_idx" ON "rekap_harian"("tanggal");

-- AddForeignKey
ALTER TABLE "roster_shift" ADD CONSTRAINT "roster_shift_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "roster_shift" ADD CONSTRAINT "roster_shift_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "penugasan_kalender" ADD CONSTRAINT "penugasan_kalender_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "penugasan_kalender" ADD CONSTRAINT "penugasan_kalender_kalenderKerjaId_fkey" FOREIGN KEY ("kalenderKerjaId") REFERENCES "kalender_kerja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rekap_harian" ADD CONSTRAINT "rekap_harian_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
