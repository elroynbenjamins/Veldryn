-- Profile badge v2: one elective badge (earned OR Supporter), staff identity independent.
-- Supporter star tiers unlock at 0 / 3 / 6 / 12 TOTAL verified active months.
-- A private cumulative ledger preserves elapsed Supporter time across lapses;
-- historical tenure requires verifiable coverage evidence and is not inferred from expiry.
-- This migration does NOT grant paid access, mint currency or activate features.
begin;

create table if not exists private.supporter_badge_progress_v2 (
 account_id uuid primary key references auth.users(id) on delete cascade,
 verified_since timestamptz not null,
 coverage_until timestamptz,
 last_verified_at timestamptz not null default now(),
 credited_seconds numeric(20,3) not null default 0 check(credited_seconds>=0),
 last_checkpoint_at timestamptz not null default now(),
 accruing boolean not null default false,
 check(last_verified_at>=verified_since)
);
alter table private.supporter_badge_progress_v2 enable row level security;
revoke all on private.supporter_badge_progress_v2 from public,anon,authenticated;
grant select,insert,update,delete on private.supporter_badge_progress_v2 to service_role;
comment on table private.supporter_badge_progress_v2 is
 'Cumulative actual verified active Supporter seconds across sessions, excluding inactive gaps and advance purchases. Historic backfill requires audited proof.';

alter table private.player_badge_preferences_v1
 add column if not exists equipped_badge_id text not null default 'auto';
alter table private.player_badge_preferences_v1
 drop constraint if exists player_badge_one_selection_v2;
alter table private.player_badge_preferences_v1
 add constraint player_badge_one_selection_v2 check(equipped_badge_id in
  ('auto','none','supporter','supporter_3m','supporter_6m','supporter_12m',
   'founder','beta_tester','veteran','guild_leader','community_champion','event_champion'));

-- Keep one preexisting earned badge rather than discarding user preferences.
-- With no prior collectible, retain the legacy opted-in Supporter preference.
update private.player_badge_preferences_v1 set
 equipped_badge_id=case
  when cardinality(featured_badge_ids)>0 then featured_badge_ids[1]
  when show_supporter then 'supporter'
  else 'none'
 end,
 featured_badge_ids=case
  when cardinality(featured_badge_ids)>0 then featured_badge_ids[1:1]
  else array[]::text[] end
where equipped_badge_id='auto';

