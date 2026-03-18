-- AlterEnum: Add ISLAND_CONNECTION, remove NAM_STUDIO
ALTER TYPE "Entity" ADD VALUE 'ISLAND_CONNECTION';

-- Update any existing NAM_STUDIO rows to EXTERNAL
UPDATE "Event" SET entity = 'EXTERNAL' WHERE entity = 'NAM_STUDIO';
