-- Reverses 0010_views_alerts_digests.sql. Kept out of the migrations folder's
-- top level so migrate.ts never applies it; the integration suite runs it.
DROP TABLE digest_subscriptions;
DROP TABLE alert_firings;
DROP TABLE alert_rules;
DROP TABLE notifications;
DROP TABLE saved_views;
