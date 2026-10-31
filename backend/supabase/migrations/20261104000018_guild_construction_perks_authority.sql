-- Guild Construction benefit authority. No feature is automatically released.
-- New construction templates stay DISABLED by default. All earned unlocks are
-- immutable guild-owned records; all purchase/earning decisions are server-side.
-- Do not change construction donation RPC grants in this migration.

create or replace function public.guild_construction_tier_v1(p_guild uuid,p_building text)
returns integer language plpgsql stable security invoker set search_path=public as $$
declare v_max integer;v_tier integer:=0;v_idx integer;
begin
 v_max:=case p_building
  when 'hall' then 4 when 'forge' then 3 when 'library' then 3
  when 'treasury' then 2 when 'war_room' then 3
  when 'expedition' then 2 else 0 end;
 if p_guild is null or v_max=0 then return 0;end if;
 for v_idx in 1..v_max loop
  exit when not exists(select 1 from public.guild_construction_unlocks u
   where u.guild_id=p_guild and u.unlock_id='guild_construction_'||p_building||'_'||v_idx
     and u.template_id='construction_'||p_building||'_'||v_idx);
  v_tier:=v_idx;
 end loop;
 return v_tier;
end $$;
revoke all on function public.guild_construction_tier_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.guild_construction_tier_v1(uuid,text) to service_role;

create or replace function public.guild_construction_token_weekly_cap_v1(p_account_id uuid)
returns integer language sql stable security invoker set search_path=public as $$
 select 250 + 25*coalesce((
  select public.guild_construction_tier_v1(m.guild_id,'treasury')
  from public.guild_members m where m.account_id=p_account_id limit 1
 ),0)
$$;
revoke all on function public.guild_construction_token_weekly_cap_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.guild_construction_token_weekly_cap_v1(uuid) to service_role;

create or replace function public.guild_construction_token_bonus_bps_v1(p_account_id uuid)
returns integer language sql stable security invoker set search_path=public as $$
 select 1000*coalesce((
  select public.guild_construction_tier_v1(m.guild_id,'treasury')
  from public.guild_members m where m.account_id=p_account_id limit 1
 ),0)
$$;
revoke all on function public.guild_construction_token_bonus_bps_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.guild_construction_token_bonus_bps_v1(uuid) to service_role;

-- Existing standard weekly reward totals are currently constrained to 250.
alter table public.guild_shop_weekly drop constraint if exists guild_shop_weekly_earned_check;
alter table public.guild_shop_weekly
 add constraint guild_shop_weekly_earned_check check(earned between 0 and 300);

-- Reuse the existing VERIFIED-claim path (not a client-controlled amount). Bonus
-- is applied ONCE when inserting a claim source; reruns of the same claim key
-- do not insert a second row or receive the current guild's bonus again.
create or replace function public.guild_construction_verified_token_bonus_v1()
returns trigger language plpgsql security invoker set search_path=public as $$
declare v_bps integer;
begin
 if new.reward_kind='standard' and
   (new.claim_key like 'guild-muster:%' or new.claim_key like 'guild-weekly:%') then
  v_bps:=public.guild_construction_token_bonus_bps_v1(new.account_id);
  if v_bps>0 then
   new.reward_amount:=ceil(new.reward_amount::numeric*(10000+v_bps)/10000)::bigint;
  end if;
 end if;
 return new;
end $$;
revoke all on function public.guild_construction_verified_token_bonus_v1() from public,anon,authenticated;
drop trigger if exists guild_construction_verified_token_bonus on public.guild_shop_claim_sources;
create trigger guild_construction_verified_token_bonus before insert
 on public.guild_shop_claim_sources for each row
 execute function public.guild_construction_verified_token_bonus_v1();

-- Keep source -> wallet -> week row lock ordering, idempotency and event cap bypass.
create or replace function public.guild_shop_redeem_verified_claim_server_v2(
 p_account_id uuid,p_claim_key text
) returns bigint language plpgsql security invoker set search_path=public as $$
declare v_amount bigint;v_kind text;v_credited bigint;v_earned integer;v_week date;
 v_cap integer;
