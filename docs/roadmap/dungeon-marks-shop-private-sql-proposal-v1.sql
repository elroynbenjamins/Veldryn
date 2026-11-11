-- Dungeon Marks Shop V2 — hidden staging foundation (2026-11-11).
-- No shop is enabled by this migration. No public client receives EXECUTE.
-- Materials are explicitly blocked until nontradeable inventory provenance exists.
-- Only the authenticated co-op Edge service may later call these service_role RPCs.
create table if not exists public.dungeon_shop_settings_v1 (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.dungeon_shop_settings_v1(singleton,enabled) values(true,false)
on conflict(singleton) do nothing;
alter table public.dungeon_shop_settings_v1 enable row level security;
revoke all on public.dungeon_shop_settings_v1 from public, anon, authenticated;
grant select on public.dungeon_shop_settings_v1 to service_role;

create table if not exists public.dungeon_shop_catalogue_v1 (
  item_id text primary key check (item_id ~ '^dshop_[a-z0-9_]{1,80}$'),
  name text not null,
  price integer not null check (price > 0 and price < 1000000),
  grant_kind text not null check (grant_kind in ('material','account_resource','profile_collectible')),
  reward_field text not null,
  reward_id text,
  reward_quantity integer not null default 1 check (reward_quantity between 1 and 100000),
  required_region text check(required_region in ('Asterfall','Sunscar','Frostmarch')),
  per_utc_week smallint check(per_utc_week between 1 and 10),
  permanent boolean not null default false,
  enabled boolean not null default false,
  check (permanent = (grant_kind = 'profile_collectible')),
  check ((permanent and per_utc_week is null and reward_id is not null)
        or (not permanent and per_utc_week is not null))
);
alter table public.dungeon_shop_catalogue_v1 enable row level security;
revoke all on public.dungeon_shop_catalogue_v1 from public, anon, authenticated;
grant select on public.dungeon_shop_catalogue_v1 to service_role;

insert into public.dungeon_shop_catalogue_v1
(item_id,name,price,grant_kind,reward_field,reward_id,reward_quantity,required_region,per_utc_week,permanent,enabled)
values
('dshop_tempering_satchel','Delver Tempering Satchel',120,'material','TEMPERING_DUST',null,10,null,2,false,false),
('dshop_gem_dust_cache','Gem Dust Cache',240,'material','GEM_DUST',null,8,null,1,false,false),
('dshop_tempering_core_cache','Tempering Core Cache',450,'material','TEMPERING_CORE',null,2,null,1,false,false),
('dshop_companion_essence','Companion Essence Cache',400,'account_resource','companionEssence',null,100,null,1,false,false),
('dshop_bondstone','Bondstone',750,'account_resource','bondstones',null,1,null,1,false,false),
('dshop_asterfall_icon','Warden''s Lantern',500,'profile_collectible','unlockedProfileIconIds','dungeon:asterfall:wardens-lantern',1,'Asterfall',null,true,false),
('dshop_asterfall_border','Briarbound Frame',950,'profile_collectible','unlockedProfileBorderIds','dungeon:asterfall:briarbound-frame',1,'Asterfall',null,true,false),
('dshop_asterfall_background','Rootbound Sanctuary',1500,'profile_collectible','unlockedProfileBackgroundIds','dungeon:asterfall:rootbound-sanctuary',1,'Asterfall',null,true,false),
('dshop_asterfall_pet','Oathroot Seedling',3000,'profile_collectible','unlockedCosmeticPetIds','DUNGEON_PET_ASTERFALL_001',1,'Asterfall',null,true,false),
('dshop_sunscar_icon','Solar Vault Key',500,'profile_collectible','unlockedProfileIconIds','dungeon:sunscar:solar-vault-key',1,'Sunscar',null,true,false),
('dshop_sunscar_border','Amberglass Loop',950,'profile_collectible','unlockedProfileBorderIds','dungeon:sunscar:amberglass-loop',1,'Sunscar',null,true,false),
('dshop_sunscar_background','Buried Observatory',1500,'profile_collectible','unlockedProfileBackgroundIds','dungeon:sunscar:buried-observatory',1,'Sunscar',null,true,false),
('dshop_sunscar_pet','Vaultscarab',3000,'profile_collectible','unlockedCosmeticPetIds','DUNGEON_PET_SUNSCAR_001',1,'Sunscar',null,true,false),
('dshop_frostmarch_icon','Resonant Bell',500,'profile_collectible','unlockedProfileIconIds','dungeon:frostmarch:resonant-bell',1,'Frostmarch',null,true,false),
('dshop_frostmarch_border','Frostbound Chime',950,'profile_collectible','unlockedProfileBorderIds','dungeon:frostmarch:frostbound-chime',1,'Frostmarch',null,true,false),
('dshop_frostmarch_background','Shiverlake Reflections',1500,'profile_collectible','unlockedProfileBackgroundIds','dungeon:frostmarch:shiverlake-reflections',1,'Frostmarch',null,true,false),
('dshop_frostmarch_pet','Choirbell Sprite',3000,'profile_collectible','unlockedCosmeticPetIds','DUNGEON_PET_FROSTMARCH_001',1,'Frostmarch',null,true,false)
on conflict(item_id) do nothing;

create table if not exists public.dungeon_shop_receipts_v1 (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null check(length(request_id) between 8 and 128),
  item_id text not null references public.dungeon_shop_catalogue_v1(item_id),
  marks_spent integer not null check (marks_spent > 0),
  balance_after bigint not null check (balance_after >= 0),
  permanent boolean not null,
  rewarded_id text,
  week_key date not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(account_id,request_id)
);
create unique index if not exists dungeon_shop_permanent_unique_v1
on public.dungeon_shop_receipts_v1(account_id,item_id) where permanent;
create index if not exists dungeon_shop_receipts_week_v1
on public.dungeon_shop_receipts_v1(account_id,item_id,week_key);
alter table public.dungeon_shop_receipts_v1 enable row level security;
revoke all on public.dungeon_shop_receipts_v1 from public, anon, authenticated;
grant select, insert on public.dungeon_shop_receipts_v1 to service_role;

-- Only claimed, participant-owned, successfully completed regular dungeon runs count.
create or replace function public.dungeon_shop_cleared_regions_server_v1(p_account_id uuid)
returns text[] language sql stable security invoker set search_path=public as $$
  select coalesce(array_agg(distinct region order by region),array[]::text[])
  from (
    select case
      when r.expedition_id in ('EXP_001','EXP_002') then 'Asterfall'
      when r.expedition_id in ('EXP_003','EXP_004') then 'Sunscar'
      when r.expedition_id in ('EXP_005','EXP_006') then 'Frostmarch'
    end as region
    from public.coop_reward_entitlements e
    join public.expedition_runs r on r.id=e.run_id
    where e.recipient_account_id=p_account_id
      and e.entitlement_kind='participant'
      and e.claimed_at is not null
      and (r.phase='completed' or r.status='completed')
      and r.expedition_id in ('EXP_001','EXP_002','EXP_003','EXP_004','EXP_005','EXP_006')
  ) x where region is not null;
$$;
revoke all on function public.dungeon_shop_cleared_regions_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.dungeon_shop_cleared_regions_server_v1(uuid) to service_role;

create or replace function public.dungeon_shop_snapshot_server_v1(p_account_id uuid)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare
  v_wallet bigint:=0;
  v_account jsonb:='{}'::jsonb;
  v_owned jsonb:='[]'::jsonb;
  v_counts jsonb:='{}'::jsonb;
  v_week date:=(date_trunc('week',clock_timestamp() at time zone 'UTC'))::date;
  v_field text;
begin
  if p_account_id is null then raise exception 'invalid_account'; end if;
  select coalesce(expedition_marks,0) into v_wallet from public.expedition_wallets where account_id=p_account_id;
  select coalesce(state->'account','{}'::jsonb) into v_account from public.online_game_states where account_id=p_account_id;
  if not found then raise exception 'character_required'; end if;
  if jsonb_typeof(v_account)<>'object' then raise exception 'invalid_game_account'; end if;
  foreach v_field in array array['unlockedProfileIconIds','unlockedProfileBorderIds','unlockedProfileBackgroundIds','unlockedCosmeticPetIds']
  loop
    if jsonb_typeof(coalesce(v_account->v_field,'[]'::jsonb))<>'array' then raise exception 'invalid_reward_inventory';end if;
    v_owned:=v_owned || coalesce(v_account->v_field,'[]'::jsonb);
  end loop;
  select coalesce(jsonb_object_agg(item_id,used),'{}'::jsonb) into v_counts
  from (select item_id,sum(quantity)::integer used from public.expedition_shop_purchases
        where account_id=p_account_id and week_key=v_week group by item_id) x;
  return jsonb_build_object('marks',coalesce(v_wallet,0),
    'clearedRegions',to_jsonb(public.dungeon_shop_cleared_regions_server_v1(p_account_id)),
    'ownedRewardIds',v_owned,'purchasesThisUtcWeek',v_counts);
end $$;
revoke all on function public.dungeon_shop_snapshot_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.dungeon_shop_snapshot_server_v1(uuid) to service_role;

create or replace function public.dungeon_shop_purchase_server_v1(
 p_account_id uuid,p_item_id text,p_request_id text
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare
 v_rec public.dungeon_shop_receipts_v1%rowtype;
 v_offer public.dungeon_shop_catalogue_v1%rowtype;
 v_game public.online_game_states%rowtype;
 v_account jsonb;
 v_owned jsonb;
 v_balance bigint;
 v_used integer;
 v_current bigint;
 v_week date:=(date_trunc('week',clock_timestamp() at time zone 'UTC'))::date;
 v_enabled boolean:=false;
 v_cleared text[];
begin
 if p_account_id is null or p_item_id is null or p_request_id is null
   or p_item_id !~ '^dshop_[a-z0-9_]{1,80}$'
   or p_request_id !~ '^[a-zA-Z0-9_-]{8,128}$'
 then raise exception 'invalid_dungeon_shop_request';end if;

 -- Mirror the game's atomic revision lock order, before the wallet lock.
 select * into v_game from public.online_game_states where account_id=p_account_id for update;
 if not found or v_game.state is null or v_game.character_id is null then raise exception 'character_required';end if;
 v_account:=coalesce(v_game.state->'account','{}'::jsonb);
 if jsonb_typeof(v_account)<>'object' then raise exception 'invalid_game_account';end if;

 -- An authenticated retry must replay its old receipt even if the shop was disabled meanwhile.
 select * into v_rec from public.dungeon_shop_receipts_v1
 where account_id=p_account_id and request_id=p_request_id;
 if found then
   if v_rec.item_id<>p_item_id then raise exception 'idempotency_request_mismatch';end if;
   return jsonb_build_object('status','purchased','idempotentReplay',true,'receiptId',v_rec.id,
      'itemId',v_rec.item_id,'balance',v_rec.balance_after);
 end if;
 select enabled into v_enabled from public.dungeon_shop_settings_v1 where singleton=true;
 if not coalesce(v_enabled,false) then raise exception 'dungeon_shop_unreleased';end if;
 select * into v_offer from public.dungeon_shop_catalogue_v1 where item_id=p_item_id;
 if not found then raise exception 'unknown_dungeon_shop_offer';end if;
 if not v_offer.enabled then raise exception 'dungeon_shop_offer_unreleased';end if;
 -- Bound-material provenance is not implemented. Never generate tradeable stacks.
 if v_offer.grant_kind='material' then raise exception 'dungeon_shop_bound_materials_unavailable';end if;

 if v_offer.required_region is not null then
   v_cleared:=public.dungeon_shop_cleared_regions_server_v1(p_account_id);
   if not v_offer.required_region=any(v_cleared) then raise exception 'dungeon_shop_region_locked';end if;
 end if;

 insert into public.expedition_wallets(account_id)values(p_account_id) on conflict do nothing;
 select expedition_marks into v_balance from public.expedition_wallets
 where account_id=p_account_id for update;
 if v_offer.permanent then
   if exists(select 1 from public.dungeon_shop_receipts_v1
     where account_id=p_account_id and item_id=p_item_id and permanent)
   then return jsonb_build_object('status','already_owned','balance',v_balance);end if;
 end if;
 if v_offer.per_utc_week is not null then
   select coalesce(sum(quantity),0)::integer into v_used
   from public.expedition_shop_purchases
   where account_id=p_account_id and item_id=p_item_id and week_key=v_week;
   if v_used>=v_offer.per_utc_week then raise exception 'dungeon_shop_weekly_limit';end if;
 end if;
 if v_balance<v_offer.price then raise exception 'insufficient_expedition_marks';end if;

 if v_offer.grant_kind='profile_collectible' then
   if v_offer.reward_field not in ('unlockedProfileIconIds','unlockedProfileBorderIds',
     'unlockedProfileBackgroundIds','unlockedCosmeticPetIds') or v_offer.reward_id is null
   then raise exception 'invalid_dungeon_shop_reward';end if;
   v_owned:=coalesce(v_account->v_offer.reward_field,'[]'::jsonb);
   if jsonb_typeof(v_owned)<>'array' then raise exception 'invalid_reward_inventory';end if;
   if v_owned ? v_offer.reward_id then return jsonb_build_object('status','already_owned','balance',v_balance);end if;
   v_account:=jsonb_set(v_account,array[v_offer.reward_field],v_owned||to_jsonb(v_offer.reward_id),true);
 elsif v_offer.grant_kind='account_resource' then
   if v_offer.reward_field not in ('companionEssence','bondstones') or v_offer.reward_quantity<1 then
     raise exception 'invalid_dungeon_shop_reward';end if;
   v_current:=coalesce((v_account->>v_offer.reward_field)::bigint,0);
   if v_current<0 or v_current>1000000000 then raise exception 'invalid_companion_balance';end if;
   v_account:=jsonb_set(v_account,array[v_offer.reward_field],
     to_jsonb(v_current+v_offer.reward_quantity),true);
 else
   raise exception 'invalid_dungeon_shop_reward';
 end if;

 update public.online_game_states
 set state=jsonb_set(state,'{account}',v_account,true),
     revision=revision+1,updated_at=clock_timestamp()
 where account_id=p_account_id;
 update public.expedition_wallets set expedition_marks=expedition_marks-v_offer.price,
    updated_at=clock_timestamp() where account_id=p_account_id;
 insert into public.expedition_currency_ledger(account_id,run_id,currency,amount,reason,idempotency_key)
 values(p_account_id,null,'expedition_mark',-v_offer.price,'dungeon_shop_purchase',
        'dungeon-shop:'||p_account_id::text||':'||p_request_id);
 insert into public.expedition_shop_purchases(account_id,item_id,week_key,quantity,marks_spent)
 values(p_account_id,p_item_id,v_week,1,v_offer.price);
 insert into public.dungeon_shop_receipts_v1(account_id,request_id,item_id,marks_spent,balance_after,
        permanent,rewarded_id,week_key)
 values(p_account_id,p_request_id,p_item_id,v_offer.price,v_balance-v_offer.price,
        v_offer.permanent,v_offer.reward_id,v_week)
 returning * into v_rec;
 return jsonb_build_object('status','purchased','idempotentReplay',false,
       'receiptId',v_rec.id,'itemId',p_item_id,'balance',v_balance-v_offer.price);
end $$;
revoke all on function public.dungeon_shop_purchase_server_v1(uuid,text,text) from public,anon,authenticated;
grant execute on function public.dungeon_shop_purchase_server_v1(uuid,text,text) to service_role;
