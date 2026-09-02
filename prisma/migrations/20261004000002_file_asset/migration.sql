-- Sprint 2 storage lokal: tabel metadata berkas (FileAsset).

-- CreateTable
CREATE TABLE "file_asset" (
    "id" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "jenis" TEXT,
    "path" TEXT NOT NULL,
    "mime" TEXT,
    "size" BIGINT,
    "hash" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "file_asset_path_key" ON "file_asset"("path");

-- CreateIndex
CREATE INDEX "file_asset_ownerType_ownerId_idx" ON "file_asset"("ownerType", "ownerId");
