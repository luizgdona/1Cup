-- Phase 7 schema changes.
-- Apply automatically with `prisma db push` (the flow this project uses), or run
-- this SQL directly against PostgreSQL. Safe to run even if edit_suggestions is
-- empty (the previous three-FK design made inserts impossible).

-- 1) Fix EditSuggestion: replace the single entity_id (which carried three
--    mutually-exclusive FK constraints) with three nullable target columns.
ALTER TABLE "edit_suggestions" DROP CONSTRAINT IF EXISTS "edit_suggestions_coffee_fkey";
ALTER TABLE "edit_suggestions" DROP CONSTRAINT IF EXISTS "edit_suggestions_producer_fkey";
ALTER TABLE "edit_suggestions" DROP CONSTRAINT IF EXISTS "edit_suggestions_roastery_fkey";

ALTER TABLE "edit_suggestions" ADD COLUMN IF NOT EXISTS "coffee_id" TEXT;
ALTER TABLE "edit_suggestions" ADD COLUMN IF NOT EXISTS "producer_id" TEXT;
ALTER TABLE "edit_suggestions" ADD COLUMN IF NOT EXISTS "roastery_id" TEXT;

-- Backfill from the old column when present, based on entity_type.
UPDATE "edit_suggestions" SET "coffee_id"   = "entity_id" WHERE "entity_type" = 'COFFEE'   AND "coffee_id"   IS NULL AND to_regclass('edit_suggestions') IS NOT NULL;
UPDATE "edit_suggestions" SET "producer_id" = "entity_id" WHERE "entity_type" = 'PRODUCER' AND "producer_id" IS NULL;
UPDATE "edit_suggestions" SET "roastery_id" = "entity_id" WHERE "entity_type" = 'ROASTERY' AND "roastery_id" IS NULL;

ALTER TABLE "edit_suggestions" DROP COLUMN IF EXISTS "entity_id";

ALTER TABLE "edit_suggestions"
  ADD CONSTRAINT "edit_suggestions_coffee_id_fkey"
  FOREIGN KEY ("coffee_id") REFERENCES "coffees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "edit_suggestions"
  ADD CONSTRAINT "edit_suggestions_producer_id_fkey"
  FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "edit_suggestions"
  ADD CONSTRAINT "edit_suggestions_roastery_id_fkey"
  FOREIGN KEY ("roastery_id") REFERENCES "roasteries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "edit_suggestions_status_idx"    ON "edit_suggestions"("status");
CREATE INDEX IF NOT EXISTS "edit_suggestions_coffee_id_idx" ON "edit_suggestions"("coffee_id");

-- 2) Password reset tokens.
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id"         TEXT NOT NULL,
  "token"      TEXT NOT NULL,
  "user_id"    TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at"    TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_key"   ON "password_reset_tokens"("token");
CREATE INDEX IF NOT EXISTS        "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Email verification tokens.
CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id"         TEXT NOT NULL,
  "token"      TEXT NOT NULL,
  "user_id"    TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at"    TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_token_key"   ON "email_verification_tokens"("token");
CREATE INDEX IF NOT EXISTS        "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");
ALTER TABLE "email_verification_tokens"
  ADD CONSTRAINT "email_verification_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