-- Internal trigger, not callable from public RPC. A renewal before the previous
-- confirmed coverage expires preserves tenure; a lapse resets it.
create or replace function private.refresh_supporter_badge_progress_v2(p_account_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
 v_paid_active boolean:=false;v_paid_exp timestamptz;
 v_promo_lifetime boolean:=false;v_promo_exp timestamptz;
 v_paid_valid boolean:=false;v_promo_valid boolean:=false;v_active boolean:=false;
 v_coverage timestamptz;v_previous private.supporter_badge_progress_v2%rowtype;
 v_now timestamptz:=now();v_end timestamptz;v_added numeric(20,3):=0;
begin
 if p_account_id is null then return;end if;
 select coalesce(supporter_active,false),supporter_expires_at
 into v_paid_active,v_paid_exp from private.account_commerce_entitlements_v1
 where account_id=p_account_id;
 select coalesce(supporter_lifetime,false),supporter_expires_at
 into v_promo_lifetime,v_promo_exp from private.commerce_promo_entitlements_v1
 where account_id=p_account_id;
 v_paid_valid:=coalesce(v_paid_active,false) and (v_paid_exp is null or v_paid_exp>v_now);
 v_promo_valid:=coalesce(v_promo_lifetime,false) or coalesce(v_promo_exp>v_now,false);
 v_active:=v_paid_valid or v_promo_valid;
 if v_active then
  if (v_paid_valid and v_paid_exp is null) or v_promo_lifetime then
   v_coverage:=null;
  else
   v_coverage:=greatest(case when v_paid_valid then v_paid_exp end,
     case when v_promo_valid then v_promo_exp end);
  end if;
 end if;

 select * into v_previous from private.supporter_badge_progress_v2
  where account_id=p_account_id for update;
 if not found then
  if v_active then
   insert into private.supporter_badge_progress_v2
     (account_id,verified_since,coverage_until,last_verified_at,credited_seconds,last_checkpoint_at,accruing)
   values(p_account_id,v_now,v_coverage,v_now,0,v_now,true);
  end if;
  return;
 end if;
 -- Settle only time actually covered by the PREVIOUS verified entitlement.
 -- A late renewal after expiry never credits the gap, but keeps past progress.
 if v_previous.accruing then
  v_end:=least(v_now,coalesce(v_previous.coverage_until,v_now));
  v_added:=greatest(0,extract(epoch from (v_end-v_previous.last_checkpoint_at)));
 end if;
 update private.supporter_badge_progress_v2
 set credited_seconds=credited_seconds+v_added,
     last_checkpoint_at=v_now,
     last_verified_at=v_now,
     coverage_until=case when v_active then v_coverage else v_now end,
     accruing=v_active
 where account_id=p_account_id;
end; $$;
revoke all on function private.refresh_supporter_badge_progress_v2(uuid)
 from public,anon,authenticated;
grant execute on function private.refresh_supporter_badge_progress_v2(uuid) to service_role;

create or replace function private.track_supporter_badge_progress_v2()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.refresh_supporter_badge_progress_v2(new.account_id);
 return new;
end; $$;
revoke all on function private.track_supporter_badge_progress_v2()
 from public,anon,authenticated;

drop trigger if exists track_paid_supporter_badge_v2 on private.account_commerce_entitlements_v1;
create trigger track_paid_supporter_badge_v2
 after insert or update of supporter_active,supporter_expires_at
 on private.account_commerce_entitlements_v1
 for each row execute function private.track_supporter_badge_progress_v2();

drop trigger if exists track_promo_supporter_badge_v2 on private.commerce_promo_entitlements_v1;
create trigger track_promo_supporter_badge_v2
 after insert or update of supporter_lifetime,supporter_expires_at
 on private.commerce_promo_entitlements_v1
 for each row execute function private.track_supporter_badge_progress_v2();

-- Expiry and updated_at cannot prove elapsed historical payments. Seed current
-- active accounts conservatively; audited historical receipts may later be imported.
-- Use a set-based outer query instead of a one-row-at-a-time anonymous DO
-- block. The invoked VOLATILE function locks/updates each verified account.
select private.refresh_supporter_badge_progress_v2(account_id)
from (
 select account_id from private.account_commerce_entitlements_v1
 union
 select account_id from private.commerce_promo_entitlements_v1
) verified_accounts;

-- Effective earned time = settled verified seconds + current covered interval.
-- Reading this function never changes state or awards future prepaid periods.
create or replace function private.supporter_badge_total_seconds_v2(p_account_id uuid)
returns numeric language plpgsql stable security definer set search_path='' as $$
declare v_row private.supporter_badge_progress_v2%rowtype;v_now timestamptz:=now();
begin
 if p_account_id is null then return 0;end if;
 select * into v_row from private.supporter_badge_progress_v2 where account_id=p_account_id;
 if not found then return 0;end if;
 if v_row.accruing then
  return v_row.credited_seconds+greatest(0,extract(epoch from
    (least(v_now,coalesce(v_row.coverage_until,v_now))-v_row.last_checkpoint_at)));
 end if;
 return v_row.credited_seconds;
end; $$;
revoke all on function private.supporter_badge_total_seconds_v2(uuid) from public,anon,authenticated;
grant execute on function private.supporter_badge_total_seconds_v2(uuid) to service_role;

create or replace function private.supporter_badge_tier_v2(p_account_id uuid)
returns smallint language plpgsql stable security definer set search_path='' as $$
declare v_active boolean:=false;v_anchor timestamptz;v_seconds numeric;
begin
 if p_account_id is null then return 0;end if;
 select supporter into v_active from private.commerce_entitlements_v1(p_account_id);
 if not coalesce(v_active,false) then return 0;end if;
 select verified_since into v_anchor from private.supporter_badge_progress_v2
 where account_id=p_account_id;
 if v_anchor is null then return 1;end if;
 v_seconds:=private.supporter_badge_total_seconds_v2(p_account_id);
 -- Compare accumulated duration with calendar months anchored to the first
 -- verified entitlement. Pauses freeze progress instead of resetting it.
 if v_seconds>=extract(epoch from ((v_anchor+interval '12 months')-v_anchor)) then return 12;end if;
 if v_seconds>=extract(epoch from ((v_anchor+interval '6 months')-v_anchor)) then return 6;end if;
 if v_seconds>=extract(epoch from ((v_anchor+interval '3 months')-v_anchor)) then return 3;end if;
 return 1;
end; $$;
revoke all on function private.supporter_badge_tier_v2(uuid) from public,anon,authenticated;
grant execute on function private.supporter_badge_tier_v2(uuid) to service_role;

-- The original v1 JSON/RPC names remain unchanged for existing Android builds.
-- A new v2 selection RPC is added; staff cannot be selected or impersonated.
create or replace function private.player_badges_v1(p_account_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 v_staff text;v_supporter_active boolean:=false;v_tier smallint:=0;
 v_show boolean:=true;v_choice text:='auto';v_selected text:='none';
 v_owned text[];v_featured text[]:=array[]::text[];
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
   and v_tier>=case v_choice when 'supporter_12m' then 12 when 'supporter_6m' then 6
      when 'supporter_3m' then 3 else 1 end then
  v_selected:=v_choice;
 end if;
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
  'validUntilMs',floor(extract(epoch from v_until)*1000)::bigint
 );
end; $$;
revoke all on function private.player_badges_v1(uuid) from public,anon,authenticated;
grant execute on function private.player_badges_v1(uuid) to service_role;

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
  'featuredExtras',coalesce(v_identity->'extras','[]'::jsonb)
 );
