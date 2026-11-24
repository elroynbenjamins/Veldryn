\set ON_ERROR_STOP on
-- Disposable database only: real migration functions on minimal synthetic app tables.
DO $$ BEGIN IF current_database()<>'winter_hearth_rpc_review_2026' THEN RAISE EXCEPTION 'QA_DISPOSABLE_DATABASE_REQUIRED'; END IF; END $$;
CREATE SCHEMA auth;
CREATE SCHEMA private;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE public.guilds(id uuid PRIMARY KEY);
CREATE TABLE public.guild_members(guild_id uuid REFERENCES public.guilds,account_id uuid REFERENCES auth.users UNIQUE,joined_at timestamptz NOT NULL DEFAULT '2026-11-01',PRIMARY KEY(guild_id,account_id));
CREATE TABLE public.online_game_states(account_id uuid PRIMARY KEY REFERENCES auth.users,character_id text NOT NULL,state jsonb NOT NULL,revision bigint NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.live_events(event_id text PRIMARY KEY,enabled boolean NOT NULL,config jsonb NOT NULL,starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL);
CREATE TABLE public.guild_bank_balances(guild_id uuid REFERENCES public.guilds,resource_id text,amount bigint,PRIMARY KEY(guild_id,resource_id));
CREATE TABLE public.guild_cosmetic_unlocks(guild_id uuid REFERENCES public.guilds,unlock_id text,source_kind text,source_ref text,PRIMARY KEY(guild_id,unlock_id));
\ir ../../../backend/supabase/migrations/20261123221000_winter_hearth_2026_guild_market_v1.sql
\ir ../../../backend/supabase/migrations/20261123221200_winter_hearth_2026_snapshot_lock_fix_v1.sql
\ir ../../../backend/supabase/migrations/20261124081801_winter_hearth_2026_donation_context_v2.sql
\ir ../../../backend/supabase/migrations/20261124081820_winter_hearth_2026_cosmetic_milestone_catalog_v1.sql
-- Change only the clock inside the disposable copy of each actual RPC; no test
-- clock parameter or production migration modification.
DO $$ DECLARE f regprocedure; definition text; BEGIN
 FOREACH f IN ARRAY ARRAY['public.winter_hearth_2026_donate_v1(text,integer,text)'::regprocedure,'public.winter_hearth_2026_donate_v2(text,integer,text,uuid,uuid,text,date)'::regprocedure,'public.winter_hearth_2026_snapshot_v1()'::regprocedure] LOOP
  definition:=pg_get_functiondef(f);
  IF position('now()' in definition)=0 THEN RAISE EXCEPTION 'QA_CLOCK_ANCHOR_CHANGED';END IF;
  EXECUTE replace(definition,'now()', '(current_setting(''winter_hearth.qa_now'')::timestamptz)');
 END LOOP;
END $$;
INSERT INTO public.live_events VALUES('EVT_ANNUAL_012_2026',true,'{"winterHearthGuildEnabled":true}','2026-12-03','2026-12-27');
INSERT INTO public.guilds VALUES('11111111-1111-4111-8111-111111111111');
DO $$ DECLARE i int; a uuid; BEGIN
 FOR i IN 1..3 LOOP
  a:=('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa'||i)::uuid;
  INSERT INTO auth.users VALUES(a);
  INSERT INTO public.guild_members(guild_id,account_id) VALUES('11111111-1111-4111-8111-111111111111',a);
  INSERT INTO public.online_game_states(account_id,character_id,state) VALUES(a,'qa-character-'||i,'{"settings":{"lockedItemIds":[]},"inventory":{"stacks":[{"itemId":"GREENWOOD_LOG","quantity":10000},{"itemId":"FROSTFALL_CHRISTMAS_LIGHTS_2026","quantity":1000},{"itemId":"IRONWOOD_LOG","quantity":999,"locked":true}]}}');
 END LOOP;
END $$;
DO $qa$
DECLARE i int; w int; a uuid; g uuid:='11111111-1111-4111-8111-111111111111'; t timestamptz; wk date; r jsonb; rev bigint; nonce text; expected int; gold bigint;
BEGIN
 IF has_function_privilege('authenticated','public.winter_hearth_2026_donate_v1(text,integer,text)','execute') OR has_function_privilege('anon','public.winter_hearth_2026_donate_v2(text,integer,text,uuid,uuid,text,date)','execute') THEN RAISE EXCEPTION 'QA_RPC_ACL'; END IF;
 FOR w IN 1..4 LOOP
  t:=(ARRAY['2026-12-03T12:00:00Z','2026-12-08T12:00:00Z','2026-12-15T12:00:00Z','2026-12-22T12:00:00Z']::timestamptz[])[w]; wk:=date_trunc('week',t AT TIME ZONE 'UTC')::date;
  PERFORM set_config('winter_hearth.qa_now',t::text,true);
  FOR i IN 1..CASE WHEN w=4 THEN 1 ELSE 3 END LOOP
   a:=('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa'||i)::uuid;
   PERFORM set_config('request.jwt.claim.sub',a::text,true);
   nonce:='qa-logs-'||w||'-'||i;
   r:=public.winter_hearth_2026_donate_v2('GREENWOOD_LOG',2500,nonce,a,g,'qa-character-'||i,wk);
   IF (r->>'quantity')::int<>2500 OR (r->>'alreadyProcessed')::boolean THEN RAISE EXCEPTION 'QA_LOG_RECEIPT'; END IF;
   SELECT revision INTO rev FROM public.online_game_states WHERE account_id=a;
   r:=public.winter_hearth_2026_donate_v2('GREENWOOD_LOG',2500,nonce,a,g,'qa-character-'||i,wk);
   IF NOT (r->>'alreadyProcessed')::boolean OR (SELECT revision FROM public.online_game_states WHERE account_id=a)<>rev THEN RAISE EXCEPTION 'QA_REPLAY_DEBIT'; END IF;
   r:=public.winter_hearth_2026_donate_v2('FROSTFALL_CHRISTMAS_LIGHTS_2026',250,'qa-lights-'||w||'-'||i,a,g,'qa-character-'||i,wk);
   IF (r->>'quantity')::int<>250 OR (r->>'alreadyProcessed')::boolean THEN RAISE EXCEPTION 'QA_LIGHT_RECEIPT'; END IF;
   BEGIN
    PERFORM public.winter_hearth_2026_donate_v2('GREENWOOD_LOG',1,'qa-cap-'||w||'-'||i,a,g,'qa-character-'||i,wk);
    RAISE EXCEPTION 'QA_CAP_ACCEPTED';
   EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT IN ('WINTER_HEARTH_WEEKLY_CAP','WINTER_HEARTH_TRACK_FULL') THEN RAISE;END IF; END;
   BEGIN
    PERFORM public.winter_hearth_2026_donate_v2('GREENWOOD_LOG',2499,nonce,a,g,'qa-character-'||i,wk);
    RAISE EXCEPTION 'QA_NONCE_CONFLICT_ACCEPTED';
   EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'WINTER_HEARTH_NONCE_CONFLICT' THEN RAISE;END IF; END;
  END LOOP;
  expected:=w*25; gold:=(ARRAY[10000,30000,60000,110000])[w];
  r:=public.winter_hearth_2026_snapshot_v1();
  IF (r->>'milestonePercent')::int<>expected OR (SELECT amount FROM public.guild_bank_balances WHERE guild_id=g AND resource_id='gold')<>gold THEN RAISE EXCEPTION 'QA_MILESTONE_%',w; END IF;
  IF (SELECT count(*) FROM public.guild_cosmetic_unlocks WHERE guild_id=g)<>(ARRAY[0,1,2,4])[w] THEN RAISE EXCEPTION 'QA_COSMETIC_%',w; END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.guild_winter_hearth_2026_donations)<>20 OR (SELECT sum(revision) FROM public.online_game_states)<>20 THEN RAISE EXCEPTION 'QA_EXACT_ONCE';END IF;
 IF (SELECT count(*) FROM public.guild_winter_hearth_2026_milestones)<>4 THEN RAISE EXCEPTION 'QA_MILESTONES';END IF;
 IF (SELECT coalesce(sum((s->>'quantity')::int),0) FROM public.online_game_states CROSS JOIN LATERAL jsonb_array_elements(state#>'{inventory,stacks}') s WHERE s->>'itemId'='GREENWOOD_LOG')<>5000 THEN RAISE EXCEPTION 'QA_LOG_CONSERVATION'; END IF;
 IF (SELECT coalesce(sum((s->>'quantity')::int),0) FROM public.online_game_states CROSS JOIN LATERAL jsonb_array_elements(state#>'{inventory,stacks}') s WHERE s->>'itemId'='FROSTFALL_CHRISTMAS_LIGHTS_2026')<>500 THEN RAISE EXCEPTION 'QA_LIGHT_CONSERVATION'; END IF;
 PERFORM set_config('winter_hearth.qa_now','2026-12-27T00:00:00Z',true);
 r:=public.winter_hearth_2026_snapshot_v1();
 IF (r->>'active')::boolean OR (r->>'gatheringSpeedBps')::int<>0 OR (SELECT count(*) FROM public.guild_cosmetic_unlocks WHERE guild_id=g)<>4 THEN RAISE EXCEPTION 'QA_EXPIRY';END IF;
END $qa$;
SELECT 'PASS actual v2 migration, inventory conservation, replay, four milestones, 110k Gold, four permanent cosmetics, expiry' AS result;
