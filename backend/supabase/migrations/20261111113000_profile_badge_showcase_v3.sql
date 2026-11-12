-- Profile badge showcase v3: the single badge worn beside the name stays exactly one,
-- and the profile gains its own ordered shelf of up to three badges of the player's choice.
-- The shelf is a NEW column so the legacy featured_badge_ids mirror keeps its v2 meaning
-- for older app builds. Ownership and Supporter tenure are re-validated on write AND on
-- read, so a lapsed Supporter stops showing a tier star without any client cooperation.
-- This migration grants no entitlement, mints no currency and confers no privilege.
begin;

alter table private.player_badge_preferences_v1
 add column if not exists profile_badge_ids text[] not null default array[]::text[];
alter table private.player_badge_preferences_v1
 drop constraint if exists player_profile_badges_v3;
alter table private.player_badge_preferences_v1
 add constraint player_profile_badges_v3 check(
  cardinality(profile_badge_ids)<=3
  and profile_badge_ids<@array['supporter','supporter_3m','supporter_6m','supporter_12m',
   'founder','beta_tester','veteran','guild_leader','community_champion','event_champion']::text[]
 );
comment on column private.player_badge_preferences_v1.profile_badge_ids is
 'Ordered profile badge shelf, max 3. Display is still filtered by current ownership and Supporter tenure at read time.';

-- Deliberately NOT seeded from the worn badge: the name row on a profile already shows
-- that badge, so a seeded shelf would greet every player with a duplicate of it. The
-- shelf stays empty, and therefore invisible, until the player features something.

-- Unchanged from v2 except for the new 'featured' key. The v1 name and every existing
-- JSON field are preserved for app builds that have not shipped the shelf yet.
create or replace function private.player_badges_v1(p_account_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 v_staff text;v_supporter_active boolean:=false;v_tier smallint:=0;
 v_show boolean:=true;v_choice text:='auto';v_selected text:='none';
 v_owned text[];v_featured text[]:=array[]::text[];v_profile text[]:=array[]::text[];
 v_exp timestamptz;v_promo_exp timestamptz;
 v_until timestamptz:=now()+interval '120 seconds';
begin
 select role into v_staff from private.player_staff_badges_v1
  where account_id=p_account_id and enabled;
 if exists(select 1 from public.liveops_admin_users
    where account_id=p_account_id and enabled and role='owner')then v_staff:='admin';end if;
 select supporter into v_supporter_active from private.commerce_entitlements_v1(p_account_id);
 v_supporter_active:=coalesce(v_supporter_active,false);
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
 end if;

 -- The shelf keeps the player's own order, but only entries they can still wear today.
 select coalesce(array_agg(shelf.id order by shelf.ord),array[]::text[]) into v_profile from (
  select id,ord from unnest(coalesce((select profile_badge_ids
    from private.player_badge_preferences_v1 where account_id=p_account_id),array[]::text[]))
    with ordinality as chosen(id,ord)
  where id=any(v_owned)
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
  'equippedBadgeId',nullif(v_selected,'none'),
  'extras',to_jsonb(v_featured),
  'featured',to_jsonb(v_profile),
  'validUntilMs',floor(extract(epoch from v_until)*1000)::bigint
 );
end; $$;
revoke all on function private.player_badges_v1(uuid) from public,anon,authenticated;
grant execute on function private.player_badges_v1(uuid) to service_role;

-- featuredExtras now means the profile shelf rather than a mirror of the worn badge.
create or replace function public.player_badge_self_v1() returns jsonb
language plpgsql stable security definer set search_path='' as $$
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
  'supporterTierMonths',private.supporter_badge_tier_v2(v_uid),
  'supporterTotalDays',floor(private.supporter_badge_total_seconds_v2(v_uid)/86400)::bigint,
  'equippedBadgeId',v_identity->'equippedBadgeId',
  'ownedExtras',to_jsonb(v_owned),
  'featuredExtras',coalesce(v_identity->'featured','[]'::jsonb)
 );
end; $$;
revoke all on function public.player_badge_self_v1() from public,anon,authenticated;
grant execute on function public.player_badge_self_v1() to authenticated;

-- Never takes an account id, an ownership list or a tenure claim from the caller.
-- Writing the shelf cannot change which badge is worn beside the name.
create or replace function public.update_player_profile_badges_v3(p_badge_ids text[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_uid uuid:=auth.uid();v_owned text[];v_supporter boolean:=false;v_tier smallint:=0;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_badge_ids is null or cardinality(p_badge_ids)>3
  then raise exception 'INVALID_BADGE_SELECTION';end if;
 if exists(select 1 from unnest(p_badge_ids) id where id is null)
  or (select count(*) from unnest(p_badge_ids))<>(select count(distinct id) from unnest(p_badge_ids) id)
 then raise exception 'INVALID_BADGE_SELECTION';end if;
 v_owned:=private.player_badge_unlocks_v1(v_uid);
 select supporter into v_supporter from private.commerce_entitlements_v1(v_uid);
 v_supporter:=coalesce(v_supporter,false);
 v_tier:=private.supporter_badge_tier_v2(v_uid);
 if exists(select 1 from unnest(p_badge_ids) id where not(
   id=any(v_owned)
   or (v_supporter and ((id='supporter' and v_tier>=1)
     or (id='supporter_3m' and v_tier>=3)
     or (id='supporter_6m' and v_tier>=6)
     or (id='supporter_12m' and v_tier>=12)))
 )) then raise exception 'BADGE_NOT_OWNED';end if;
 insert into private.player_badge_preferences_v1(account_id,profile_badge_ids)
 values(v_uid,p_badge_ids)
 on conflict(account_id) do update set profile_badge_ids=excluded.profile_badge_ids;
 return public.player_badge_self_v1();
end; $$;
revoke all on function public.update_player_profile_badges_v3(text[])
 from public,anon,authenticated;
grant execute on function public.update_player_profile_badges_v3(text[]) to authenticated;

commit;
