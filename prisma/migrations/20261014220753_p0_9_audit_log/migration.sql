-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "waktu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "actorNama" TEXT,
    "actorRole" TEXT,
    "aksi" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "sebelum" JSONB,
    "sesudah" JSONB,
    "alasan" TEXT,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_waktu_idx" ON "audit_log"("waktu");

-- CreateIndex
CREATE INDEX "audit_log_aksi_idx" ON "audit_log"("aksi");

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");
