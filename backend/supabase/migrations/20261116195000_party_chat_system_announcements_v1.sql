-- Party Herald: persistent-party, contract and verified live-event announcements.
-- Requires the Guild Herald chat_messages system-message migration.
BEGIN;

-- System actors must have no player account and are restricted to Guild/Party channels.
ALTER TABLE public.chat_messages
 DROP CONSTRAINT IF EXISTS chat_messages_system_identity_v1;
ALTER TABLE public.chat_messages
 ADD CONSTRAINT chat_messages_system_identity_v1 CHECK (
   (is_system AND account_id IS NULL AND channel_type IN ('guild','party')
     AND system_event_key IS NOT NULL)
   OR (NOT is_system AND account_id IS NOT NULL AND system_event_key IS NULL)
 );
CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_party_system_event_unique_v1
 ON public.chat_messages(channel_id,system_event_key)
 WHERE is_system AND channel_type='party';

CREATE OR REPLACE FUNCTION public.party_chat_post_system_event_v1(
 p_party uuid,p_key text,p_body text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $post$
BEGIN
 IF p_party IS NULL OR length(coalesce(p_key,'')) NOT BETWEEN 4 AND 200
    OR NOT EXISTS(SELECT 1 FROM public.parties WHERE id=p_party) THEN
  RAISE EXCEPTION 'invalid_party_herald_event';
 END IF;
 INSERT INTO public.chat_messages(
  account_id,channel_type,channel_id,sender_name,body,is_system,system_event_key)
 VALUES(NULL,'party',p_party::text,'Party Herald',
  left(coalesce(nullif(trim(p_body),''),'Party update'),300),true,p_key)
 ON CONFLICT DO NOTHING;
END $post$;
REVOKE ALL ON FUNCTION public.party_chat_post_system_event_v1(uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.party_chat_post_system_event_v1(uuid,text,text)
 TO service_role;

-- Announce real member transitions, not character loadout or roster reads.
CREATE OR REPLACE FUNCTION public.party_herald_member_change_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $member$
DECLARE v_name text;v_key text;v_body text;
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.left_at IS NOT NULL THEN RETURN NEW; END IF;
  v_key:='member:'||NEW.account_id||':join:'||to_char(NEW.joined_at AT TIME ZONE 'UTC','YYYYMMDDHH24MISSUS');
  v_body:=' joined the party.';
 ELSE
  IF OLD.left_at IS NULL AND NEW.left_at IS NOT NULL THEN
   v_key:='member:'||NEW.account_id||':leave:'||to_char(NEW.left_at AT TIME ZONE 'UTC','YYYYMMDDHH24MISSUS');
   v_body:=' left the party.';
  ELSIF OLD.left_at IS NOT NULL AND NEW.left_at IS NULL THEN
   v_key:='member:'||NEW.account_id||':join:'||to_char(NEW.joined_at AT TIME ZONE 'UTC','YYYYMMDDHH24MISSUS');
   v_body:=' rejoined the party.';
  ELSE
   RETURN NEW;
  END IF;
 END IF;
 SELECT left(coalesce(nullif(trim(c.name),''),
   nullif(trim(pp.display_name),''),'Adventurer'),40)
 INTO v_name
 FROM (SELECT 1) s
 LEFT JOIN public.characters c ON c.id=NEW.character_id
 LEFT JOIN public.player_profiles pp ON pp.account_id=NEW.account_id;
 PERFORM public.party_chat_post_system_event_v1(NEW.party_id,v_key,coalesce(v_name,'Adventurer')||v_body);
 RETURN NEW;
END $member$;
REVOKE ALL ON FUNCTION public.party_herald_member_change_v1()
 FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS party_herald_member_change_v1 ON public.party_members;
CREATE TRIGGER party_herald_member_change_v1
 AFTER INSERT OR UPDATE OF left_at ON public.party_members
 FOR EACH ROW EXECUTE FUNCTION public.party_herald_member_change_v1();

-- Party contracts are celebrated only on the confirmed completed transition.
CREATE OR REPLACE FUNCTION public.party_herald_contract_completed_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $contract$
DECLARE v_name text;
BEGIN
 SELECT name INTO v_name
 FROM public.party_contract_definitions_v16
 WHERE definition_id=NEW.definition_id AND version=NEW.definition_version;
 PERFORM public.party_chat_post_system_event_v1(NEW.party_id,
  'contract:'||NEW.id||':complete',
  'Party Contract completed: '||left(coalesce(nullif(trim(v_name),''),'Contract'),90)
   ||'. Eligible members can claim rewards.');
 RETURN NEW;
END $contract$;
REVOKE ALL ON FUNCTION public.party_herald_contract_completed_v1()
 FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS party_herald_contract_completed_v1 ON public.party_contract_instances_v16;
CREATE TRIGGER party_herald_contract_completed_v1
 AFTER UPDATE OF status ON public.party_contract_instances_v16
 FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM 'completed' AND NEW.status='completed')
 EXECUTE FUNCTION public.party_herald_contract_completed_v1();

-- Same canonical party-score milestones currently used by the Party Event UI.
-- Do not emit for scheduled/inactive events or unverified client-side previews.
CREATE OR REPLACE FUNCTION public.party_herald_event_score_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $event$
DECLARE v_event record;v_before bigint:=0;v_after bigint;
 v_threshold integer;v_name text;
BEGIN
 SELECT id,status,starts_at,ends_at,event_id,definition_snapshot
 INTO v_event FROM public.liveops_event_instances WHERE id=NEW.event_instance_id;
 IF NOT FOUND OR v_event.status<>'active'
    OR now()<v_event.starts_at OR now()>=v_event.ends_at THEN RETURN NEW; END IF;
 v_after:=greatest(0,coalesce(NEW.score,0));
 IF TG_OP='UPDATE' THEN v_before:=greatest(0,coalesce(OLD.score,0)); END IF;
 IF v_after<=v_before THEN RETURN NEW; END IF;
 v_name:=left(coalesce(nullif(trim(v_event.definition_snapshot->>'name'),''),
   initcap(replace(v_event.event_id,'_',' ')),'Party Event'),80);
 PERFORM public.party_chat_post_system_event_v1(NEW.party_id,
  'event:'||NEW.event_instance_id||':active','Party Event underway: '||v_name||'.');
 FOREACH v_threshold IN ARRAY ARRAY[2000,4000,6000,9000] LOOP
  IF v_before<v_threshold AND v_after>=v_threshold THEN
   PERFORM public.party_chat_post_system_event_v1(NEW.party_id,
    'event:'||NEW.event_instance_id||':score:'||v_threshold,
    'Party Event milestone: '||v_name||' reached '||v_threshold||' shared points!');
  END IF;
 END LOOP;
 RETURN NEW;
END $event$;
REVOKE ALL ON FUNCTION public.party_herald_event_score_v1()
 FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS party_herald_event_score_v1 ON public.liveops_event_party_progress;
CREATE TRIGGER party_herald_event_score_v1
 AFTER INSERT OR UPDATE OF score ON public.liveops_event_party_progress
 FOR EACH ROW EXECUTE FUNCTION public.party_herald_event_score_v1();

-- Realtime follows the same authoritative current-membership boundary.
-- Nullable system sender is explicitly permitted; player blocks remain enforced.
DROP POLICY IF EXISTS "party chat current members read v16" ON public.chat_messages;
CREATE POLICY "party chat current members read v16"
 ON public.chat_messages FOR SELECT TO authenticated
 USING (
  channel_type='party'
  AND EXISTS(
   SELECT 1 FROM public.parties p
   WHERE p.id::text=chat_messages.channel_id
     AND public.is_active_party_member_v16(p.id,(select auth.uid()))
  )
  AND ((is_system AND account_id IS NULL) OR
   (NOT is_system AND account_id IS NOT NULL AND NOT public.party_social_blocked_v16(account_id)))
 );

-- Guild Herald already updated the unread cursor. Ensure system messages
-- remain unread in Party Chat but cannot impersonate player mentions.
DO $attention$
DECLARE v_src text;
BEGIN
 SELECT pg_get_functiondef('public.social_chat_attention_state_v1()'::regprocedure)
 INTO v_src;
 IF position('and cm.account_id<>v_uid' IN v_src)>0 THEN
  v_src:=replace(v_src,'and cm.account_id<>v_uid',
    'and (cm.account_id is null or cm.account_id<>v_uid)');
  EXECUTE v_src;
 ELSIF position('cm.account_id is null or cm.account_id<>v_uid' IN v_src)=0 THEN
  RAISE EXCEPTION 'party_herald_attention_contract_changed';
 END IF;
END $attention$;

COMMIT;
