-- Phase 9 — engagement & gamification.
-- Apply with `prisma db push` (this repo's flow; the CI integration job runs it)
-- or run directly. After applying, (re)seed the catalog via `POST /badges/seed`
-- (admin) so the new badges + tiers/categories are populated.

-- Badge tier / category enums --------------------------------------
DO $$ BEGIN
  CREATE TYPE "BadgeTier" AS ENUM ('BRONZE','SILVER','GOLD','PLATINUM');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "BadgeCategory" AS ENUM ('MILESTONE','EXPLORER','CONNOISSEUR','SOCIAL','DEDICATION');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "badges" ADD COLUMN IF NOT EXISTS "tier" "BadgeTier" NOT NULL DEFAULT 'BRONZE';
ALTER TABLE "badges" ADD COLUMN IF NOT EXISTS "category" "BadgeCategory" NOT NULL DEFAULT 'MILESTONE';

-- New notification type --------------------------------------------
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BADGE_EARNED';
