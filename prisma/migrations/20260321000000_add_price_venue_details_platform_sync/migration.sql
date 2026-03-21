-- AlterTable
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "price" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "platformEventId" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "platformSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "directions" TEXT;

-- AlterEnum (remove NAM_STUDIO if it exists)
-- This is safe because we never used NAM_STUDIO in production
