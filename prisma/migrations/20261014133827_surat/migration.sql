-- CreateTable
CREATE TABLE "surat_template" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "badan" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surat_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surat_keluar" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "kodeVerifikasi" TEXT,
    "templateId" TEXT,
    "jenis" TEXT NOT NULL,
    "referensiType" TEXT,
    "referensiId" TEXT,
    "karyawanId" TEXT,
    "vars" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surat_keluar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "surat_template_kode_key" ON "surat_template"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "surat_keluar_nomor_key" ON "surat_keluar"("nomor");

-- CreateIndex
CREATE UNIQUE INDEX "surat_keluar_kodeVerifikasi_key" ON "surat_keluar"("kodeVerifikasi");

-- CreateIndex
CREATE INDEX "surat_keluar_jenis_idx" ON "surat_keluar"("jenis");

-- CreateIndex
CREATE INDEX "surat_keluar_referensiType_referensiId_idx" ON "surat_keluar"("referensiType", "referensiId");

-- AddForeignKey
ALTER TABLE "surat_keluar" ADD CONSTRAINT "surat_keluar_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "surat_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_keluar" ADD CONSTRAINT "surat_keluar_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "karyawan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
