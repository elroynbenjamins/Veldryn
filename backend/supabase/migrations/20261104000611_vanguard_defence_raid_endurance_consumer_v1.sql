-- Defensive Doctrine: guild-raid-only effective defensive contribution.
-- Guild PvE v3 has NO incoming boss-hit/HP-loss mechanic, so do not pretend
-- this reduces damage taken. Instead, each released rank increases by 2%
-- the Defence+HP portion of the server-authored three-minute raid damage
-- snapshot. This directly helps tank/durable builds, before normal caps.
-- No change to normal combat, dungeons, character HP or past attempts.
-- Requires 20261104000610_vanguard_boss_support_attempt_consumer_v1.sql.
alter table public.guild_pve_attempts_v3
 add column if not exists guild_defence_bonus_bps integer not null default 0
 check (guild_defence_bonus_bps between 0 and 600);

do $vanguard_defence_patch$
declare v_source text;v_next text;
begin
 select pg_get_functiondef('public.attempt_guild_pve_v3(uuid,text)'::regprocedure)
 into v_source;
 if position('v_guild_defence_bps' in v_source)>0 then
  raise notice 'Defensive Doctrine raid consumer already connected';
  return;
 end if;
 if position('v_guild_support_bps integer:=0;v_character_damage' in v_source)=0
 or position($guard$
   v_guild_support_bps:=least(600,greatest(0,
    coalesce((v_skill_effects->>'guildSupportBps')::integer,0)));
  end if;
  -- Battle Support$guard$ in v_source)=0
 then raise exception 'guild_vanguard_defence_source_mismatch';end if;
 v_source:=replace(v_source,
  'v_guild_support_bps integer:=0;v_character_damage',
  'v_guild_support_bps integer:=0;v_guild_defence_bps integer:=0;v_character_damage');
 v_next:=replace(v_source,
  $guard$
   v_guild_support_bps:=least(600,greatest(0,
    coalesce((v_skill_effects->>'guildSupportBps')::integer,0)));
  end if;
  -- Battle Support$guard$,
  $endurance$
   v_guild_support_bps:=least(600,greatest(0,
    coalesce((v_skill_effects->>'guildSupportBps')::integer,0)));
   v_guild_defence_bps:=least(600,greatest(0,
    coalesce((v_skill_effects->>'guildDefenceBps')::integer,0)));
  end if;
  -- Defensive Doctrine strengthens the HP + Defence fraction of the
  -- existing raid calculation, reflecting endurance without inventing
  -- a nonexistent incoming-hit or permanent-health mechanic.
  v_character_damage:=v_character_damage+floor(
   (v_defense*35+v_hp*2)*v_roll*v_character_modifier
    *v_guild_defence_bps/10000)::bigint;
  -- Battle Support$endurance$
 );
 if v_next=v_source then raise exception 'guild_vanguard_defence_effect_anchor_missing';end if;
 v_source:=v_next;
 v_next:=replace(v_source,
  'guild_boss_bonus_bps,guild_support_bonus_bps) values(e.id,uid,p_request_id,v_used+1,v_damage,v_character_damage,v_companion_damage,v_companion_id,v_resolves_at,v_guild_boss_bps,v_guild_support_bps)',
  'guild_boss_bonus_bps,guild_support_bonus_bps,guild_defence_bonus_bps) values(e.id,uid,p_request_id,v_used+1,v_damage,v_character_damage,v_companion_damage,v_companion_id,v_resolves_at,v_guild_boss_bps,v_guild_support_bps,v_guild_defence_bps)');
 if v_next=v_source then raise exception 'guild_vanguard_defence_receipt_anchor_missing';end if;
 execute v_next;
end
$vanguard_defence_patch$;

do $vanguard_defence_timeline_patch$
declare v_source text;v_next text;
begin
 select pg_get_functiondef('public.guild_pve_attempt_timeline_v1(uuid)'::regprocedure)
 into v_source;
 if position('guildDefenceBps' in v_source)>0 then return;end if;
 v_next:=replace(v_source,
  '''guildSupportBps'',v_attempt.guild_support_bonus_bps,',
  '''guildSupportBps'',v_attempt.guild_support_bonus_bps,''guildDefenceBps'',v_attempt.guild_defence_bonus_bps,');
 if v_next=v_source then raise exception 'guild_vanguard_defence_timeline_anchor_missing';end if;
 execute v_next;
end
$vanguard_defence_timeline_patch$;

do $vanguard_defence_hold$
begin
 if (select is_released from public.guild_skill_catalogue_v1
  where skill_id='vanguard_defence')
 then raise exception 'defensive_doctrine_must_stay_unreleased_until_signoff';end if;
end
$vanguard_defence_hold$;
