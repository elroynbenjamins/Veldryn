-- WORLD BOSS V23: REVIEW-ONLY PRIVATE ACCOUNT-RAID RESERVATION.
-- NEVER APPLY TO STAGING OR PRODUCTION. Depends on disposable V17/V18/V22.
-- No route, player rewards, live boss, or real-world inventory changes.
--
-- V19 four-Echo worker is intentionally incompatible. The new private V23
-- worker verifies the serialized owner-only roster and selected phase digest.
-- SECURITY INVOKER requires a restricted internal service DB role, NEVER
-- client-provided account IDs or general RPC access.
BEGIN;

CREATE FUNCTION private.world_boss_v23_reserve_account(
 p_event uuid,p_account uuid,p_leader uuid,p_request text,
 p_order text,p_seed text,p_digest text,p_packet jsonb,
 p_engine text,p_worker text,p_camp_digest text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $raid$
DECLARE
 e private.world_boss_events_v17%ROWTYPE;
 old private.world_boss_attempts_v17%ROWTYPE;
 phase_at_start text;
 phase_profile jsonb;
 item jsonb;
 char_text text;
 seen text[]:=ARRAY[]::text[];
 seen_leader boolean:=false;
 selected_digest text;
 decoded_roster jsonb;
 latest_version bigint;
 roster_position integer:=0;
 now_at timestamptz;
BEGIN
 -- Lock event FIRST, matching V18's checkout/settlement order.
 SELECT * INTO e FROM private.world_boss_events_v17
 WHERE id=p_event FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB23_EVENT_NOT_FOUND'; END IF;
 SELECT * INTO old FROM private.world_boss_attempts_v17
 WHERE event_id=p_event AND account_id=p_account AND request_id=p_request
 FOR UPDATE;
 IF FOUND THEN
  IF old.character_id IS DISTINCT FROM p_leader OR
     old.war_order IS DISTINCT FROM p_order
  THEN RAISE EXCEPTION 'WB23_REQUEST_ID_REUSED'; END IF;
  -- Read before window check: idempotent late ACK/retry does not spend again.
  RETURN jsonb_build_object('status',old.status,'ordinal',old.ordinal,
   'phase',old.phase,'generation',old.lease_generation,'repeated',true);
 END IF;

 now_at:=clock_timestamp();
 IF e.status<>'active' OR e.ends_at<>e.starts_at+interval '7 days' OR
   private.world_boss_v22_window_at(e.starts_at,now_at)<0
 THEN RAISE EXCEPTION 'WB23_RAID_WINDOW_CLOSED'; END IF;
 IF p_account IS NULL OR p_leader IS NULL OR p_request IS NULL OR
    p_request !~ '^[A-Za-z0-9_-]{8,128}$' OR
    p_order NOT IN ('break_armor','hold_line','steady_assault') OR
    p_seed IS NULL OR length(p_seed) NOT BETWEEN 24 AND 512 OR
    p_seed !~ '^[A-Za-z0-9:_-]+$' OR
    p_digest !~ '^[0-9a-f]{64}$' OR
    p_engine IS DISTINCT FROM 'world-boss-account-raid-v22-prototype' OR
    p_worker !~ '^[A-Za-z0-9:_-]{8,160}$' OR
    p_camp_digest !~ '^[0-9a-f]{64}$' OR
    p_packet IS NULL OR jsonb_typeof(p_packet)<>'object' OR
    octet_length(p_packet::text) NOT BETWEEN 128 AND 262144 OR
    p_packet->>'schema'<>'world-boss-v23-frozen-account-raid' OR
    p_packet->>'eventId' IS DISTINCT FROM p_event::text OR
    p_packet->>'accountId' IS DISTINCT FROM p_account::text OR
    p_packet->>'requestId' IS DISTINCT FROM p_request OR
    p_packet->>'order' IS DISTINCT FROM p_order OR
    p_packet->>'rulesVersion' IS DISTINCT FROM e.rules_version OR
    p_packet->>'rosterDigest' IS DISTINCT FROM p_digest OR
    jsonb_typeof(p_packet->'characters')<>'array' OR
    p_packet->>'serializedRoster' IS NULL OR
    length(p_packet->>'serializedRoster') NOT BETWEEN 128 AND 245760
 THEN RAISE EXCEPTION 'WB23_INVALID_FROZEN_PACKET'; END IF;

 IF jsonb_array_length(p_packet->'characters') NOT BETWEEN 1 AND 5
 THEN RAISE EXCEPTION 'WB23_INVALID_ACCOUNT_CHARACTER_COUNT'; END IF;
 -- Compare the JSONB selector array to the actual serialized roster; only
 -- the latter retains stable JSON key order for the V22 SHA256 digest.
 BEGIN
  decoded_roster:=(p_packet->>'serializedRoster')::jsonb;
 EXCEPTION WHEN others THEN
  RAISE EXCEPTION 'WB23_INVALID_SERIALIZED_ROSTER';
 END;
 IF decoded_roster->>'accountId' IS DISTINCT FROM p_account::text OR
    decoded_roster->>'rosterDigest' IS DISTINCT FROM p_digest OR
    jsonb_typeof(decoded_roster->'characters')<>'array' OR
    jsonb_array_length(decoded_roster->'characters')<>
      jsonb_array_length(p_packet->'characters')
 THEN RAISE EXCEPTION 'WB23_SERIALIZED_ROSTER_MISMATCH'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_packet->'characters')
 LOOP
  char_text:=item->>'characterId';
  IF char_text IS NULL OR
     char_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR
     lower(char_text)=ANY(seen) OR
     item->>'sourceRevision' IS NULL OR
     item->>'sourceRevision' !~ '^[1-9][0-9]{0,15}$' OR
     decoded_roster->'characters'->roster_position->>'characterId'
       IS DISTINCT FROM char_text OR
     decoded_roster->'characters'->roster_position->>'sourceRevision'
       IS DISTINCT FROM item->>'sourceRevision'
  THEN RAISE EXCEPTION 'WB23_DUPLICATE_OR_INVALID_CHARACTER'; END IF;
  seen:=array_append(seen,lower(char_text));
  IF char_text::uuid=p_leader THEN seen_leader:=true; END IF;
  -- Lock each verified character's owner and GameState revision.
  SELECT s.revision::bigint INTO latest_version
  FROM public.characters c
  JOIN public.online_game_states s ON s.character_id=c.id AND
    s.account_id=c.account_id
  WHERE c.id=char_text::uuid AND c.account_id=p_account
  FOR SHARE OF c,s;
  IF NOT FOUND OR latest_version<>(item->>'sourceRevision')::bigint
  THEN RAISE EXCEPTION 'WB23_CHARACTER_SOURCE_REVISION_CHANGED'; END IF;
  roster_position:=roster_position+1;
 END LOOP;
 IF NOT seen_leader THEN RAISE EXCEPTION 'WB23_LEADER_NOT_OWNED_ROSTER'; END IF;

 -- War Camp is immutable for this one reservation. A proper event-wide freeze
 -- at the preparation cutoff is still a separate launch requirement.
 IF jsonb_typeof(p_packet->'warCamp')<>'object' OR
    p_packet->'warCamp'->>'eventId' IS DISTINCT FROM p_event::text OR
    p_packet->'warCamp'->>'digest' IS DISTINCT FROM p_camp_digest OR
    jsonb_typeof(p_packet->'encounterProfiles')<>'object'
 THEN RAISE EXCEPTION 'WB23_INVALID_WAR_CAMP_OR_PROFILES'; END IF;

 phase_at_start:=CASE WHEN e.remaining_hp::numeric/e.max_hp<=0.3
  THEN 'enraged' WHEN e.remaining_hp::numeric/e.max_hp<=0.7
  THEN 'exposed' ELSE 'armored' END;
 phase_profile:=p_packet->'encounterProfiles'->phase_at_start;
 selected_digest:=phase_profile->>'digest';
 IF jsonb_typeof(phase_profile)<>'object' OR
    selected_digest IS NULL OR selected_digest !~ '^[0-9a-f]{64}$' OR
    phase_profile->>'eventId' IS DISTINCT FROM p_event::text OR
    phase_profile->>'boss' IS DISTINCT FROM e.boss_id OR
    phase_profile->>'phase' IS DISTINCT FROM phase_at_start
 THEN RAISE EXCEPTION 'WB23_FROZEN_PHASE_PROFILE_MISMATCH'; END IF;

 -- V18 reserves one ordinal (max 3) PER ACCOUNT and chooses the phase again
 -- under the *same event-row lock*, freezing its specific profile digest.
 -- It also enforces 15-minute maximum hard recovery/replay lease.
 RETURN private.world_boss_v18_reserve(
  p_event,p_account,p_leader,p_request,p_order,p_seed,p_digest,p_packet,
  p_engine,p_worker,p_camp_digest,selected_digest);
END
$raid$;

REVOKE ALL ON FUNCTION private.world_boss_v23_reserve_account(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_v23_reserve_account(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text)
 TO service_role;
COMMIT;
