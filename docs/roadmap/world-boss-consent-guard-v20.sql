-- WORLD BOSS V20: HIDDEN CONSENT RECHECK PROTOTYPE.
-- REVIEW ONLY. DO NOT RUN AS A MIGRATION OR ON LIVE/STAGING SUPABASE.
-- Depends on isolated V17/V18 schema loaded in disposable PG 16.
-- This is NOT a public grant endpoint and does NOT enable World Boss.
BEGIN;

CREATE TABLE private.world_boss_echo_consents_v20(
 event_id uuid NOT NULL REFERENCES private.world_boss_events_v17(id) ON DELETE RESTRICT,
 owner_account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE RESTRICT,
 consent_revision bigint NOT NULL CHECK (consent_revision>=1),
 enabled boolean NOT NULL DEFAULT false,
 granted_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count>=0),
 PRIMARY KEY(event_id,owner_account_id),
 CHECK (expires_at>granted_at),
 CHECK (expires_at<=granted_at+interval '7 days')
);
CREATE INDEX world_boss_v20_eligible_echo_idx
 ON private.world_boss_echo_consents_v20(event_id,enabled,expires_at);

ALTER TABLE private.world_boss_echo_consents_v20 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_echo_consents_v20 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON private.world_boss_echo_consents_v20 TO service_role;

-- This wraps V18's short event-lock transaction. Both functions run inside
-- ONE PostgreSQL statement/transaction. The V18 insert is ROLLED BACK if
-- selected Echo consent is revoked, expired or ownership mismatches.
-- SELECT ... FOR SHARE holds each grant until the transaction commits;
-- simultaneous revocation UPDATE cannot slip in between check and insert.
-- The client cannot call either routine or select a candidate owner.
CREATE FUNCTION private.world_boss_v20_reserve(
 p_event uuid,p_account uuid,p_character uuid,p_request text,
 p_order text,p_seed text,p_digest text,p_squad jsonb,
 p_engine text,p_worker text,p_camp_digest text DEFAULT NULL,
 p_profile_digest text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $v20$
DECLARE
 result jsonb;
 selected jsonb;
 r private.world_boss_echo_consents_v20%ROWTYPE;
 seen_owners text[]:=ARRAY[]::text[];
 selected_count integer;
 now_at timestamptz;
 owner_text text;
 char_text text;
BEGIN
 -- Locks event first inside V18; the lock remains held until THIS function
 -- finishes its checks. No separate JS call may substitute for this guard.
 result:=private.world_boss_v18_reserve(
  p_event,p_account,p_character,p_request,p_order,p_seed,p_digest,p_squad,
  p_engine,p_worker,p_camp_digest,p_profile_digest);
 IF (result->>'repeated')::boolean THEN RETURN result; END IF;

 IF p_squad IS NULL OR p_squad->>'schema'<>'world-boss-v20-serialized-v9' OR
    jsonb_typeof(p_squad->'realEchoConsents')<>'array'
 THEN RAISE EXCEPTION 'WB20_UNVERIFIED_FROZEN_PACKET'; END IF;
 selected_count:=jsonb_array_length(p_squad->'realEchoConsents');
 IF selected_count>3 THEN RAISE EXCEPTION 'WB20_TOO_MANY_CONSENTED_ECHOES'; END IF;
 now_at:=clock_timestamp();
 FOR selected IN SELECT value FROM jsonb_array_elements(p_squad->'realEchoConsents')
 LOOP
  owner_text:=selected->>'ownerAccountId';
  char_text:=selected->>'characterId';
  IF selected->>'eventId' IS DISTINCT FROM p_event::text OR
     owner_text IS NULL OR char_text IS NULL OR
     owner_text=p_account::text OR owner_text=ANY(seen_owners) OR
     owner_text !~ '^[0-9a-fA-F-]{36}$' OR char_text !~ '^[0-9a-fA-F-]{36}$'
  THEN RAISE EXCEPTION 'WB20_INVALID_SELECTED_ECHO'; END IF;
  seen_owners:=array_append(seen_owners,owner_text);
  SELECT * INTO r FROM private.world_boss_echo_consents_v20
  WHERE event_id=p_event AND owner_account_id=owner_text::uuid
   AND character_id=char_text::uuid
  FOR SHARE;
  IF NOT FOUND OR NOT r.enabled OR
     r.consent_revision IS DISTINCT FROM
       CASE WHEN (selected->>'consentRevision') ~ '^[0-9]{1,18}$'
        THEN (selected->>'consentRevision')::bigint ELSE NULL END OR
     r.granted_at>now_at OR r.expires_at<=now_at OR
     now_at-r.granted_at>interval '7 days' OR
     NOT EXISTS (
      SELECT 1 FROM public.characters ch
      WHERE ch.id=r.character_id AND ch.account_id=r.owner_account_id
     )
  THEN RAISE EXCEPTION 'WB20_ECHO_CONSENT_REVOKED_OR_UNOWNED'; END IF;
 END LOOP;
 RETURN result;
END
$v20$;

REVOKE ALL ON FUNCTION private.world_boss_v20_reserve(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_v20_reserve(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 TO service_role;
COMMIT;
