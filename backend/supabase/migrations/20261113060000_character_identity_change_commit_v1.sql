-- Veldryn: atomic server-only application of one paid/coupon/admin character change.
-- Requires the preceding private character change credit ledger migration.
BEGIN;

CREATE OR REPLACE FUNCTION public.load_character_change_server_v1(p_account_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $fn$
 SELECT jsonb_build_object('state',g.state,'version',g.revision,
   'characterId',g.character_id,
   'serverNow',floor(extract(epoch FROM clock_timestamp())*1000))
 FROM public.online_game_states g WHERE g.account_id=p_account_id;
$fn$;

CREATE OR REPLACE FUNCTION public.commit_character_change_server_v1(
 p_account_id uuid,
 p_character_id uuid,
 p_expected_version bigint,
 p_request_id text,
 p_request_hash text,
 p_credit_id uuid,
 p_new_state jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 v_game public.online_game_states%rowtype;
 v_character public.characters%rowtype;
 v_credit private.character_change_credits_v1%rowtype;
 v_old_char jsonb;
 v_new_char jsonb;
 v_old_account jsonb;
 v_new_account jsonb;
 v_previous private.character_change_receipts_v1%rowtype;
 v_kind text;
 v_old_name text;
 v_new_name text;
 v_new_class text;
 v_old_class text;
 v_hp integer;
 v_attack integer;
 v_defense integer;
 v_first_skill text;
 v_second_skill text;
 v_expected_copies jsonb;
 v_removed_gear_count integer:=0;
 v_removed_receipts_count integer:=0;
 v_old_copies jsonb;
 v_old_equip_ids jsonb;
 v_response jsonb;
BEGIN
 IF p_account_id IS NULL OR p_character_id IS NULL OR p_credit_id IS NULL
   OR p_request_id !~ '^[a-zA-Z0-9_-]{8,128}$'
   OR p_request_hash !~ '^[0-9a-f]{64}$'
 THEN RAISE EXCEPTION 'invalid_character_change_request'; END IF;

 -- The gameplay commit already uses this lock. This prevents cross-command
 -- changes from debiting a credit against an outdated saved state.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
   'party-account:'||p_account_id::text,0));
 SELECT * INTO v_game FROM public.online_game_states g
 WHERE g.account_id=p_account_id FOR UPDATE;
 IF NOT FOUND OR v_game.character_id IS DISTINCT FROM p_character_id
 THEN RAISE EXCEPTION 'active_character_required'; END IF;

 -- Idempotent retry succeeds before checking the now-consumed credit or revision.
 SELECT * INTO v_previous FROM private.character_change_receipts_v1
 WHERE account_id=p_account_id AND request_id=p_request_id;
 IF FOUND THEN
   IF v_previous.request_hash<>p_request_hash
   THEN RAISE EXCEPTION 'idempotency_key_conflict'; END IF;
   RETURN v_previous.response;
 END IF;
 IF v_game.revision<>p_expected_version THEN RAISE EXCEPTION 'stale_state'; END IF;
 SELECT * INTO v_character FROM public.characters c
 WHERE c.id=p_character_id AND c.account_id=p_account_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'character_not_found'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.player_profiles p
  WHERE p.account_id=p_account_id AND p.active_character_id=p_character_id)
 THEN RAISE EXCEPTION 'active_profile_mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p_account_id AND coalesce(u.is_anonymous,false))
 THEN RAISE EXCEPTION 'link_account_required'; END IF;
 SELECT * INTO v_credit FROM private.character_change_credits_v1
 WHERE id=p_credit_id AND account_id=p_account_id FOR UPDATE;
 IF NOT FOUND OR v_credit.consumed_at IS NOT NULL
 THEN RAISE EXCEPTION 'change_credit_unavailable'; END IF;
 v_kind:=v_credit.change_kind;

 IF jsonb_typeof(v_game.state)<>'object'
   OR jsonb_typeof(p_new_state)<>'object'
   OR p_new_state->'version' IS DISTINCT FROM v_game.state->'version'
   OR p_new_state-'character'-'account' IS DISTINCT FROM v_game.state-'character'-'account'
 THEN RAISE EXCEPTION 'invalid_change_state'; END IF;
 v_old_char:=v_game.state->'character';
 v_new_char:=p_new_state->'character';
 v_old_account:=v_game.state->'account';
 v_new_account:=p_new_state->'account';
 IF jsonb_typeof(v_old_char)<>'object' OR jsonb_typeof(v_new_char)<>'object'
   OR jsonb_typeof(v_new_account)<>'object'
   OR v_old_char->>'id' IS DISTINCT FROM p_character_id::text
   OR v_new_char->>'id' IS DISTINCT FROM p_character_id::text
   OR v_old_char->>'name' IS DISTINCT FROM v_character.name
   OR v_old_char->>'classId' IS DISTINCT FROM v_character.class_id
 THEN RAISE EXCEPTION 'character_snapshot_mismatch'; END IF;
 v_old_name:=v_old_char->>'name';
 v_new_name:=v_new_char->>'name';
 v_old_class:=v_old_char->>'classId';
 v_new_class:=v_new_char->>'classId';

 IF v_kind='rename' THEN
   IF v_new_name IS NULL OR v_new_name=v_old_name
     OR length(v_new_name) NOT BETWEEN 3 AND 20
     OR NOT public.safe_identity_name_v1(v_new_name,3,20)
     OR v_new_char-'name' IS DISTINCT FROM v_old_char-'name'
     OR v_new_account IS DISTINCT FROM v_old_account
   THEN RAISE EXCEPTION 'invalid_rename_transition'; END IF;
   IF EXISTS(SELECT 1 FROM pg_catalog.unnest(
       pg_catalog.regexp_split_to_array(lower(v_new_name),$rx$[ '-]+$rx$)) AS token
       WHERE token=ANY(ARRAY[
       'admin','administrator','moderator','mod','developer','dev','staff','support',
       'system','official','owner','gamemaster','gm','bot','null',
       'undefined','deleted','veldryn','fuck','fucker','fucking','shit','shite',
       'bitch','cunt','dick','pussy','whore','slut','bastard','retard','rape',
       'rapist','pedo','porn','nazi','nigger','nigga']))
     OR pg_catalog.regexp_replace(lower(v_new_name),$rx$[ '-]$rx$,'','g')=
        ANY(ARRAY['admin','administrator','moderator','developer','support','system','official',
        'owner','gamemaster','game master','gm','veldryn','fuck','shit','bitch','cunt',
        'rape','rapist','pedo','porn','nazi','nigger','nigga'])
   THEN RAISE EXCEPTION 'invalid_character_name'; END IF;

   -- Existing game data has legacy duplicate names. Lock all new renames, reject
   -- current collisions, but do not add a breaking global unique index yet.
   PERFORM pg_catalog.pg_advisory_xact_lock(
     pg_catalog.hashtextextended('character-new-name:'||lower(v_new_name),0));
   IF EXISTS(SELECT 1 FROM public.characters c
     WHERE lower(c.name)=lower(v_new_name) AND c.id<>p_character_id)
   THEN RAISE EXCEPTION 'name_already_taken'; END IF;

 ELSIF v_kind='class' THEN
   IF v_new_name IS DISTINCT FROM v_old_name OR v_new_class=v_old_class
     OR v_new_char - ARRAY['classId','hp','attack','defense','currentHp',
          'equipment','equipmentInstanceIds','gearEnhancements','classSkills',
          'classSkillRemainders','profileIconId','equippedCombatCompanionId',
          'savedLoadouts','activityQueuePausedReason']::text[]
       IS DISTINCT FROM
        v_old_char - ARRAY['classId','hp','attack','defense','currentHp',
          'equipment','equipmentInstanceIds','gearEnhancements','classSkills',
          'classSkillRemainders','profileIconId','equippedCombatCompanionId',
          'savedLoadouts','activityQueuePausedReason']::text[]
     OR v_new_account-'craftedGearInstances'
       IS DISTINCT FROM v_old_account-'craftedGearInstances'
     OR v_new_char->'equipment' IS DISTINCT FROM '{}'::jsonb
     OR v_new_char->'equipmentInstanceIds' IS DISTINCT FROM '{}'::jsonb
   THEN RAISE EXCEPTION 'invalid_class_transition'; END IF;
   SELECT t.hp,t.attack,t.defense,t.first_skill,t.second_skill
   INTO v_hp,v_attack,v_defense,v_first_skill,v_second_skill
   FROM (VALUES
     ('IRONWARDEN',155,15,19,'guardcraft','warding'),
     ('BASTION',164,14,20,'guardcraft','warding'),
     ('DREADGUARD',150,17,17,'might','warding'),
     ('WAYFINDER',110,21,11,'marksmanship','tracking'),
     ('RAVAGER',128,22,10,'might','breaking'),
     ('HEXWEAVER',108,17,11,'spellcraft','hexcraft'),
     ('KNIFE_DANCER',106,22,10,'blade_rhythm','precision'),
     ('DAWNKEEPER',118,14,13,'restoration','sanctity'),
     ('STONECALLER',120,20,12,'resonance','geomancy')
   ) AS t(class_id,hp,attack,defense,first_skill,second_skill)
   WHERE t.class_id=v_new_class;
   IF v_hp IS NULL OR v_new_char->>'hp'<>v_hp::text
     OR v_new_char->>'attack'<>v_attack::text
     OR v_new_char->>'defense'<>v_defense::text
     OR (v_new_char->>'currentHp')::integer NOT BETWEEN 1 AND v_hp
     OR jsonb_array_length(coalesce(v_old_char->'classSkills','[]'::jsonb))<>2
     OR jsonb_array_length(coalesce(v_new_char->'classSkills','[]'::jsonb))<>2
     OR v_new_char#>>'{classSkills,0,skillId}'<>v_first_skill
     OR v_new_char#>>'{classSkills,1,skillId}'<>v_second_skill
     OR v_new_char#>>'{classSkills,0,xp}' IS DISTINCT FROM v_old_char#>>'{classSkills,0,xp}'
     OR v_new_char#>>'{classSkills,1,xp}' IS DISTINCT FROM v_old_char#>>'{classSkills,1,xp}'
     OR (v_new_char->>'equippedCombatCompanionId' IS NOT NULL
         AND v_new_char->>'equippedCombatCompanionId' IS DISTINCT FROM
             v_old_char->>'equippedCombatCompanionId')
   THEN RAISE EXCEPTION 'class_stats_or_skills_mismatch'; END IF;
   IF v_old_char->>'profileIconId' LIKE 'class:%'
     AND v_new_char->>'profileIconId' IS DISTINCT FROM 'class:'||v_new_class
   THEN RAISE EXCEPTION 'class_icon_mismatch'; END IF;
   IF v_old_char->>'profileIconId' NOT LIKE 'class:%'
     AND v_new_char->>'profileIconId' IS DISTINCT FROM v_old_char->>'profileIconId'
   THEN RAISE EXCEPTION 'earned_icon_mismatch'; END IF;
   IF v_game.state->'activity' IS DISTINCT FROM 'null'::jsonb
     OR v_old_char->'classTraining' IS NOT NULL
     OR EXISTS(SELECT 1 FROM public.party_members pm
       WHERE pm.character_id=p_character_id AND pm.left_at IS NULL)
     OR EXISTS(SELECT 1 FROM public.live_dungeon_account_slots ds
       WHERE ds.account_id=p_account_id AND ds.expires_at>now()
         AND ds.slot_state NOT IN ('released','completed'))
     OR EXISTS(SELECT 1 FROM public.matchmaking_tickets mt
       WHERE mt.account_id=p_account_id
         AND mt.status NOT IN ('cancelled','expired','completed','failed'))
     OR EXISTS(SELECT 1 FROM public.equipment_v24_loadout_slots ls
       WHERE ls.character_id=p_character_id)
     OR EXISTS(SELECT 1 FROM public.item_instances i
       WHERE i.character_id=p_character_id AND i.equipped_slot IS NOT NULL)
     OR EXISTS(SELECT 1 FROM public.equipment_craft_queues q
       WHERE q.character_id=p_character_id
         AND q.state NOT IN ('completed','cancelled','claimed'))
   THEN RAISE EXCEPTION 'finish_active_activity_or_loadout_first'; END IF;
   IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(
      coalesce(v_old_account->'equipmentCraftingQueue','[]'::jsonb)) AS job
      WHERE job->>'ownerCharacterId'=p_character_id::text)
   THEN RAISE EXCEPTION 'claim_forge_jobs_before_class_change'; END IF;

   v_old_copies:=coalesce(v_old_account->'craftedGearInstances','[]'::jsonb);
   v_old_equip_ids:=coalesce(v_old_char->'equipmentInstanceIds','{}'::jsonb);
   IF jsonb_typeof(v_old_copies)<>'array'
     OR jsonb_typeof(v_old_equip_ids)<>'object'
   THEN RAISE EXCEPTION 'invalid_equipment_ledger'; END IF;
   SELECT count(*) INTO v_removed_gear_count
   FROM pg_catalog.jsonb_each(v_old_char->'equipment') e
   WHERE e.value IS NOT NULL AND e.value<>'null'::jsonb;
   SELECT count(*) INTO v_removed_receipts_count FROM
    pg_catalog.jsonb_each_text(v_old_equip_ids) equip_id;
   IF (SELECT count(*) FROM pg_catalog.jsonb_array_elements(v_old_copies) e
      WHERE e->>'id' IN
       (SELECT value FROM pg_catalog.jsonb_each_text(v_old_equip_ids)))
        <> v_removed_receipts_count
   THEN RAISE EXCEPTION 'equipped_crafted_receipts_mismatch'; END IF;
   SELECT coalesce(jsonb_agg(e.value ORDER BY e.ord),'[]'::jsonb)
   INTO v_expected_copies
   FROM pg_catalog.jsonb_array_elements(v_old_copies)
     WITH ORDINALITY e(value,ord)
   WHERE e.value->>'id' NOT IN
     (SELECT value FROM pg_catalog.jsonb_each_text(v_old_equip_ids));
   IF v_new_account->'craftedGearInstances' IS DISTINCT FROM v_expected_copies
   THEN RAISE EXCEPTION 'unequipped_equipment_would_be_lost'; END IF;
 ELSE
   RAISE EXCEPTION 'unsupported_change_credit_kind';
 END IF;

 UPDATE public.characters SET
   name=v_new_name,
   class_id=v_new_class,
   base_stats=jsonb_build_object('hp',v_new_char->'hp','currentHp',v_new_char->'currentHp',
      'attack',v_new_char->'attack','defense',v_new_char->'defense'),
   equipment=v_new_char->'equipment',
   profile_equipment_snapshot=CASE WHEN v_kind='class'
      THEN '{}'::jsonb ELSE profile_equipment_snapshot END,
   updated_at=now()
 WHERE id=p_character_id AND account_id=p_account_id;

 UPDATE public.player_profiles SET display_name=v_new_name,updated_at=now()
 WHERE account_id=p_account_id AND active_character_id=p_character_id;

 IF v_kind='rename' THEN
   UPDATE auth.users SET
      raw_user_meta_data=pg_catalog.jsonb_set(
        coalesce(raw_user_meta_data,'{}'::jsonb),'{display_name}',
        to_jsonb(v_new_name),true),
      updated_at=now()
   WHERE id=p_account_id AND raw_user_meta_data->>'display_name'=v_old_name;
 ELSE
   UPDATE public.coop_saved_loadouts SET active=false
   WHERE character_id=p_character_id AND active=true;
   UPDATE public.echo_profiles SET opted_in=false,expires_at=now()
   WHERE character_id=p_character_id AND opted_in=true;
   UPDATE public.online_coop_lfg_posts SET closed_at=now()
   WHERE character_id=p_character_id AND closed_at IS NULL;
 END IF;

 UPDATE public.online_game_states SET
   state=p_new_state,revision=v_game.revision+1,updated_at=now()
 WHERE account_id=p_account_id AND character_id=p_character_id AND revision=v_game.revision;
 IF NOT FOUND THEN RAISE EXCEPTION 'stale_state'; END IF;

 UPDATE private.character_change_credits_v1 SET
  consumed_at=now(),consumed_character_id=p_character_id,request_id=p_request_id
 WHERE id=p_credit_id AND account_id=p_account_id AND consumed_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'change_credit_unavailable'; END IF;

 v_response:=jsonb_build_object('accountId',p_account_id,'version',v_game.revision+1,
   'state',p_new_state,'changeKind',v_kind,'creditId',p_credit_id,
   'removedEquipment',v_removed_gear_count);
 INSERT INTO private.character_change_receipts_v1
  (account_id,request_id,request_hash,credit_id,character_id,response)
 VALUES(p_account_id,p_request_id,p_request_hash,p_credit_id,p_character_id,v_response);
 INSERT INTO public.liveops_admin_audit_log
  (actor_role,action,target_type,target_id,detail_json)
 VALUES('self_service','character.change','character',p_character_id::text,
  jsonb_build_object('creditId',p_credit_id,'changeKind',v_kind,
    'sourceKind',v_credit.source_kind,'requestId',p_request_id,
    'before',jsonb_build_object('name',v_old_name,'classId',v_old_class,
      'equipment',v_old_char->'equipment','equipmentInstanceIds',v_old_equip_ids,
      'classSkills',v_old_char->'classSkills','profileIconId',v_old_char->'profileIconId'),
    'after',jsonb_build_object('name',v_new_name,'classId',v_new_class,
      'equipmentRemoved',v_removed_gear_count)));
 RETURN v_response;
END $fn$;

-- Idempotent retries must read their receipt before re-applying the pure
-- change to a save that already contains the new name/class.
CREATE OR REPLACE FUNCTION public.read_character_change_receipt_server_v1(
 p_account_id uuid,p_request_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $fn$
 SELECT jsonb_build_object('requestHash',r.request_hash,'response',r.response)
 FROM private.character_change_receipts_v1 r
 WHERE r.account_id=p_account_id AND r.request_id=p_request_id;
$fn$;

REVOKE ALL ON FUNCTION public.read_character_change_receipt_server_v1(uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_character_change_receipt_server_v1(uuid,text)
 TO service_role;

REVOKE ALL ON FUNCTION public.load_character_change_server_v1(uuid),
 public.commit_character_change_server_v1(uuid,uuid,bigint,text,text,uuid,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.load_character_change_server_v1(uuid),
 public.commit_character_change_server_v1(uuid,uuid,bigint,text,text,uuid,jsonb)
 TO service_role;
COMMIT;