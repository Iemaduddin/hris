-- API mobile: koordinat GPS pada event presensi (opsional, untuk validasi radius).

ALTER TABLE "absensi" ADD COLUMN "latitude" DECIMAL(10,7);
ALTER TABLE "absensi" ADD COLUMN "longitude" DECIMAL(10,7);
