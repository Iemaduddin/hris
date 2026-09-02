-- Sprint 3 Core HR: relasi User 1-1, NIK unik, atasan langsung, tabel penomoran.

-- Normalisasi string kosong menjadi NULL agar constraint unik aman
UPDATE "karyawan" SET "nik" = NULL WHERE "nik" = '';
UPDATE "karyawan" SET "userId" = NULL WHERE "userId" = '';

-- AtasanLangsung (self-relation untuk routing approval)
ALTER TABLE "karyawan" ADD COLUMN "atasanLangsungId" TEXT;
ALTER TABLE "karyawan" ADD CONSTRAINT "karyawan_atasanLangsungId_fkey"
  FOREIGN KEY ("atasanLangsungId") REFERENCES "karyawan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- User 1-1: satu akun untuk satu karyawan
CREATE UNIQUE INDEX "karyawan_userId_key" ON "karyawan"("userId");

-- NIK unik (NULL ganda tetap diizinkan PostgreSQL)
CREATE UNIQUE INDEX "karyawan_nik_key" ON "karyawan"("nik");

-- Sequence penomoran aman-konkuren (kunci mis. 'JKT.2026')
CREATE TABLE "penomoran" (
    "id" TEXT NOT NULL,
    "kunci" TEXT NOT NULL,
    "terakhir" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "penomoran_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "penomoran_kunci_key" ON "penomoran"("kunci");
