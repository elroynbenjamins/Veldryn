-- Veldryn hidden Party Events v25: one per-account NONPAYING claim reservation.
-- Dependencies: v11-v19, v21-v24. No public API, economy grant or Inbox mail.
-- This implements the safe quote/claim-identity half of the eventual atomic
-- wallet+inventory+XP+companion+renown transfer. Never mistake an intent
-- for a claim receipt, entitlement, or credit.
begin;

create table private.party_event_claim_intents_v25 (
 id uuid primary key default gen_random_uuid(),
 offer_id uuid not null unique references
  private.party_event_reward_offers_v24(id) on delete cascade,
 event_starts_at timestamptz not null,
 reservation_id uuid not null references
  private.party_event_reward_batches_v24(reservation_id) on delete cascade,
 account_id uuid not null references auth.users(id) on delete cascade,
 character_id uuid not null,
 request_id text not null unique check(length(request_id) between 8 and 180),
 reward_model text not null check(reward_model='party-event-rewards-v2'),
 reward_kind text not null check(reward_kind in ('participation','warrior','artisan','companion')),
 reward_quote jsonb not null check(jsonb_typeof(reward_quote)='object'),
 quote_hash text not null check(quote_hash ~ '^[a-f0-9]{64}$'),
 online_revision bigint not null check(online_revision>=0),
 wallet_gold_before bigint not null check(wallet_gold_before>=0),
 inventory_used_slots integer not null check(inventory_used_slots>=0),
 inventory_capacity integer not null check(inventory_capacity between 1 and 10000),
 inventory_extra_slots integer not null check(inventory_extra_slots between 0 and 1),
 prepared_at timestamptz not null default now(),
 state text not null default 'blocked_unreleased' check(state='blocked_unreleased'),
 claimable boolean not null default false check(claimable=false),
 claimed boolean not null default false check(claimed=false),
 rewards_granted boolean not null default false check(rewards_granted=false),
 entitlement_created boolean not null default false check(entitlement_created=false),
 unique(event_starts_at,account_id),
 foreign key(character_id,account_id)
  references public.characters(id,account_id) on delete cascade,
 check(inventory_used_slots+inventory_extra_slots<=inventory_capacity)
);
alter table private.party_event_claim_intents_v25 enable row level security;
revoke all on private.party_event_claim_intents_v25
 from public,anon,authenticated,service_role;
grant select on private.party_event_claim_intents_v25 to service_role;
create trigger party_event_claim_intent_immutable_v25 before update
 on private.party_event_claim_intents_v25 for each row
 execute function private.party_event_progress_immutable_v14();

