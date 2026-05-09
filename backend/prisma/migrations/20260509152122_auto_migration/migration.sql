-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('SMS', 'WHATSAPP', 'RCS');

-- CreateEnum
CREATE TYPE "SmsProviderType" AS ENUM ('PLATFORM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MessagePurchaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "BulkRecipientSource" AS ENUM ('FILTER', 'LIST', 'CSV', 'MANUAL');

-- CreateEnum
CREATE TYPE "BulkMessageJobStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PROCESSING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BulkMessageDeliveryStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MessagingContactUploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageCreditTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SenderIdRequestStatus" AS ENUM ('PENDING', 'REVIEWING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "customDltEntityId" TEXT,
ADD COLUMN     "customDltSenderId" TEXT,
ADD COLUMN     "customDltTeleMarketerId" TEXT,
ADD COLUMN     "dltConfiguredAt" TIMESTAMP(3),
ADD COLUMN     "dltConfiguredById" TEXT,
ADD COLUMN     "dltPlatform" TEXT,
ADD COLUMN     "dltRegisteredName" TEXT,
ADD COLUMN     "messagingNotes" TEXT,
ADD COLUMN     "rcsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsProviderType" "SmsProviderType" NOT NULL DEFAULT 'PLATFORM',
ADD COLUMN     "smsSenderId" TEXT,
ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "organization_sms_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dltTemplateId" TEXT NOT NULL,
    "dltContentType" TEXT NOT NULL DEFAULT 'TRANSACTIONAL',
    "content" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sampleValues" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_sms_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_balances" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "smsCredits" INTEGER NOT NULL DEFAULT 0,
    "whatsappCredits" INTEGER NOT NULL DEFAULT 0,
    "rcsCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_pricing" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "smsPrice" DECIMAL(10,4) NOT NULL DEFAULT 0.25,
    "whatsappPrice" DECIMAL(10,4) NOT NULL DEFAULT 0.75,
    "rcsPrice" DECIMAL(10,4) NOT NULL DEFAULT 0.60,
    "smsBulkDiscount" JSONB DEFAULT '{}',
    "whatsappBulkDiscount" JSONB DEFAULT '{}',
    "rcsBulkDiscount" JSONB DEFAULT '{}',
    "minPurchase" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_purchases" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerUnit" DECIMAL(10,4) NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "status" "MessagePurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "isManualAdjustment" BOOLEAN NOT NULL DEFAULT false,
    "adjustmentReason" TEXT,
    "adjustedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_message_jobs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "templateId" TEXT,
    "dltTemplateId" TEXT,
    "name" TEXT,
    "description" TEXT,
    "recipientSource" "BulkRecipientSource" NOT NULL DEFAULT 'FILTER',
    "recipientFilter" JSONB DEFAULT '{}',
    "recipientListId" TEXT,
    "phoneNumbers" JSONB DEFAULT '[]',
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "status" "BulkMessageJobStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "message" TEXT,
    "mediaUrl" TEXT,
    "rcsRichCardPayload" JSONB,
    "rcsCarouselPayload" JSONB,
    "rcsSuggestedReplies" JSONB,
    "variables" JSONB DEFAULT '[]',
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "creditsRefund" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "actualCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_message_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_message_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bulkJobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "status" "BulkMessageDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerMsgId" TEXT,
    "providerStatus" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "creditCost" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messaging_contacts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "customFields" JSONB DEFAULT '{}',
    "smsOptOut" BOOLEAN NOT NULL DEFAULT false,
    "whatsappOptOut" BOOLEAN NOT NULL DEFAULT false,
    "rcsOptOut" BOOLEAN NOT NULL DEFAULT false,
    "optOutAt" TIMESTAMP(3),
    "source" TEXT,
    "sourceRef" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messaging_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messaging_contact_groups" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "syncFromCRM" BOOLEAN NOT NULL DEFAULT false,
    "crmSyncFilter" JSONB DEFAULT '{}',
    "lastSyncAt" TIMESTAMP(3),
    "contactCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messaging_contact_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messaging_contact_group_members" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messaging_contact_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messaging_contact_uploads" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "columnMapping" JSONB NOT NULL DEFAULT '{}',
    "status" "MessagingContactUploadStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB DEFAULT '[]',
    "targetGroupId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messaging_contact_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_credit_transactions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "transactionType" "MessageCreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "description" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sender_id_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestedSenderId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT,
    "purpose" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "hasOwnDlt" BOOLEAN NOT NULL DEFAULT false,
    "dltEntityId" TEXT,
    "dltPlatform" TEXT,
    "status" "SenderIdRequestStatus" NOT NULL DEFAULT 'PENDING',
    "statusReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT,
    "assignedSenderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sender_id_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messaging_api_keys" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "dailyLimit" INTEGER,
    "ipWhitelist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messaging_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_sms_templates_organizationId_isActive_idx" ON "organization_sms_templates"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "organization_sms_templates_organizationId_dltTemplateId_key" ON "organization_sms_templates"("organizationId", "dltTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "message_balances_organizationId_key" ON "message_balances"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "message_pricing_organizationId_key" ON "message_pricing"("organizationId");

-- CreateIndex
CREATE INDEX "message_purchases_organizationId_idx" ON "message_purchases"("organizationId");

-- CreateIndex
CREATE INDEX "message_purchases_userId_idx" ON "message_purchases"("userId");

-- CreateIndex
CREATE INDEX "message_purchases_status_idx" ON "message_purchases"("status");

-- CreateIndex
CREATE INDEX "bulk_message_jobs_organizationId_idx" ON "bulk_message_jobs"("organizationId");

-- CreateIndex
CREATE INDEX "bulk_message_jobs_status_idx" ON "bulk_message_jobs"("status");

-- CreateIndex
CREATE INDEX "bulk_message_jobs_scheduledAt_idx" ON "bulk_message_jobs"("scheduledAt");

-- CreateIndex
CREATE INDEX "bulk_message_jobs_createdAt_idx" ON "bulk_message_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "bulk_message_logs_organizationId_idx" ON "bulk_message_logs"("organizationId");

-- CreateIndex
CREATE INDEX "bulk_message_logs_bulkJobId_idx" ON "bulk_message_logs"("bulkJobId");

-- CreateIndex
CREATE INDEX "bulk_message_logs_phone_idx" ON "bulk_message_logs"("phone");

-- CreateIndex
CREATE INDEX "bulk_message_logs_status_idx" ON "bulk_message_logs"("status");

-- CreateIndex
CREATE INDEX "messaging_contacts_organizationId_idx" ON "messaging_contacts"("organizationId");

-- CreateIndex
CREATE INDEX "messaging_contacts_phone_idx" ON "messaging_contacts"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "messaging_contacts_organizationId_phone_key" ON "messaging_contacts"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "messaging_contact_groups_organizationId_idx" ON "messaging_contact_groups"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "messaging_contact_groups_organizationId_name_key" ON "messaging_contact_groups"("organizationId", "name");

-- CreateIndex
CREATE INDEX "messaging_contact_group_members_contactId_idx" ON "messaging_contact_group_members"("contactId");

-- CreateIndex
CREATE INDEX "messaging_contact_group_members_groupId_idx" ON "messaging_contact_group_members"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "messaging_contact_group_members_contactId_groupId_key" ON "messaging_contact_group_members"("contactId", "groupId");

-- CreateIndex
CREATE INDEX "messaging_contact_uploads_organizationId_idx" ON "messaging_contact_uploads"("organizationId");

-- CreateIndex
CREATE INDEX "messaging_contact_uploads_userId_idx" ON "messaging_contact_uploads"("userId");

-- CreateIndex
CREATE INDEX "message_credit_transactions_organizationId_idx" ON "message_credit_transactions"("organizationId");

-- CreateIndex
CREATE INDEX "message_credit_transactions_channel_idx" ON "message_credit_transactions"("channel");

-- CreateIndex
CREATE INDEX "message_credit_transactions_createdAt_idx" ON "message_credit_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "sender_id_requests_organizationId_idx" ON "sender_id_requests"("organizationId");

-- CreateIndex
CREATE INDEX "sender_id_requests_status_idx" ON "sender_id_requests"("status");

-- CreateIndex
CREATE INDEX "messaging_api_keys_organizationId_idx" ON "messaging_api_keys"("organizationId");

-- CreateIndex
CREATE INDEX "messaging_api_keys_keyPrefix_idx" ON "messaging_api_keys"("keyPrefix");

-- CreateIndex
CREATE INDEX "messaging_api_keys_isActive_idx" ON "messaging_api_keys"("isActive");

-- AddForeignKey
ALTER TABLE "organization_sms_templates" ADD CONSTRAINT "organization_sms_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_balances" ADD CONSTRAINT "message_balances_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_purchases" ADD CONSTRAINT "message_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_message_jobs" ADD CONSTRAINT "bulk_message_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messaging_contact_group_members" ADD CONSTRAINT "messaging_contact_group_members_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "messaging_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messaging_contact_group_members" ADD CONSTRAINT "messaging_contact_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "messaging_contact_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sender_id_requests" ADD CONSTRAINT "sender_id_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sender_id_requests" ADD CONSTRAINT "sender_id_requests_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messaging_api_keys" ADD CONSTRAINT "messaging_api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messaging_api_keys" ADD CONSTRAINT "messaging_api_keys_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

