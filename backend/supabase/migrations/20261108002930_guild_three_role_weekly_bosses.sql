-- Guild Raids: one weekly boss from three roles, while earned claims survive.
-- Preserve the active 2-9 Nov raid and all existing attempt receipts and Guild Skill bonuses.
begin;

-- Anchor the rotation to the existing Fallen Oathbreaker week (2 November).
-- New weeks: Granite Moss Troll (9 Nov), Veilbound Revenant (16 Nov),
-- Fallen Oathbreaker (23 Nov). Existing encounters and claim windows are kept.
create or replace function public.guild_pve_weekly_boss_name_v1(p_start timestamptz)
returns text language sql immutable set search_path=public as $$
 select case mod(mod(floor(extract(epoch from (p_start - timestamptz '2026-11-02 00:00:00+00'))/604800)::integer,3)+3,3)
  when 0 then 'Fallen Oathbreaker'
  when 1 then 'Granite Moss Troll'
  else 'Veilbound Revenant'
 end;
$$;
revoke all on function public.guild_pve_weekly_boss_name_v1(timestamptz) from public,anon,authenticated;
grant execute on function public.guild_pve_weekly_boss_name_v1(timestamptz) to service_role;

-- The class-role emphasis is a bounded, deterministic estimate of contribution.
-- No client-submitted actions or imaginary healing/block numbers are accepted.
-- 65% base combat + 35% weekly focus; matching classes receive a moderate
-- advantage without excluding others. Role and stats both matter.
create or replace function public.guild_pve_weekly_role_focus_v1(
 p_boss text,p_class text,p_attack numeric,p_defense numeric,p_hp numeric,p_level integer
) returns numeric language sql immutable set search_path=public as $$
 with profile as (
  select case p_boss
   when 'Fallen Oathbreaker' then 'Tank'
   when 'Granite Moss Troll' then 'Damage'
   when 'Veilbound Revenant' then 'Support'
   else 'Balanced' end as focus,
  case
   when p_class in ('IRONWARDEN','BASTION','DREADGUARD') then 'Tank'
   when p_class in ('WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER') then 'Damage'
   when p_class in ('DAWNKEEPER','STONECALLER') then 'Support'
   else 'Balanced' end as role,
  greatest(1,coalesce(p_attack,1)) as atk,
  greatest(0,coalesce(p_defense,0)) as def,
  greatest(1,coalesce(p_hp,1)) as hp,
  greatest(1,coalesce(p_level,1)) as lvl
 ), scored as (
  select focus,role,
   greatest(1,atk*180+def*35+hp*2+lvl*450) as baseline,
   case focus
    when 'Tank' then def*110+hp*3+lvl*265
    when 'Damage' then atk*250+lvl*265
    when 'Support' then atk*90+def*90+hp*3+lvl*240
    else atk*180+def*35+hp*2+lvl*450 end as focus_score
  from profile
 )
 select round(greatest(.82,least(1.18,
  .65+.35*greatest(.80,least(1.20,focus_score/greatest(1,baseline)*1.35))
    *(case when focus='Balanced' then 1 when role=focus then 1.32 else .80 end)
 )),4)
 from scored;
$$;
revoke all on function public.guild_pve_weekly_role_focus_v1(text,text,numeric,numeric,numeric,integer) from public,anon,authenticated;
grant execute on function public.guild_pve_weekly_role_focus_v1(text,text,numeric,numeric,numeric,integer) to service_role;

