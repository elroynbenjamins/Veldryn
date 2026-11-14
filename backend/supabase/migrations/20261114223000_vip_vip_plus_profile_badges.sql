-- Verified commerce VIP and VIP+ as selectable profile badges.
-- VIP+ may also wear VIP; neither badge is awarded from client input.
-- Existing Supporter tenure, collectible awards, and staff display are unchanged.
begin;

alter table private.player_badge_preferences_v1
 drop constraint if exists player_badge_one_selection_v2;
alter table private.player_badge_preferences_v1
 add constraint player_badge_one_selection_v2 check(equipped_badge_id in
 ('auto','none','vip','vip_plus','supporter','supporter_3m','supporter_6m','supporter_12m',
 'founder','beta_tester','veteran','guild_leader','community_champion','event_champion'));

alter table private.player_badge_preferences_v1
 drop constraint if exists player_profile_badges_v3;
alter table private.player_badge_preferences_v1
 add constraint player_profile_badges_v3 check(
 cardinality(profile_badge_ids)<=3
 and profile_badge_ids<@array['vip','vip_plus','supporter','supporter_3m','supporter_6m','supporter_12m',
 'founder','beta_tester','veteran','guild_leader','community_champion','event_champion']::text[]);

CREATE OR REPLACE FUNCTION private.player_badges_v1(p_account_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_staff text;v_supporter_active boolean:=false;v_vip_active boolean:=false;v_vip_plus_active boolean:=false;v_tier smallint:=0;
 v_show boolean:=true;v_choice text:='auto';v_selected text:='none';
 v_owned text[];v_featured text[]:=array[]::text[];v_profile text[]:=array[]::text[];
 v_exp timestamptz;v_promo_exp timestamptz;
 v_until timestamptz:=now()+interval '120 seconds';
begin
 select role into v_staff from private.player_staff_badges_v1
  where account_id=p_account_id and enabled;
 if exists(select 1 from public.liveops_admin_users
    where account_id=p_account_id and enabled and role='owner')then v_staff:='admin';end if;
 select vip,vip_plus,supporter into v_vip_active,v_vip_plus_active,v_supporter_active from private.commerce_entitlements_v1(p_account_id);
 v_supporter_active:=coalesce(v_supporter_active,false);
 v_vip_plus_active:=coalesce(v_vip_plus_active,false);
 v_vip_active:=coalesce(v_vip_active,false) or v_vip_plus_active;
 v_tier:=private.supporter_badge_tier_v2(p_account_id);
 select coalesce(show_supporter,true),equipped_badge_id
 into v_show,v_choice from private.player_badge_preferences_v1
 where account_id=p_account_id;
 v_show:=coalesce(v_show,true);v_choice:=coalesce(v_choice,'auto');
 v_owned:=private.player_badge_unlocks_v1(p_account_id);

 if v_choice='auto' then
  select id into v_choice from (
   select id,ord from unnest(coalesce((select featured_badge_ids
     from private.player_badge_preferences_v1 where account_id=p_account_id),array[]::text[]))
     with ordinality as old_featured(id,ord)
   where id=any(v_owned) order by ord limit 1
  ) existing_selection;
  v_choice:=coalesce(v_choice,case when v_show then 'supporter' else 'none' end);
 end if;
 if v_choice=any(v_owned) then
  v_selected:=v_choice;
  v_featured:=array[v_selected];
 elsif v_choice in ('supporter','supporter_3m','supporter_6m','supporter_12m')
   and v_supporter_active
   and ((v_choice='supporter' and v_tier>=1)
     or (v_choice='supporter_3m' and v_tier>=3)
     or (v_choice='supporter_6m' and v_tier>=6)
     or (v_choice='supporter_12m' and v_tier>=12)) then
  v_selected:=v_choice;
 elsif (v_choice='vip' and v_vip_active) or (v_choice='vip_plus' and v_vip_plus_active) then
  v_selected:=v_choice;
 end if;

 -- The shelf keeps the player's own order, but only entries they can still wear today.
 select coalesce(array_agg(shelf.id order by shelf.ord),array[]::text[]) into v_profile from (
  select id,ord from unnest(coalesce((select profile_badge_ids
    from private.player_badge_preferences_v1 where account_id=p_account_id),array[]::text[]))
    with ordinality as chosen(id,ord)
  where id=any(v_owned)
    or (id='vip' and v_vip_active)
    or (id='vip_plus' and v_vip_plus_active)
    or (v_supporter_active and ((id='supporter' and v_tier>=1)
      or (id='supporter_3m' and v_tier>=3)
      or (id='supporter_6m' and v_tier>=6)
      or (id='supporter_12m' and v_tier>=12)))
  order by ord limit 3
 ) shelf;

 if v_supporter_active then
  select supporter_expires_at into v_exp
   from private.account_commerce_entitlements_v1
   where account_id=p_account_id and supporter_active
     and (supporter_expires_at is null or supporter_expires_at>now());
  select supporter_expires_at into v_promo_exp
   from private.commerce_promo_entitlements_v1
   where account_id=p_account_id and not supporter_lifetime
     and supporter_expires_at>now();
  if v_exp is not null then v_until:=least(v_until,v_exp);end if;
  if v_promo_exp is not null then v_until:=least(v_until,v_promo_exp);end if;
 end if;
 return jsonb_build_object(
  'staff',v_staff,'supporter',v_supporter_active and v_selected like 'supporter%',
  'supporterAvailable',v_supporter_active,'supporterTierMonths',v_tier,
  'vipAvailable',v_vip_active,'vipPlusAvailable',v_vip_plus_active,
  'equippedBadgeId',nullif(v_selected,'none'),
  'extras',to_jsonb(v_featured),
  'featured',to_jsonb(v_profile),
  'validUntilMs',floor(extract(epoch from v_until)*1000)::bigint
 );
end; $function$;
revoke all on function private.player_badges_v1(uuid) from public,anon,authenticated;
grant execute on function private.player_badges_v1(uuid) to service_role;

CREATE OR REPLACE FUNCTION public.player_badge_self_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_uid uuid:=auth.uid();v_available boolean:=false;
 v_identity jsonb;v_owned text[];
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select supporter into v_available from private.commerce_entitlements_v1(v_uid);
 v_available:=coalesce(v_available,false);
 v_identity:=private.player_badges_v1(v_uid);
 v_owned:=private.player_badge_unlocks_v1(v_uid);
 return jsonb_build_object(
  'identity',v_identity,
  'showSupporter',coalesce((select show_supporter from private.player_badge_preferences_v1
     where account_id=v_uid),true),
  'supporterAvailable',v_available,
  'vipAvailable',coalesce((v_identity->>'vipAvailable')::boolean,false),
  'vipPlusAvailable',coalesce((v_identity->>'vipPlusAvailable')::boolean,false),
  'supporterTierMonths',private.supporter_badge_tier_v2(v_uid),
  'supporterTotalDays',floor(private.supporter_badge_total_seconds_v2(v_uid)/86400)::bigint,
  'equippedBadgeId',v_identity->'equippedBadgeId',
  'ownedExtras',to_jsonb(v_owned),
  'featuredExtras',coalesce(v_identity->'featured','[]'::jsonb)
 );
end; $function$;
revoke all on function public.player_badge_self_v1() from public,anon,authenticated;
grant execute on function public.player_badge_self_v1() to authenticated;

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
  'founder','beta_tester','veteran','guild_leader','community_champion','event_champion')
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
  ('founder','beta_tester','veteran','guild_leader','community_champion','event_champion')
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

