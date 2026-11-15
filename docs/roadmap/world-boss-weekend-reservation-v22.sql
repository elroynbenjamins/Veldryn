-- WORLD BOSS V22/V26: PRIVATE REVIEW-ONLY ACCOUNT RAID RESERVATION.
-- REPAIRED: replace prior malformed concatenated draft; no Supabase migration.
-- Requires disposable V17/V18 schema; NOT to staging or production.
-- Five preparation days then ONE continuous 48-hour weekend, 3 account
-- attempts/event; no active game endpoint or World Sigil credit.
BEGIN;

CREATE FUNCTION private.world_boss_v22_window_at(
 p_starts_at timestamptz,p_now timestamptz
) RETURNS integer LANGUAGE plpgsql IMMUTABLE STRICT SECURITY INVOKER
 SET search_path='' AS $win$
DECLARE
 elapsed_seconds numeric;
BEGIN
 IF p_starts_at<>(date_trunc('day',p_starts_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
    OR extract(isodow FROM p_starts_at AT TIME ZONE 'UTC')<>1
 THEN RETURN -1; END IF;
 elapsed_seconds:=extract(epoch FROM p_now-p_starts_at);
 IF elapsed_seconds<432000 OR elapsed_seconds>=604800 THEN RETURN -1; END IF;
 RETURN 0;
END
$win$;

-- No public RPC. Trusted service supplies authenticated account ID and V12
-- owner-bound character snapshots; this function only checks DB invariants.
-- Packet/engine schema pairing is explicit so an old V22 settlement worker
-- cannot mistake an authored V26 result for a V22 generic-timer result.
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
 -- Always lock event FIRST; same ordering as V18 checkout/settle.
 SELECT * INTO e FROM private.world_boss_events_v17
 WHERE id=p_event FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB22_EVENT_NOT_FOUND'; END IF;

 -- An idempotency retry does not re-consume a slot, regenerate entropy,
 -- or require the combat window to remain open.
 SELECT * INTO old FROM private.world_boss_attempts_v17
 WHERE event_id=p_event AND account_id=p_account AND request_id=p_request
 FOR UPDATE;
 IF FOUND THEN
  RETURN private.world_boss_v18_reserve(
   p_event,p_account,p_character,p_request,p_order,p_seed,p_digest,
   p_account_roster,p_engine,p_worker,p_camp_digest,p_profile_digest);
 END IF;

 now_at:=clock_timestamp();
 IF e.status<>'active' OR e.ends_at<>e.starts_at+interval '7 days'
    OR private.world_boss_v22_window_at(e.starts_at,now_at)<0
 THEN RAISE EXCEPTION 'WB22_WEEKEND_WINDOW_CLOSED'; END IF;

 IF p_account_roster IS NULL
    OR jsonb_typeof(p_account_roster)<>'object'
    OR NOT (
      (p_account_roster->>'schema'='world-boss-v22-account-raid-prototype'
       AND p_engine='world-boss-account-raid-v22-prototype')
      OR
      (p_account_roster->>'schema'='world-boss-v26-authored-account-packet'
       AND p_engine='world-boss-account-rounds-v25-prototype')
    )
    OR p_account_roster->>'accountId' IS DISTINCT FROM p_account::text
    OR p_account_roster->>'eventId' IS DISTINCT FROM p_event::text
    OR p_account_roster->>'requestId' IS DISTINCT FROM p_request
    OR p_account_roster->>'order' IS DISTINCT FROM p_order
    OR p_account_roster->>'rulesVersion' IS DISTINCT FROM e.rules_version
    OR p_account_roster->>'rosterDigest' IS DISTINCT FROM p_digest
    OR p_digest IS NULL OR p_digest !~ '^[a-f0-9]{64}$'
    OR jsonb_typeof(p_account_roster->'characters')<>'array'
    OR jsonb_typeof(p_account_roster->'encounterProfiles')<>'object'
    OR p_account_roster->>'serializedRoster' IS NULL
    OR length(p_account_roster->>'serializedRoster') NOT BETWEEN 128 AND 262144
 THEN RAISE EXCEPTION 'WB22_INVALID_FROZEN_ACCOUNT_ROSTER'; END IF;

 size:=jsonb_array_length(p_account_roster->'characters');
 IF size<1 OR size>5
 THEN RAISE EXCEPTION 'WB22_CHARACTER_COUNT_OUT_OF_RANGE'; END IF;

 FOR item IN SELECT value FROM jsonb_array_elements(p_account_roster->'characters')
 LOOP
  character_text:=item->>'characterId';
  IF character_text IS NULL
     OR character_text !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     OR character_text=ANY(seen)
  THEN RAISE EXCEPTION 'WB22_INVALID_OR_DUPLICATE_CHARACTER'; END IF;
  seen:=array_append(seen,character_text);
  IF character_text=p_character::text THEN seen_primary:=true; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.characters
   WHERE id=character_text::uuid AND account_id=p_account)
  THEN RAISE EXCEPTION 'WB22_ROSTER_CHARACTER_NOT_OWNED'; END IF;
 END LOOP;
 IF NOT seen_primary
 THEN RAISE EXCEPTION 'WB22_PRIMARY_MISSING_FROM_ROSTER'; END IF;

 -- Current global phase and corresponding server-frozen encounter are
 -- selected WHILE holding the same event row lock used by V18 settlement.
 IF p_camp_digest IS NULL OR p_camp_digest !~ '^[a-f0-9]{64}$'
    OR p_account_roster->'warCamp'->>'digest' IS DISTINCT FROM p_camp_digest
 THEN RAISE EXCEPTION 'WB22_MISSING_FROZEN_WAR_CAMP'; END IF;
 selected_phase:=CASE
  WHEN e.remaining_hp::numeric/e.max_hp<=0.3 THEN 'enraged'
  WHEN e.remaining_hp::numeric/e.max_hp<=0.7 THEN 'exposed'
  ELSE 'armored' END;
 selected_profile_digest:=p_account_roster->'encounterProfiles'
  ->selected_phase->>'digest';
 IF selected_profile_digest IS NULL
    OR selected_profile_digest !~ '^[a-f0-9]{64}$'
    OR (p_profile_digest IS NOT NULL
        AND p_profile_digest IS DISTINCT FROM selected_profile_digest)
 THEN RAISE EXCEPTION 'WB22_FROZEN_PHASE_PROFILE_MISMATCH'; END IF;

 -- V18 checks underlying account ownership of the primary character,
 -- account-wide three ordinal slots, immutable replay lease and event lock.
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
