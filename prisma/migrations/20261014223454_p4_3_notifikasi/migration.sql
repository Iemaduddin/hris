-- CreateEnum
CREATE TYPE "JenisNotifikasi" AS ENUM ('PENGAJUAN_MASUK', 'KEPUTUSAN', 'INFO');

-- CreateTable
CREATE TABLE "notifikasi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "jenis" "JenisNotifikasi" NOT NULL DEFAULT 'INFO',
    "referensiType" TEXT,
    "referensiId" TEXT,
    "url" TEXT,
    "dibacaPada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferensi_notifikasi" (
    "userId" TEXT NOT NULL,
    "pushAktif" BOOLEAN NOT NULL DEFAULT true,
    "emailAktif" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferensi_notifikasi_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "notifikasi_userId_dibacaPada_idx" ON "notifikasi"("userId", "dibacaPada");

-- CreateIndex
CREATE INDEX "notifikasi_userId_createdAt_idx" ON "notifikasi"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferensi_notifikasi" ADD CONSTRAINT "preferensi_notifikasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
