-- Guild Herald: system notices in the existing Guild Chat feed.
-- Only successful server-owned transitions create deduplicated announcements.
BEGIN;

ALTER TABLE public.chat_messages
 ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS system_event_key text;
ALTER TABLE public.chat_messages ALTER COLUMN account_id DROP NOT NULL;
DO $constraints$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.chat_messages'::regclass AND conname='chat_messages_system_identity_v1') THEN
  ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_system_identity_v1 CHECK (
   (is_system AND account_id IS NULL AND channel_type='guild' AND system_event_key IS NOT NULL)
   OR (NOT is_system AND account_id IS NOT NULL AND system_event_key IS NULL)
  );
 END IF;
END $constraints$;
CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_guild_system_event_unique_v1
 ON public.chat_messages(channel_id,system_event_key)
 WHERE is_system AND channel_type='guild';

CREATE OR REPLACE FUNCTION public.guild_chat_post_system_event_v1(
 p_guild uuid,p_event_key text,p_body text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $post$
BEGIN
 IF p_guild IS NULL OR length(coalesce(p_event_key,'')) NOT BETWEEN 4 AND 200 THEN
  RAISE EXCEPTION 'invalid_guild_herald_event';
 END IF;
 INSERT INTO public.chat_messages(account_id,channel_type,channel_id,sender_name,body,is_system,system_event_key)
 VALUES(NULL,'guild',p_guild::text,'Guild Herald',
  left(coalesce(nullif(trim(p_body),''),'Guild update'),300),true,p_event_key)
 ON CONFLICT DO NOTHING;
END $post$;
REVOKE ALL ON FUNCTION public.guild_chat_post_system_event_v1(uuid,text,text) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guild_chat_post_system_event_v1(uuid,text,text) TO service_role;

-- Both weekly project slots emit one completion notice per project instance.
CREATE OR REPLACE FUNCTION public.guild_herald_project_completed_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $project$
DECLARE v_name text;
BEGIN
 IF OLD.status IS DISTINCT FROM 'completed' AND NEW.status='completed' THEN
  v_name:=left(coalesce(nullif(trim(NEW.definition_snapshot->>'name'),''),
    initcap(replace(NEW.template_id,'_',' '))),90);
  PERFORM public.guild_chat_post_system_event_v1(NEW.guild_id,'project:'||NEW.id||':complete',
   'Project completed: '||v_name||'. Eligible members can claim rewards.');
 END IF;
 RETURN NEW;
END $project$;
REVOKE ALL ON FUNCTION public.guild_herald_project_completed_v1() FROM public,anon,authenticated;
DROP TRIGGER IF EXISTS guild_herald_project_completed_v1 ON public.guild_project_instances;
CREATE TRIGGER guild_herald_project_completed_v1 AFTER UPDATE OF status ON public.guild_project_instances
 FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status='completed')
 EXECUTE FUNCTION public.guild_herald_project_completed_v1();

-- Idempotent receipt rows are created only after verified Guild Skill upgrades.
CREATE OR REPLACE FUNCTION public.guild_herald_skill_upgraded_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $skill$
DECLARE v_label text;
BEGIN
 SELECT label INTO v_label FROM public.guild_skill_catalogue_v1 WHERE skill_id=NEW.skill_id;
 v_label:=left(coalesce(nullif(trim(v_label),''),initcap(replace(NEW.skill_id,'_',' '))),90);
 PERFORM public.guild_chat_post_system_event_v1(NEW.guild_id,
  'skill:'||NEW.account_id||':'||NEW.request_key,
  'Guild Skill upgraded: '||v_label||' to Rank '||NEW.to_rank||'.');
 RETURN NEW;
END $skill$;
REVOKE ALL ON FUNCTION public.guild_herald_skill_upgraded_v1() FROM public,anon,authenticated;
DROP TRIGGER IF EXISTS guild_herald_skill_upgraded_v1 ON public.guild_skill_upgrade_receipts_v1;
CREATE TRIGGER guild_herald_skill_upgraded_v1 AFTER INSERT ON public.guild_skill_upgrade_receipts_v1
 FOR EACH ROW EXECUTE FUNCTION public.guild_herald_skill_upgraded_v1();

-- Boss readiness and earned 25%, 50%, 100% damage milestones.
CREATE OR REPLACE FUNCTION public.guild_herald_boss_progress_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $boss$
DECLARE v_level integer;v_before integer;v_after integer;v_pct integer;
BEGIN
 SELECT level INTO v_level FROM public.guilds WHERE id=NEW.guild_id;
 IF coalesce(v_level,0)<3 THEN RETURN NEW; END IF;
 IF clock_timestamp()<NEW.starts_at OR clock_timestamp()>=NEW.ends_at THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' OR (TG_OP='UPDATE' AND NEW.damage>OLD.damage) THEN
  PERFORM public.guild_chat_post_system_event_v1(NEW.guild_id,'boss:'||NEW.id||':ready',
   'Guild Boss available: '||left(NEW.name,90)||'. Rally your guild!');
 END IF;
 IF TG_OP='UPDATE' AND NEW.damage>OLD.damage THEN
  v_before:=floor(100*OLD.damage::numeric/NEW.max_hp)::integer;
  v_after:=floor(100*NEW.damage::numeric/NEW.max_hp)::integer;
  FOREACH v_pct IN ARRAY ARRAY[25,50,100] LOOP
   IF v_before<v_pct AND v_after>=v_pct THEN
    PERFORM public.guild_chat_post_system_event_v1(NEW.guild_id,'boss:'||NEW.id||':'||v_pct,
     CASE WHEN v_pct=100
      THEN 'Guild Boss defeated: '||left(NEW.name,90)||'. Eligible rewards can be claimed!'
      ELSE 'Guild Boss milestone: '||left(NEW.name,90)||' reached '||v_pct||'% damage. Claim eligible rewards!'
     END);
   END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END $boss$;
REVOKE ALL ON FUNCTION public.guild_herald_boss_progress_v1() FROM public,anon,authenticated;
DROP TRIGGER IF EXISTS guild_herald_boss_progress_v1 ON public.guild_pve_encounters_v1;
CREATE TRIGGER guild_herald_boss_progress_v1 AFTER INSERT OR UPDATE OF damage ON public.guild_pve_encounters_v1
 FOR EACH ROW EXECUTE FUNCTION public.guild_herald_boss_progress_v1();

-- System notices count as unread Guild Chat, not as player mentions.
DO $attention$
DECLARE v_sql text;
BEGIN
 SELECT pg_get_functiondef('public.social_chat_attention_state_v1()'::regprocedure) INTO v_sql;
 IF position('and cm.account_id<>v_uid' IN v_sql)>0 THEN
  v_sql:=replace(v_sql,'and cm.account_id<>v_uid','and (cm.account_id is null or cm.account_id<>v_uid)');
  EXECUTE v_sql;
 ELSIF position('cm.account_id is null or cm.account_id<>v_uid' IN v_sql)=0 THEN
  RAISE EXCEPTION 'guild_herald_attention_contract_changed';
 END IF;
END $attention$;

COMMIT;
