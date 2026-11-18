-- V32 PRIVATE World Boss permission regression.
-- READ-ONLY audit in disposable PostgreSQL CI, after V17-V28 fixture DDL.
-- No schema changes, no staging/production Supabase connection or user data.
-- All users/roles are disposable CI roles from V17 fixture bootstrap.
DO $world_boss_access$
DECLARE
 table_count integer;
 function_count integer;
 violations text;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon')
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated')
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role')
 THEN
   RAISE EXCEPTION 'WB32_ROLE_FIXTURES_MISSING';
 END IF;

 SELECT count(*) INTO table_count
 FROM pg_class c
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='private' AND c.relname LIKE 'world_boss_%'
   AND c.relkind IN ('r','p');
 SELECT count(*) INTO function_count
 FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='private' AND p.proname LIKE 'world_boss_%';

 IF table_count<12 OR function_count<15 THEN
   RAISE EXCEPTION 'WB32_INCOMPLETE_PRIVATE_SCHEMA: tables %, functions %',
     table_count,function_count;
 END IF;

 IF has_schema_privilege('anon','private','USAGE')
    OR has_schema_privilege('authenticated','private','USAGE')
    OR NOT has_schema_privilege('service_role','private','USAGE')
 THEN RAISE EXCEPTION 'WB32_PRIVATE_SCHEMA_USAGE_EXPOSED'; END IF;

 SELECT string_agg(c.relname,', ' ORDER BY c.relname) INTO violations
 FROM pg_class c
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='private' AND c.relname LIKE 'world_boss_%'
   AND c.relkind IN ('r','p')
   AND NOT c.relrowsecurity;
 IF violations IS NOT NULL THEN
   RAISE EXCEPTION 'WB32_PRIVATE_RLS_MISSING: %', violations;
 END IF;

 SELECT string_agg(DISTINCT c.relname,', ' ORDER BY c.relname)
 INTO violations
 FROM pg_class c
 JOIN pg_namespace n ON n.oid=c.relnamespace
 CROSS JOIN (VALUES
  ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),
  ('TRUNCATE'),('REFERENCES'),('TRIGGER')
 ) AS rights(privilege)
 WHERE n.nspname='private' AND c.relname LIKE 'world_boss_%'
   AND c.relkind IN ('r','p')
   AND (
    has_table_privilege('anon',c.oid,rights.privilege)
    OR has_table_privilege('authenticated',c.oid,rights.privilege)
   );
 IF violations IS NOT NULL THEN
   RAISE EXCEPTION 'WB32_PRIVATE_TABLE_PRIVILEGE_EXPOSED: %', violations;
 END IF;

 SELECT string_agg(p.oid::regprocedure::text,', '
                    ORDER BY p.oid::regprocedure::text)
 INTO violations
 FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='private' AND p.proname LIKE 'world_boss_%'
   AND (
     has_function_privilege('anon',p.oid,'EXECUTE')
     OR has_function_privilege('authenticated',p.oid,'EXECUTE')
   );
 IF violations IS NOT NULL THEN
   RAISE EXCEPTION 'WB32_PRIVATE_FUNCTION_EXECUTE_EXPOSED: %', violations;
 END IF;

 SELECT string_agg(p.oid::regprocedure::text,', '
                    ORDER BY p.oid::regprocedure::text)
 INTO violations
 FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='private' AND p.proname LIKE 'world_boss_%'
   AND NOT has_function_privilege('service_role',p.oid,'EXECUTE');
 IF violations IS NOT NULL THEN
   RAISE EXCEPTION 'WB32_SERVICE_FUNCTION_PRIVILEGE_MISSING: %', violations;
 END IF;

 RAISE NOTICE 'WORLD_BOSS_V32_PRIVATE_ACCESS_OK: % RLS tables, % service-only functions',
   table_count,function_count;
END
$world_boss_access$;
