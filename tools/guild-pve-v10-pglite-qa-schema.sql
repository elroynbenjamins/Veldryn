-- V10 PGLITE FIXTURE SCHEMA ONLY — ISOLATED TEMPORARY LOCAL DATABASE.
-- This is NOT a Supabase migration and must never run against staging/production.
CREATE SCHEMA IF NOT EXISTS guild_pve_v10_qa;
REVOKE ALL ON SCHEMA guild_pve_v10_qa FROM PUBLIC;
CREATE TABLE IF NOT EXISTS guild_pve_v10_qa.guild_state (
  scope text PRIMARY KEY CHECK (length(scope) BETWEEN 1 AND 64),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  payload jsonb NOT NULL DEFAULT '{"guildRuns":{},"cycleBindings":{},"receipts":{}}'::jsonb,
  CHECK (
    jsonb_typeof(payload->'guildRuns')='object'
    AND jsonb_typeof(payload->'cycleBindings')='object'
    AND jsonb_typeof(payload->'receipts')='object'
  )
);
REVOKE ALL ON guild_pve_v10_qa.guild_state FROM PUBLIC;
ALTER TABLE guild_pve_v10_qa.guild_state ENABLE ROW LEVEL SECURITY;
