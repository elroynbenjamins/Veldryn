-- Vanguard Guild Boss / Battle Support consumers, read from actual
-- server-validated, idempotent three-minute Guild PvE attempts.
-- No public release. Defensive Doctrine remains gated because no actual
-- incoming-damage mitigation mechanic exists in Guild PvE v3 yet.
-- The OLD passive guild_pve_effort_v2 is intentionally a no-op; leave it so.
alter table public.guild_pve_attempts_v3
 add column if not exists guild_boss_bonus_bps integer not null default 0
 check (guild_boss_bonus_bps between 0 and 600);
alter table public.guild_pve_attempts_v3
 add column if not exists guild_support_bonus_bps integer not null default 0
 check (guild_support_bonus_bps between 0 and 600);

do $vanguard_attempt_patch$
declare v_source text; v_next text;
begin
 select pg_get_functiondef('public.attempt_guild_pve_v3(uuid,text)'::regprocedure)
 into v_source;
 if position('v_guild_boss_bps' in v_source)>0 then
  raise notice 'Guild Vanguard attempt effects are already wired';
  return;
 end if;
 if position('v_damage bigint;v_character_damage' in v_source)=0
 or position('v_damage:=v_character_damage+v_companion_damage;' in v_source)=0
 or position('v_companion_damage:=least(v_companion_damage,v_damage);' in v_source)=0
 or position('v_damage:=greatest(1,least(v_damage,ceil(e.max_hp*.11)' in v_source)=0
 then raise exception 'guild_vanguard_attempt_source_mismatch';end if;
 v_next:=replace(v_source,
  'v_damage bigint;v_character_damage',
  'v_damage bigint;v_skill_effects jsonb;v_guild_boss_bps integer:=0;v_guild_support_bps integer:=0;v_character_damage');
 v_source:=v_next;
 v_next:=replace(v_source,
  'v_damage:=v_character_damage+v_companion_damage;',
  $replacement$
  -- The server projects only individually released Guild Skills. A player
  -- may not carry bonuses from another guild even if a former roster includes
  -- their account. The existing attempt receipt resolves before this point.
  v_skill_effects:=public.guild_skill_effects_server_v1(uid);
  if v_skill_effects->>'guildId'=e.guild_id::text then
   v_guild_boss_bps:=least(600,greatest(0,
    coalesce((v_skill_effects->>'guildBossDamageBps')::integer,0)));
   v_guild_support_bps:=least(600,greatest(0,
    coalesce((v_skill_effects->>'guildSupportBps')::integer,0)));
  end if;
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
  $replacement$
 );
 if v_next=v_source then raise exception 'guild_vanguard_damage_anchor_missing';end if;
 v_source:=v_next;
 v_next:=replace(v_source,
  'companion_id,resolves_at) values(e.id,uid,p_request_id,v_used+1,v_damage,v_character_damage,v_companion_damage,v_companion_id,v_resolves_at)',
  'companion_id,resolves_at,guild_boss_bonus_bps,guild_support_bonus_bps) values(e.id,uid,p_request_id,v_used+1,v_damage,v_character_damage,v_companion_damage,v_companion_id,v_resolves_at,v_guild_boss_bps,v_guild_support_bps)');
 if v_next=v_source then raise exception 'guild_vanguard_receipt_anchor_missing';end if;
 execute v_next;
end
$vanguard_attempt_patch$;

-- Expose the actually applied, snapshotted percentages in the owner-only
-- 3-minute combat timeline, without recalculating from a newer skill rank.
do $vanguard_timeline_patch$
declare v_source text;v_next text;
begin
 select pg_get_functiondef('public.guild_pve_attempt_timeline_v1(uuid)'::regprocedure)
 into v_source;
 if position('guildBossDamageBps' in v_source)>0 then return;end if;
 v_next:=replace(v_source,
  '''companionDamage'',v_attempt.companion_damage,',
  '''companionDamage'',v_attempt.companion_damage,''guildBossDamageBps'',v_attempt.guild_boss_bonus_bps,''guildSupportBps'',v_attempt.guild_support_bonus_bps,');
 if v_next=v_source then raise exception 'guild_vanguard_timeline_source_mismatch';end if;
 execute v_next;
end
$vanguard_timeline_patch$;

-- Purchases are still blocked until verification and an explicit release
-- migration. This protects early Guild Bank deposits and skill points.
do $vanguard_hold_check$
begin
 if exists(select 1 from public.guild_skill_catalogue_v1
  where skill_id in ('vanguard_boss','vanguard_support','vanguard_defence')
    and is_released)
 then raise exception 'vanguard_skills_must_stay_unreleased';end if;
end
$vanguard_hold_check$;
