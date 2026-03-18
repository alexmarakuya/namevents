-- CreateEnum
CREATE TYPE "Entity" AS ENUM ('KIN_HAUS', 'AI_MEETUP', 'NAM_SPACE', 'NAM_STUDIO', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "EventFormat" AS ENUM ('SOCIAL', 'MEETUP', 'WORKSHOP', 'PERFORMANCE', 'COMMUNITY', 'RETREAT', 'POPUP');

-- CreateEnum
CREATE TYPE "EventStage" AS ENUM ('SEED', 'BREWING', 'CONFIRMED', 'ANNOUNCED', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "entity" "Entity" NOT NULL,
    "format" "EventFormat" NOT NULL,
    "stage" "EventStage" NOT NULL DEFAULT 'SEED',
    "date" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "location" TEXT,
    "locationUrl" TEXT,
    "description" TEXT,
    "shortBlurb" TEXT,
    "coverImage" TEXT,
    "images" TEXT[],
    "public" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT,
    "tags" TEXT[],
    "coHosts" TEXT[],
    "capacity" INTEGER,
    "registrationUrl" TEXT,
    "externalUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Event_shareToken_key" ON "Event"("shareToken");

-- CreateIndex
CREATE INDEX "Event_entity_idx" ON "Event"("entity");

-- CreateIndex
CREATE INDEX "Event_stage_idx" ON "Event"("stage");

-- CreateIndex
CREATE INDEX "Event_public_idx" ON "Event"("public");

-- CreateIndex
CREATE INDEX "Event_date_idx" ON "Event"("date");
