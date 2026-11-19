-- V54 metadata/aggregate-only staging World Boss preflight.
-- READ ONLY: no DDL, migrations, player IDs, save payloads, auth tokens,
-- inventory, wallet ledger rows, or gameplay writes.
-- Safe to run on a project without any world_boss_* objects.
WITH
 boss_tables AS (
  SELECT count(*) AS n FROM information_schema.tables
  WHERE table_schema='private' AND table_name LIKE 'world_boss_%'
 ),
 boss_functions AS (
  SELECT count(*) AS n FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='private' AND p.proname LIKE 'world_boss_%'
 ),
 unsafe_public_grants AS (
  SELECT count(*) AS n FROM information_schema.role_table_grants
  WHERE table_schema='private' AND table_name LIKE 'world_boss_%'
    AND grantee IN ('anon','authenticated','PUBLIC')
 ),
 auth_fk AS (
  SELECT count(*) AS n FROM pg_constraint c
  JOIN pg_class t ON t.oid=c.conrelid
  JOIN pg_namespace n ON n.oid=t.relnamespace
  WHERE n.nspname='private' AND t.relname LIKE 'world_boss_%'
    AND c.contype='f' AND c.confrelid='auth.users'::regclass
 ),
 online_states AS (
  SELECT count(*) AS n FROM public.online_game_states
 ),
 relational_characters AS (
  SELECT count(*) AS n FROM public.characters
 ),
 multi_character_accounts AS (
  SELECT count(*) AS n FROM (
   SELECT account_id FROM public.characters
   GROUP BY account_id HAVING count(*) >= 3
  ) account_groups
 )
SELECT
 (SELECT n FROM boss_tables) AS private_boss_tables,
 (SELECT n FROM boss_functions) AS private_boss_functions,
 (SELECT n FROM unsafe_public_grants) AS unauthorized_boss_table_grants,
 (SELECT n FROM auth_fk) AS boss_auth_fk_count,
 (SELECT n FROM online_states) AS saved_account_states,
 (SELECT n FROM relational_characters) AS character_rows,
 (SELECT n FROM multi_character_accounts) AS accounts_with_three_plus_characters,
 CASE
  WHEN (SELECT n FROM boss_tables)=0 OR (SELECT n FROM boss_functions)=0
   THEN 'BLOCKED_WORLD_BOSS_SCHEMA_NOT_INSTALLED'
  WHEN (SELECT n FROM unsafe_public_grants)>0
   THEN 'BLOCKED_PRIVATE_TABLE_PRIVILEGES'
  WHEN (SELECT n FROM multi_character_accounts)=0
   THEN 'BLOCKED_NO_MULTI_CHARACTER_FIXTURE'
  ELSE 'METADATA_ONLY_REVIEW_REQUIRED_NOT_LAUNCH_APPROVAL'
 END AS readiness;
