-- Retire the Beta Tester badge globally. Retain all other badge entitlements and selections.
-- Old Android clients cannot reselect the retired badge; stale projections are filtered client-side.
begin;

-- Recover any historical selections before tightening constraints.
update private.player_badge_preferences_v1
set equipped_badge_id=case when equipped_badge_id='beta_tester' then 'none' else equipped_badge_id end,
    featured_badge_ids=array_remove(featured_badge_ids,'beta_tester'),
    profile_badge_ids=array_remove(profile_badge_ids,'beta_tester')
where equipped_badge_id='beta_tester'
   or 'beta_tester'=any(featured_badge_ids)
   or 'beta_tester'=any(profile_badge_ids);

-- Remove any previously awarded entitlement.
delete from private.player_collectible_badges_v1 where badge_id='beta_tester';

alter table private.player_collectible_badges_v1
 drop constraint if exists player_collectible_badges_v1_badge_id_check;
alter table private.player_collectible_badges_v1
 add constraint player_collectible_badges_v1_badge_id_check
 check (badge_id in ('founder','veteran','guild_leader','community_champion','event_champion'));

alter table private.player_badge_preferences_v1
 drop constraint if exists player_badge_one_selection_v2;
alter table private.player_badge_preferences_v1
 add constraint player_badge_one_selection_v2 check(equipped_badge_id in
 ('auto','none','vip','vip_plus','supporter','supporter_3m','supporter_6m','supporter_12m',
 'founder','veteran','guild_leader','community_champion','event_champion'));

alter table private.player_badge_preferences_v1
 drop constraint if exists player_profile_badges_v3;
alter table private.player_badge_preferences_v1
 add constraint player_profile_badges_v3 check(
 cardinality(profile_badge_ids)<=3
 and profile_badge_ids<@array['vip','vip_plus','supporter','supporter_3m','supporter_6m','supporter_12m',
 'founder','veteran','guild_leader','community_champion','event_champion']::text[]);

-- Keep existing server-side ownership checks and commerce rules, with retired ID removed.
CREATE OR REPLACE FUNCTION private.player_badge_unlocks_v1(p_account_id uuid)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(array_agg(badge_id order by priority),array[]::text[])
 from (
  select badge_id,
   case badge_id when 'founder' then 1 when 'veteran' then 3 when 'guild_leader' then 4 when 'community_champion' then 5 else 6 end as priority
  from private.player_collectible_badges_v1 where account_id=p_account_id
  union
  select 'veteran'::text,3 where exists (
   select 1 from auth.users where id=p_account_id and created_at<=now()-interval '90 days'
  )
  union
  select 'guild_leader'::text,4 where exists (
   select 1 from public.guild_members where account_id=p_account_id and role='leader'
  )
 ) unlocked;
$function$;
revoke all on function private.player_badge_unlocks_v1(uuid) from public,anon,authenticated;
grant execute on function private.player_badge_unlocks_v1(uuid) to service_role;

CREATE OR REPLACE FUNCTION public.update_player_equipped_badge_v2(p_badge_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_uid uuid:=auth.uid();v_choice text:=coalesce(p_badge_id,'none');
 v_tier smallint;v_owned text[];v_supporter boolean:=false;v_featured text[];
 v_vip boolean:=false;v_vip_plus boolean:=false;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if v_choice not in ('none','vip','vip_plus','supporter','supporter_3m','supporter_6m','supporter_12m',
  'founder','veteran','guild_leader','community_champion','event_champion')
 then raise exception 'INVALID_BADGE_SELECTION';end if;
 if v_choice in ('supporter','supporter_3m','supporter_6m','supporter_12m') then
  select supporter into v_supporter from private.commerce_entitlements_v1(v_uid);
  v_tier:=private.supporter_badge_tier_v2(v_uid);
  if not coalesce(v_supporter,false)
     or (v_choice='supporter_3m' and v_tier<3)
     or (v_choice='supporter_6m' and v_tier<6)
     or (v_choice='supporter_12m' and v_tier<12)
  then raise exception 'BADGE_NOT_OWNED';end if;
 elsif v_choice in ('vip','vip_plus') then
  select vip,vip_plus into v_vip,v_vip_plus from private.commerce_entitlements_v1(v_uid);
  if not ((v_choice='vip' and (coalesce(v_vip,false) or coalesce(v_vip_plus,false)))
     or (v_choice='vip_plus' and coalesce(v_vip_plus,false)))
  then raise exception 'BADGE_NOT_OWNED';end if;
 elsif v_choice<>'none' then
  v_owned:=private.player_badge_unlocks_v1(v_uid);
  if not (v_choice=any(v_owned)) then raise exception 'BADGE_NOT_OWNED';end if;
 end if;
 v_featured:=case when v_choice in
  ('founder','veteran','guild_leader','community_champion','event_champion')
  then array[v_choice] else array[]::text[] end;
 insert into private.player_badge_preferences_v1
  (account_id,equipped_badge_id,featured_badge_ids,show_supporter)
 values(v_uid,v_choice,v_featured,v_choice like 'supporter%')
 on conflict(account_id) do update set
  equipped_badge_id=excluded.equipped_badge_id,
  featured_badge_ids=excluded.featured_badge_ids,
  show_supporter=excluded.show_supporter;
 return public.player_badge_self_v1();
end; $function$;
revoke all on function public.update_player_equipped_badge_v2(text) from public,anon,authenticated;
grant execute on function public.update_player_equipped_badge_v2(text) to authenticated;

commit;