-- Exact v2 model translation (positive amounts only; PostgreSQL round() and
-- JS Math.round() agree for all generated nonnegative values).
-- Quote is derived solely from a verified v24 offer + immutable choice.
-- It is NOT an obligation to deliver and never mutates a balance.
create or replace function private.party_event_reward_quote_v25(
 p_offer_id uuid,p_account_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 o private.party_event_reward_offers_v24%rowtype;
 ch private.party_event_reward_choices_v24%rowtype;
 w private.party_event_weeks_v11%rowtype;
 v_kind text;v_factor numeric;v_base integer;v_renown integer;
 v_gold integer:=0;v_combat integer:=0;v_skill integer:=0;
 v_essence integer:=0;v_bondstones integer:=0;v_materials jsonb:='{}'::jsonb;
begin
 if p_offer_id is null or p_account_id is null
 then raise exception 'party_event_v25_invalid_quote';end if;
 select * into o from private.party_event_reward_offers_v24
  where id=p_offer_id and account_id=p_account_id;
 if not found then raise exception 'party_event_v25_offer_not_owned';end if;
 select * into w from private.party_event_weeks_v11
  where party_id=o.party_id and event_starts_at=o.event_starts_at;
 if not found then raise exception 'party_event_v25_week_missing';end if;
 select * into ch from private.party_event_reward_choices_v24
  where offer_id=o.id and account_id=o.account_id;
 if o.eligibility='full' and ch.offer_id is null
 then raise exception 'party_event_v25_choice_required';end if;
 if o.eligibility='participation' and ch.offer_id is not null
 then raise exception 'party_event_v25_participation_choice_invalid';end if;
 v_kind:=case when o.eligibility='participation'
  then 'participation' else ch.choice end;
 v_factor:=case w.difficulty
  when 'standard' then 1 when 'veteran' then 1.2
  when 'heroic' then 1.35 else null end;
 if v_factor is null or o.reward_band not between 1 and 6
 then raise exception 'party_event_v25_invalid_reward_model';end if;
 if o.eligibility='participation' then
  v_gold:=round((300+o.reward_band*120)*v_factor)::integer;
 else
  v_base:=round((1250+o.reward_band*450)*v_factor)::integer;
  v_gold:=v_base;
  v_renown:=case w.difficulty
   when 'standard' then 10 when 'veteran' then 12 else 14 end;
  case v_kind
   when 'warrior' then
    v_combat:=round((1300+o.reward_band*350)*v_factor)::integer;
    v_materials:=jsonb_build_object('GEM_DUST',greatest(1,round(3+o.reward_band*.7)::integer));
   when 'artisan' then
    v_skill:=round((1800+o.reward_band*450)*v_factor)::integer;
    v_materials:=jsonb_build_object('GEM_DUST',greatest(1,round(3+o.reward_band*.7)::integer));
   when 'companion' then
    v_essence:=round((80+o.reward_band*45)*v_factor)::integer;
    v_bondstones:=case when o.reward_band>=5 then 2
     when o.reward_band>=3 then 1 else 0 end;
   else raise exception 'party_event_v25_invalid_choice';
  end case;
 end if;
 return jsonb_build_object(
  'version','party-event-rewards-v2','kind',v_kind,
  'performanceBand',o.reward_band,'personalPoints',o.personal_points,
  'gold',v_gold,'combatXp',v_combat,'skillXp',v_skill,
  'companionEssence',v_essence,'bondstones',v_bondstones,
  'partyRenown',coalesce(v_renown,0),'materials',v_materials);
end;$$;

-- Serialize by the SAME account advisory key used by the online gameplay
-- commit. No external client may choose the account/character to receive
-- a reward: the calling private worker must use an authenticated owner.
-- Lock order: account advisory, week, offer, state, wallet.
-- A new intent does not itself spend the chosen cache or lock future claims.
create or replace function private.prepare_party_event_claim_intent_v25(
 p_offer_id uuid,p_account_id uuid,p_request_id text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 o private.party_event_reward_offers_v24%rowtype;
 w private.party_event_weeks_v11%rowtype;
 prior private.party_event_claim_intents_v25%rowtype;
 v_character_id uuid;v_wallet bigint;
 g public.online_game_states%rowtype;
 v_inv jsonb;v_stack jsonb;v_used integer;v_capacity integer;
 v_extra integer:=0;v_quote jsonb;v_hash text;v_materials jsonb;
 v_material text;v_quantity bigint;
 v_new private.party_event_claim_intents_v25%rowtype;
begin
 if p_offer_id is null or p_account_id is null
  or p_request_id is null or length(p_request_id) not between 8 and 180
 then raise exception 'party_event_v25_invalid_claim_intent';end if;

 perform pg_advisory_xact_lock(
  hashtextextended('party-account:'||p_account_id::text,0));

 select * into o from private.party_event_reward_offers_v24
  where id=p_offer_id;
 if not found then raise exception 'party_event_v25_offer_missing';end if;
 if o.account_id is distinct from p_account_id
 then raise exception 'party_event_v25_offer_not_owned';end if;

 select * into w from private.party_event_weeks_v11
  where party_id=o.party_id and event_starts_at=o.event_starts_at for update;
 if not found then raise exception 'party_event_v25_week_missing';end if;
 select * into prior from private.party_event_claim_intents_v25
  where offer_id=p_offer_id or request_id=p_request_id
   or (event_starts_at=o.event_starts_at and account_id=p_account_id)
  for update;
 if found then
  if prior.offer_id is distinct from p_offer_id
   or prior.account_id is distinct from p_account_id
   or prior.request_id is distinct from p_request_id
  then raise exception 'party_event_v25_claim_intent_conflict';end if;
  return jsonb_build_object('intentId',prior.id,'replayed',true,
   'offerId',p_offer_id,'claimReady',false,
   'claimable',false,'claimed',false,'rewardsGranted',false);
 end if;
 -- A v24 offer alone is insufficient to authorize any actual claim.
 if not exists(select 1 from private.party_event_boss_replay_attestations_v23 a
   join private.party_event_reward_batches_v24 b
    on b.reservation_id=a.reservation_id
   where b.reservation_id=o.reservation_id
    and b.party_id=o.party_id and b.event_starts_at=o.event_starts_at)
 then raise exception 'party_event_v25_replay_proof_missing';end if;
 select roster.character_id into v_character_id
 from private.party_event_roster_v11 roster
 where roster.party_id=o.party_id and roster.event_starts_at=o.event_starts_at
   and roster.account_id=p_account_id;
 if v_character_id is null
 then raise exception 'party_event_v25_character_not_enrolled';end if;
 if not exists(select 1 from public.characters
  where id=v_character_id and account_id=p_account_id)
 then raise exception 'party_event_v25_character_not_owned';end if;
 v_quote:=private.party_event_reward_quote_v25(p_offer_id,p_account_id);
 v_hash:=encode(sha256(convert_to(v_quote::text,'UTF8')),'hex');

 select * into g from public.online_game_states
  where account_id=p_account_id for update;
 if not found or g.state is null or g.character_id is distinct from v_character_id
 then raise exception 'party_event_v25_online_character_required';end if;
 v_inv:=g.state#>'{inventory,stacks}';
 if v_inv is null or jsonb_typeof(v_inv)<>'array'
 then raise exception 'party_event_v25_inventory_invalid';end if;
 if (g.state#>>'{inventory,capacity}') !~ '^[0-9]{1,5}$'
 then raise exception 'party_event_v25_capacity_invalid';end if;
 v_capacity:=(g.state#>>'{inventory,capacity}')::integer;
 if v_capacity not between 1 and 10000
 then raise exception 'party_event_v25_capacity_invalid';end if;
 v_used:=0;
 for v_stack in select value from jsonb_array_elements(v_inv) loop
  if jsonb_typeof(v_stack)<>'object' or
     v_stack->>'itemId' is null or
     (v_stack->>'quantity') !~ '^[0-9]{1,9}$'
  then raise exception 'party_event_v25_inventory_stack_invalid';end if;
  if (v_stack->>'quantity')::bigint>0
  then v_used:=v_used+1;end if;
 end loop;
 if v_used>v_capacity
 then raise exception 'party_event_v25_inventory_over_capacity';end if;
 v_materials:=v_quote->'materials';
 if jsonb_typeof(v_materials)<>'object'
 then raise exception 'party_event_v25_reward_materials_invalid';end if;
 for v_material,v_quantity in select key,(value)::bigint
  from jsonb_each_text(v_materials) loop
  if v_material<>'GEM_DUST' or v_quantity not between 1 and 999
  then raise exception 'party_event_v25_unapproved_reward_material';end if;
  -- A merged material stack must also remain within the inventory
  -- quantity shape supported by the live online state.
  if exists(select 1 from jsonb_array_elements(v_inv) st
      where st->>'itemId'=v_material
       and (st->>'quantity') ~ '^[0-9]{1,9}$'
       and (st->>'quantity')::bigint>999999999-v_quantity)
  then raise exception 'party_event_v25_material_stack_overflow';end if;
  if not exists(select 1 from jsonb_array_elements(v_inv) st
     where st->>'itemId'=v_material
       and (st->>'quantity') ~ '^[0-9]{1,9}$'
       and (st->>'quantity')::bigint>0)
  then v_extra:=v_extra+1;end if;
 end loop;
 if v_used+v_extra>v_capacity
 then raise exception 'party_event_v25_inventory_full';end if;

 select gold into v_wallet from public.character_wallets
  where character_id=v_character_id for update;
 if v_wallet is null or v_wallet<0
 then raise exception 'party_event_v25_wallet_missing';end if;
 if v_wallet>9223372036854775807::bigint-(v_quote->>'gold')::bigint
 then raise exception 'party_event_v25_wallet_overflow';end if;

 insert into private.party_event_claim_intents_v25(
  offer_id,event_starts_at,reservation_id,account_id,character_id,
  request_id,reward_model,reward_kind,reward_quote,quote_hash,
  online_revision,wallet_gold_before,inventory_used_slots,
  inventory_capacity,inventory_extra_slots)
 values(o.id,o.event_starts_at,o.reservation_id,p_account_id,v_character_id,
  p_request_id,'party-event-rewards-v2',v_quote->>'kind',v_quote,v_hash,
  g.revision,v_wallet,v_used,v_capacity,v_extra)
 returning * into v_new;
 return jsonb_build_object('intentId',v_new.id,'replayed',false,
  'offerId',p_offer_id,'quoteHash',v_new.quote_hash,
  'claimReady',false,'claimable',false,'claimed',false,'rewardsGranted',false);
end;$$;

-- Even after intent creation, there is NO server-side method to claim it.
-- This explicit blocked endpoint is an intentional release guard and
-- cannot be bypassed with an untrusted request payload.
create or replace function private.claim_party_event_reward_from_intent_v25(
 p_offer_id uuid,p_account_id uuid,p_request_id text
) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 raise exception 'party_event_v25_payout_not_released';
end;$$;

-- Account-scoped status only, no reward balances or private cross-account data.
create or replace function private.party_event_claim_intents_inbox_v25(
 p_account_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_items jsonb;
begin
 if p_account_id is null then
  raise exception 'party_event_v25_invalid_account';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'intentId',i.id,'offerId',i.offer_id,'reservationId',i.reservation_id,
  'rewardKind',i.reward_kind,'quoteHash',i.quote_hash,
  'state','blocked_unreleased','claimable',false,
  'claimed',false,'rewardsGranted',false)
  order by i.prepared_at desc,i.id),'[]'::jsonb) into v_items
 from private.party_event_claim_intents_v25 i
 where i.account_id=p_account_id;
 return jsonb_build_object('items',v_items,'claimEnabled',false,
  'rewardsGranted',false,'economyTransfers',0);
end;$$;

revoke all on function
 private.party_event_reward_quote_v25(uuid,uuid),
 private.prepare_party_event_claim_intent_v25(uuid,uuid,text),
 private.claim_party_event_reward_from_intent_v25(uuid,uuid,text),
 private.party_event_claim_intents_inbox_v25(uuid)
 from public,anon,authenticated;
grant execute on function
 private.party_event_reward_quote_v25(uuid,uuid),
 private.prepare_party_event_claim_intent_v25(uuid,uuid,text),
 private.claim_party_event_reward_from_intent_v25(uuid,uuid,text),
 private.party_event_claim_intents_inbox_v25(uuid)
 to service_role;

commit;
