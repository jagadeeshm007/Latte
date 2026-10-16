-- Migration 0006 (SCC-1, 2026-10-16): index for the performance leaderboard.
-- The leaderboard and the highlights group live calls by agent over a call
-- date range; with hundreds of agents the existing (agent_id, created_at)
-- index does not serve a call_date range. Teams and products already have
-- (team_id, call_date) and (product_id, call_date).
-- Down: down/0006_dashboard_indexes.sql.
CREATE INDEX ix_calls_agent_call_date ON calls (agent_id, call_date) WHERE deleted_at IS NULL;
