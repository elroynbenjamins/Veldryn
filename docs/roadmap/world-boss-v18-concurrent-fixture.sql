-- Disposable database ONLY. Fixture ownership and accounts do not exist in
-- staging/production. This script is safe only after V17 + V18 SQL dry run.
INSERT INTO auth.users(id)
SELECT ('10000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid
FROM generate_series(1,14) AS i;
INSERT INTO public.characters(id,account_id)
SELECT ('20000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,
       ('10000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid
FROM generate_series(1,14) AS i;
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
VALUES ('30000000-0000-4000-8000-000000000001','hollowroot','active',
 clock_timestamp()-interval '1 hour',clock_timestamp()+interval '6 days',
 'wb18-review-fixture',1,1);
