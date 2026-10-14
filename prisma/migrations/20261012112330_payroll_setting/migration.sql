-- CreateTable
CREATE TABLE "payroll_setting" (
    "kunci" TEXT NOT NULL,
    "nilai" TEXT NOT NULL,
    "deskripsi" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_setting_pkey" PRIMARY KEY ("kunci")
);
