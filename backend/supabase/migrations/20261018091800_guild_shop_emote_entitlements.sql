-- Emote packs: use existing five unique authored pet-emote artworks each.
-- Each purchase grants all five IDs atomically in the same saved account state.
alter table public.guild_shop_reward_catalogue
 add column if not exists reward_ids jsonb;
update public.guild_shop_reward_catalogue
 set account_field='unlockedEmoteIds',
 reward_id=null,
 reward_ids=case item_id
  when 'emotes_fellowship' then '["pet_set_a_01","pet_set_a_02","pet_set_a_03","pet_set_a_04","pet_set_a_05"]'::jsonb
  when 'emotes_adventure' then '["pet_set_a_06","pet_set_a_07","pet_set_a_08","pet_set_a_09","pet_set_a_10"]'::jsonb
  when 'emotes_legends' then '["pet_set_b_01","pet_set_b_02","pet_set_b_03","pet_set_b_04","pet_set_b_05"]'::jsonb
 end
where item_id in ('emotes_fellowship','emotes_adventure','emotes_legends');

create or replace function public.guild_shop_purchase_server_v4(
 p_account_id uuid,p_item_id text
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare
 v_level integer; v_cost bigint;v_required integer;v_enabled boolean;
 v_reward_id text;v_account_field text;v_reward_ids jsonb;
 v_game public.online_game_states;
 v_owned jsonb;v_account jsonb;v_progress jsonb;v_balance bigint;
begin
 if p_account_id is null or p_item_id is null or length(p_item_id) not between 1 and 120
 then raise exception 'invalid_guild_shop_purchase';end if;
 select c.token_cost,c.required_guild_level,c.enabled,c.account_field,c.reward_id,c.reward_ids
 into v_cost,v_required,v_enabled,v_account_field,v_reward_id,v_reward_ids
 from public.guild_shop_reward_catalogue c where c.item_id=p_item_id;
 if not found then raise exception 'unknown_guild_reward';end if;
 if not v_enabled then raise exception 'guild_reward_not_released';end if;
 if v_account_field not in ('unlockedCosmeticPetIds','unlockedCombatCompanionIds',
   'unlockedProfileBorderIds','unlockedProfileIconIds','unlockedEmoteIds')
  then raise exception 'guild_reward_not_configured';end if;
 v_reward_ids:=coalesce(v_reward_ids,jsonb_build_array(v_reward_id));
 if jsonb_typeof(v_reward_ids)<>'array' or jsonb_array_length(v_reward_ids) not between 1 and 5
  or exists(select 1 from jsonb_array_elements(v_reward_ids) e
   where jsonb_typeof(e.value)<>'string' or length(trim(both '"' from e.value::text))<1)
 then raise exception 'invalid_guild_reward_ids';end if;
 if v_account_field='unlockedEmoteIds' and jsonb_array_length(v_reward_ids)<>5
 then raise exception 'invalid_emote_pack';end if;

 select g.level into v_level from public.guild_members m
 join public.guilds g on g.id=m.guild_id where m.account_id=p_account_id limit 1;
 if v_level is null then raise exception 'guild_membership_required';end if;
 if v_level<v_required then raise exception 'guild_level_locked';end if;

 -- Keep the lock order consistent with the gameplay state transaction.
 select * into v_game from public.online_game_states
 where account_id=p_account_id for update;
 if not found or v_game.state is null or v_game.character_id is null
 then raise exception 'character_required';end if;
 v_account:=coalesce(v_game.state->'account','{}'::jsonb);
 if jsonb_typeof(v_account)<>'object' then raise exception 'invalid_game_account';end if;
 v_owned:=coalesce(v_account->v_account_field,'[]'::jsonb);
 if jsonb_typeof(v_owned)<>'array' then raise exception 'invalid_reward_inventory';end if;

 insert into public.guild_shop_wallets(account_id) values(p_account_id)
 on conflict(account_id) do nothing;
 select balance into v_balance from public.guild_shop_wallets
 where account_id=p_account_id for update;
 if exists(select 1 from public.guild_shop_owned
  where account_id=p_account_id and item_id=p_item_id) then
  -- Repairing inconsistent snapshots must be separate from charging a buyer.
  return jsonb_build_object('status','already_owned','balance',v_balance);
 end if;
 if v_balance<v_cost then raise exception 'insufficient_guild_tokens';end if;
 if exists(select 1 from jsonb_array_elements_text(v_reward_ids) as e(value)
  where v_owned ? e.value) then raise exception 'guild_reward_already_unlocked';end if;

 v_account:=jsonb_set(v_account,array[v_account_field],v_owned||v_reward_ids,true);
 if v_account_field='unlockedCombatCompanionIds' then
  v_progress:=coalesce(v_account->'combatCompanionProgress','{}'::jsonb);
  if jsonb_typeof(v_progress)<>'object' then raise exception 'invalid_companion_progress';end if;
  if v_progress ? v_reward_id then raise exception 'guild_companion_already_unlocked';end if;
  v_progress:=jsonb_set(v_progress,array[v_reward_id],jsonb_build_object(
   'level',1,'xp',0,'ascensionTier',0,'bondLevel',0,'bondXp',0,
   'bondTraitUnlocked',false,'obtainedAtMs',floor(extract(epoch from clock_timestamp())*1000)
  ),true);
  v_account:=jsonb_set(v_account,'{combatCompanionProgress}',v_progress,true);
 end if;

 update public.online_game_states set
  state=jsonb_set(state,'{account}',v_account,true),revision=revision+1,updated_at=now()
 where account_id=p_account_id;
 insert into public.guild_shop_owned(account_id,item_id) values(p_account_id,p_item_id);
 insert into public.guild_shop_ledger(account_id,claim_key,amount,kind)
 values(p_account_id,'purchase:'||p_item_id,-v_cost,'purchase');
 update public.guild_shop_wallets set balance=balance-v_cost where account_id=p_account_id;
 return jsonb_build_object('status','purchased','balance',v_balance-v_cost,
  'rewardId',v_reward_id,'rewardIds',v_reward_ids);
end $$;
revoke all on function public.guild_shop_purchase_server_v4(uuid,text)
 from public,anon,authenticated,service_role;
-- Deliberately NOT enabled: check reconciliation with commerce projection,
-- build/test coverage, and asset availability before granting EXECUTE.
