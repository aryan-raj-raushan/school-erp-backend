ALTER TABLE "school_settings" ADD COLUMN IF NOT EXISTS "admission_prefix" varchar(15);
ALTER TABLE "school_settings" ADD COLUMN IF NOT EXISTS "admission_include_year" boolean DEFAULT true NOT NULL;
ALTER TABLE "school_settings" ADD COLUMN IF NOT EXISTS "admission_number_digits" integer DEFAULT 5 NOT NULL;
ALTER TABLE "school_settings" ADD COLUMN IF NOT EXISTS "admission_start_number" integer DEFAULT 1 NOT NULL;
ALTER TABLE "school_student_counters" ADD COLUMN IF NOT EXISTS "admission_last_number" integer DEFAULT 0 NOT NULL;
