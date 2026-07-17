-- Phase 8 — social depth.
-- Apply with `prisma db push` (this project's flow) or run directly. The CI
-- integration job runs `prisma db push`, which reconciles these automatically.

-- Enums ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('LIKE','COMMENT','FRIEND_REQUEST','FRIEND_ACCEPTED','NEW_COFFEE');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ReportEntity" AS ENUM ('CHECKIN','COMMENT','USER');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ReportStatus" AS ENUM ('PENDING','REVIEWED','DISMISSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- checkin_likes ----------------------------------------------------
CREATE TABLE IF NOT EXISTS "checkin_likes" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "checkin_id" TEXT NOT NULL REFERENCES "checkins"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "checkin_likes_user_id_checkin_id_key" ON "checkin_likes"("user_id","checkin_id");
CREATE INDEX IF NOT EXISTS "checkin_likes_checkin_id_idx" ON "checkin_likes"("checkin_id");

-- comments ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "comments" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "checkin_id" TEXT NOT NULL REFERENCES "checkins"("id") ON DELETE CASCADE,
  "body" VARCHAR(500) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "comments_checkin_id_created_at_idx" ON "comments"("checkin_id","created_at");

-- follows ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "follows" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "coffee_id" TEXT REFERENCES "coffees"("id") ON DELETE CASCADE,
  "roastery_id" TEXT REFERENCES "roasteries"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "follows_user_id_coffee_id_key" ON "follows"("user_id","coffee_id");
CREATE UNIQUE INDEX IF NOT EXISTS "follows_user_id_roastery_id_key" ON "follows"("user_id","roastery_id");
CREATE INDEX IF NOT EXISTS "follows_coffee_id_idx" ON "follows"("coffee_id");
CREATE INDEX IF NOT EXISTS "follows_roastery_id_idx" ON "follows"("roastery_id");

-- notifications ----------------------------------------------------
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" "NotificationType" NOT NULL,
  "actor_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "checkin_id" TEXT REFERENCES "checkins"("id") ON DELETE CASCADE,
  "coffee_id" TEXT,
  "data" JSONB,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "notifications_user_id_read_at_idx" ON "notifications"("user_id","read_at");
CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx" ON "notifications"("user_id","created_at");

-- blocks -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "blocks" (
  "id" TEXT PRIMARY KEY,
  "blocker_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "blocked_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "blocks_blocker_id_blocked_id_key" ON "blocks"("blocker_id","blocked_id");
CREATE INDEX IF NOT EXISTS "blocks_blocked_id_idx" ON "blocks"("blocked_id");

-- reports ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "reports" (
  "id" TEXT PRIMARY KEY,
  "reporter_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "entity_type" "ReportEntity" NOT NULL,
  "entity_id" TEXT NOT NULL,
  "reason" VARCHAR(60) NOT NULL,
  "note" VARCHAR(500),
  "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
  "reviewed_by" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "review_note" VARCHAR(300),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "reports_status_created_at_idx" ON "reports"("status","created_at");
CREATE INDEX IF NOT EXISTS "reports_entity_type_entity_id_idx" ON "reports"("entity_type","entity_id");