begin
 if p_account_id is null or p_claim_key is null or length(p_claim_key) not between 1 and 200
 then raise exception 'invalid_claim';end if;
 select reward_amount,reward_kind into v_amount,v_kind
 from public.guild_shop_claim_sources
 where account_id=p_account_id and claim_key=p_claim_key and consumed_at is null
 for update;
 if not found then
  if exists(select 1 from public.guild_shop_claim_sources
   where account_id=p_account_id and claim_key=p_claim_key and consumed_at is not null)
  then return 0;end if;
  raise exception 'unverified_guild_claim';
 end if;
 insert into public.guild_shop_wallets(account_id) values(p_account_id)
 on conflict(account_id) do nothing;
 perform 1 from public.guild_shop_wallets where account_id=p_account_id for update;
 v_week:=date_trunc('week',now() at time zone 'utc')::date;
 insert into public.guild_shop_weekly(account_id,week_start) values(p_account_id,v_week)
 on conflict(account_id,week_start) do nothing;
 select earned into v_earned from public.guild_shop_weekly
 where account_id=p_account_id and week_start=v_week for update;
 v_cap:=public.guild_construction_token_weekly_cap_v1(p_account_id);
 v_credited:=case when v_kind='event' then v_amount
   else least(v_amount,greatest(0,v_cap-v_earned)) end;
 if v_credited>0 then
  insert into public.guild_shop_ledger(account_id,claim_key,amount,kind)
   values(p_account_id,p_claim_key,v_credited,v_kind);
  update public.guild_shop_wallets set balance=balance+v_credited where account_id=p_account_id;
  if v_kind='standard' then
   update public.guild_shop_weekly set earned=earned+v_credited
    where account_id=p_account_id and week_start=v_week;
  end if;
 end if;
 update public.guild_shop_claim_sources set consumed_at=now()
 where account_id=p_account_id and claim_key=p_claim_key;
 return v_credited;
end $$;
revoke all on function public.guild_shop_redeem_verified_claim_server_v2(uuid,text)
 from public,anon,authenticated;
grant execute on function public.guild_shop_redeem_verified_claim_server_v2(uuid,text) to service_role;

-- Distinguish SHOP ITEM QUALITY from any personal collectible rarity.
-- Existing required_guild_level and canonical account entitlement remain in force.
alter table public.guild_shop_reward_catalogue
 add column if not exists quality_tier text not null default 'standard';
alter table public.guild_shop_reward_catalogue
 drop constraint if exists guild_shop_reward_quality_tier_check;
alter table public.guild_shop_reward_catalogue add constraint guild_shop_reward_quality_tier_check
 check(quality_tier in('standard','rare','epic','prestige'));
update public.guild_shop_reward_catalogue set quality_tier=case
 when item_id in('guild_pet_02','border_emerald','emotes_adventure') then 'rare'
 when item_id in('guild_companion_01','border_royal','emotes_legends') then 'epic'
 when item_id in('guild_companion_02','guild_companion_03') then 'prestige'
 else 'standard' end;

-- Compatibility: old Guild Shop purchases remain intact. A tier is enforced
-- only after its matching Guild Hall construction template is explicitly released.
create or replace function public.guild_construction_shop_tier_guard_v1()
returns trigger language plpgsql security invoker set search_path=public as $$
declare v_quality text;v_required integer;v_guild uuid;
begin
 select quality_tier into v_quality from public.guild_shop_reward_catalogue
  where item_id=new.item_id;
 v_required:=case v_quality when 'rare' then 2 when 'epic' then 3
  when 'prestige' then 4 else 0 end;
 if v_required=0 then return new;end if;
 if not exists(select 1 from public.guild_construction_templates t
   where t.template_id='construction_hall_'||v_required and t.enabled) then
  return new;
 end if;
 select m.guild_id into v_guild from public.guild_members m
  where m.account_id=new.account_id limit 1;
 if v_guild is null or public.guild_construction_tier_v1(v_guild,'hall')<v_required
 then raise exception 'guild_shop_quality_locked';end if;
 return new;
