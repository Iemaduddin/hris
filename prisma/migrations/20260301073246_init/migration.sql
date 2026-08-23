-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "JenisKontrak" AS ENUM ('PKWT', 'PKWTT', 'MAGANG', 'FREELANCE', 'OUTSOURCING');

-- CreateEnum
CREATE TYPE "StatusKontrak" AS ENUM ('DRAFT', 'AKTIF', 'AKAN_BERAKHIR', 'BERAKHIR', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- CreateEnum
CREATE TYPE "StatusKaryawan" AS ENUM ('AKTIF', 'TIDAK_AKTIF', 'PROBASI', 'RESIGN', 'DIHENTIKAN', 'PENSIUN');

-- CreateEnum
CREATE TYPE "HubunganKeluarga" AS ENUM ('PASANGAN', 'ANAK', 'ORANG_TUA', 'SAUDARA', 'LAINNYA');

-- CreateEnum
CREATE TYPE "GelarPendidikan" AS ENUM ('SD', 'SMP', 'SMA_SMK', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3', 'LAINNYA');

-- CreateEnum
CREATE TYPE "JenisDokumen" AS ENUM ('KTP', 'NPWP', 'IJAZAH', 'TRANSKRIP', 'PAKLARING', 'SERTIFIKAT', 'KONTRAK_KERJA', 'FOTO', 'KARTU_KELUARGA', 'BPJS_KESEHATAN', 'BPJS_KETENAGAKERJAAN', 'CV', 'LAINNYA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provinsi" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "provinsi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kota" (
    "id" TEXT NOT NULL,
    "provinsiId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "kota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kecamatan" (
    "id" TEXT NOT NULL,
    "kotaId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "kecamatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desa" (
    "id" TEXT NOT NULL,
    "kecamatanId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "desa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perusahaan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "namaSingkat" TEXT,
    "logo" TEXT,
    "npwp" TEXT,
    "telepon" TEXT,
    "email" TEXT,
    "website" TEXT,
    "provinsiId" TEXT,
    "kotaId" TEXT,
    "kecamatanId" TEXT,
    "desaId" TEXT,
    "alamat" TEXT,
    "kodePos" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perusahaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_organisasi" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "nama" TEXT NOT NULL,
    "kode" TEXT,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_organisasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "golongan_posisi" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kode" TEXT,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "golongan_posisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posisi" (
    "id" TEXT NOT NULL,
    "unitOrganisasiId" TEXT,
    "golonganPosisiId" TEXT,
    "nama" TEXT NOT NULL,
    "kode" TEXT,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lokasi_kerja" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kode" TEXT,
    "alamat" TEXT,
    "kota" TEXT,
    "provinsi" TEXT,
    "kodePos" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lokasi_kerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "karyawan" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "nomorKaryawan" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "gender" "JenisKelamin" NOT NULL,
    "tanggalLahir" TIMESTAMP(3),
    "nik" TEXT,
    "npwp" TEXT,
    "telepon" TEXT,
    "email" TEXT,
    "alamat" TEXT,
    "status" "StatusKaryawan" NOT NULL DEFAULT 'AKTIF',
    "tanggalMasuk" TIMESTAMP(3) NOT NULL,
    "tanggalResign" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "karyawan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kontrak_kerja" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "nomorKontrak" TEXT NOT NULL,
    "jenisKontrak" "JenisKontrak" NOT NULL,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3),
    "status" "StatusKontrak" NOT NULL DEFAULT 'DRAFT',
    "gajiPokok" DECIMAL(15,2),
    "urlDokumen" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kontrak_kerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posisi_karyawan" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "unitOrganisasiId" TEXT,
    "posisiId" TEXT,
    "lokasiKerjaId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "tanggalEfektif" TIMESTAMP(3) NOT NULL,
    "tanggalBerakhir" TIMESTAMP(3),
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posisi_karyawan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keluarga_karyawan" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "hubungan" "HubunganKeluarga" NOT NULL,
    "gender" "JenisKelamin" NOT NULL,
    "tanggalLahir" TIMESTAMP(3),
    "nik" TEXT,
    "pekerjaan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keluarga_karyawan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pendidikan_karyawan" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "gelar" "GelarPendidikan" NOT NULL,
    "institusi" TEXT NOT NULL,
    "jurusan" TEXT,
    "tahunMulai" INTEGER,
    "tahunLulus" INTEGER,
    "ipk" DOUBLE PRECISION,
    "isHighest" BOOLEAN NOT NULL DEFAULT false,
    "urlDokumen" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pendidikan_karyawan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riwayat_pekerjaan" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "namaPerusahaan" TEXT NOT NULL,
    "posisi" TEXT,
    "tanggalMulai" TIMESTAMP(3),
    "tanggalSelesai" TIMESTAMP(3),
    "gajiTerakhir" DECIMAL(15,2),
    "alasanKeluar" TEXT,
    "teleponReferensi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "riwayat_pekerjaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dokumen_karyawan" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "jenisDokumen" "JenisDokumen" NOT NULL,
    "nama" TEXT NOT NULL,
    "urlFile" TEXT NOT NULL,
    "ukuranFile" BIGINT,
    "tipeFile" TEXT,
    "tanggalKadaluarsa" TIMESTAMP(3),
    "catatan" TEXT,
    "tanggalUnggah" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dokumen_karyawan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "kota_provinsiId_idx" ON "kota"("provinsiId");

-- CreateIndex
CREATE INDEX "kecamatan_kotaId_idx" ON "kecamatan"("kotaId");

-- CreateIndex
CREATE INDEX "desa_kecamatanId_idx" ON "desa"("kecamatanId");

-- CreateIndex
CREATE INDEX "unit_organisasi_parentId_idx" ON "unit_organisasi"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "golongan_posisi_kode_key" ON "golongan_posisi"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "posisi_kode_key" ON "posisi"("kode");

-- CreateIndex
CREATE INDEX "karyawan_status_idx" ON "karyawan"("status");

-- CreateIndex
CREATE UNIQUE INDEX "karyawan_nomorKaryawan_key" ON "karyawan"("nomorKaryawan");

-- CreateIndex
CREATE UNIQUE INDEX "kontrak_kerja_nomorKontrak_key" ON "kontrak_kerja"("nomorKontrak");

-- CreateIndex
CREATE INDEX "kontrak_kerja_karyawanId_idx" ON "kontrak_kerja"("karyawanId");

-- CreateIndex
CREATE INDEX "kontrak_kerja_karyawanId_status_idx" ON "kontrak_kerja"("karyawanId", "status");

-- CreateIndex
CREATE INDEX "kontrak_kerja_tanggalMulai_idx" ON "kontrak_kerja"("tanggalMulai");

-- CreateIndex
CREATE INDEX "kontrak_kerja_tanggalSelesai_idx" ON "kontrak_kerja"("tanggalSelesai");

-- CreateIndex
CREATE INDEX "posisi_karyawan_karyawanId_isCurrent_idx" ON "posisi_karyawan"("karyawanId", "isCurrent");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kota" ADD CONSTRAINT "kota_provinsiId_fkey" FOREIGN KEY ("provinsiId") REFERENCES "provinsi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kecamatan" ADD CONSTRAINT "kecamatan_kotaId_fkey" FOREIGN KEY ("kotaId") REFERENCES "kota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desa" ADD CONSTRAINT "desa_kecamatanId_fkey" FOREIGN KEY ("kecamatanId") REFERENCES "kecamatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_organisasi" ADD CONSTRAINT "unit_organisasi_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "unit_organisasi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posisi" ADD CONSTRAINT "posisi_unitOrganisasiId_fkey" FOREIGN KEY ("unitOrganisasiId") REFERENCES "unit_organisasi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posisi" ADD CONSTRAINT "posisi_golonganPosisiId_fkey" FOREIGN KEY ("golonganPosisiId") REFERENCES "golongan_posisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karyawan" ADD CONSTRAINT "karyawan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kontrak_kerja" ADD CONSTRAINT "kontrak_kerja_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posisi_karyawan" ADD CONSTRAINT "posisi_karyawan_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posisi_karyawan" ADD CONSTRAINT "posisi_karyawan_unitOrganisasiId_fkey" FOREIGN KEY ("unitOrganisasiId") REFERENCES "unit_organisasi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posisi_karyawan" ADD CONSTRAINT "posisi_karyawan_posisiId_fkey" FOREIGN KEY ("posisiId") REFERENCES "posisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posisi_karyawan" ADD CONSTRAINT "posisi_karyawan_lokasiKerjaId_fkey" FOREIGN KEY ("lokasiKerjaId") REFERENCES "lokasi_kerja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keluarga_karyawan" ADD CONSTRAINT "keluarga_karyawan_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendidikan_karyawan" ADD CONSTRAINT "pendidikan_karyawan_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_pekerjaan" ADD CONSTRAINT "riwayat_pekerjaan_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen_karyawan" ADD CONSTRAINT "dokumen_karyawan_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
