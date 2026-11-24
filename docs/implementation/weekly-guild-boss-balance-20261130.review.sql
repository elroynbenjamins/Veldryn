-- REVIEW ONLY: not a Supabase migration. Do not execute against production.
-- Production definitions captured read-only on 2026-11-24.
-- New weekly encounters only; prior weekly and all event paths unchanged.
-- Helper functions are private, invoker-security; no new public grants.
CREATE OR REPLACE FUNCTION private.guild_weekly_boss_cap_review_v1(n integer, focus numeric)
RETURNS TABLE(attempt_fraction numeric, personal_fraction numeric)
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN n<=1 THEN .34 WHEN n=2 THEN .20 WHEN n=3 THEN .15 WHEN n=4 THEN .11 ELSE .11*least(1,focus) END,
 CASE WHEN n<=1 THEN 1.00 WHEN n=2 THEN .60 WHEN n=3 THEN .45 WHEN n=4 THEN .34 ELSE .28*least(1,focus) END
$$;
REVOKE ALL ON FUNCTION private.guild_weekly_boss_cap_review_v1(integer,numeric) FROM PUBLIC,anon,authenticated;

-- JSON contains only internally calculated per-account potential, not player inputs.
-- Round to nearest 10k for large raids, down to nearest 100 for small raids;
-- reduce target if heavily concentrated strength makes caps too restrictive.
CREATE OR REPLACE FUNCTION private.guild_weekly_boss_hp_review_v1(p_hits jsonb)
RETURNS bigint LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE n integer; total numeric; hp bigint; step bigint; cap numeric; loops integer:=0;
BEGIN
 SELECT count(*),coalesce(sum(hit),0) INTO n,total FROM jsonb_to_recordset(p_hits) AS h(hit numeric,focus numeric);
 IF n=0 OR total<=0 THEN RETURN 1000; END IF;
 step:=CASE WHEN total*2.25>=100000 THEN 10000 WHEN total*2.25>=10000 THEN 1000 ELSE 100 END;
 hp:=greatest(100,least(1000000000,(round(total*2.25/step)*step)::bigint));
 LOOP
  SELECT coalesce(sum(least(3*least(hit,ceil(hp*c.attempt_fraction)),ceil(hp*c.personal_fraction))),0) INTO cap
   FROM jsonb_to_recordset(p_hits) AS h(hit numeric,focus numeric)
   CROSS JOIN LATERAL private.guild_weekly_boss_cap_review_v1(n,h.focus) c;
  EXIT WHEN hp<=cap OR hp<=100;
  hp:=greatest(100,least(hp-step,(floor(cap/step)*step)::bigint));
  loops:=loops+1;
  IF loops>128 THEN RETURN 100; END IF;
 END LOOP;
 RETURN hp;
