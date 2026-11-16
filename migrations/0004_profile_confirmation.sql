ALTER TABLE "school_users" ADD COLUMN IF NOT EXISTS "profile_confirmed_at" timestamptz;
ALTER TABLE "student_parents" ADD COLUMN IF NOT EXISTS "profile_confirmed_at" timestamptz;

UPDATE "school_users" SET "profile_confirmed_at" = "last_login_at"
  WHERE "profile_confirmed_at" IS NULL AND "last_login_at" IS NOT NULL;
UPDATE "student_parents" SET "profile_confirmed_at" = "last_login_at"
  WHERE "profile_confirmed_at" IS NULL AND "last_login_at" IS NOT NULL;
