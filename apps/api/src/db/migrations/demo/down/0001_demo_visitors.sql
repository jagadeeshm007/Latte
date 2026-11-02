-- Down for demo migration 0001: run with the demo search path.
DROP TABLE IF EXISTS session_starts;
DROP TABLE IF EXISTS daily_uploads;
DROP TABLE IF EXISTS device_uploads;
DROP TABLE IF EXISTS visitors;
DELETE FROM schema_migrations WHERE name = 'demo/0001_demo_visitors.sql';