end $$;
revoke all on function public.guild_construction_shop_tier_guard_v1() from public,anon,authenticated;
drop trigger if exists guild_construction_shop_tier_guard on public.guild_shop_owned;
create trigger guild_construction_shop_tier_guard before insert on public.guild_shop_owned
 for each row execute function public.guild_construction_shop_tier_guard_v1();

-- Hall I unlocks only the PERMISSION to edit. Existing earned/event/achievement
-- allowlists and leader/officer checks remain enforced by appearance writers.
-- Do not block legacy editing until Hall I is explicitly released.
create or replace function public.guild_construction_color_edit_guard_v1()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if (new.name_color_id is distinct from old.name_color_id
  or new.tag_color_id is distinct from old.tag_color_id)
 and exists(select 1 from public.guild_construction_templates t
  where t.template_id='construction_hall_1' and t.enabled)
 and public.guild_construction_tier_v1(new.id,'hall')<1
 then raise exception 'guild_hall_color_edit_locked';end if;
 return new;
end $$;
revoke all on function public.guild_construction_color_edit_guard_v1() from public,anon,authenticated;
drop trigger if exists guild_construction_color_edit_guard on public.guilds;
create trigger guild_construction_color_edit_guard
 before update of name_color_id,tag_color_id on public.guilds
 for each row execute function public.guild_construction_color_edit_guard_v1();

-- Scoped read-only benefit projection for trusted gameplay callers. Combat,
-- crafting and quest Gold payout integration still requires separate validation.
create or replace function public.guild_construction_benefits_server_v1(p_account_id uuid)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare v_gid uuid;v_h integer;v_f integer;v_l integer;v_t integer;
 v_w integer;v_e integer;
begin
 select guild_id into v_gid from public.guild_members where account_id=p_account_id limit 1;
 if v_gid is null then return '{}'::jsonb;end if;
 v_h:=public.guild_construction_tier_v1(v_gid,'hall');
 v_f:=public.guild_construction_tier_v1(v_gid,'forge');
 v_l:=public.guild_construction_tier_v1(v_gid,'library');
 v_t:=public.guild_construction_tier_v1(v_gid,'treasury');
 v_w:=public.guild_construction_tier_v1(v_gid,'war_room');
 v_e:=public.guild_construction_tier_v1(v_gid,'expedition');
 return jsonb_build_object(
  'canChangeGuildColors',v_h>=1,
  'shopTier',v_h,'smithingTailoringSpeedBps',(array[0,500,800,1200])[v_f+1],
  'nonCombatXpBps',(array[0,500,800,1200])[v_l+1],
  'guildTokenBonusBps',v_t*1000,
  'guildTokenWeeklyCap',250+v_t*25,
  'guildBossDamageBps',(array[0,300,600,1000])[v_w+1],
  'guildQuestGoldBps',(array[0,500,1000])[v_e+1]
 );
end $$;
revoke all on function public.guild_construction_benefits_server_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.guild_construction_benefits_server_v1(uuid) to service_role;

-- Existing cosmetic adapter was written for legacy construction cosmetics.
-- New Hall/Forge/Library/Treasury/War/Expedition unlocks are NOT cosmetics and
-- must not create phantom entries in guild_cosmetic_unlocks.
create or replace function public.guild_construction_publish_cosmetic_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from public.guild_construction_cosmetic_releases release
  where release.template_id=new.template_id
    and release.unlock_id=new.unlock_id and release.released=true) then
  insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref,unlocked_at)
  values(new.guild_id,new.unlock_id,'construction',new.template_id,new.unlocked_at)
  on conflict(guild_id,unlock_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.guild_construction_publish_cosmetic_v1() from public,anon,authenticated;
