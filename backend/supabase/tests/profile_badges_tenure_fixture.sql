-- Disposable PGlite schema for migration test only. NOT a production migration.
create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema private;
grant usage on schema auth,private,public to service_role;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as
 $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.liveops_admin_users(account_id uuid primary key references auth.users(id),enabled boolean,role text);
create table private.player_staff_badges_v1(account_id uuid primary key references auth.users(id),role text,enabled boolean);
create table private.player_badge_preferences_v1(
 account_id uuid primary key references auth.users(id),
 show_supporter boolean not null default true,
 featured_badge_ids text[] not null default array[]::text[]
);
create table private.account_commerce_entitlements_v1(
 account_id uuid primary key references auth.users(id),
 supporter_active boolean not null default false,
 supporter_expires_at timestamptz
);
create table private.commerce_promo_entitlements_v1(
 account_id uuid primary key references auth.users(id),
 supporter_lifetime boolean not null default false,
 supporter_expires_at timestamptz
);
create table private.fixture_badges(account_id uuid references auth.users(id),badge_id text,primary key(account_id,badge_id));
create function private.player_badge_unlocks_v1(p_account_id uuid)
returns text[] language sql stable security definer set search_path='' as
 $$ select coalesce(array_agg(badge_id order by badge_id),array[]::text[])
    from private.fixture_badges where account_id=p_account_id $$;
create function private.commerce_entitlements_v1(p_account_id uuid)
returns table(vip boolean,vip_plus boolean,supporter boolean)
language sql stable security definer set search_path='' as
 $$ select false,false,
      coalesce(e.supporter_active and (e.supporter_expires_at is null or e.supporter_expires_at>now()),false)
        or coalesce(p.supporter_lifetime,false)
        or coalesce(p.supporter_expires_at>now(),false)
    from (select 1) x
    left join private.account_commerce_entitlements_v1 e on e.account_id=p_account_id
    left join private.commerce_promo_entitlements_v1 p on p.account_id=p_account_id $$;
insert into auth.users(id)values
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000003');
insert into public.liveops_admin_users(account_id,enabled,role)
values('00000000-0000-4000-8000-000000000001',true,'owner');
insert into private.fixture_badges(account_id,badge_id)
values('00000000-0000-4000-8000-000000000001','founder'),
 ('00000000-0000-4000-8000-000000000001','beta_tester'),
 ('00000000-0000-4000-8000-000000000002','veteran');
insert into private.player_badge_preferences_v1(account_id,show_supporter,featured_badge_ids)
values('00000000-0000-4000-8000-000000000001',true,array['founder','beta_tester']);
insert into private.account_commerce_entitlements_v1(account_id,supporter_active,supporter_expires_at)
values('00000000-0000-4000-8000-000000000001',true,now()+interval '7 months'),
 ('00000000-0000-4000-8000-000000000002',true,now()+interval '6 months');
insert into private.commerce_promo_entitlements_v1(account_id,supporter_expires_at)
values('00000000-0000-4000-8000-000000000003',now()+interval '6 months');
