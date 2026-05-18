-- AlterTable
ALTER TABLE "lead_stages" ADD COLUMN     "followUpConfigId" TEXT;

-- CreateIndex
CREATE INDEX "lead_stages_followUpConfigId_idx" ON "lead_stages"("followUpConfigId");

-- AddForeignKey
ALTER TABLE "lead_stages" ADD CONSTRAINT "lead_stages_followUpConfigId_fkey" FOREIGN KEY ("followUpConfigId") REFERENCES "follow_up_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
