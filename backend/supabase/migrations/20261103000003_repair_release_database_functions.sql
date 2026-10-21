-- Repair release drift and nine hosted function errors. Preserve balances, ACLs and v3 timed combat.
begin;
alter table public.guild_pve_encounters_v1
 add column if not exists roster_size integer not null default 5,
 add column if not exists personal_cap bigint not null default 30000,
 add column if not exists daily_cap bigint not null default 6000;
create table if not exists public.guild_pve_roster_v2(
 encounter_id uuid not null references public.guild_pve_encounters_v1(id) on delete cascade,
 account_id uuid not null references auth.users(id) on delete cascade,
 eligible_since timestamptz not null,
 primary key(encounter_id,account_id));
create index if not exists guild_pve_roster_v2_account_idx on public.guild_pve_roster_v2(account_id);
alter table public.guild_pve_roster_v2 enable row level security;
revoke all on public.guild_pve_roster_v2 from public,anon,authenticated;
grant all on public.guild_pve_roster_v2 to service_role;
-- Recover still-claimable encounters only; never reset encounter damage or claim history.
insert into public.guild_pve_roster_v2(encounter_id,account_id,eligible_since)
 select e.id,m.account_id,greatest(e.starts_at,m.joined_at)
 from public.guild_pve_encounters_v1 e join public.guild_members m on m.guild_id=e.guild_id
 where e.claim_ends_at>now() on conflict do nothing;

