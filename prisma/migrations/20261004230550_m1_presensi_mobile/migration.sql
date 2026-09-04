-- AlterTable
ALTER TABLE "absensi" ADD COLUMN     "diLuarRadius" BOOLEAN,
ADD COLUMN     "isMocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "lokasi_kerja" ADD COLUMN     "latitude" DECIMAL(10,7),
ADD COLUMN     "longitude" DECIMAL(10,7),
ADD COLUMN     "radiusMeter" INTEGER;

-- CreateTable
CREATE TABLE "perangkat_karyawan" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "namaPerangkat" TEXT,
    "platform" TEXT,
    "pushToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perangkat_karyawan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "perangkat_karyawan_karyawanId_isActive_idx" ON "perangkat_karyawan"("karyawanId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "perangkat_karyawan_karyawanId_deviceId_key" ON "perangkat_karyawan"("karyawanId", "deviceId");

-- AddForeignKey
ALTER TABLE "perangkat_karyawan" ADD CONSTRAINT "perangkat_karyawan_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
