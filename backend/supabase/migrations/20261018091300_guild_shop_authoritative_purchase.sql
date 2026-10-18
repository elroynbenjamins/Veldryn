-- Durable, price-authoritative Guild Token reward catalogue.
-- Reward rows default disabled until their matching in-game collectible exists.
create table if not exists public.guild_shop_reward_catalogue (
 item_id text primary key,
 category text not null check(category in ('pet','companion','border','profile_icon','emote_set')),
 required_guild_level integer not null check(required_guild_level between 1 and 100),
 token_cost bigint not null check(token_cost>0),
 enabled boolean not null default false
);
insert into public.guild_shop_reward_catalogue(item_id,category,required_guild_level,token_cost) values
 ('guild_pet_01','pet',3,2000),
 ('guild_pet_02','pet',7,4000),
 ('guild_companion_01','companion',10,6000),
 ('guild_companion_02','companion',15,8000),
 ('guild_companion_03','companion',20,10000),
 ('border_silver','border',2,750),
 ('icon_guild','profile_icon',4,1000),
 ('emotes_fellowship','emote_set',5,1250),
 ('border_emerald','border',8,1500),
 ('emotes_adventure','emote_set',10,1750),
 ('border_royal','border',14,2000),
 ('emotes_legends','emote_set',18,2500)
on conflict(item_id) do nothing;
alter table public.guild_shop_reward_catalogue enable row level security;
revoke all on public.guild_shop_reward_catalogue from anon,authenticated;

-- Purchase and durable ownership are a single transaction, never a client price.
-- This API is disabled until these reward IDs are projected into GameState and
-- backed by canonical pet/companion/profile content.
create or replace function public.guild_shop_purchase_server_v2(
 p_account_id uuid,p_item_id text
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_level integer;v_cost bigint;v_required integer;v_enabled boolean;
 v_balance bigint;
begin
 if p_account_id is null or p_item_id is null or length(p_item_id) not between 1 and 120
 then raise exception 'invalid_guild_shop_purchase';end if;
 select c.token_cost,c.required_guild_level,c.enabled
 into v_cost,v_required,v_enabled
 from public.guild_shop_reward_catalogue c where c.item_id=p_item_id;
 if not found then raise exception 'unknown_guild_reward';end if;
 if not v_enabled then raise exception 'guild_reward_not_released';end if;
 select g.level into v_level
 from public.guild_members m join public.guilds g on g.id=m.guild_id
 where m.account_id=p_account_id limit 1;
 if v_level is null then raise exception 'guild_membership_required';end if;
 if v_level<v_required then raise exception 'guild_level_locked';end if;

 insert into public.guild_shop_wallets(account_id) values(p_account_id)
 on conflict(account_id) do nothing;
 select balance into v_balance from public.guild_shop_wallets
 where account_id=p_account_id for update;
 if exists(select 1 from public.guild_shop_owned
  where account_id=p_account_id and item_id=p_item_id) then
  return jsonb_build_object('status','already_owned','balance',v_balance);
 end if;
 if v_balance<v_cost then raise exception 'insufficient_guild_tokens';end if;
 insert into public.guild_shop_owned(account_id,item_id)
 values(p_account_id,p_item_id);
 insert into public.guild_shop_ledger(account_id,claim_key,amount,kind)
 values(p_account_id,'purchase:'||p_item_id,-v_cost,'purchase');
 update public.guild_shop_wallets set balance=balance-v_cost where account_id=p_account_id;
 return jsonb_build_object('status','purchased','balance',v_balance-v_cost);
end $$;
revoke all on function public.guild_shop_purchase_server_v2(uuid,text) from public,anon,authenticated,service_role;
-- Grant service_role only after actual GameState entitlement delivery is verified.
