-- V45: READ-ONLY preflight. Staging metadata only. No migrations or data reads.
-- Designed for Veldryn staging PG17 before any World Boss private schema install.
-- Never mistake a pass here for a license to deploy: operational/legal sign-off
-- and synthetic 3–5 character fixtures are independent launch gates.
WITH table_contract AS (
 SELECT c.relname,
  EXISTS(SELECT 1 FROM pg_constraint p
   WHERE p.conrelid=c.oid AND p.contype='p' AND
    pg_get_constraintdef(p.oid) ILIKE
      CASE WHEN c.relname='online_game_states' THEN '%(account_id)%'
           ELSE '%(id)%' END) AS expected_primary_key,
  EXISTS(SELECT 1 FROM pg_attribute a
   WHERE a.attrelid=c.oid AND a.attname='account_id'
    AND a.atttypid='uuid'::regtype AND a.attnum>0 AND NOT a.attisdropped) AS account_uuid,
  EXISTS(SELECT 1 FROM pg_attribute a
   WHERE a.attrelid=c.oid AND a.attname='character_id'
    AND a.atttypid='uuid'::regtype AND a.attnum>0 AND NOT a.attisdropped) AS active_uuid,
  EXISTS(SELECT 1 FROM pg_attribute a
   WHERE a.attrelid=c.oid AND a.attname='state'
    AND a.atttypid='jsonb'::regtype AND a.attnum>0 AND NOT a.attisdropped) AS state_json,
  EXISTS(SELECT 1 FROM pg_attribute a
   WHERE a.attrelid=c.oid AND a.attname='revision'
    AND a.atttypid='int8'::regtype AND a.attnum>0 AND NOT a.attisdropped) AS revision_bigint,
  EXISTS(SELECT 1 FROM pg_attribute a
   WHERE a.attrelid=c.oid AND a.attname='class_id'
    AND a.atttypid='text'::regtype AND a.attnum>0 AND NOT a.attisdropped) AS class_text
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r'
  AND c.relname IN('online_game_states','characters')
), count_objects AS (
 SELECT
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='private' AND c.relkind IN('r','p') AND c.relname LIKE 'world_boss_%')::integer AS private_tables,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='private' AND p.proname LIKE 'world_boss_%')::integer AS private_functions,
  (SELECT count(*) FROM (SELECT account_id FROM public.characters
   GROUP BY account_id HAVING count(*) BETWEEN 3 AND 5) multi)::integer AS real_multi_character_accounts
), compatible AS (
 SELECT (
  EXISTS(SELECT 1 FROM table_contract WHERE relname='online_game_states'
   AND expected_primary_key AND account_uuid AND active_uuid AND state_json AND revision_bigint)
  AND EXISTS(SELECT 1 FROM table_contract WHERE relname='characters'
   AND expected_primary_key AND account_uuid AND class_text)
 ) AS save_schema_compatible
)
SELECT jsonb_build_object(
 'status','review_only', 'saveSchemaCompatible', compatible.save_schema_compatible,
 'preExistingWorldBossTables',count_objects.private_tables,
 'preExistingWorldBossFunctions',count_objects.private_functions,
 'realMultiCharacterAccounts',count_objects.real_multi_character_accounts,
 'requiresApprovedMigrationPlan',true,
 'requiresRehearsedRollback',true,
 'requiresLegalErasureDecision',true,
 'requiresTrustedAuthRoutes',true,
 'requiresRealClassCalibration',true,
 'readyForLaunch',false
) AS world_boss_staging_preflight
FROM compatible CROSS JOIN count_objects;