end; $$;
revoke all on function public.player_badge_self_v1() from public,anon,authenticated;
grant execute on function public.player_badge_self_v1() to authenticated;

create or replace function public.update_player_equipped_badge_v2(p_badge_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_uid uuid:=auth.uid();v_choice text:=coalesce(p_badge_id,'none');
 v_tier smallint;v_owned text[];v_supporter boolean:=false;v_featured text[];
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if v_choice not in ('none','supporter','supporter_3m','supporter_6m','supporter_12m',
  'founder','beta_tester','veteran','guild_leader','community_champion','event_champion')
 then raise exception 'INVALID_BADGE_SELECTION';end if;
 if v_choice in ('supporter','supporter_3m','supporter_6m','supporter_12m') then
  select supporter into v_supporter from private.commerce_entitlements_v1(v_uid);
  v_tier:=private.supporter_badge_tier_v2(v_uid);
  if not coalesce(v_supporter,false) or v_tier<case v_choice
      when 'supporter_12m' then 12 when 'supporter_6m' then 6 when 'supporter_3m' then 3 else 1 end
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
end; $$;
revoke all on function public.update_player_equipped_badge_v2(text)
 from public,anon,authenticated;
grant execute on function public.update_player_equipped_badge_v2(text) to authenticated;

-- Legacy writers are retained for older app builds, but can no longer feature
-- a second collectible badge. An old two-ID request keeps its first owned ID.
create or replace function public.update_player_featured_badges_v1(p_badge_ids text[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_owned text[];v_choice text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_badge_ids is null or cardinality(p_badge_ids)>2
  then raise exception 'INVALID_BADGE_SELECTION';end if;
 if exists(select 1 from unnest(p_badge_ids) id where id is null)
  or (select count(*) from unnest(p_badge_ids))<>(select count(distinct id) from unnest(p_badge_ids) id)
 then raise exception 'INVALID_BADGE_SELECTION';end if;
 v_owned:=private.player_badge_unlocks_v1(v_uid);
 if exists(select 1 from unnest(p_badge_ids) id where not(id=any(v_owned)))
 then raise exception 'BADGE_NOT_OWNED';end if;
 v_choice:=coalesce(p_badge_ids[1],'none');
 return public.update_player_equipped_badge_v2(nullif(v_choice,'none'));
end; $$;
revoke all on function public.update_player_featured_badges_v1(text[])
 from public,anon,authenticated;
grant execute on function public.update_player_featured_badges_v1(text[]) to authenticated;

create or replace function public.update_player_badge_preferences_v1(p_show_supporter boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_show_supporter is null then raise exception 'INVALID_BADGE_PREFERENCE';end if;
 insert into private.player_badge_preferences_v1
  (account_id,show_supporter,equipped_badge_id)
 values(v_uid,p_show_supporter,case when p_show_supporter then 'auto' else 'none' end)
 on conflict(account_id) do update set
  show_supporter=excluded.show_supporter,
  equipped_badge_id=case
   when excluded.show_supporter then 'supporter'
   when private.player_badge_preferences_v1.equipped_badge_id like 'supporter%' then 'none'
   else private.player_badge_preferences_v1.equipped_badge_id
  end;
 return public.player_badge_self_v1();
end; $$;
revoke all on function public.update_player_badge_preferences_v1(boolean)
 from public,anon,authenticated;
grant execute on function public.update_player_badge_preferences_v1(boolean) to authenticated;

commit;