create or replace function public.create_guild_pve_encounter_v2(p_guild uuid,p_scope text,p_kind text,p_name text,p_start timestamptz,p_end timestamptz,p_claim_end timestamptz,p_event text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_count integer;v_bracket integer;v_weeks numeric;
begin
 -- Lock membership rows while capturing both bracket and reward eligibility.
 perform 1 from public.guild_members where guild_id=p_guild for share;
 select count(*) into v_count from public.guild_members where guild_id=p_guild;
 v_bracket:=case when v_count<=5 then 5 when v_count<=8 then 8 when v_count<=12 then 12 when v_count<=16 then 16 else 20 end;
 v_weeks:=greatest(1,least(4,extract(epoch from p_end-p_start)/604800));
 insert into public.guild_pve_encounters_v1(guild_id,scope_key,event_id,kind,name,starts_at,ends_at,claim_ends_at,max_hp,roster_size,personal_cap,daily_cap)
 values(p_guild,p_scope,p_event,p_kind,p_name,p_start,p_end,p_claim_end,ceil(v_bracket*15000*v_weeks),v_bracket,ceil(30000*v_weeks),6000)
 on conflict do nothing returning id into v_id;
 if v_id is not null then
  insert into public.guild_pve_roster_v2 select v_id,account_id,greatest(p_start,joined_at) from public.guild_members where guild_id=p_guild;
 end if;
end $$;
revoke all on function public.create_guild_pve_encounter_v2(uuid,text,text,text,timestamptz,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.create_guild_pve_encounter_v2(uuid,text,text,text,timestamptz,timestamptz,timestamptz,text) to service_role;


-- Keep passive combat credit disabled; v3 attempts are the authoritative contribution path.
create or replace function public.settle_guild_pve_attempts_v3(p_guild uuid,p_now timestamptz)
returns void language plpgsql security definer set search_path=public as $function$
declare
 v_attempt public.guild_pve_attempts_v3%rowtype;
 v_encounter public.guild_pve_encounters_v1%rowtype;
begin
 for v_attempt in
  select attempt_row.* from public.guild_pve_attempts_v3 attempt_row
  join public.guild_pve_encounters_v1 encounter_row on encounter_row.id=attempt_row.encounter_id
  where encounter_row.guild_id=p_guild and attempt_row.resolved_at is null and attempt_row.resolves_at<=p_now
  order by attempt_row.created_at for update of attempt_row
 loop
  select e.* into v_encounter from public.guild_pve_encounters_v1 e where e.id=v_attempt.encounter_id for update;
  insert into public.guild_pve_members_v1(encounter_id,account_id,damage)
  values(v_encounter.id,v_attempt.account_id,v_attempt.damage)
  on conflict(encounter_id,account_id) do update set damage=public.guild_pve_members_v1.damage+excluded.damage;
  update public.guild_pve_encounters_v1 e set damage=least(e.max_hp,e.damage+v_attempt.damage) where e.id=v_encounter.id;
  update public.guild_pve_attempts_v3 a set resolved_at=p_now
   where a.encounter_id=v_attempt.encounter_id and a.account_id=v_attempt.account_id and a.request_id=v_attempt.request_id;
 end loop;
end $function$;

CREATE OR REPLACE FUNCTION public.reward_gift_admin_v1(p_actor uuid, p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare campaign private.reward_gift_campaigns_v1;v_catalog_entry private.reward_gift_catalog_v1;v_audience text;recipient uuid;qty integer;counted integer;rid uuid;existing private.reward_gift_campaigns_v1;
begin
 if not exists(select 1 from public.liveops_admin_users where account_id=p_actor and role='owner' and enabled) then raise exception 'insufficient_admin_role';end if;
 if p_action='state' then return jsonb_build_object('catalog',(select coalesce(jsonb_agg(to_jsonb(c) order by c.kind,c.name),'[]') from private.reward_gift_catalog_v1 c),
  'campaigns',(select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]') from (select c.*,(select count(*) from private.reward_gift_recipients_v1 r where r.campaign_id=c.id) as recipient_count from private.reward_gift_campaigns_v1 c order by created_at desc limit 50)t));end if;
 if p_action='preview' then
  rid:=(p_payload->>'requestId')::uuid;v_audience:=p_payload->>'audience';recipient:=nullif(p_payload->>'accountId','')::uuid;qty:=(p_payload->>'quantity')::integer;
  if rid is null or coalesce(v_audience,'') not in ('all','account') then raise exception 'invalid_gift_request';end if;
  select * into v_catalog_entry from private.reward_gift_catalog_v1 where id=p_payload->>'catalogId';
  if not found or qty is null or qty<1 or qty>v_catalog_entry.max_quantity then raise exception 'invalid_gift_reward';end if;
  if char_length(trim(coalesce(p_payload->>'title',''))) not between 3 and 100 or char_length(coalesce(p_payload->>'body',''))>1000 or char_length(trim(coalesce(p_payload->>'reason',''))) not between 10 and 1000 then raise exception 'invalid_gift_message_or_reason';end if;
  if v_audience='account' and (recipient is null or not exists(select 1 from auth.users where id=recipient)) then raise exception 'recipient_not_found';end if;
  perform pg_advisory_xact_lock(hashtextextended('gift:'||p_actor||':'||rid,0));
  select * into existing from private.reward_gift_campaigns_v1 where actor_id=p_actor and request_id=rid;
  if found then
   if existing.title<>trim(p_payload->>'title') or existing.body<>coalesce(p_payload->>'body','') or existing.audience<>v_audience or existing.target_account_id is distinct from recipient or existing.attachments<>jsonb_build_array(jsonb_build_object('kind',v_catalog_entry.kind,'resourceId',v_catalog_entry.resource_id,'name',v_catalog_entry.name,'quantity',qty)) then raise exception 'gift_request_conflict';end if;
   campaign:=existing;
  else
   insert into private.reward_gift_campaigns_v1(actor_id,request_id,title,body,reason,audience,target_account_id,attachments)
   values(p_actor,rid,trim(p_payload->>'title'),coalesce(p_payload->>'body',''),trim(p_payload->>'reason'),v_audience,recipient,jsonb_build_array(jsonb_build_object('kind',v_catalog_entry.kind,'resourceId',v_catalog_entry.resource_id,'name',v_catalog_entry.name,'quantity',qty))) returning * into campaign;
   insert into private.reward_gift_recipients_v1(campaign_id,account_id) select campaign.id,id from auth.users where deleted_at is null and (v_audience='all' or id=recipient);
  end if;
 elsif p_action='send' then
  select * into campaign from private.reward_gift_campaigns_v1 where id=(p_payload->>'id')::uuid and actor_id=p_actor for update;
  if not found then raise exception 'gift_not_found';end if;
  if p_payload->>'confirmation' is distinct from 'SEND GIFT' then raise exception 'confirmation_required';end if;
  if campaign.sent_at is null then
   insert into private.reward_inbox_v1(account_id,source_key,source_kind,source_id,title,body,attachments)
    select account_id,'gift:'||campaign.id,'gift',campaign.id,campaign.title,campaign.body,campaign.attachments from private.reward_gift_recipients_v1 where campaign_id=campaign.id on conflict do nothing;
   update private.reward_gift_campaigns_v1 set sent_at=now() where id=campaign.id returning * into campaign;
   insert into public.liveops_admin_audit_log(actor_account_id,actor_role,action,target_type,target_id,detail_json)
    values(p_actor,'owner','sendRewardGift','reward_gift',campaign.id::text,jsonb_build_object('reason',campaign.reason,'audience',campaign.audience,'attachments',campaign.attachments,'recipients',(select count(*) from private.reward_gift_recipients_v1 where campaign_id=campaign.id)));
  end if;
 else raise exception 'invalid_gift_action';end if;
 select count(*) into counted from private.reward_gift_recipients_v1 where campaign_id=campaign.id;
 return to_jsonb(campaign)||jsonb_build_object('recipient_count',counted);
end $function$;

CREATE OR REPLACE FUNCTION public.guild_activity_state_v1()
 RETURNS TABLE(guild_id uuid, meter_bps integer, activity_percent integer, target_units integer, daily_decay_percent integer, next_decay_date date, gathering_speed_bps integer, production_speed_bps integer, skill_xp_bps integer, mastery_xp_bps integer, rare_material_relative_bps integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 return query select s.guild_id,s.meter_bps,s.activity_percent,s.target_units,
  case s.decay_mode when 'protected' then 0 when 'partial' then s.partial_decay_percent else s.inactive_decay_percent end,
  s.next_decay_date,s.gathering_speed_bps,s.production_speed_bps,s.skill_xp_bps,s.mastery_xp_bps,s.rare_material_relative_bps
 from public.guild_activity_state_v2() s;
end $function$;

CREATE OR REPLACE FUNCTION public.guild_quest_state_v1()
 RETURNS TABLE(guild_id uuid, week_key date, week_ends_at timestamp with time zone, active_members integer, quest_key text, title text, category text, description text, theme text, rarity text, estimated_minutes integer, progress integer, target integer, objective_progress jsonb, activity_reward integer, completed boolean, contributor_count integer, board_slot integer, featured boolean, personal_progress jsonb, newly_completed boolean, activity_before_percent integer, activity_after_percent integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); gid uuid; wk date:=public.guild_quest_week_key_v1(); t record; p record; b record; s record; prog jsonb; done boolean; totalp int; totalt int; rr text; base_actions int; scale numeric; foundation_progress int; foundation_target int; inserted_key text; award record; before_pct int; after_pct int; just_completed boolean;
begin
 if uid is null then return; end if;
 select gm.guild_id into gid from public.guild_members gm where gm.account_id=uid limit 1;
 if gid is null then return; end if;
 perform public.guild_quest_settle_v1(gid,wk);
 select * into t from public.guild_quest_targets_v1(gid,wk);
 select * into p from public.guild_quest_progress_v1(gid,wk);

 for b in select qb.* from public.guild_quest_board_v5(gid,wk) qb order by qb.board_slot loop
   rr:=public.guild_quest_board_rarity_v5(gid,wk,b.board_slot);
   if b.source_key in ('combat_front','skilling_drive') then
     foundation_progress:=case b.source_key when 'combat_front' then p.combat_points else p.skilling_points end;
     foundation_target:=greatest(100,ceil(t.active_members*public.guild_quest_rarity_actions_v3(rr)*1.5)::int);
     just_completed:=false; before_pct:=null; after_pct:=null;
     if foundation_progress>=foundation_target and not exists(select 1 from public.guild_quest_completions qc where qc.guild_id=gid and qc.week_key=wk and qc.quest_key=b.source_key||':'||rr) then
       inserted_key:=null;
       insert into public.guild_quest_completions as completed_quest(guild_id,week_key,quest_key,activity_units)
       values(gid,wk,b.source_key||':'||rr,public.guild_quest_rarity_reward_v3(rr)) on conflict do nothing returning completed_quest.quest_key into inserted_key;
       if inserted_key is not null then
         select * into award from public.guild_activity_award_v1(gid,'guild_quest',wk::text||':'||b.source_key||':'||rr,public.guild_quest_rarity_reward_v3(rr),clock_timestamp());
         after_pct:=floor(award.meter_bps/100.0)::int;before_pct:=greatest(0,floor((award.meter_bps-award.awarded_bps)/100.0)::int);just_completed:=true;
       end if;
     end if;
     return query select gid,wk,(wk+7)::timestamp at time zone 'UTC',t.active_members,b.source_key,
       case b.source_key when 'combat_front' then 'Guild Vanguard' else 'Supply the Guild' end,
       case b.source_key when 'combat_front' then 'Combat' else 'Skilling' end,
       case b.source_key when 'combat_front' then 'Contribute through verified combat play.' else 'Contribute through verified gathering, processing and crafting.' end,
       case b.source_key when 'combat_front' then 'Vanguard' else 'Professions' end,
       rr,public.guild_quest_rarity_minutes_v3(rr),
       foundation_progress,
       foundation_target,
       '[]'::jsonb,public.guild_quest_rarity_reward_v3(rr),
       exists(select 1 from public.guild_quest_completions c where c.guild_id=gid and c.week_key=wk and c.quest_key=b.source_key||':'||rr),p.contributors,b.board_slot,b.featured,'[]'::jsonb,just_completed,before_pct,after_pct;
   else
     select * into s from (
       select * from public.guild_quest_special_pool_v3(gid,wk)
       union all select * from public.guild_quest_extended_pool_v4(gid,wk)
     ) pool where pool.quest_key=b.source_key limit 1;
     if s.quest_key is null then continue; end if;
     -- Re-scale generated objective counts to the board-composed rarity while preserving objective proportions.
     base_actions:=greatest(1,public.guild_quest_rarity_actions_v3(s.rarity));
     scale:=public.guild_quest_rarity_actions_v3(rr)::numeric/base_actions;
     prog:=public.guild_quest_action_progress_v3(gid,wk,
       jsonb_build_object('mode','all','objectives',(
         select jsonb_agg(jsonb_build_object('key',o->>'key','target',greatest(1,ceil((o->>'target')::numeric*scale)::int)))
         from jsonb_array_elements(s.objective_json->'objectives') o
       )));
     select coalesce(sum((x->>'progress')::int),0),coalesce(sum((x->>'target')::int),1),coalesce(bool_and((x->>'progress')::int >= (x->>'target')::int),false)
       into totalp,totalt,done from jsonb_array_elements(prog) x;
     just_completed:=false;before_pct:=null;after_pct:=null;
     if done and not exists(select 1 from public.guild_quest_completions qc where qc.guild_id=gid and qc.week_key=wk and qc.quest_key=b.source_key||':'||rr) then
       inserted_key:=null;
       insert into public.guild_quest_completions as completed_quest(guild_id,week_key,quest_key,activity_units) values(gid,wk,b.source_key||':'||rr,public.guild_quest_rarity_reward_v3(rr)) on conflict do nothing returning completed_quest.quest_key into inserted_key;
       if inserted_key is not null then
         select * into award from public.guild_activity_award_v1(gid,'guild_quest',wk::text||':'||b.source_key||':'||rr,public.guild_quest_rarity_reward_v3(rr),clock_timestamp());
         after_pct:=floor(award.meter_bps/100.0)::int;before_pct:=greatest(0,floor((award.meter_bps-award.awarded_bps)/100.0)::int);just_completed:=true;
       end if;
     end if;
     return query select gid,wk,(wk+7)::timestamp at time zone 'UTC',t.active_members,b.source_key,s.title,s.category,s.description,s.theme,rr,public.guild_quest_rarity_minutes_v3(rr),
       totalp,totalt,prog,public.guild_quest_rarity_reward_v3(rr),
       exists(select 1 from public.guild_quest_completions c where c.guild_id=gid and c.week_key=wk and c.quest_key=b.source_key||':'||rr),p.contributors,b.board_slot,b.featured,public.guild_quest_personal_objective_progress_v6(gid,uid,wk,prog),just_completed,before_pct,after_pct;
   end if;
 end loop;
end $function$;

CREATE OR REPLACE FUNCTION public.update_guild_appearance_v52(p_banner_id text, p_border_id text, p_name_color_id text, p_tag_color_id text, p_nameplate_id text, p_motto text)
 RETURNS TABLE(guild_id uuid, banner_id text, border_id text, name_color_id text, tag_color_id text, nameplate_id text, motto text, revision bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_gid uuid;v_role text;v_level integer;v_gallery integer;v_achievements text[];v_events text[];v_motto text:=regexp_replace(trim(coalesce(p_motto,'')),'\s+',' ','g');v_required integer;v_trophy text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'LINK_ACCOUNT_REQUIRED';end if;
 select gm.guild_id,gm.role into v_gid,v_role from public.guild_members gm where gm.account_id=v_uid limit 1;
 if v_gid is null then raise exception 'NOT_IN_GUILD';end if;if v_role not in('leader','officer') then raise exception 'GUILD_OFFICER_REQUIRED';end if;
 select e.guild_level,e.banner_gallery_tier,e.pve_achievement_ids,e.event_cosmetic_ids into v_level,v_gallery,v_achievements,v_events from public.guild_appearance_entitlements_events_v2() e;
 if p_banner_id not in('swordwing_blue','world_tree_green','phoenix_crimson','moon_star_indigo','wolf_peak_charcoal','arcane_eye_purple','sun_lion_ivory','forge_anvil_teal','halloween_pumpkin_lantern','halloween_bat_moon') then raise exception 'INVALID_GUILD_BANNER';end if;
 if p_border_id not in('classic','bronze_fellowship','silver_fellowship','grand_gold','emerald_vine','sapphire_dungeon','crimson_bossbreaker','amethyst_raidforged','mythic_conqueror','border_halloween_veil') then raise exception 'INVALID_GUILD_FRAME';end if;
 if p_name_color_id not in('name_ivory','name_steel','name_gold','name_emerald','name_sapphire','name_crimson','name_amethyst','name_frost','name_mythic','name_halloween_orange') then raise exception 'INVALID_GUILD_NAME_COLOR';end if;
 if p_tag_color_id not in('tag_silver','tag_gold','tag_emerald','tag_sapphire','tag_frost','tag_crimson','tag_amethyst','tag_mythic') then raise exception 'INVALID_GUILD_TAG_COLOR';end if;
 if p_nameplate_id not in('classic','sapphire_royal') then raise exception 'INVALID_GUILD_NAMEPLATE';end if;if char_length(v_motto) not between 1 and 80 then raise exception 'INVALID_GUILD_MOTTO';end if;
 v_required:=case p_border_id when'bronze_fellowship'then 5 when'silver_fellowship'then 10 when'grand_gold'then 20 else 1 end;if v_level<v_required then raise exception 'GUILD_BORDER_LOCKED';end if;
 if p_border_id='emerald_vine' and v_gallery<3 then raise exception 'GUILD_BORDER_LOCKED';end if;if p_nameplate_id='sapphire_royal' and v_gallery<4 then raise exception 'GUILD_NAMEPLATE_LOCKED';end if;
 v_required:=case p_name_color_id when'name_gold'then 5 when'name_emerald'then 10 when'name_sapphire'then 15 else 1 end;if v_level<v_required then raise exception 'GUILD_NAME_COLOR_LOCKED';end if;
 if p_border_id='border_halloween_veil' and not coalesce(p_border_id=any(v_events),false) then raise exception 'GUILD_BORDER_LOCKED';end if;
 if p_name_color_id='name_halloween_orange' and not coalesce(p_name_color_id=any(v_events),false) then raise exception 'GUILD_NAME_COLOR_LOCKED';end if;
 if p_banner_id like 'halloween_%' and not coalesce(p_banner_id=any(v_events),false) then raise exception 'GUILD_BANNER_LOCKED';end if;
 v_trophy:=case p_border_id when'sapphire_dungeon'then'guild_pve_dungeon_25' when'crimson_bossbreaker'then'guild_pve_bossbreaker' when'amethyst_raidforged'then'guild_pve_raid_first_clear' when'mythic_conqueror'then'guild_pve_raid_hard_clear' end;if v_trophy is not null and not(v_trophy=any(v_achievements))then raise exception 'GUILD_BORDER_LOCKED';end if;
 v_trophy:=case p_name_color_id when'name_frost'then'guild_pve_dungeon_25' when'name_crimson'then'guild_pve_bossbreaker' when'name_amethyst'then'guild_pve_raid_first_clear' when'name_mythic'then'guild_pve_raid_hard_clear' end;if v_trophy is not null and not(v_trophy=any(v_achievements))then raise exception 'GUILD_NAME_COLOR_LOCKED';end if;
 update public.guilds set banner_id=p_banner_id,profile_frame_id=p_border_id,name_color_id=p_name_color_id,tag_color_id=p_tag_color_id,nameplate_id=p_nameplate_id,motto=v_motto where id=v_gid;
 update public.guild_appearance as ga set banner_id=p_banner_id,border_id=p_border_id,name_color_id=p_name_color_id,revision=ga.revision+1,updated_at=now() where ga.guild_id=v_gid;
 return query select g.id,g.banner_id,g.profile_frame_id,g.name_color_id,g.tag_color_id,g.nameplate_id,g.motto,a.revision from public.guilds g join public.guild_appearance a on a.guild_id=g.id where g.id=v_gid;
end $function$;

CREATE OR REPLACE FUNCTION public.update_guild_notice_board_v1(p_body text)
 RETURNS TABLE(guild_id uuid, body text, updated_at timestamp with time zone, updated_by_account_id uuid, can_edit boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_role text;
  v_body text:=trim(coalesce(p_body,''));
  v_now timestamptz:=now();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'LINK_ACCOUNT_REQUIRED'; end if;

  select gm.guild_id,gm.role into v_gid,v_role
  from public.guild_members gm
  where gm.account_id=v_uid
  limit 1;

  if v_gid is null then raise exception 'NOT_IN_GUILD'; end if;
  if v_role not in('leader','guild_master','co_leader','officer','quartermaster') then raise exception 'GUILD_OFFICER_REQUIRED'; end if;
  if char_length(v_body)>280 then raise exception 'GUILD_NOTICE_TOO_LONG'; end if;
  if v_body ~ '[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]' then raise exception 'INVALID_GUILD_NOTICE'; end if;

  insert into public.guild_bulletins(guild_id,body,updated_by_account_id,updated_at)
  values(v_gid,v_body,v_uid,v_now)
  on conflict on constraint guild_bulletins_pkey do update
    set body=excluded.body,
        updated_by_account_id=excluded.updated_by_account_id,
        updated_at=excluded.updated_at;

  insert into public.guild_bulletin_revisions(guild_id,body,actor_account_id,created_at)
  values(v_gid,v_body,v_uid,v_now);

  insert into public.guild_activity_feed(guild_id,kind,actor_account_id,title,body,payload_json,created_at,expires_at)
  values(
    v_gid,
    'bulletin_updated',
    v_uid,
    case when v_body='' then 'Guild Notice Board cleared' else 'Guild Notice Board updated' end,
    case when v_body='' then 'Leadership cleared the member notice.' else 'Leadership posted a new member notice.' end,
    jsonb_build_object('noticeLength',char_length(v_body)),
    v_now,
    v_now+interval '30 days'
  );

  return query
  select v_gid,gb.body,gb.updated_at,gb.updated_by_account_id,true
  from public.guild_bulletins gb
  where gb.guild_id=v_gid;
end $function$;

commit;
