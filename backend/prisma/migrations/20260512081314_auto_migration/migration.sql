-- AlterTable
ALTER TABLE "lead_notes" ADD COLUMN     "telecallerCallId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "organization_sms_templates" ADD COLUMN     "msg91TemplateId" TEXT;

-- AlterTable
ALTER TABLE "bulk_message_jobs" ADD COLUMN     "senderId" TEXT;

-- AlterTable
ALTER TABLE "bulk_message_logs" ADD COLUMN     "senderId" TEXT;

-- CreateTable
CREATE TABLE "organization_sender_ids" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dltEntityId" TEXT,
    "dltPlatform" TEXT,
    "smsType" TEXT NOT NULL DEFAULT 'TRANSACTIONAL',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_sender_ids_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_sender_ids_organizationId_idx" ON "organization_sender_ids"("organizationId");

-- CreateIndex
CREATE INDEX "organization_sender_ids_organizationId_smsType_isDefault_idx" ON "organization_sender_ids"("organizationId", "smsType", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "organization_sender_ids_organizationId_senderId_key" ON "organization_sender_ids"("organizationId", "senderId");

-- CreateIndex
CREATE INDEX "lead_notes_leadId_createdAt_idx" ON "lead_notes"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "lead_notes_telecallerCallId_idx" ON "lead_notes"("telecallerCallId");

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_telecallerCallId_fkey" FOREIGN KEY ("telecallerCallId") REFERENCES "telecaller_calls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_sender_ids" ADD CONSTRAINT "organization_sender_ids_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

