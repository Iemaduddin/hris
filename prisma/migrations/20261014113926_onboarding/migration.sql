-- CreateEnum
CREATE TYPE "KategoriOnboarding" AS ENUM ('DOKUMEN', 'AKUN', 'ASET', 'ORIENTASI', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusOnboarding" AS ENUM ('BERJALAN', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusOnboardingItem" AS ENUM ('BELUM', 'SELESAI', 'TERVERIFIKASI');

-- CreateTable
CREATE TABLE "onboarding_template" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jenisKontrak" "JenisKontrak",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_template_item" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "kategori" "KategoriOnboarding" NOT NULL DEFAULT 'LAINNYA',
    "wajib" BOOLEAN NOT NULL DEFAULT true,
    "urutan" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "onboarding_template_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "templateId" TEXT,
    "templateNama" TEXT,
    "status" "StatusOnboarding" NOT NULL DEFAULT 'BERJALAN',
    "tanggalMulai" DATE NOT NULL,
    "targetSelesai" DATE,
    "selesaiPada" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_item" (
    "id" TEXT NOT NULL,
    "onboardingId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "kategori" "KategoriOnboarding" NOT NULL DEFAULT 'LAINNYA',
    "wajib" BOOLEAN NOT NULL DEFAULT true,
    "status" "StatusOnboardingItem" NOT NULL DEFAULT 'BELUM',
    "catatan" TEXT,
    "diselesaikanPada" TIMESTAMP(3),
    "diverifikasiOlehId" TEXT,
    "diverifikasiPada" TIMESTAMP(3),
    "urutan" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "onboarding_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "onboarding_template_item_templateId_urutan_idx" ON "onboarding_template_item"("templateId", "urutan");

-- CreateIndex
CREATE INDEX "onboarding_karyawanId_status_idx" ON "onboarding"("karyawanId", "status");

-- CreateIndex
CREATE INDEX "onboarding_item_onboardingId_urutan_idx" ON "onboarding_item"("onboardingId", "urutan");

-- AddForeignKey
ALTER TABLE "onboarding_template_item" ADD CONSTRAINT "onboarding_template_item_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "onboarding_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding" ADD CONSTRAINT "onboarding_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_item" ADD CONSTRAINT "onboarding_item_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "onboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
