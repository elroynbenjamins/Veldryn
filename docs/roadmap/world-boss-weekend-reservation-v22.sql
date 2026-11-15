-- WORLD BOSS V22: PRIVATE, REVIEW-ONLY WEEKEND ACCOUNT RAID RESERVATION.
-- Depends on disposable V17/V18 tables/functions; NEVER apply to Supabase
-- staging/production. No route or World Boss feature is enabled.
--
-- Event starts Monday 00:00 UTC, runs until following Monday 00:00 UTC.
-- Mon-Fri: community War Camp preparations (separate donation ledger).
-- Sat 00:00 UTC through Mon 00:00 UTC (exclusive): one continuous 48h raid window.
-- Week 2: cooldown, enforced by a separately scheduled event calendar.
-- Three battle attempts PER ACCOUNT PER EVENT, NOT per character or window.
BEGIN;

-- Pure UTC math; returns 0 throughout the 48-hour weekend, -1 otherwise.
-- Not a public or user-supplied clock endpoint.
CREATE FUNCTION private.world_boss_v22_window_at(
 p_starts_at timestamptz,p_now timestamptz
) RETURNS integer LANGUAGE plpgsql IMMUTABLE STRICT SECURITY INVOKER
 SET search_path='' AS $win$
DECLARE
 elapsed_seconds numeric;
