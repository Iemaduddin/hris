-- Baseline migrasi untuk perubahan working-tree yang sebelumnya diterapkan via db push
-- (tabel absensi, lembur, cuti, kalender, dsb). Basis data sudah cocok sehingga
-- migrasi ini ditandai applied tanpa dieksekusi ulang. Lihat: migrate resolve.
-- Catatan: pembuatan enum UserRole + konversi kolom users.role ada di migrasi berikutnya.

-- CreateEnum
CREATE TYPE "TipeAbsensi" AS ENUM ('MASUK', 'KELUAR', 'MULAI_ISTIRAHAT', 'SELESAI_ISTIRAHAT', 'KELUAR_KANTOR', 'KEMBALI_KANTOR');

-- CreateEnum
CREATE TYPE "SumberAbsensi" AS ENUM ('RFID', 'FINGERPRINT', 'QR_CODE', 'WEB', 'MOBILE', 'API', 'MANUAL');

-- CreateEnum
CREATE TYPE "StatusAbsensi" AS ENUM ('VALID', 'INVALID', 'DIKOREKSI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "KategoriKetidakhadiran" AS ENUM ('CUTI', 'IZIN');

-- CreateEnum
CREATE TYPE "TipeMutasiSaldo" AS ENUM ('PENAMBAHAN', 'PENGURANGAN', 'PENYESUAIAN', 'KADALUARSA');

-- CreateEnum
CREATE TYPE "StatusPengajuanKetidakhadiran" AS ENUM ('DRAFT', 'DIAJUKAN', 'MENUNGGU_APPROVAL', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN', 'SELESAI');

-- CreateEnum
CREATE TYPE "StatusLembur" AS ENUM ('DRAFT', 'DIAJUKAN', 'DISETUJUI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "HariDalamMinggu" AS ENUM ('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU');

-- AlterTable
ALTER TABLE "kontrak_kerja" DROP COLUMN "urlDokumen";

-- AlterTable
ALTER TABLE "pendidikan_karyawan" DROP COLUMN "urlDokumen";

-- AlterTable
ALTER TABLE "perusahaan" DROP COLUMN "namaSingkat";

-- CreateTable
CREATE TABLE "absensi" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "waktu" TIMESTAMP(3) NOT NULL,
    "tipe" "TipeAbsensi" NOT NULL,
    "sumber" "SumberAbsensi" NOT NULL,
    "deviceId" TEXT,
    "lokasiKerjaId" TEXT,
    "status" "StatusAbsensi" NOT NULL DEFAULT 'VALID',
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lembur" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jamMulai" TIME,
    "jamSelesai" TIME,
    "jumlahJam" DECIMAL(4,2) NOT NULL,
    "alasan" TEXT NOT NULL,
    "status" "StatusLembur" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lembur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jenis_ketidakhadiran" (
    "id" SERIAL NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" "KategoriKetidakhadiran" NOT NULL,
    "deskripsi" TEXT,
    "menggunakanSaldo" BOOLEAN NOT NULL DEFAULT false,
    "jatahTahunan" DECIMAL(5,2),
    "wajibLampiran" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jenis_ketidakhadiran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saldo_cuti" (
    "id" SERIAL NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "jenisKetidakhadiranId" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "saldoAwal" DECIMAL(5,2) NOT NULL,
    "saldoAkhir" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saldo_cuti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mutasi_saldo_cuti" (
    "id" SERIAL NOT NULL,
    "saldoCutiId" INTEGER NOT NULL,
    "tipe" "TipeMutasiSaldo" NOT NULL,
    "jumlah" DECIMAL(5,2) NOT NULL,
    "referensiId" TEXT,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mutasi_saldo_cuti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengajuan_ketidakhadiran" (
    "id" TEXT NOT NULL,
    "nomorPengajuan" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "jenisKetidakhadiranId" INTEGER NOT NULL,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3) NOT NULL,
    "jumlahHari" DECIMAL(5,2) NOT NULL,
    "alasan" TEXT,
    "alamatSelamaTidakHadir" TEXT,
    "nomorTeleponDarurat" TEXT,
    "urlLampiran" TEXT,
    "status" "StatusPengajuanKetidakhadiran" NOT NULL DEFAULT 'DRAFT',
    "diajukanPada" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengajuan_ketidakhadiran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kalender_kerja" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "kode" TEXT,
    "deskripsi" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kalender_kerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadwal_kerja" (
    "id" SERIAL NOT NULL,
    "kalenderKerjaId" INTEGER NOT NULL,
    "hari" "HariDalamMinggu" NOT NULL,
    "isHariKerja" BOOLEAN NOT NULL DEFAULT true,
    "jamMasuk" TIME,
    "jamKeluar" TIME,
    "jamMulaiIstirahat" TIME,
    "jamSelesaiIstirahat" TIME,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jadwal_kerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hari_libur" (
    "id" SERIAL NOT NULL,
    "kalenderKerjaId" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "isCutiBersama" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hari_libur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penugasan_jadwal" (
    "id" SERIAL NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "jadwalKerjaId" INTEGER NOT NULL,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "penugasan_jadwal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "absensi_karyawanId_waktu_idx" ON "absensi"("karyawanId", "waktu");

-- CreateIndex
CREATE INDEX "absensi_waktu_idx" ON "absensi"("waktu");

-- CreateIndex
CREATE INDEX "absensi_karyawanId_tipe_waktu_idx" ON "absensi"("karyawanId", "tipe", "waktu");

-- CreateIndex
CREATE INDEX "lembur_karyawanId_tanggal_idx" ON "lembur"("karyawanId", "tanggal");

-- CreateIndex
CREATE INDEX "lembur_status_idx" ON "lembur"("status");

-- CreateIndex
CREATE UNIQUE INDEX "jenis_ketidakhadiran_kode_key" ON "jenis_ketidakhadiran"("kode");

-- CreateIndex
CREATE INDEX "saldo_cuti_karyawanId_idx" ON "saldo_cuti"("karyawanId");

-- CreateIndex
CREATE INDEX "saldo_cuti_tahun_idx" ON "saldo_cuti"("tahun");

-- CreateIndex
CREATE UNIQUE INDEX "saldo_cuti_karyawanId_jenisKetidakhadiranId_tahun_key" ON "saldo_cuti"("karyawanId", "jenisKetidakhadiranId", "tahun");

-- CreateIndex
CREATE INDEX "mutasi_saldo_cuti_saldoCutiId_createdAt_idx" ON "mutasi_saldo_cuti"("saldoCutiId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "pengajuan_ketidakhadiran_nomorPengajuan_key" ON "pengajuan_ketidakhadiran"("nomorPengajuan");

-- CreateIndex
CREATE INDEX "pengajuan_ketidakhadiran_karyawanId_tanggalMulai_idx" ON "pengajuan_ketidakhadiran"("karyawanId", "tanggalMulai");

-- CreateIndex
CREATE INDEX "pengajuan_ketidakhadiran_jenisKetidakhadiranId_idx" ON "pengajuan_ketidakhadiran"("jenisKetidakhadiranId");

-- CreateIndex
CREATE INDEX "pengajuan_ketidakhadiran_status_idx" ON "pengajuan_ketidakhadiran"("status");

-- CreateIndex
CREATE UNIQUE INDEX "kalender_kerja_kode_key" ON "kalender_kerja"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "jadwal_kerja_kalenderKerjaId_hari_key" ON "jadwal_kerja"("kalenderKerjaId", "hari");

-- CreateIndex
CREATE INDEX "hari_libur_tanggal_idx" ON "hari_libur"("tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "hari_libur_kalenderKerjaId_tanggal_key" ON "hari_libur"("kalenderKerjaId", "tanggal");

-- CreateIndex
CREATE INDEX "penugasan_jadwal_karyawanId_idx" ON "penugasan_jadwal"("karyawanId");

-- CreateIndex
CREATE INDEX "penugasan_jadwal_jadwalKerjaId_idx" ON "penugasan_jadwal"("jadwalKerjaId");

-- CreateIndex
CREATE UNIQUE INDEX "penugasan_jadwal_karyawanId_tanggalMulai_key" ON "penugasan_jadwal"("karyawanId", "tanggalMulai");

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_lokasiKerjaId_fkey" FOREIGN KEY ("lokasiKerjaId") REFERENCES "lokasi_kerja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lembur" ADD CONSTRAINT "lembur_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldo_cuti" ADD CONSTRAINT "saldo_cuti_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldo_cuti" ADD CONSTRAINT "saldo_cuti_jenisKetidakhadiranId_fkey" FOREIGN KEY ("jenisKetidakhadiranId") REFERENCES "jenis_ketidakhadiran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi_saldo_cuti" ADD CONSTRAINT "mutasi_saldo_cuti_saldoCutiId_fkey" FOREIGN KEY ("saldoCutiId") REFERENCES "saldo_cuti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan_ketidakhadiran" ADD CONSTRAINT "pengajuan_ketidakhadiran_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan_ketidakhadiran" ADD CONSTRAINT "pengajuan_ketidakhadiran_jenisKetidakhadiranId_fkey" FOREIGN KEY ("jenisKetidakhadiranId") REFERENCES "jenis_ketidakhadiran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_kerja" ADD CONSTRAINT "jadwal_kerja_kalenderKerjaId_fkey" FOREIGN KEY ("kalenderKerjaId") REFERENCES "kalender_kerja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hari_libur" ADD CONSTRAINT "hari_libur_kalenderKerjaId_fkey" FOREIGN KEY ("kalenderKerjaId") REFERENCES "kalender_kerja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penugasan_jadwal" ADD CONSTRAINT "penugasan_jadwal_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penugasan_jadwal" ADD CONSTRAINT "penugasan_jadwal_jadwalKerjaId_fkey" FOREIGN KEY ("jadwalKerjaId") REFERENCES "jadwal_kerja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
