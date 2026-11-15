-- WORLD BOSS V21: PRIVATE, REVIEW-ONLY ECHO CONSENT LIFECYCLE.
-- This is NOT a migration. NEVER apply to staging or production.
-- Requires disposable V17/V18/V20 schema; no route or event is enabled.
-- The invoking server MUST authenticate the player, derive p_owner from the
-- verified session (NEVER from client input), and call this via private PG.
-- This SECURITY INVOKER function itself is not an authentication boundary.
BEGIN;

-- Immutable command receipts make same-key network retries deterministic even
-- if the event closes or the owner revokes/changes consent afterward.
CREATE TABLE private.world_boss_consent_commands_v21 (
 event_id uuid NOT NULL REFERENCES private.world_boss_events_v17(id) ON DELETE RESTRICT,
 owner_account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 request_id text NOT NULL CHECK (request_id ~ '^[A-Za-z0-9_-]{8,128}$'),
 character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE RESTRICT,
 enabled boolean NOT NULL,
 expected_revision bigint NOT NULL CHECK (expected_revision>=0),
 resulting_revision bigint NOT NULL CHECK (resulting_revision>=1),
 receipt jsonb NOT NULL CHECK (jsonb_typeof(receipt)='object'),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (event_id,owner_account_id,request_id)
);
ALTER TABLE private.world_boss_consent_commands_v21 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_consent_commands_v21 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON private.world_boss_consent_commands_v21 TO service_role;

-- Event lock FIRST: same order as V18 reserve and V20 consent guard.
-- A concurrent reservation cannot borrow a newly-revoked grant; an already
-- frozen reservation and its retry remain valid per the approved V20 contract.
CREATE FUNCTION private.world_boss_v21_set_consent(
 p_event uuid,p_owner uuid,p_character uuid,p_enabled boolean,
 p_expected_revision bigint,p_request text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $consent$
DECLARE
 e private.world_boss_events_v17%ROWTYPE;
 previous private.world_boss_consent_commands_v21%ROWTYPE;
 grant_row private.world_boss_echo_consents_v20%ROWTYPE;
 has_grant boolean;
 now_at timestamptz;
 next_revision bigint;
 result jsonb;
BEGIN
 IF p_event IS NULL OR p_owner IS NULL OR p_character IS NULL OR
    p_enabled IS NULL OR p_expected_revision IS NULL OR
    p_expected_revision<0 OR p_request IS NULL OR
    p_request !~ '^[A-Za-z0-9_-]{8,128}$'
 THEN RAISE EXCEPTION 'WB21_INVALID_CONSENT_COMMAND'; END IF;

 SELECT * INTO e FROM private.world_boss_events_v17
 WHERE id=p_event FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB21_EVENT_NOT_FOUND'; END IF;

 SELECT * INTO previous FROM private.world_boss_consent_commands_v21
 WHERE event_id=p_event AND owner_account_id=p_owner AND request_id=p_request;
 IF FOUND THEN
  IF previous.character_id IS DISTINCT FROM p_character OR
     previous.enabled IS DISTINCT FROM p_enabled OR
     previous.expected_revision IS DISTINCT FROM p_expected_revision
  THEN RAISE EXCEPTION 'WB21_REQUEST_REUSED'; END IF;
  RETURN jsonb_set(previous.receipt,'{repeated}','true'::jsonb);
 END IF;

 IF NOT EXISTS (
  SELECT 1 FROM public.characters
  WHERE id=p_character AND account_id=p_owner
 ) THEN RAISE EXCEPTION 'WB21_CHARACTER_NOT_OWNED'; END IF;

 now_at:=clock_timestamp();
 IF p_enabled AND (e.status<>'active' OR now_at<e.starts_at OR now_at>=e.ends_at)
 THEN RAISE EXCEPTION 'WB21_EVENT_NOT_OPEN_FOR_SHARING'; END IF;

 SELECT * INTO grant_row FROM private.world_boss_echo_consents_v20
 WHERE event_id=p_event AND owner_account_id=p_owner FOR UPDATE;
 has_grant:=FOUND;

 IF (NOT has_grant AND p_expected_revision<>0) OR
    (has_grant AND grant_row.consent_revision<>p_expected_revision)
 THEN RAISE EXCEPTION 'WB21_STALE_CONSENT_REVISION'; END IF;
 IF NOT p_enabled AND NOT has_grant
 THEN RAISE EXCEPTION 'WB21_NO_GRANT_TO_REVOKE'; END IF;
 IF has_grant AND grant_row.consent_revision=9223372036854775807
 THEN RAISE EXCEPTION 'WB21_CONSENT_REVISION_EXHAUSTED'; END IF;

 IF p_enabled THEN
  IF has_grant THEN
   UPDATE private.world_boss_echo_consents_v20
   SET character_id=p_character,consent_revision=consent_revision+1,
       enabled=true,granted_at=now_at,
       expires_at=LEAST(e.ends_at,now_at+interval '7 days'),
       updated_at=now_at
   WHERE event_id=p_event AND owner_account_id=p_owner
   RETURNING consent_revision INTO next_revision;
  ELSE
   INSERT INTO private.world_boss_echo_consents_v20(
    event_id,owner_account_id,character_id,consent_revision,enabled,
    granted_at,expires_at,updated_at)
   VALUES (p_event,p_owner,p_character,1,true,now_at,
           LEAST(e.ends_at,now_at+interval '7 days'),now_at)
   RETURNING consent_revision INTO next_revision;
  END IF;
 ELSE
  -- A revoke increments revision even if the previous grant was already
  -- disabled. This fences any pending candidate read with the old revision.
  IF grant_row.character_id IS DISTINCT FROM p_character
  THEN RAISE EXCEPTION 'WB21_CONSENT_CHARACTER_CHANGED'; END IF;
  UPDATE private.world_boss_echo_consents_v20
  SET enabled=false,consent_revision=consent_revision+1,updated_at=now_at
  WHERE event_id=p_event AND owner_account_id=p_owner
  RETURNING consent_revision INTO next_revision;
 END IF;

 result:=jsonb_build_object(
  'eventId',p_event::text,'characterId',p_character::text,
  'enabled',p_enabled,'consentRevision',next_revision,'repeated',false);
 INSERT INTO private.world_boss_consent_commands_v21(
  event_id,owner_account_id,request_id,character_id,enabled,
  expected_revision,resulting_revision,receipt)
 VALUES(p_event,p_owner,p_request,p_character,p_enabled,
        p_expected_revision,next_revision,result);
 RETURN result;
END
$consent$;

REVOKE ALL ON FUNCTION private.world_boss_v21_set_consent(
 uuid,uuid,uuid,boolean,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_v21_set_consent(
 uuid,uuid,uuid,boolean,bigint,text) TO service_role;
COMMIT;
