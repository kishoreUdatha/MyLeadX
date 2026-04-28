-- Migration: Change admissionNumber from global unique to per-organization unique
-- This allows each organization to have their own admission number sequence

-- Drop the existing global unique constraint on admissionNumber
DROP INDEX IF EXISTS "admissions_admissionNumber_key";

-- Add composite unique constraint (organizationId + admissionNumber)
CREATE UNIQUE INDEX IF NOT EXISTS "admissions_organizationId_admissionNumber_key" ON "admissions"("organizationId", "admissionNumber");
