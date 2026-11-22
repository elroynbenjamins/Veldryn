-- V18 PGLITE FIXTURE ONLY. NEVER DEPLOY THIS SCHEMA TO SUPABASE.
-- No user input, auth bypass, rewards or shared production data.
CREATE SCHEMA IF NOT EXISTS guild_pve_v18_qa;
REVOKE ALL ON SCHEMA guild_pve_v18_qa FROM PUBLIC;
CREATE TABLE IF NOT EXISTS guild_pve_v18_qa.atomic_state (
 scope text PRIMARY KEY CHECK (length(scope) BETWEEN 1 AND 64),
 revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
 payload jsonb NOT NULL CHECK (
  jsonb_typeof(payload->'guild') = 'object'
  AND jsonb_typeof(payload->'guild'->'guildRuns') = 'object'
  AND jsonb_typeof(payload->'guild'->'cycleBindings') = 'object'
  AND jsonb_typeof(payload->'guild'->'receipts') = 'object'
  AND jsonb_typeof(payload->'charges') = 'object'
  AND jsonb_typeof(payload->'receipts') = 'object'
 )
);
REVOKE ALL ON guild_pve_v18_qa.atomic_state FROM PUBLIC;
ALTER TABLE guild_pve_v18_qa.atomic_state ENABLE ROW LEVEL SECURITY;
