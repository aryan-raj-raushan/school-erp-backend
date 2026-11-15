ALTER TABLE "rfid_scan_events"
  ADD COLUMN IF NOT EXISTS "school_id" varchar(36) REFERENCES "schools"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "rfid_scan_events_school_received_idx"
  ON "rfid_scan_events" ("school_id", "received_at" DESC);

CREATE INDEX IF NOT EXISTS "rfid_scan_events_received_idx"
  ON "rfid_scan_events" ("received_at" DESC);

ALTER TABLE "rfid_devices" ADD COLUMN IF NOT EXISTS "last_seen_at" timestamptz;
