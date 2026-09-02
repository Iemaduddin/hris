-- Repair: samakan tipe ID dengan schema.prisma (INT autoincrement).
-- DB berisi TEXT cuid dari era db-push; kode + client memakai number sehingga
-- modul jadwal rusak di runtime. Tabel yang berisi data (kalender/jadwal/libur)
-- hanya berasal dari seed dan akan di-seed ulang setelah migrasi ini.

-- Kosongkan dan bangun ulang tabel ber-ID salah (CASCADE untuk FK era push)
DROP TABLE IF EXISTS "penugasan_jadwal" CASCADE;
DROP TABLE IF EXISTS "hari_libur" CASCADE;
DROP TABLE IF EXISTS "jadwal_kerja" CASCADE;
DROP TABLE IF EXISTS "kalender_kerja" CASCADE;
DROP TABLE IF EXISTS "mutasi_saldo_cuti" CASCADE;
DROP TABLE IF EXISTS "saldo_cuti" CASCADE;
DROP TABLE IF EXISTS "pengajuan_ketidakhadiran" CASCADE;
DROP TABLE IF EXISTS "jenis_ketidakhadiran" CASCADE;
DROP TABLE IF EXISTS "lembur" CASCADE;
DROP TABLE IF EXISTS "absensi" CASCADE;

-- CreateTable (sesuai schema.prisma; enum sudah ada)
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

-- Indexes
CREATE INDEX "absensi_karyawanId_waktu_idx" ON "absensi"("karyawanId", "waktu");
CREATE INDEX "absensi_waktu_idx" ON "absensi"("waktu");
CREATE INDEX "absensi_karyawanId_tipe_waktu_idx" ON "absensi"("karyawanId", "tipe", "waktu");
CREATE INDEX "lembur_karyawanId_tanggal_idx" ON "lembur"("karyawanId", "tanggal");
CREATE INDEX "lembur_status_idx" ON "lembur"("status");
CREATE UNIQUE INDEX "jenis_ketidakhadiran_kode_key" ON "jenis_ketidakhadiran"("kode");
CREATE INDEX "saldo_cuti_karyawanId_idx" ON "saldo_cuti"("karyawanId");
CREATE INDEX "saldo_cuti_tahun_idx" ON "saldo_cuti"("tahun");
CREATE UNIQUE INDEX "saldo_cuti_karyawanId_jenisKetidakhadiranId_tahun_key" ON "saldo_cuti"("karyawanId", "jenisKetidakhadiranId", "tahun");
CREATE INDEX "mutasi_saldo_cuti_saldoCutiId_createdAt_idx" ON "mutasi_saldo_cuti"("saldoCutiId", "createdAt");
CREATE UNIQUE INDEX "pengajuan_ketidakhadiran_nomorPengajuan_key" ON "pengajuan_ketidakhadiran"("nomorPengajuan");
CREATE INDEX "pengajuan_ketidakhadiran_karyawanId_tanggalMulai_idx" ON "pengajuan_ketidakhadiran"("karyawanId", "tanggalMulai");
CREATE INDEX "pengajuan_ketidakhadiran_jenisKetidakhadiranId_idx" ON "pengajuan_ketidakhadiran"("jenisKetidakhadiranId");
CREATE INDEX "pengajuan_ketidakhadiran_status_idx" ON "pengajuan_ketidakhadiran"("status");
CREATE UNIQUE INDEX "kalender_kerja_kode_key" ON "kalender_kerja"("kode");
CREATE UNIQUE INDEX "jadwal_kerja_kalenderKerjaId_hari_key" ON "jadwal_kerja"("kalenderKerjaId", "hari");
CREATE INDEX "hari_libur_tanggal_idx" ON "hari_libur"("tanggal");
CREATE UNIQUE INDEX "hari_libur_kalenderKerjaId_tanggal_key" ON "hari_libur"("kalenderKerjaId", "tanggal");
CREATE INDEX "penugasan_jadwal_karyawanId_idx" ON "penugasan_jadwal"("karyawanId");
CREATE INDEX "penugasan_jadwal_jadwalKerjaId_idx" ON "penugasan_jadwal"("jadwalKerjaId");
CREATE UNIQUE INDEX "penugasan_jadwal_karyawanId_tanggalMulai_key" ON "penugasan_jadwal"("karyawanId", "tanggalMulai");

-- Foreign keys
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_lokasiKerjaId_fkey" FOREIGN KEY ("lokasiKerjaId") REFERENCES "lokasi_kerja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lembur" ADD CONSTRAINT "lembur_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saldo_cuti" ADD CONSTRAINT "saldo_cuti_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saldo_cuti" ADD CONSTRAINT "saldo_cuti_jenisKetidakhadiranId_fkey" FOREIGN KEY ("jenisKetidakhadiranId") REFERENCES "jenis_ketidakhadiran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mutasi_saldo_cuti" ADD CONSTRAINT "mutasi_saldo_cuti_saldoCutiId_fkey" FOREIGN KEY ("saldoCutiId") REFERENCES "saldo_cuti"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pengajuan_ketidakhadiran" ADD CONSTRAINT "pengajuan_ketidakhadiran_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pengajuan_ketidakhadiran" ADD CONSTRAINT "pengajuan_ketidakhadiran_jenisKetidakhadiranId_fkey" FOREIGN KEY ("jenisKetidakhadiranId") REFERENCES "jenis_ketidakhadiran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "jadwal_kerja" ADD CONSTRAINT "jadwal_kerja_kalenderKerjaId_fkey" FOREIGN KEY ("kalenderKerjaId") REFERENCES "kalender_kerja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hari_libur" ADD CONSTRAINT "hari_libur_kalenderKerjaId_fkey" FOREIGN KEY ("kalenderKerjaId") REFERENCES "kalender_kerja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "penugasan_jadwal" ADD CONSTRAINT "penugasan_jadwal_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "penugasan_jadwal" ADD CONSTRAINT "penugasan_jadwal_jadwalKerjaId_fkey" FOREIGN KEY ("jadwalKerjaId") REFERENCES "jadwal_kerja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK penugasan_kalender yang tertunda dari migrasi 000004 (kini tipe cocok)
ALTER TABLE "penugasan_kalender" ADD CONSTRAINT "penugasan_kalender_kalenderKerjaId_fkey" FOREIGN KEY ("kalenderKerjaId") REFERENCES "kalender_kerja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
