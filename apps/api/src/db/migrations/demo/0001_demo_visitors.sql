-- Demo migration 0001 (SCC-11, 2026-11-02): the visitors of the public demo
-- and the limits on what they spend (ADR-0033). Runs only in the demo schema,
-- after every migration in the parent folder has built it; nothing here
-- names a schema, so the demo search path decides where it lands.
-- Down: down/0001_demo_visitors.sql.
CREATE TABLE visitors (
  id uuid PRIMARY KEY REFERENCES profiles (id) ON DELETE CASCADE,
  fingerprint_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT chk_visitors_fingerprint CHECK (fingerprint_hash ~ '^[0-9a-f]{64}$')
);
CREATE INDEX idx_visitors_expires_at ON visitors (expires_at);
COMMENT ON TABLE visitors IS 'A demo visitor: a throwaway manager profile that lasts 24 hours';
COMMENT ON COLUMN visitors.fingerprint_hash IS 'HMAC of the IP and browser signals; the raw values are never stored';

CREATE TABLE device_uploads (
  fingerprint_hash text PRIMARY KEY,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE device_uploads IS 'Devices that used their one demo upload; kept 7 days';

CREATE TABLE daily_uploads (
  day date PRIMARY KEY,
  uploads integer NOT NULL DEFAULT 0 CHECK (uploads >= 0)
);
COMMENT ON TABLE daily_uploads IS 'Demo uploads per UTC day, against DEMO_DAILY_UPLOADS; kept 30 days';

CREATE TABLE session_starts (
  ip_hash text NOT NULL,
  hour timestamptz NOT NULL,
  starts integer NOT NULL DEFAULT 0 CHECK (starts >= 0),
  PRIMARY KEY (ip_hash, hour)
);
COMMENT ON TABLE session_starts IS 'Demo sessions started per hashed IP per hour; kept 2 days';

ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_starts ENABLE ROW LEVEL SECURITY;
