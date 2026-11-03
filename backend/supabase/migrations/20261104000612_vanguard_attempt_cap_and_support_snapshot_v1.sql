-- Vanguard release hardening: do not report a support bonus when the
-- player has no equipped companion, and never award the historical 1-damage
-- leak after a player already reached the 28% per-encounter ceiling.
-- Keep the existing 11% per-attempt cap, receipt idempotency and raid timing.
do $vanguard_guard_patch$
declare v_source text;v_next text;
begin
 select pg_get_functiondef('public.attempt_guild_pve_v3(uuid,text)'::regprocedure)
 into v_source;
 if position('PERSONAL_DAMAGE_CAP_REACHED' in v_source)>0 then return;end if;
 if position('  -- Defensive Doctrine strengthens' in v_source)=0
 or position('v_damage:=greatest(1,least(v_damage,ceil(e.max_hp*.11)' in v_source)=0
 then raise exception 'guild_vanguard_cap_source_mismatch';end if;
 v_next:=replace(v_source,
  '  -- Defensive Doctrine strengthens',
  '  if v_companion_id is null then v_guild_support_bps:=0;end if;'||
    chr(10)||'  -- Defensive Doctrine strengthens');
 v_source:=v_next;
 v_next:=replace(v_source,
  'v_damage:=greatest(1,least(v_damage,ceil(e.max_hp*.11)',
  'if v_personal>=ceil(e.max_hp*.28)::bigint then raise exception ''PERSONAL_DAMAGE_CAP_REACHED'';end if;'||
    chr(10)||'  v_damage:=greatest(1,least(v_damage,ceil(e.max_hp*.11)');
 if v_next=v_source then raise exception 'guild_vanguard_cap_anchor_missing';end if;
 execute v_next;
end
$vanguard_guard_patch$;