BEGIN
 IF p_starts_at<>date_trunc('day',p_starts_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
    OR extract(isodow FROM p_starts_at AT TIME ZONE 'UTC')<>1
 THEN RETURN -1; END IF;
 elapsed_seconds:=extract(epoch FROM p_now-p_starts_at);
 -- Exactly Saturday 00:00 through Monday 00:00 UTC, half-open.
 IF elapsed_seconds<432000 OR elapsed_seconds>=604800
 THEN RETURN -1; END IF;
 RETURN 0;
END
$win$;

-- NOTE: V22's frozen packet is a NEW schema. V19's 4-Echo worker is NOT
-- compatible; this reservation draft must stay unmounted until an audited
-- V22 worker verifies every V12 loadout hash and settles the account ledger.
-- The server injects p_account from verified Auth and all roster snapshots
-- from authoritative owner-only state; no client GameState or damage accepted.
CREATE FUNCTION private.world_boss_v22_reserve_account(
 p_event uuid,p_account uuid,p_character uuid,p_request text,
 p_order text,p_seed text,p_digest text,p_account_roster jsonb,
 p_engine text,p_worker text,p_camp_digest text DEFAULT NULL,
 p_profile_digest text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $raid$
DECLARE
 e private.world_boss_events_v17%ROWTYPE;
 old private.world_boss_attempts_v17%ROWTYPE;
 item jsonb;
 seen text[]:=ARRAY[]::text[];
 character_text text;
 seen_primary boolean:=false;
 size integer;
 now_at timestamptz;
 selected_phase text;
 selected_profile_digest text;
BEGIN
 -- Event FIRST, identical lock order to V18 and V21.
 SELECT * INTO e FROM private.world_boss_events_v17
 WHERE id=p_event FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB22_EVENT_NOT_FOUND'; END IF;

 -- Lost ACK / post-window retries must return the frozen original receipt.
 SELECT * INTO old FROM private.world_boss_attempts_v17
 WHERE event_id=p_event AND account_id=p_account AND request_id=p_request
 FOR UPDATE;
 IF FOUND THEN
  RETURN private.world_boss_v18_reserve(
   p_event,p_account,p_character,p_request,p_order,p_seed,p_digest,
   p_account_roster,p_engine,p_worker,p_camp_digest,p_profile_digest);
 END IF;

 now_at:=clock_timestamp();
 IF e.status<>'active' OR e.ends_at<>e.starts_at+interval '7 days' OR
    private.world_boss_v22_window_at(e.starts_at,now_at)<0
 THEN RAISE EXCEPTION 'WB22_WEEKEND_WINDOW_CLOSED'; END IF;
 IF p_account_roster IS NULL OR
    p_account_roster->>'schema'<>'world-boss-v22-account-raid-prototype' OR
    p_account_roster->>'accountId' IS DISTINCT FROM p_account::text OR
    jsonb_typeof(p_account_roster->'characters')<>'array' OR
    p_engine NOT LIKE 'world-boss-account-raid-v22%' OR
    p_digest !~ '^[a-f0-9]{64}
 THEN RAISE EXCEPTION 'WB22_INVALID_FROZEN_ACCOUNT_ROSTER'; END IF;
 size:=jsonb_array_length(p_account_roster->'characters');
 IF size<1 OR size>5
 THEN RAISE EXCEPTION 'WB22_CHARACTER_COUNT_OUT_OF_RANGE'; END IF;

 FOR item IN SELECT value FROM jsonb_array_elements(p_account_roster->'characters')
 LOOP
  character_text:=item->>'characterId';
  IF character_text IS NULL OR
     character_text !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' OR
     character_text=ANY(seen)
  THEN RAISE EXCEPTION 'WB22_INVALID_OR_DUPLICATE_CHARACTER'; END IF;
  seen:=array_append(seen,character_text);
  IF character_text=p_character::text THEN seen_primary:=true; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.characters
   WHERE id=character_text::uuid AND account_id=p_account)
  THEN RAISE EXCEPTION 'WB22_ROSTER_CHARACTER_NOT_OWNED'; END IF;
 END LOOP;
 IF NOT seen_primary
 THEN RAISE EXCEPTION 'WB22_PRIMARY_MISSING_FROM_ROSTER'; END IF;

 -- We already hold the event row lock, so freeze the boss phase and its
 -- encounter digest from the same global HP that V18 will reserve against.
 -- Otherwise the generic V18 routine stores a NULL profile for V22 packets.
 IF p_camp_digest IS NULL OR
    p_camp_digest !~ '^[a-f0-9]{64}
END
$raid$;

REVOKE ALL ON FUNCTION private.world_boss_v22_window_at(
 timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v22_reserve_account(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_v22_window_at(
 timestamptz,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v22_reserve_account(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 TO service_role;
COMMIT;
 OR
    p_account_roster->>'rosterDigest' IS DISTINCT FROM p_digest OR
    p_account_roster->>'eventId' IS DISTINCT FROM p_event::text OR
    p_account_roster->>'requestId' IS DISTINCT FROM p_request OR
    p_account_roster->>'order' IS DISTINCT FROM p_order OR
    p_account_roster->>'rulesVersion' IS DISTINCT FROM e.rules_version
 THEN RAISE EXCEPTION 'WB22_INVALID_FROZEN_ACCOUNT_ROSTER'; END IF;
 size:=jsonb_array_length(p_account_roster->'characters');
 IF size<1 OR size>5
 THEN RAISE EXCEPTION 'WB22_CHARACTER_COUNT_OUT_OF_RANGE'; END IF;

 FOR item IN SELECT value FROM jsonb_array_elements(p_account_roster->'characters')
 LOOP
  character_text:=item->>'characterId';
  IF character_text IS NULL OR
     character_text !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' OR
     character_text=ANY(seen)
  THEN RAISE EXCEPTION 'WB22_INVALID_OR_DUPLICATE_CHARACTER'; END IF;
  seen:=array_append(seen,character_text);
  IF character_text=p_character::text THEN seen_primary:=true; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.characters
   WHERE id=character_text::uuid AND account_id=p_account)
  THEN RAISE EXCEPTION 'WB22_ROSTER_CHARACTER_NOT_OWNED'; END IF;
 END LOOP;
 IF NOT seen_primary
 THEN RAISE EXCEPTION 'WB22_PRIMARY_MISSING_FROM_ROSTER'; END IF;

 -- V18 atomically enforces ONE account attempt ordinal (max three),
 -- not one ordinal for each of the 1-5 participating characters.
 RETURN private.world_boss_v18_reserve(
  p_event,p_account,p_character,p_request,p_order,p_seed,p_digest,
  p_account_roster,p_engine,p_worker,p_camp_digest,p_profile_digest);
END
$raid$;

REVOKE ALL ON FUNCTION private.world_boss_v22_window_at(
 timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v22_reserve_account(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_v22_window_at(
 timestamptz,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v22_reserve_account(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 TO service_role;
COMMIT;
 OR
    p_account_roster->'warCamp'->>'digest' IS DISTINCT FROM p_camp_digest OR
    jsonb_typeof(p_account_roster->'encounterProfiles')<>'object'
 THEN RAISE EXCEPTION 'WB22_MISSING_FROZEN_WAR_CAMP'; END IF;
 selected_phase:=CASE
  WHEN e.remaining_hp::numeric/e.max_hp<=0.3 THEN 'enraged'
  WHEN e.remaining_hp::numeric/e.max_hp<=0.7 THEN 'exposed'
  ELSE 'armored' END;
 selected_profile_digest:=p_account_roster->'encounterProfiles'
  ->selected_phase->>'digest';
 IF selected_profile_digest IS NULL OR
    selected_profile_digest !~ '^[a-f0-9]{64}
END
$raid$;

REVOKE ALL ON FUNCTION private.world_boss_v22_window_at(
 timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v22_reserve_account(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_v22_window_at(
 timestamptz,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v22_reserve_account(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 TO service_role;
COMMIT;
 OR
    p_account_roster->>'rosterDigest' IS DISTINCT FROM p_digest OR
    p_account_roster->>'eventId' IS DISTINCT FROM p_event::text OR
    p_account_roster->>'requestId' IS DISTINCT FROM p_request OR
    p_account_roster->>'order' IS DISTINCT FROM p_order OR
    p_account_roster->>'rulesVersion' IS DISTINCT FROM e.rules_version
 THEN RAISE EXCEPTION 'WB22_INVALID_FROZEN_ACCOUNT_ROSTER'; END IF;
 size:=jsonb_array_length(p_account_roster->'characters');
 IF size<1 OR size>5
 THEN RAISE EXCEPTION 'WB22_CHARACTER_COUNT_OUT_OF_RANGE'; END IF;

 FOR item IN SELECT value FROM jsonb_array_elements(p_account_roster->'characters')
 LOOP
  character_text:=item->>'characterId';
  IF character_text IS NULL OR
     character_text !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' OR
     character_text=ANY(seen)
  THEN RAISE EXCEPTION 'WB22_INVALID_OR_DUPLICATE_CHARACTER'; END IF;
  seen:=array_append(seen,character_text);
  IF character_text=p_character::text THEN seen_primary:=true; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.characters
   WHERE id=character_text::uuid AND account_id=p_account)
  THEN RAISE EXCEPTION 'WB22_ROSTER_CHARACTER_NOT_OWNED'; END IF;
 END LOOP;
 IF NOT seen_primary
 THEN RAISE EXCEPTION 'WB22_PRIMARY_MISSING_FROM_ROSTER'; END IF;

 -- V18 atomically enforces ONE account attempt ordinal (max three),
 -- not one ordinal for each of the 1-5 participating characters.
 RETURN private.world_boss_v18_reserve(
  p_event,p_account,p_character,p_request,p_order,p_seed,p_digest,
  p_account_roster,p_engine,p_worker,p_camp_digest,p_profile_digest);
END
$raid$;

REVOKE ALL ON FUNCTION private.world_boss_v22_window_at(
 timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v22_reserve_account(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_v22_window_at(
 timestamptz,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v22_reserve_account(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 TO service_role;
COMMIT;
 OR
    (p_profile_digest IS NOT NULL AND
     p_profile_digest IS DISTINCT FROM selected_profile_digest)
 THEN RAISE EXCEPTION 'WB22_FROZEN_PHASE_PROFILE_MISMATCH'; END IF;

 -- V18 atomically enforces ONE account attempt ordinal (max three),
 -- not one ordinal for each of the 1-5 participating characters.
 RETURN private.world_boss_v18_reserve(
  p_event,p_account,p_character,p_request,p_order,p_seed,p_digest,
  p_account_roster,p_engine,p_worker,p_camp_digest,selected_profile_digest);
END
$raid$;

REVOKE ALL ON FUNCTION private.world_boss_v22_window_at(
 timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v22_reserve_account(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_v22_window_at(
 timestamptz,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v22_reserve_account(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 TO service_role;
COMMIT;
 OR
    p_account_roster->>'rosterDigest' IS DISTINCT FROM p_digest OR
    p_account_roster->>'eventId' IS DISTINCT FROM p_event::text OR
    p_account_roster->>'requestId' IS DISTINCT FROM p_request OR
    p_account_roster->>'order' IS DISTINCT FROM p_order OR
    p_account_roster->>'rulesVersion' IS DISTINCT FROM e.rules_version
 THEN RAISE EXCEPTION 'WB22_INVALID_FROZEN_ACCOUNT_ROSTER'; END IF;
 size:=jsonb_array_length(p_account_roster->'characters');
 IF size<1 OR size>5
 THEN RAISE EXCEPTION 'WB22_CHARACTER_COUNT_OUT_OF_RANGE'; END IF;

 FOR item IN SELECT value FROM jsonb_array_elements(p_account_roster->'characters')
 LOOP
  character_text:=item->>'characterId';
  IF character_text IS NULL OR
     character_text !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' OR
     character_text=ANY(seen)
  THEN RAISE EXCEPTION 'WB22_INVALID_OR_DUPLICATE_CHARACTER'; END IF;
  seen:=array_append(seen,character_text);
  IF character_text=p_character::text THEN seen_primary:=true; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.characters
   WHERE id=character_text::uuid AND account_id=p_account)
  THEN RAISE EXCEPTION 'WB22_ROSTER_CHARACTER_NOT_OWNED'; END IF;
 END LOOP;
 IF NOT seen_primary
 THEN RAISE EXCEPTION 'WB22_PRIMARY_MISSING_FROM_ROSTER'; END IF;

 -- V18 atomically enforces ONE account attempt ordinal (max three),
 -- not one ordinal for each of the 1-5 participating characters.
 RETURN private.world_boss_v18_reserve(
  p_event,p_account,p_character,p_request,p_order,p_seed,p_digest,
  p_account_roster,p_engine,p_worker,p_camp_digest,p_profile_digest);
END
$raid$;

REVOKE ALL ON FUNCTION private.world_boss_v22_window_at(
 timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v22_reserve_account(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_v22_window_at(
 timestamptz,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v22_reserve_account(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 TO service_role;
COMMIT;
