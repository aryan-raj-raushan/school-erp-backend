ALTER TABLE "school_users" ADD COLUMN IF NOT EXISTS "salutation" varchar(10);
ALTER TABLE "student_parents" ADD COLUMN IF NOT EXISTS "salutation" varchar(10);
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "principal_salutation" varchar(10);