-- Replace from the currently deployed production signature to retain existing
-- Vanguard Boss, Battle Support and Defensive Doctrine modifiers.
CREATE OR REPLACE FUNCTION public.attempt_guild_pve_v3(p_encounter uuid, p_request_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare uid uuid:=auth.uid();e public.guild_pve_encounters_v1;v_character public.characters;v_eligible boolean;v_guild_level integer;v_state jsonb;v_companion_progress jsonb;v_companion_id text;v_used integer;v_cap integer;v_attack numeric;v_defense numeric;v_hp numeric;v_level integer;v_companion_level integer:=0;v_companion_bond integer:=0;v_character_modifier numeric:=1;v_companion_modifier numeric:=1;v_roll numeric;v_damage bigint;v_skill_effects jsonb;v_guild_boss_bps integer:=0;v_guild_support_bps integer:=0;v_guild_defence_bps integer:=0;v_role_focus numeric:=1;v_character_damage bigint;v_companion_damage bigint:=0;v_personal bigint;v_resolves_at timestamptz;begin if uid is null then raise exception 'AUTH_REQUIRED';end if;if p_request_id !~ '^[A-Za-z0-9_-]{8,128}$' then raise exception 'INVALID_REQUEST';end if;perform pg_advisory_xact_lock(hashtextextended('guild-pve-attempt:'||uid::text||':'||p_encounter::text,0));select * into e from public.guild_pve_encounters_v1 where id=p_encounter for update;if not found then raise exception 'ENCOUNTER_NOT_FOUND';end if;select g.level,exists(select 1 from public.guild_pve_roster_v2 where encounter_id=e.id and account_id=uid) into v_guild_level,v_eligible from public.guilds g where g.id=e.guild_id;if coalesce(v_guild_level,1)<3 then raise exception 'GUILD_LEVEL_3_REQUIRED';end if;if not v_eligible then raise exception 'ENCOUNTER_ROSTER_REQUIRED';end if;if now()<e.starts_at or now()>=e.ends_at then raise exception 'ENCOUNTER_CLOSED';end if;if e.kind='event' and not exists(select 1 from public.visible_live_events() v where v.event_id=e.event_id and v.starts_at=e.starts_at and v.ends_at>now()) then raise exception 'EVENT_UNAVAILABLE';end if;select * into v_character from public.characters where account_id=uid order by updated_at desc limit 1 for share;if not found then raise exception 'CHARACTER_REQUIRED';end if;select state into v_state from public.online_game_states where account_id=uid for share;select count(*) into v_used from public.guild_pve_attempts_v3 where encounter_id=e.id and account_id=uid;v_cap:=public.guild_pve_attempt_cap_v3(e.starts_at,e.ends_at);select resolves_at into v_resolves_at from public.guild_pve_attempts_v3 where encounter_id=e.id and account_id=uid and request_id=p_request_id;if found then return jsonb_build_object('attemptsUsed',v_used,'attemptCap',v_cap,'resolvesAt',v_resolves_at);end if;if exists(select 1 from public.guild_pve_attempts_v3 where encounter_id=e.id and account_id=uid and resolved_at is null) then raise exception 'RAID_IN_PROGRESS';end if;if v_used>=v_cap then raise exception 'ATTEMPT_CAP_REACHED';end if;v_attack:=greatest(1,coalesce(nullif(v_character.base_stats->>'attack','')::numeric,1));v_defense:=greatest(0,coalesce(nullif(v_character.base_stats->>'defense','')::numeric,0));v_hp:=greatest(1,coalesce(nullif(v_character.base_stats->>'hp','')::numeric,1));v_level:=greatest(1,v_character.level);v_roll:=.94+(abs(hashtextextended(e.id::text||':'||uid::text||':'||p_request_id,0))%1201)/10000.0;if e.kind='weekly' and e.starts_at < timestamptz '2026-11-09 00:00:00+00' then case e.name when 'Fallen Oathbreaker' then v_character_modifier:=.94;when 'Granite Moss Troll' then v_companion_modifier:=.90;when 'Veilbound Revenant' then v_companion_modifier:=1.15;else null;end case;end if;v_character_damage:=floor((v_attack*180+v_defense*35+v_hp*2+v_level*450)*v_roll*v_character_modifier)::bigint;
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
  v_damage:=greatest(1,least(v_damage,ceil(e.max_hp*.11*least(1,v_role_focus))::bigint,greatest(0,ceil(e.max_hp*.28*least(1,v_role_focus))::bigint-v_personal)));v_companion_damage:=least(v_companion_damage,v_damage);v_character_damage:=v_damage-v_companion_damage;v_resolves_at:=now()+interval '3 minutes';insert into public.guild_pve_attempts_v3(encounter_id,account_id,request_id,attempt_number,damage,character_damage,companion_damage,companion_id,resolves_at,guild_boss_bonus_bps,guild_support_bonus_bps,guild_defence_bonus_bps) values(e.id,uid,p_request_id,v_used+1,v_damage,v_character_damage,v_companion_damage,v_companion_id,v_resolves_at,v_guild_boss_bps,v_guild_support_bps,v_guild_defence_bps);return jsonb_build_object('attemptsUsed',v_used+1,'attemptCap',v_cap,'resolvesAt',v_resolves_at);end $function$


commit;
