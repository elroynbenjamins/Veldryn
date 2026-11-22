-- Seasonal Guild Boss: freeze HP to recently-active level-10+ guild participants.
-- UTC 7 days preceding event start, >=3 authoritative 5-minute presence buckets.
-- Existing encounters and ordinary weekly bosses retain their original HP and caps.
begin;

create or replace function public.guild_pve_event_active_count_v1(p_guild uuid, p_asof timestamptz)
returns integer language sql stable security invoker set search_path='' as $active_count$
  select greatest(1,count(*)::integer)
  from public.guild_members m
  join lateral (
    select c.level from public.characters c
    where c.account_id=m.account_id
    order by c.updated_at desc,c.id desc limit 1
  ) character_snapshot on true
  where m.guild_id=p_guild
    and character_snapshot.level>=10
    and (
      select count(distinct p.bucket_start)
      from public.player_presence_5m p
      where p.account_id=m.account_id
        and p.bucket_start>=p_asof-interval '7 days'
        and p.bucket_start<p_asof
    )>=3;
$active_count$;
revoke all on function public.guild_pve_event_active_count_v1(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.guild_pve_event_active_count_v1(uuid,timestamptz) to service_role;

-- Patch only the bracket calculation in the deployed creation function.
-- Do not replace its roster capture, uniqueness, or entitlement behavior.
do $patch_encounter$
declare source text;
  old_bracket constant text := 'v_bracket:=case when v_count<=5 then 5 when v_count<=8 then 8 when v_count<=12 then 12 when v_count<=16 then 16 else 20 end;';
  new_bracket constant text := 'v_bracket:=case when p_kind=''event'' then public.guild_pve_event_active_count_v1(p_guild,p_start) else case when v_count<=5 then 5 when v_count<=8 then 8 when v_count<=12 then 12 when v_count<=16 then 16 else 20 end end;';
begin
  select pg_get_functiondef('public.create_guild_pve_encounter_v2(uuid,text,text,text,timestamptz,timestamptz,timestamptz,text)'::regprocedure) into source;
  if position(old_bracket in source)=0 then
    raise exception 'Expected Guild PvE encounter bracket source not present; migration aborted';
  end if;
  execute replace(source,old_bracket,new_bracket);
end $patch_encounter$;

-- Solo/small guilds must have enough cumulative damage allowance to finish.
-- 1 member: 100% lifetime / 14% per attempt
-- 2 members: 60% lifetime / 14% per attempt
-- 3 members: 45% lifetime / 12% per attempt
-- 4+ members: unchanged 28% lifetime / 11% per attempt
-- Same weekly values continue untouched (28% / 11%).
do $patch_attempt$
declare source text;
  old_personal constant text := 'e.max_hp*.28*least(1,v_role_focus)';
  new_personal constant text := 'e.max_hp*(case when e.kind=''event'' then case when e.roster_size<=1 then 1.00 when e.roster_size=2 then .60 when e.roster_size=3 then .45 else .28 end else .28 end)*least(1,v_role_focus)';
  old_per_attempt constant text := 'e.max_hp*.11*least(1,v_role_focus)';
  new_per_attempt constant text := 'e.max_hp*(case when e.kind=''event'' then case when e.roster_size<=2 then .14 when e.roster_size=3 then .12 else .11 end else .11 end)*least(1,v_role_focus)';
begin
  select pg_get_functiondef('public.attempt_guild_pve_v3(uuid,text)'::regprocedure) into source;
  if (length(source)-length(replace(source,old_personal,'')))/length(old_personal) <> 2
     or (length(source)-length(replace(source,old_per_attempt,'')))/length(old_per_attempt) <> 1 then
    raise exception 'Expected Guild PvE damage-cap source not present; migration aborted';
  end if;
  source:=replace(source,old_personal,new_personal);
  source:=replace(source,old_per_attempt,new_per_attempt);
  execute source;
end $patch_attempt$;
commit;