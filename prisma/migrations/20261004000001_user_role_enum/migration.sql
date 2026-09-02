-- Sprint 1 fondasi peran: ubah users.role dari TEXT menjadi enum UserRole.
-- Nilai lama dipetakan dulu ke nilai baru yang valid (PRD: ADMIN -> ADMIN_HR,
-- HR_MANAGER -> ADMIN_HR), sehingga konversi tipe aman.

-- Remap nilai lama ke enum baru
UPDATE "users" SET "role" = 'ADMIN_HR' WHERE "role" = 'ADMIN';
UPDATE "users" SET "role" = 'ADMIN_HR' WHERE "role" = 'HR_MANAGER';
UPDATE "users" SET "role" = 'MANAJER' WHERE "role" = 'MANAGER';

-- CreateEnum (idempoten: bersihkan sisa percobaan gagal bila ada)
DROP TYPE IF EXISTS "UserRole";
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN_HR', 'MANAJER', 'FINANCE', 'EMPLOYEE');

-- AlterTable: TEXT -> UserRole (nilai sudah dijamin valid oleh UPDATE di atas)
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';