CREATE OR REPLACE FUNCTION public.update_player_profile_badges_v3(p_badge_ids text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_uid uuid:=auth.uid();v_owned text[];v_supporter boolean:=false;v_tier smallint:=0;
 v_vip boolean:=false;v_vip_plus boolean:=false;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_badge_ids is null or cardinality(p_badge_ids)>3
  then raise exception 'INVALID_BADGE_SELECTION';end if;
 if exists(select 1 from unnest(p_badge_ids) id where id is null)
  or (select count(*) from unnest(p_badge_ids))<>(select count(distinct id) from unnest(p_badge_ids) id)
 then raise exception 'INVALID_BADGE_SELECTION';end if;
 v_owned:=private.player_badge_unlocks_v1(v_uid);
 select vip,vip_plus,supporter into v_vip,v_vip_plus,v_supporter from private.commerce_entitlements_v1(v_uid);
 v_vip_plus:=coalesce(v_vip_plus,false);
 v_vip:=coalesce(v_vip,false) or v_vip_plus;
 v_supporter:=coalesce(v_supporter,false);
 v_tier:=private.supporter_badge_tier_v2(v_uid);
 if exists(select 1 from unnest(p_badge_ids) id where not(
   id=any(v_owned)
   or (id='vip' and v_vip)
   or (id='vip_plus' and v_vip_plus)
   or (v_supporter and ((id='supporter' and v_tier>=1)
     or (id='supporter_3m' and v_tier>=3)
     or (id='supporter_6m' and v_tier>=6)
     or (id='supporter_12m' and v_tier>=12)))
 )) then raise exception 'BADGE_NOT_OWNED';end if;
 insert into private.player_badge_preferences_v1(account_id,profile_badge_ids)
 values(v_uid,p_badge_ids)
 on conflict(account_id) do update set profile_badge_ids=excluded.profile_badge_ids;
 return public.player_badge_self_v1();
end; $function$;
revoke all on function public.update_player_profile_badges_v3(text[]) from public,anon,authenticated;
grant execute on function public.update_player_profile_badges_v3(text[]) to authenticated;

commit;
