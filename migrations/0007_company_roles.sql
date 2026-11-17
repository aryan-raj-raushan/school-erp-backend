CREATE TABLE IF NOT EXISTS "company_roles" (
  "id" varchar(36) PRIMARY KEY,
  "name" varchar(60) NOT NULL UNIQUE,
  "description" varchar(255),
  "permissions" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_by" varchar(36),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz
);

ALTER TABLE "company_users" ADD COLUMN IF NOT EXISTS "company_role_id" varchar(36);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_users_company_role_id_company_roles_id_fk'
  ) THEN
    ALTER TABLE "company_users"
      ADD CONSTRAINT "company_users_company_role_id_company_roles_id_fk"
      FOREIGN KEY ("company_role_id") REFERENCES "company_roles"("id") ON DELETE SET NULL;
  END IF;
END $$;
