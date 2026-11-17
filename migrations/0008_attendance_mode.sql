ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "mode" varchar(10) NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "marked_at" timestamptz;

ALTER TABLE "staff_attendances" ADD COLUMN IF NOT EXISTS "mode" varchar(10) NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "staff_attendances" ADD COLUMN IF NOT EXISTS "marked_at" timestamptz;
ALTER TABLE "staff_attendances" ADD COLUMN IF NOT EXISTS "latitude" numeric(9, 6);
ALTER TABLE "staff_attendances" ADD COLUMN IF NOT EXISTS "longitude" numeric(9, 6);
ALTER TABLE "staff_attendances" ADD COLUMN IF NOT EXISTS "location_accuracy_m" integer;

UPDATE "attendances" SET "mode" = 'RFID' WHERE "marked_by" = 'rfid-auto' AND "mode" = 'MANUAL';
UPDATE "staff_attendances" SET "mode" = 'RFID' WHERE "marked_by" = 'rfid-auto' AND "mode" = 'MANUAL';
UPDATE "attendances" SET "marked_at" = "created_at" WHERE "marked_at" IS NULL;
UPDATE "staff_attendances" SET "marked_at" = "created_at" WHERE "marked_at" IS NULL;
