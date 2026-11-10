-- Frostfall 2026: five selectable event-dungeon tiers and accessible seasonal Guild Boss.

-- Does not enable the festival, publish future rewards or change ordinary dungeon unlocks.

-- Server-owned character levels, verified loadouts, runtime and guild membership remain authoritative.

begin;

create or replace function public.start_online_event_expedition_server_v1(
 p_account_id uuid,p_game_version bigint,p_request_id text,p_request_hash text,p_run_id uuid,p_live_event_id text,
 p_private_state jsonb,p_client_projection jsonb,p_members jsonb,p_seed_hash text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_prior jsonb;g public.online_game_states;r jsonb:=p_private_state->'run';m jsonb;s jsonb;e public.echo_profiles;v_index integer:=0;v_series text;v_tier integer:=1;v_required_level integer:=1;
begin
 perform pg_advisory_xact_lock(hashtextextended('online-coop:'||p_account_id::text,0));
 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'event_start_v1',p_account_id::text,p_request_id);
 if v_prior is not null then if v_prior->>'requestHash'<>p_request_hash then raise exception 'idempotency_key_conflict';end if;return v_prior->'response';end if;
 if char_length(p_request_id) not between 8 and 128 or p_request_hash!~'^[a-f0-9]{64}$' or p_seed_hash!~'^[a-f0-9]{64}$' then raise exception 'invalid_request';end if;
 v_series:=public.online_event_expedition_series_server_v1(r->>'eventId');
 if v_series is null then raise exception 'unknown_event_expedition';end if;
 if p_live_event_id not like v_series||'\_%' escape '\' then raise exception 'event_not_live';end if;
 if not exists(select 1 from public.live_events x where x.event_id=p_live_event_id and x.enabled and x.starts_at is not null and x.starts_at<=clock_timestamp() and x.ends_at is not null and x.ends_at>clock_timestamp()) then raise exception 'event_not_live';end if;
 if p_private_state->>'liveEventId' is distinct from p_live_event_id then raise exception 'event_not_live';end if;
 select * into g from public.online_game_states where account_id=p_account_id for share;
 if not found or g.character_id is null then raise exception 'character_required';end if;
 -- Frostfall tier selection is validated against server-owned character and normalized snapshots.
 if r->>'eventId'='EVENT_FROSTFALL_AURORA_HOLLOW' then
  if coalesce(r->>'tier','') not in ('1','2','3','4','5') then raise exception 'invalid_event_tier';end if;
  v_tier:=(r->>'tier')::integer;v_required_level:=10+(v_tier-1)*5;
  if coalesce((g.state#>>'{character,level}')::integer,0)<v_required_level then raise exception 'event_level_requirement';end if;
 elsif coalesce(r->>'tier','1')<>'1' then raise exception 'invalid_event_tier';end if;
 if g.revision<>p_game_version then raise exception 'stale_game_version';end if;
 if r->>'id' is distinct from p_run_id::text or r#>>'{accountIds,0}' is distinct from p_account_id::text or r->>'phase' is distinct from 'awaiting_choice' or r->>'settlement' is distinct from 'pending' then raise exception 'invalid_run';end if;
 if r->>'eventId'='EVENT_FROSTFALL_AURORA_HOLLOW' and
    exists(select 1 from jsonb_array_elements(p_members) x where coalesce((x#>>'{snapshot,normalized,effectiveLevel}')::integer,0)<v_required_level) then raise exception 'event_level_requirement';end if;
 if p_client_projection->>'tier' is distinct from v_tier::text then raise exception 'invalid_event_tier';end if;
 if jsonb_array_length(p_members)<>4 or (select count(distinct x#>>'{snapshot,accountId}') from jsonb_array_elements(p_members) x)<>4
  or (select count(distinct x#>>'{snapshot,characterId}') from jsonb_array_elements(p_members) x)<>4
  or (select count(*) from jsonb_array_elements(p_members) x where x#>>'{snapshot,readiness,role}'='tank')<>1
  or (select count(*) from jsonb_array_elements(p_members) x where x#>>'{snapshot,readiness,role}'='damage')<>2
  or (select count(*) from jsonb_array_elements(p_members) x where x#>>'{snapshot,readiness,role}'='support')<>1 then raise exception 'invalid_roster';end if;
 delete from public.coop_account_reservations where account_id=p_account_id and reservation_kind<>'run' and expires_at<=clock_timestamp();
 if exists(select 1 from public.coop_account_reservations where account_id=p_account_id)
  or exists(select 1 from public.coop_run_access_memberships a join public.expedition_runs x on x.id=a.run_id where a.account_id=p_account_id and a.active and x.status='active') then raise exception 'account_already_participating';end if;

 insert into public.expedition_runs(id,expedition_id,tier,content_version,seed_hash,created_by,coop_mode,controller_account_id,route_schema_version,route_graph_json,current_node_id,balance_version,engine_version,phase)
 values(p_run_id,r->>'eventId',v_tier,'online-event-expedition-v1',p_seed_hash,p_account_id,'event',p_account_id,1,r->'graph',r->>'currentNodeId','event-balance-v1','online-event-runtime-v1','awaiting_choice');

 for m in select * from jsonb_array_elements(p_members) loop
  s:=m->'snapshot';
  if (s#>>'{readiness,ready}')::boolean is not true then raise exception 'loadout_not_ready';end if;
  if v_index=0 then
   if s->>'accountId' is distinct from p_account_id::text or s->>'characterId' is distinct from g.character_id::text or s->>'revision' is distinct from p_game_version::text then raise exception 'invalid_controller';end if;
  else
   select ep.* into e from public.echo_profiles ep join public.characters c on c.id=ep.character_id
   where ep.id=(m->>'profileId')::uuid and c.account_id=(s->>'accountId')::uuid and ep.character_id=(s->>'characterId')::uuid
    and ep.opted_in and ep.expires_at>clock_timestamp() and ep.published_at>clock_timestamp()-interval '24 hours'
    and ep.content_version='online-coop-loadout-v1' and ep.preferences->>'pipeline'='online_coop_v1' and ep.snapshot_hash=m->>'sourceHash'
   for share of ep;
   if not found then raise exception 'echo_no_longer_eligible';end if;
   if exists(select 1 from public.player_blocks b where (b.blocker_id=p_account_id and b.blocked_id=(s->>'accountId')::uuid) or (b.blocked_id=p_account_id and b.blocker_id=(s->>'accountId')::uuid)) then raise exception 'echo_no_longer_eligible';end if;
  end if;
  insert into public.expedition_run_members(run_id,character_id,account_id,echo_profile_version,role,synced_level,loadout_snapshot,stat_snapshot,slot_id,member_kind,source_account_id,active_participant_account_id,snapshot_hash)
  values(p_run_id,(s->>'characterId')::uuid,(s->>'accountId')::uuid,case when v_index=0 then null else e.profile_version end,s#>>'{readiness,role}',(s#>>'{normalized,effectiveLevel}')::integer,s,s#>'{normalized,snapshot}',v_index::text,case when v_index=0 then 'human' else 'echo' end,(s->>'accountId')::uuid,case when v_index=0 then p_account_id else null end,s->>'snapshotHash');
  v_index:=v_index+1;
 end loop;

 insert into public.coop_run_access_memberships(run_id,account_id,membership_kind) values(p_run_id,p_account_id,'controller');
 insert into public.coop_account_reservations(account_id,run_id,reservation_kind) values(p_account_id,p_run_id,'run');
 insert into public.coop_run_private_state(run_id,state_json) values(p_run_id,p_private_state);
 insert into public.coop_run_client_snapshots(run_id,state_version,event_cursor,projection_json) values(p_run_id,1,1,p_client_projection);
 insert into public.coop_outbox(semantic_key,run_id,channel_epoch,event_type,client_payload) values('event:'||p_run_id||':start',p_run_id,1,'event_run_started',p_client_projection);
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json) values(p_account_id,'event_start_v1',p_account_id::text,p_request_id,p_request_hash,p_client_projection);
 return p_client_projection;
end $$;

CREATE OR REPLACE FUNCTION public.attempt_guild_pve_v3(p_encounter uuid, p_request_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare uid uuid:=auth.uid();e public.guild_pve_encounters_v1;v_character public.characters;v_eligible boolean;v_guild_level integer;v_state jsonb;v_companion_progress jsonb;v_companion_id text;v_used integer;v_cap integer;v_attack numeric;v_defense numeric;v_hp numeric;v_level integer;v_companion_level integer:=0;v_companion_bond integer:=0;v_character_modifier numeric:=1;v_companion_modifier numeric:=1;v_roll numeric;v_damage bigint;v_skill_effects jsonb;v_guild_boss_bps integer:=0;v_guild_support_bps integer:=0;v_guild_defence_bps integer:=0;v_role_focus numeric:=1;v_character_damage bigint;v_companion_damage bigint:=0;v_personal bigint;v_resolves_at timestamptz;begin if uid is null then raise exception 'AUTH_REQUIRED';end if;if p_request_id !~ '^[A-Za-z0-9_-]{8,128}$' then raise exception 'INVALID_REQUEST';end if;perform pg_advisory_xact_lock(hashtextextended('guild-pve-attempt:'||uid::text||':'||p_encounter::text,0));select * into e from public.guild_pve_encounters_v1 where id=p_encounter for update;if not found then raise exception 'ENCOUNTER_NOT_FOUND';end if;select g.level,exists(select 1 from public.guild_pve_roster_v2 where encounter_id=e.id and account_id=uid) into v_guild_level,v_eligible from public.guilds g where g.id=e.guild_id;if e.kind='weekly' and coalesce(v_guild_level,1)<3 then raise exception 'GUILD_LEVEL_3_REQUIRED';end if;if not v_eligible then raise exception 'ENCOUNTER_ROSTER_REQUIRED';end if;if now()<e.starts_at or now()>=e.ends_at then raise exception 'ENCOUNTER_CLOSED';end if;if e.kind='event' and not exists(select 1 from public.visible_live_events() v where v.event_id=e.event_id and v.starts_at=e.starts_at and v.ends_at>now()) then raise exception 'EVENT_UNAVAILABLE';end if;select * into v_character from public.characters where account_id=uid order by updated_at desc limit 1 for share;if not found then raise exception 'CHARACTER_REQUIRED';end if;if e.kind='event' and coalesce(v_character.level,0)<10 then raise exception 'CHARACTER_LEVEL_10_REQUIRED';end if;select state into v_state from public.online_game_states where account_id=uid for share;select count(*) into v_used from public.guild_pve_attempts_v3 where encounter_id=e.id and account_id=uid;v_cap:=public.guild_pve_attempt_cap_v3(e.starts_at,e.ends_at);select resolves_at into v_resolves_at from public.guild_pve_attempts_v3 where encounter_id=e.id and account_id=uid and request_id=p_request_id;if found then return jsonb_build_object('attemptsUsed',v_used,'attemptCap',v_cap,'resolvesAt',v_resolves_at);end if;if exists(select 1 from public.guild_pve_attempts_v3 where encounter_id=e.id and account_id=uid and resolved_at is null) then raise exception 'RAID_IN_PROGRESS';end if;if v_used>=v_cap then raise exception 'ATTEMPT_CAP_REACHED';end if;v_attack:=greatest(1,coalesce(nullif(v_character.base_stats->>'attack','')::numeric,1));v_defense:=greatest(0,coalesce(nullif(v_character.base_stats->>'defense','')::numeric,0));v_hp:=greatest(1,coalesce(nullif(v_character.base_stats->>'hp','')::numeric,1));v_level:=greatest(1,v_character.level);v_roll:=.94+(abs(hashtextextended(e.id::text||':'||uid::text||':'||p_request_id,0))%1201)/10000.0;if e.kind='weekly' and e.starts_at < timestamptz '2026-11-09 00:00:00+00' then case e.name when 'Fallen Oathbreaker' then v_character_modifier:=.94;when 'Granite Moss Troll' then v_companion_modifier:=.90;when 'Veilbound Revenant' then v_companion_modifier:=1.15;else null;end case;end if;v_character_damage:=floor((v_attack*180+v_defense*35+v_hp*2+v_level*450)*v_roll*v_character_modifier)::bigint;
-- From the first complete new UTC week, score 65% general combat and 35% role focus.
-- This models build effectiveness from server-owned stats; it does not claim
-- that actual block/heal/shield event logs exist in the current timed raid.
if e.kind='weekly' and e.starts_at >= timestamptz '2026-11-09 00:00:00+00' then
 v_role_focus:=public.guild_pve_weekly_role_focus_v1(e.name,v_character.class_id,v_attack,v_defense,v_hp,v_level);
 v_character_damage:=floor(v_character_damage*v_role_focus)::bigint;
end if;v_companion_id:=nullif(v_state#>>'{character,equippedCombatCompanionId}','');if v_companion_id is not null then v_companion_progress:=coalesce(v_state#>ARRAY['account','combatCompanionProgress',v_companion_id],'{}'::jsonb);v_companion_level:=greatest(1,coalesce(nullif(v_companion_progress->>'level','')::integer,1));v_companion_bond:=greatest(1,coalesce(nullif(v_companion_progress->>'bondLevel','')::integer,1));v_companion_damage:=floor(v_character_damage*(.06+least(v_companion_level,35)*.006+least(v_companion_bond,10)*.004)*v_companion_modifier)::bigint;end if;
  -- The server projects only individually released Guild Skills. A player
  -- may not carry bonuses from another guild even if a former roster includes
  -- their account. The existing attempt receipt resolves before this point.
  v_skill_effects:=public.guild_skill_effects_server_v1(uid);
  if v_skill_effects->>'guildId'=e.guild_id::text then
   v_guild_boss_bps:=least(600,greatest(0,
    coalesce((v_skill_effects->>'guildBossDamageBps')::integer,0)));
   v_guild_support_bps:=least(600,greatest(0,
    coalesce((v_skill_effects->>'guildSupportBps')::integer,0)));
   v_guild_defence_bps:=least(600,greatest(0,
    coalesce((v_skill_effects->>'guildDefenceBps')::integer,0)));
  end if;
  if v_companion_id is null then v_guild_support_bps:=0;end if;
  -- Defensive Doctrine strengthens the HP + Defence fraction of the
  -- existing raid calculation, reflecting endurance without inventing
  -- a nonexistent incoming-hit or permanent-health mechanic.
  v_character_damage:=v_character_damage+floor(
   (v_defense*35+v_hp*2)*v_roll*v_character_modifier
    *v_guild_defence_bps/10000)::bigint;
  -- Battle Support improves ONLY companion assistance in a Guild Boss run.
  -- No equipped companion => no companion bonus and no fabricated damage.
  v_companion_damage:=floor(v_companion_damage::numeric
    *(10000+v_guild_support_bps)/10000)::bigint;
  -- Guild Boss bonus applies once to combined character+companion damage.
  -- Existing 11%-per-attempt and 28%-per-player caps still apply afterward.
  v_damage:=floor((v_character_damage+v_companion_damage)::numeric
    *(10000+v_guild_boss_bps)/10000)::bigint;
  v_companion_damage:=floor(v_companion_damage::numeric
    *(10000+v_guild_boss_bps)/10000)::bigint;
  select coalesce(sum(damage),0) into v_personal from public.guild_pve_attempts_v3 where encounter_id=e.id and account_id=uid;if v_personal>=ceil(e.max_hp*.28*least(1,v_role_focus))::bigint then raise exception 'PERSONAL_DAMAGE_CAP_REACHED';end if;
  v_damage:=greatest(1,least(v_damage,ceil(e.max_hp*.11*least(1,v_role_focus))::bigint,greatest(0,ceil(e.max_hp*.28*least(1,v_role_focus))::bigint-v_personal)));v_companion_damage:=least(v_companion_damage,v_damage);v_character_damage:=v_damage-v_companion_damage;v_resolves_at:=now()+interval '3 minutes';insert into public.guild_pve_attempts_v3(encounter_id,account_id,request_id,attempt_number,damage,character_damage,companion_damage,companion_id,resolves_at,guild_boss_bonus_bps,guild_support_bonus_bps,guild_defence_bonus_bps) values(e.id,uid,p_request_id,v_used+1,v_damage,v_character_damage,v_companion_damage,v_companion_id,v_resolves_at,v_guild_boss_bps,v_guild_support_bps,v_guild_defence_bps);return jsonb_build_object('attemptsUsed',v_used+1,'attemptCap',v_cap,'resolvesAt',v_resolves_at);end $function$;

create or replace function public.guild_pve_board_v1() returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();gid uuid;v_guild_level integer;result jsonb;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 select guild_id into gid from public.guild_members where account_id=uid limit 1 for share;if gid is null then return '[]'::jsonb;end if;
 perform public.ensure_guild_pve_v1(gid,now());select level into v_guild_level from public.guilds where id=gid;perform public.settle_guild_pve_attempts_v3(gid,now());
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'name',e.name,'eventId',e.event_id,'startsAt',e.starts_at,'endsAt',e.ends_at,'claimEndsAt',e.claim_ends_at,'maxHp',e.max_hp,'damage',e.damage,'rosterSize',e.roster_size,'personalCap',e.personal_cap,'dailyCap',e.daily_cap,'eligible',exists(select 1 from public.guild_pve_roster_v2 where encounter_id=e.id and account_id=uid),'guildLevel',coalesce(v_guild_level,1),'requiredGuildLevel',case when e.kind='event' then 1 else 3 end,'requiredCharacterLevel',case when e.kind='event' then 10 else 1 end,'characterLevel',coalesce((select level from public.characters where account_id=uid order by updated_at desc limit 1),0),'dailyUsed',0,'attemptCap',public.guild_pve_attempt_cap_v3(e.starts_at,e.ends_at),'attemptsUsed',coalesce((select count(*) from public.guild_pve_attempts_v3 a where a.encounter_id=e.id and a.account_id=uid),0),'pendingAttempts',coalesce((select count(*) from public.guild_pve_attempts_v3 a where a.encounter_id=e.id and a.account_id=uid and a.resolved_at is null),0),'nextAttemptResolvesAt',(select resolves_at from public.guild_pve_attempts_v3 a where a.encounter_id=e.id and a.account_id=uid and a.resolved_at is null order by attempt_number limit 1),'lastAttemptDamage',(select damage from public.guild_pve_attempts_v3 a where a.encounter_id=e.id and a.account_id=uid and a.resolved_at is not null order by attempt_number desc limit 1),'lastAttemptCharacterDamage',(select character_damage from public.guild_pve_attempts_v3 a where a.encounter_id=e.id and a.account_id=uid and a.resolved_at is not null order by attempt_number desc limit 1),'lastAttemptCompanionDamage',(select companion_damage from public.guild_pve_attempts_v3 a where a.encounter_id=e.id and a.account_id=uid and a.resolved_at is not null order by attempt_number desc limit 1),'lastAttemptCompanionId',(select companion_id from public.guild_pve_attempts_v3 a where a.encounter_id=e.id and a.account_id=uid and a.resolved_at is not null order by attempt_number desc limit 1),'personalDamage',coalesce((select damage from public.guild_pve_members_v1 where encounter_id=e.id and account_id=uid),0),'allowanceUsed',coalesce((select sum(m.damage) from public.guild_pve_members_v1 m join public.guild_pve_encounters_v1 x on x.id=m.encounter_id where m.account_id=uid and x.scope_key=e.scope_key),0),'contributors',(select count(*) from public.guild_pve_members_v1 where encounter_id=e.id),'claimed',coalesce((select jsonb_agg(milestone) from public.guild_pve_claims_v1 where account_id=uid and scope_key=e.scope_key),'[]'::jsonb)) order by e.starts_at desc,e.kind),'[]'::jsonb) into result from public.guild_pve_encounters_v1 e where e.guild_id=gid and e.claim_ends_at>now() and (e.kind='weekly' or exists(select 1 from public.visible_live_events() v where v.event_id=e.event_id and v.starts_at=e.starts_at));
 return result;
end $$;

create or replace function public.ensure_guild_pve_v1(p_guild uuid,p_now timestamptz)
returns void language plpgsql security definer set search_path=public as $
declare v_start timestamptz:=date_trunc('week',p_now at time zone 'UTC') at time zone 'UTC';e record;
begin
 perform public.create_guild_pve_encounter_v2(
  p_guild,'weekly:'||to_char(v_start at time zone 'UTC','YYYY-MM-DD'),'weekly',
  public.guild_pve_weekly_boss_name_v1(v_start),v_start,v_start+interval '7 days',v_start+interval '14 days'
 );
 for e in select * from public.visible_live_events() where starts_at<=p_now and ends_at>p_now loop
  perform public.create_guild_pve_encounter_v2(p_guild,'event:'||e.event_id||':'||extract(epoch from e.starts_at)::text,'event',e.name,e.starts_at,e.ends_at,greatest(e.ends_at,coalesce(e.claim_ends_at,e.ends_at+interval '3 days')),e.event_id);
  -- Seasonal raids allow late guild joiners to participate from their join time.
  -- Weekly raid roster brackets remain frozen at their original creation.
  insert into public.guild_pve_roster_v2(encounter_id,account_id,eligible_since)
  select raid.id,m.account_id,greatest(raid.starts_at,m.joined_at)
  from public.guild_pve_encounters_v1 raid
  join public.guild_members m on m.guild_id=raid.guild_id
  where raid.guild_id=p_guild and raid.kind='event' and raid.event_id=e.event_id and raid.starts_at=e.starts_at
   and m.joined_at<raid.ends_at
  on conflict(encounter_id,account_id) do nothing;
 end loop;
end $;

revoke all on function public.ensure_guild_pve_v1(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.ensure_guild_pve_v1(uuid,timestamptz) to service_role;

revoke all on function public.start_online_event_expedition_server_v1(uuid,bigint,text,text,uuid,text,jsonb,jsonb,jsonb,text) from public,anon,authenticated;

grant execute on function public.start_online_event_expedition_server_v1(uuid,bigint,text,text,uuid,text,jsonb,jsonb,jsonb,text) to service_role;

revoke all on function public.attempt_guild_pve_v3(uuid,text),public.guild_pve_board_v1() from public,anon;

grant execute on function public.attempt_guild_pve_v3(uuid,text),public.guild_pve_board_v1() to authenticated;

commit;

