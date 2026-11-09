-- Cosmetic-only player collectibles. Badge awards never grant admin/moderator permissions.
-- Server writes only: Founder, Beta Tester, Community Champion and Event Champion.
-- Veteran and Guild Leader are recalculated from trusted current account/guild state.
begin;

create table if not exists private.player_collectible_badges_v1 (
 account_id uuid not null references auth.users(id) on delete cascade,
 badge_id text not null check(badge_id in ('founder','beta_tester','veteran','guild_leader','community_champion','event_champion')),
 awarded_at timestamptz not null default now(),
 primary key(account_id,badge_id)
);
alter table private.player_collectible_badges_v1 enable row level security;
revoke all on private.player_collectible_badges_v1 from public,anon,authenticated;
grant select,insert,update,delete on private.player_collectible_badges_v1 to service_role;
comment on table private.player_collectible_badges_v1 is 'Cosmetic badge entitlements; does not confer privileges. Grant manually via audited operations, never from client metadata.';

alter table private.player_badge_preferences_v1
 add column if not exists featured_badge_ids text[] not null default array[]::text[];

create or replace function private.player_badge_unlocks_v1(p_account_id uuid) returns text[]
language sql stable security definer set search_path='' as $$
 select coalesce(array_agg(badge_id order by priority),array[]::text[])
 from (
  select badge_id,
   case badge_id when 'founder' then 1 when 'beta_tester' then 2 when 'veteran' then 3 when 'guild_leader' then 4 when 'community_champion' then 5 else 6 end as priority
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
$$;
revoke all on function private.player_badge_unlocks_v1(uuid) from public,anon,authenticated;
grant execute on function private.player_badge_unlocks_v1(uuid) to service_role;

-- Preserve existing public identity JSON fields for older Android builds.
create or replace function private.player_badges_v1(p_account_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_staff text;v_supporter boolean:=false;v_show boolean:=true;
 v_exp timestamptz;v_until timestamptz:=now()+interval '120 seconds';
 v_owned text[];v_featured text[];
begin
 select role into v_staff from private.player_staff_badges_v1 where account_id=p_account_id and enabled;
 if exists(select 1 from public.liveops_admin_users where account_id=p_account_id and enabled and role='owner') then v_staff:='admin';end if;
 if to_regprocedure('private.commerce_entitlements_v1(uuid)') is not null then
  select supporter into v_supporter from private.commerce_entitlements_v1(p_account_id);
  select supporter_expires_at into v_exp from private.account_commerce_entitlements_v1 where account_id=p_account_id;
 end if;
 select coalesce((select show_supporter from private.player_badge_preferences_v1 where account_id=p_account_id),true) into v_show;
 if v_supporter and v_show and v_exp is not null then v_until:=least(v_until,v_exp);end if;
 v_owned:=private.player_badge_unlocks_v1(p_account_id);
 select coalesce(array_agg(t.id order by t.ord),array[]::text[]) into v_featured from (
  select id,ord from unnest(coalesce((select featured_badge_ids from private.player_badge_preferences_v1 where account_id=p_account_id),array[]::text[])) with ordinality as e(id,ord)
  where id=any(v_owned) order by ord limit 2
 ) t;
 return jsonb_build_object('staff',v_staff,'supporter',coalesce(v_supporter,false) and v_show,
   'extras',to_jsonb(v_featured),'validUntilMs',floor(extract(epoch from v_until)*1000)::bigint);
end $$;
revoke all on function private.player_badges_v1(uuid) from public,anon,authenticated;
grant execute on function private.player_badges_v1(uuid) to service_role;

create or replace function public.player_badge_self_v1() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_available boolean:=false;v_owned text[];v_featured text[];
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if to_regprocedure('private.commerce_entitlements_v1(uuid)') is not null then
  select supporter into v_available from private.commerce_entitlements_v1(v_uid);
 end if;
 v_owned:=private.player_badge_unlocks_v1(v_uid);
 select coalesce(array_agg(t.id order by t.ord),array[]::text[]) into v_featured from (
  select id,ord from unnest(coalesce((select featured_badge_ids from private.player_badge_preferences_v1 where account_id=v_uid),array[]::text[])) with ordinality as e(id,ord)
  where id=any(v_owned) order by ord limit 2
 ) t;
 return jsonb_build_object('identity',private.player_badges_v1(v_uid),
  'showSupporter',coalesce((select show_supporter from private.player_badge_preferences_v1 where account_id=v_uid),true),
  'supporterAvailable',coalesce(v_available,false),
  'ownedExtras',to_jsonb(v_owned),'featuredExtras',to_jsonb(v_featured));
end $$;
revoke all on function public.player_badge_self_v1() from public,anon,authenticated;
grant execute on function public.player_badge_self_v1() to authenticated;

-- Never take an account id or earned badge list from the caller.
create or replace function public.update_player_featured_badges_v1(p_badge_ids text[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_owned text[];
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_badge_ids is null or cardinality(p_badge_ids)>2 then raise exception 'INVALID_BADGE_SELECTION';end if;
 if exists(select 1 from unnest(p_badge_ids) id where id is null)
    or (select count(*) from unnest(p_badge_ids))<>(select count(distinct id) from unnest(p_badge_ids) id)
 then raise exception 'INVALID_BADGE_SELECTION';end if;
 v_owned:=private.player_badge_unlocks_v1(v_uid);
 if exists(select 1 from unnest(p_badge_ids) id where not (id=any(v_owned))) then raise exception 'BADGE_NOT_OWNED';end if;
 insert into private.player_badge_preferences_v1(account_id,featured_badge_ids)
 values(v_uid,p_badge_ids)
 on conflict(account_id) do update set featured_badge_ids=excluded.featured_badge_ids;
 return public.player_badge_self_v1();
end $$;
revoke all on function public.update_player_featured_badges_v1(text[]) from public,anon,authenticated;
grant execute on function public.update_player_featured_badges_v1(text[]) to authenticated;

commit;