END $$;
REVOKE ALL ON FUNCTION private.guild_weekly_boss_hp_review_v1(jsonb) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.guild_weekly_boss_snapshot_review_v1(p_guild uuid,p_boss text)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 WITH c AS (
  SELECT m.account_id,c.id,c.level,c.class_id,
   greatest(1,coalesce(nullif(c.base_stats->>'attack','')::numeric,1)) atk,
   greatest(0,coalesce(nullif(c.base_stats->>'defense','')::numeric,0)) def,
   greatest(1,coalesce(nullif(c.base_stats->>'hp','')::numeric,1)) hp,
   nullif(s.state#>>'{character,equippedCombatCompanionId}','') companion,s.state,
   public.guild_skill_effects_server_v1(m.account_id) skills
  FROM public.guild_members m JOIN public.characters c ON c.account_id=m.account_id
  LEFT JOIN public.online_game_states s ON s.account_id=m.account_id WHERE m.guild_id=p_guild
 ), b AS (
  SELECT *,public.guild_pve_weekly_role_focus_v1(p_boss,class_id,atk,def,hp,greatest(1,level)) focus,
   (atk*180+def*35+hp*2+greatest(1,level)*450) baseline,
   CASE WHEN skills->>'guildId'=p_guild::text THEN least(600,greatest(0,coalesce((skills->>'guildBossDamageBps')::integer,0))) ELSE 0 END boss_bps,
   CASE WHEN skills->>'guildId'=p_guild::text THEN least(600,greatest(0,coalesce((skills->>'guildDefenceBps')::integer,0))) ELSE 0 END defence_bps,
   CASE WHEN skills->>'guildId'=p_guild::text THEN least(600,greatest(0,coalesce((skills->>'guildSupportBps')::integer,0))) ELSE 0 END support_bps
  FROM c
 ), hits AS (
  SELECT *,floor((floor(baseline*focus)+floor((def*35+hp*2)*defence_bps/10000)
   +floor(floor(baseline*focus)*CASE WHEN companion IS NULL THEN 0 ELSE
    .06+least(35,greatest(1,coalesce(nullif(state#>>array['account','combatCompanionProgress',companion,'level'],'')::integer,1)))*.006
      +least(10,greatest(1,coalesce(nullif(state#>>array['account','combatCompanionProgress',companion,'bondLevel'],'')::integer,1)))*.004
    END*(1+support_bps/10000.0)))*(1+boss_bps/10000.0)) hit FROM b
 ), strongest AS (
  SELECT DISTINCT ON(account_id) account_id,hit,focus FROM hits ORDER BY account_id,hit DESC,id
 )
 SELECT coalesce(jsonb_agg(jsonb_build_object('hit',hit,'focus',focus) ORDER BY account_id),'[]'::jsonb) FROM strongest
$$;
REVOKE ALL ON FUNCTION private.guild_weekly_boss_snapshot_review_v1(uuid,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.create_guild_pve_encounter_v2(p_guild uuid, p_scope text, p_kind text, p_name text, p_start timestamp with time zone, p_end timestamp with time zone, p_claim_end timestamp with time zone, p_event text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;v_count integer;v_bracket integer;v_weeks numeric;v_new_hp bigint;v_hits jsonb;
begin
 -- Lock membership rows while capturing both bracket and reward eligibility.
 perform 1 from public.guild_members where guild_id=p_guild for share;
 select count(*) into v_count from public.guild_members where guild_id=p_guild;
 v_bracket:=case when p_kind='event' then public.guild_pve_event_active_count_v1(p_guild,p_start) else case when v_count<=5 then 5 when v_count<=8 then 8 when v_count<=12 then 12 when v_count<=16 then 16 else 20 end end;
 IF p_kind='weekly' AND p_start>=timestamptz '2026-11-30 00:00:00+00' THEN
  -- A repeated board read must never recompute an existing week's encounter.
  IF EXISTS(SELECT 1 FROM public.guild_pve_encounters_v1 WHERE guild_id=p_guild AND scope_key=p_scope) THEN RETURN; END IF;
  v_hits:=private.guild_weekly_boss_snapshot_review_v1(p_guild,p_name);
  v_bracket:=greatest(1,jsonb_array_length(v_hits));
  v_new_hp:=private.guild_weekly_boss_hp_review_v1(v_hits);
 END IF;
 v_weeks:=greatest(1,least(4,extract(epoch from p_end-p_start)/604800));
 insert into public.guild_pve_encounters_v1(guild_id,scope_key,event_id,kind,name,starts_at,ends_at,claim_ends_at,max_hp,roster_size,personal_cap,daily_cap)
 values(p_guild,p_scope,p_event,p_kind,p_name,p_start,p_end,p_claim_end,coalesce(v_new_hp,ceil(v_bracket*15000*v_weeks)::bigint),v_bracket,ceil(30000*v_weeks),6000)
 on conflict do nothing returning id into v_id;
 if v_id is not null then
  insert into public.guild_pve_roster_v2 select v_id,account_id,greatest(p_start,joined_at) from public.guild_members where guild_id=p_guild;
 end if;
end $function$;

CREATE OR REPLACE FUNCTION public.attempt_guild_pve_v3(p_encounter uuid, p_request_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare uid uuid:=auth.uid();e public.guild_pve_encounters_v1;v_character public.characters;v_eligible boolean;v_guild_level integer;v_state jsonb;v_companion_progress jsonb;v_companion_id text;v_used integer;v_cap integer;v_attack numeric;v_defense numeric;v_hp numeric;v_level integer;v_companion_level integer:=0;v_companion_bond integer:=0;v_character_modifier numeric:=1;v_companion_modifier numeric:=1;v_roll numeric;v_damage bigint;v_skill_effects jsonb;v_guild_boss_bps integer:=0;v_guild_support_bps integer:=0;v_guild_defence_bps integer:=0;v_role_focus numeric:=1;v_character_damage bigint;v_companion_damage bigint:=0;v_personal bigint;v_resolves_at timestamptz;v_attempt_fraction numeric;v_personal_fraction numeric;begin if uid is null then raise exception 'AUTH_REQUIRED';end if;if p_request_id !~ '^[A-Za-z0-9_-]{8,128}$' then raise exception 'INVALID_REQUEST';end if;perform pg_advisory_xact_lock(hashtextextended('guild-pve-attempt:'||uid::text||':'||p_encounter::text,0));select * into e from public.guild_pve_encounters_v1 where id=p_encounter for update;if not found then raise exception 'ENCOUNTER_NOT_FOUND';end if;select g.level,exists(select 1 from public.guild_pve_roster_v2 where encounter_id=e.id and account_id=uid) into v_guild_level,v_eligible from public.guilds g where g.id=e.guild_id;if e.kind='weekly' and coalesce(v_guild_level,1)<3 then raise exception 'GUILD_LEVEL_3_REQUIRED';end if;if not v_eligible then raise exception 'ENCOUNTER_ROSTER_REQUIRED';end if;if now()<e.starts_at or now()>=e.ends_at then raise exception 'ENCOUNTER_CLOSED';end if;if e.kind='event' and not exists(select 1 from public.visible_live_events() v where v.event_id=e.event_id and v.starts_at=e.starts_at and v.ends_at>now()) then raise exception 'EVENT_UNAVAILABLE';end if;select * into v_character from public.characters where account_id=uid order by updated_at desc limit 1 for share;if not found then raise exception 'CHARACTER_REQUIRED';end if;if e.kind='event' and coalesce(v_character.level,0)<10 then raise exception 'CHARACTER_LEVEL_10_REQUIRED';end if;select state into v_state from public.online_game_states where account_id=uid for share;select count(*) into v_used from public.guild_pve_attempts_v3 where encounter_id=e.id and account_id=uid;v_cap:=public.guild_pve_attempt_cap_v3(e.starts_at,e.ends_at);select resolves_at into v_resolves_at from public.guild_pve_attempts_v3 where encounter_id=e.id and account_id=uid and request_id=p_request_id;if found then return jsonb_build_object('attemptsUsed',v_used,'attemptCap',v_cap,'resolvesAt',v_resolves_at);end if;if exists(select 1 from public.guild_pve_attempts_v3 where encounter_id=e.id and account_id=uid and resolved_at is null) then raise exception 'RAID_IN_PROGRESS';end if;if v_used>=v_cap then raise exception 'ATTEMPT_CAP_REACHED';end if;v_attack:=greatest(1,coalesce(nullif(v_character.base_stats->>'attack','')::numeric,1));v_defense:=greatest(0,coalesce(nullif(v_character.base_stats->>'defense','')::numeric,0));v_hp:=greatest(1,coalesce(nullif(v_character.base_stats->>'hp','')::numeric,1));v_level:=greatest(1,v_character.level);v_roll:=.94+(abs(hashtextextended(e.id::text||':'||uid::text||':'||p_request_id,0))%1201)/10000.0;if e.kind='weekly' and e.starts_at < timestamptz '2026-11-09 00:00:00+00' then case e.name when 'Fallen Oathbreaker' then v_character_modifier:=.94;when 'Granite Moss Troll' then v_companion_modifier:=.90;when 'Veilbound Revenant' then v_companion_modifier:=1.15;else null;end case;end if;v_character_damage:=floor((v_attack*180+v_defense*35+v_hp*2+v_level*450)*v_roll*v_character_modifier)::bigint;
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
  IF e.kind='weekly' and e.starts_at>=timestamptz '2026-11-30 00:00:00+00' THEN
   SELECT attempt_fraction,personal_fraction INTO v_attempt_fraction,v_personal_fraction FROM private.guild_weekly_boss_cap_review_v1(e.roster_size,v_role_focus);
  ELSE
   v_attempt_fraction:=(case when e.kind='event' then case when e.roster_size<=2 then .14 when e.roster_size=3 then .12 else .11 end else .11 end)*least(1,v_role_focus);
   v_personal_fraction:=(case when e.kind='event' then case when e.roster_size<=1 then 1.00 when e.roster_size=2 then .60 when e.roster_size=3 then .45 else .28 end else .28 end)*least(1,v_role_focus);
  END IF;
  select coalesce(sum(damage),0) into v_personal from public.guild_pve_attempts_v3 where encounter_id=e.id and account_id=uid;if v_personal>=ceil(e.max_hp*v_personal_fraction)::bigint then raise exception 'PERSONAL_DAMAGE_CAP_REACHED';end if;
  v_damage:=greatest(1,least(v_damage,ceil(e.max_hp*v_attempt_fraction)::bigint,greatest(0,ceil(e.max_hp*v_personal_fraction)::bigint-v_personal)));v_companion_damage:=least(v_companion_damage,v_damage);v_character_damage:=v_damage-v_companion_damage;v_resolves_at:=now()+interval '3 minutes';insert into public.guild_pve_attempts_v3(encounter_id,account_id,request_id,attempt_number,damage,character_damage,companion_damage,companion_id,resolves_at,guild_boss_bonus_bps,guild_support_bonus_bps,guild_defence_bonus_bps) values(e.id,uid,p_request_id,v_used+1,v_damage,v_character_damage,v_companion_damage,v_companion_id,v_resolves_at,v_guild_boss_bps,v_guild_support_bps,v_guild_defence_bps);return jsonb_build_object('attemptsUsed',v_used+1,'attemptCap',v_cap,'resolvesAt',v_resolves_at);end $function$;

CREATE OR REPLACE FUNCTION public.claim_guild_pve_v1(p_encounter uuid, p_milestone integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid();gid uuid;e record;g record;v_gold integer;v_count integer;v_currency integer:=0;v_candy integer:=0;v_account jsonb;v_kind text;v_bank_gold integer;v_bank_xp integer;v_materials jsonb;v_award_count integer;v_bank_materials jsonb;v_resource record;v_token_amount bigint:=0;v_tokens bigint:=0;v_token_key text;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_milestone not in(25,50,100) or p_milestone is null then raise exception 'INVALID_MILESTONE';end if;
 -- Lock the same account state used by gameplay so wallet updates cannot be overwritten.
 select * into g from public.online_game_states where account_id=uid for update;
 if g.character_id is null or g.state->'character' is null or g.state->'character'='null'::jsonb then raise exception 'CHARACTER_REQUIRED';end if;
 select guild_id into gid from public.guild_members where account_id=uid limit 1 for share;
 select * into e from public.guild_pve_encounters_v1 where id=p_encounter and guild_id=gid;
 if e.id is null then raise exception 'GUILD_MEMBERSHIP_REQUIRED';end if;
 if exists(select 1 from public.guild_pve_claims_v1 where account_id=uid and scope_key=e.scope_key and milestone=p_milestone) then return jsonb_build_object('alreadyClaimed',true);end if;
 if e.kind='event' and not exists(select 1 from public.visible_live_events() v where v.event_id=e.event_id and v.starts_at=e.starts_at) then raise exception 'EVENT_UNAVAILABLE';end if;
 if now()>=e.claim_ends_at then raise exception 'CLAIM_WINDOW_ENDED';end if;
 if e.damage*100<e.max_hp*p_milestone then raise exception 'MILESTONE_NOT_REACHED';end if;
 if coalesce((select damage from public.guild_pve_members_v1 where encounter_id=e.id and account_id=uid),0)<1000 then raise exception 'CONTRIBUTE_1000_DAMAGE';end if;
 v_gold:=case when e.kind='event' then case p_milestone when 25 then 250 when 50 then 500 else 1000 end when e.kind='weekly' and e.starts_at>=timestamptz '2026-11-30 00:00:00+00' then case p_milestone when 25 then 500 when 50 then 500 else 1000 end else 0 end;
 insert into public.guild_pve_claims_v1(account_id,scope_key,milestone,encounter_id,gold) values(uid,e.scope_key,p_milestone,e.id,v_gold) on conflict do nothing;
 get diagnostics v_count=row_count;
 if v_count=0 then return jsonb_build_object('alreadyClaimed',true);end if;
 if v_gold>0 then
  insert into public.character_wallets(character_id,gold) values(g.character_id,v_gold) on conflict(character_id) do update set gold=public.character_wallets.gold+excluded.gold;
  update public.online_game_states set revision=revision+1,updated_at=now(),state=jsonb_set(state,'{character,gold}',to_jsonb((select gold from public.character_wallets where character_id=g.character_id))) where account_id=uid;
 end if;
 IF e.kind='weekly' and e.starts_at>=timestamptz '2026-11-30 00:00:00+00' THEN
  v_token_amount:=case p_milestone when 25 then 5 when 50 then 10 else 15 end;
  v_token_key:='guild-weekly-boss:'||e.scope_key||':'||p_milestone::text;
  INSERT INTO public.guild_shop_claim_sources(account_id,claim_key,reward_amount,reward_kind)
  VALUES(uid,v_token_key,v_token_amount,'standard') ON CONFLICT(account_id,claim_key) DO NOTHING;
  v_tokens:=public.guild_shop_redeem_verified_claim_server_v2(uid,v_token_key);
 END IF;
 -- A guild receives each milestone once, even when several members claim it.
 v_bank_gold:=case when e.kind='event' then case p_milestone when 25 then 5000 when 50 then 10000 else 20000 end else case p_milestone when 25 then 2500 when 50 then 5000 else 10000 end end;
 v_bank_xp:=case when e.kind='event' then case p_milestone when 25 then 150 when 50 then 300 else 600 end else case p_milestone when 25 then 100 when 50 then 200 else 400 end end;
 v_materials:=case
  when e.kind='weekly' and p_milestone=25 then '{"MOSS_FIBER":50,"GREENWOOD_LOG":25}'::jsonb
  when e.kind='weekly' and p_milestone=50 then '{"IRONWOOD_LOG":40,"ASTER_IRON_INGOT":10}'::jsonb
  when e.kind='weekly' then '{"IRONWOOD_LOG":100,"ASTER_IRON_INGOT":25,"OATHGLASS_SHARD":5}'::jsonb
  when p_milestone=25 then '{"MOSS_FIBER":75,"GREENWOOD_LOG":40}'::jsonb
  when p_milestone=50 then '{"IRONWOOD_LOG":75,"ASTER_IRON_INGOT":20}'::jsonb
  else '{"IRONWOOD_LOG":150,"ASTER_IRON_INGOT":40,"OATHGLASS_SHARD":10}'::jsonb end;
 insert into public.guild_pve_treasury_awards_v1(encounter_id,guild_id,milestone,gold,guild_xp,materials)
 values(e.id,gid,p_milestone,v_bank_gold,v_bank_xp,v_materials) on conflict do nothing;
 get diagnostics v_award_count=row_count;
 if v_award_count=1 then
  insert into public.guild_pve_treasury_v1(guild_id) values(gid) on conflict do nothing;
  select materials into v_bank_materials from public.guild_pve_treasury_v1 where guild_id=gid for update;
  for v_resource in select key,value from jsonb_each_text(v_materials) loop
   v_bank_materials:=jsonb_set(v_bank_materials,array[v_resource.key],to_jsonb(coalesce((v_bank_materials->>v_resource.key)::bigint,0)+v_resource.value::bigint));
  end loop;
  update public.guild_pve_treasury_v1 set gold=gold+v_bank_gold,materials=v_bank_materials,updated_at=now() where guild_id=gid;
  update public.guilds guild set xp=guild.xp+v_bank_xp,
   level=greatest(guild.level,1+(select count(*) from unnest(array[1200,3200,6500,11000,17000,24500,33500,44000,56000]) as thresholds(required_xp) where guild.xp+v_bank_xp>=thresholds.required_xp))
   where id=gid;
 end if;
 if e.kind='event' then
 v_currency:=case p_milestone when 25 then 100 when 50 then 200 else 400 end;
 v_candy:=case when p_milestone=100 then 2 else 1 end;
 v_kind:=case when p_milestone=25 then 'skill' when p_milestone=50 then 'combat' else 'companion' end;
 v_account:=coalesce(g.state->'account','{}'::jsonb);
 v_account:=jsonb_set(v_account,'{eventCurrencyBalanceById}',coalesce(v_account->'eventCurrencyBalanceById','{}'::jsonb)||jsonb_build_object(e.event_id,coalesce((v_account#>>array['eventCurrencyBalanceById',e.event_id])::bigint,0)+v_currency));
 v_account:=jsonb_set(v_account,'{eventProgressById}',coalesce(v_account->'eventProgressById','{}'::jsonb)||jsonb_build_object(e.event_id,coalesce((v_account#>>array['eventProgressById',e.event_id])::bigint,0)+v_currency));
 v_kind:=e.event_id||':candy:'||v_kind;
 v_account:=jsonb_set(v_account,'{eventCandyChargesById}',coalesce(v_account->'eventCandyChargesById','{}'::jsonb)||jsonb_build_object(v_kind,coalesce((v_account#>>array['eventCandyChargesById',v_kind])::bigint,0)+v_candy));
 if e.event_id='EVT_ANNUAL_010_2026' then
   if p_milestone>=25 then insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref) values(gid,'name_halloween_orange','event',e.event_id) on conflict do nothing; end if;
   if p_milestone>=50 then insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref) values(gid,'border_halloween_veil','event',e.event_id) on conflict do nothing; end if;
   if p_milestone>=100 then
     insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref) values(gid,'halloween_pumpkin_lantern','event',e.event_id) on conflict do nothing;
     insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref) values(gid,'halloween_bat_moon','event',e.event_id) on conflict do nothing;
   end if;
 end if;
 update online_game_states set state=jsonb_set(state,'{account}',v_account) where account_id=uid;
 end if;
 return jsonb_build_object('alreadyClaimed',false,'gold',v_gold,'guildTokens',v_tokens,'eventCurrency',v_currency,'candy',v_candy,'guildBankGold',case when v_award_count=1 then v_bank_gold else 0 end,'guildXp',case when v_award_count=1 then v_bank_xp else 0 end);
end $function$;

CREATE OR REPLACE FUNCTION public.guild_shop_weekly_eligible_server_v1(p_account_id uuid, p_kind text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare v_guild uuid;v_week timestamptz;
begin
 select guild_id into v_guild from public.guild_members
 where account_id=p_account_id limit 1;
 if v_guild is null then return false;end if;
 v_week:=date_trunc('week',now() at time zone 'utc') at time zone 'utc';
 if p_kind='project_bonus' then return private.guild_weekly_project_early_bonus_eligible_v1(p_account_id); end if;
 if p_kind='quest' then return private.guild_weekly_quest_eligible_v1(p_account_id); end if;
 if p_kind='attendance' then
  return (select count(distinct d.activity_date)>=4
   from public.guild_muster_daily d
   where d.account_id=p_account_id and d.guild_id=v_guild
    and d.activity_date>=v_week::date
    and d.activity_date<=(now() at time zone 'utc')::date
    and d.check_in_points>0);
 elsif p_kind='project' then
  return exists(
   select 1 from public.guild_project_member_progress progress
   join public.guild_project_instances project on project.id=progress.project_instance_id
   where progress.account_id=p_account_id and project.guild_id=v_guild
    and progress.raw_points>=greatest(10,coalesce(project.meaningful_contributor_threshold,10))
    and progress.last_contribution_at>=v_week
    and progress.last_contribution_at<now()
    and project.started_at>=v_week
    and project.started_at<now()
  );
 elsif p_kind='boss' then
  return exists(
   select 1 from public.guild_pve_claims_v1 claim
   join public.guild_pve_encounters_v1 boss on boss.id=claim.encounter_id
   where claim.account_id=p_account_id and boss.guild_id=v_guild
    and boss.kind='weekly' and boss.starts_at<timestamptz '2026-11-30 00:00:00+00'
    and claim.claimed_at>=v_week
    and claim.claimed_at<now()
  );
 end if;
 return false;
end $function$;

CREATE OR REPLACE FUNCTION public.guild_pve_board_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid();gid uuid;v_guild_level integer;result jsonb;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 select guild_id into gid from public.guild_members where account_id=uid limit 1 for share;if gid is null then return '[]'::jsonb;end if;
 perform public.ensure_guild_pve_v1(gid,now());select level into v_guild_level from public.guilds where id=gid;perform public.settle_guild_pve_attempts_v3(gid,now());
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'name',e.name,'eventId',e.event_id,'startsAt',e.starts_at,'endsAt',e.ends_at,'claimEndsAt',e.claim_ends_at,'maxHp',e.max_hp,'weeklyRewardVersion',case when e.kind='weekly' and e.starts_at>=timestamptz '2026-11-30 00:00:00+00' then 2 else 1 end,'damage',e.damage,'rosterSize',e.roster_size,'personalCap',e.personal_cap,'dailyCap',e.daily_cap,'eligible',exists(select 1 from public.guild_pve_roster_v2 where encounter_id=e.id and account_id=uid),'guildLevel',coalesce(v_guild_level,1),'requiredGuildLevel',case when e.kind='event' then 1 else 3 end,'requiredCharacterLevel',case when e.kind='event' then 10 else 1 end,'characterLevel',coalesce((select level from public.characters where account_id=uid order by updated_at desc limit 1),0),'dailyUsed',0,'attemptCap',public.guild_pve_attempt_cap_v3(e.starts_at,e.ends_at),'attemptsUsed',coalesce((select count(*) from public.guild_pve_attempts_v3 a where a.encounter_id=e.id and a.account_id=uid),0),'pendingAttempts',coalesce((select count(*) from public.guild_pve_attempts_v3 a where a.encounter_id=e.id and a.account_id=uid and a.resolved_at is null),0),'nextAttemptResolvesAt',(select resolves_at from public.guild_pve_attempts_v3 a where a.encounter_id=e.id and a.account_id=uid and a.resolved_at is null order by attempt_number limit 1),'lastAttemptDamage',(select damage from public.guild_pve_attempts_v3 a where a.encounter_id=e.id and a.account_id=uid and a.resolved_at is not null order by attempt_number desc limit 1),'lastAttemptCharacterDamage',(select character_damage from public.guild_pve_attempts_v3 a where a.encounter_id=e.id and a.account_id=uid and a.resolved_at is not null order by attempt_number desc limit 1),'lastAttemptCompanionDamage',(select companion_damage from public.guild_pve_attempts_v3 a where a.encounter_id=e.id and a.account_id=uid and a.resolved_at is not null order by attempt_number desc limit 1),'lastAttemptCompanionId',(select companion_id from public.guild_pve_attempts_v3 a where a.encounter_id=e.id and a.account_id=uid and a.resolved_at is not null order by attempt_number desc limit 1),'personalDamage',coalesce((select damage from public.guild_pve_members_v1 where encounter_id=e.id and account_id=uid),0),'allowanceUsed',coalesce((select sum(m.damage) from public.guild_pve_members_v1 m join public.guild_pve_encounters_v1 x on x.id=m.encounter_id where m.account_id=uid and x.scope_key=e.scope_key),0),'contributors',(select count(*) from public.guild_pve_members_v1 where encounter_id=e.id),'claimed',coalesce((select jsonb_agg(milestone) from public.guild_pve_claims_v1 where account_id=uid and scope_key=e.scope_key),'[]'::jsonb)) order by e.starts_at desc,e.kind),'[]'::jsonb) into result from public.guild_pve_encounters_v1 e where e.guild_id=gid and e.claim_ends_at>now() and (e.kind='weekly' or exists(select 1 from public.visible_live_events() v where v.event_id=e.event_id and v.starts_at=e.starts_at));
 return result;
end $function$;
