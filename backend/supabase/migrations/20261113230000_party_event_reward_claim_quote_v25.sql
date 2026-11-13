-- Veldryn Party Events v25 — PRIVATE, immutable, account-specific claim QUOTE.
-- Not an economy entitlement and not a successful claim. It is deliberately
-- impossible to obtain gold/XP/items/renown from this migration.
-- Depends on v11-v19, v21-v24; no visibility or reward release gates changed.
begin;

create table private.party_event_reward_claim_quotes_v25 (
 offer_id uuid primary key references private.party_event_reward_offers_v24(id)
   on delete cascade,
 reservation_id uuid not null,
 party_id uuid not null,
 event_starts_at timestamptz not null,
 account_id uuid not null,
 character_id uuid not null,
 request_id text not null unique check(length(request_id) between 8 and 180),
 reward_model text not null check(reward_model='party-event-rewards-v2'),
 reward_kind text not null check(reward_kind in
   ('participation','warrior','artisan','companion')),
 difficulty text not null check(difficulty in ('standard','veteran','heroic')),
 personal_points smallint not null check(personal_points between 5 and 60),
 reward_band smallint not null check(reward_band between 1 and 6),
 reward_json jsonb not null check(jsonb_typeof(reward_json)='object'),
 reward_hash text not null check(reward_hash ~ '^[0-9a-f]{64}$'),
 prepared_at timestamptz not null default now(),
 claimable boolean not null default false check(claimable=false),
 claimed boolean not null default false check(claimed=false),
 economy_applied boolean not null default false check(economy_applied=false),
 inbox_delivered boolean not null default false check(inbox_delivered=false),
 unique(reservation_id,account_id),
 unique(event_starts_at,account_id),
 foreign key(reservation_id,account_id)
   references private.party_event_reward_offers_v24(reservation_id,account_id)
   on delete cascade,
 foreign key(party_id,event_starts_at,account_id)
   references private.party_event_roster_v11(party_id,event_starts_at,account_id)
   on delete cascade,
 foreign key(character_id,account_id)
   references public.characters(id,account_id) on delete cascade
);

alter table private.party_event_reward_claim_quotes_v25 enable row level security;
revoke all on private.party_event_reward_claim_quotes_v25
 from public,anon,authenticated,service_role;
grant select on private.party_event_reward_claim_quotes_v25 to service_role;
create trigger party_event_reward_claim_quote_immutable_v25 before update
 on private.party_event_reward_claim_quotes_v25 for each row
 execute function private.party_event_progress_immutable_v14();

-- Internal server only. The trusted server resolves account and frozen
-- character identity; no user-submitted points, reward kind, choice, totals,
-- inventory capacity or arbitrary reward JSON may enter this function.
create or replace function private.prepare_party_event_claim_quote_v25(
 p_offer_id uuid,p_account_id uuid,p_character_id uuid,p_request_id text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 o private.party_event_reward_offers_v24%rowtype;
 w private.party_event_weeks_v11%rowtype;
 b private.party_event_reward_batches_v24%rowtype;
 a private.party_event_boss_replay_attestations_v23%rowtype;
 chosen private.party_event_reward_choices_v24%rowtype;
 prior private.party_event_reward_claim_quotes_v25%rowtype;
 actor uuid;
 v_mode text;
 v_scale numeric;
 v_base integer;
 v_gold integer;
 v_combat integer:=0;
 v_skill integer:=0;
 v_essence integer:=0;
 v_bondstones integer:=0;
 v_renown integer:=0;
 v_materials jsonb:='{}'::jsonb;
 v_quote jsonb;
 v_hash text;
 v_wallet_gold bigint;
 v_state jsonb;
begin
 if p_offer_id is null or p_account_id is null or p_character_id is null
  or p_request_id is null or length(p_request_id) not between 8 and 180
 then raise exception 'party_event_v25_invalid_quote_request';end if;

 select * into o from private.party_event_reward_offers_v24
 where id=p_offer_id;
 if not found then raise exception 'party_event_v25_offer_missing';end if;
 if o.account_id is distinct from p_account_id
 then raise exception 'party_event_v25_not_offer_owner';end if;
 select * into w from private.party_event_weeks_v11
 where party_id=o.party_id and event_starts_at=o.event_starts_at for update;
 if not found then raise exception 'party_event_v25_week_missing';end if;
 select * into o from private.party_event_reward_offers_v24
 where id=p_offer_id for update;

 select * into prior from private.party_event_reward_claim_quotes_v25
 where offer_id=p_offer_id or request_id=p_request_id
  or (account_id=p_account_id and event_starts_at=o.event_starts_at)
 for update;
 if found then
  if prior.offer_id is distinct from p_offer_id
   or prior.account_id is distinct from p_account_id
   or prior.character_id is distinct from p_character_id
   or prior.request_id is distinct from p_request_id
  then raise exception 'party_event_v25_quote_conflict';end if;
  return jsonb_build_object(
   'replayed',true,'offerId',prior.offer_id,
   'accountId',prior.account_id,'characterId',prior.character_id,
   'difficulty',prior.difficulty,'quote',prior.reward_json,'quoteHash',prior.reward_hash,
   'storageShapeVerified',true,'inventoryCapacityVerified',false,
   'claimEnabled',false,'claimed',false,'entitlementsCreated',false,
   'economyApplied',false,'inboxDelivered',false);
 end if;

 if now()<w.event_ends_at+interval '1 hour'
  or o.claimable or o.granted
 then raise exception 'party_event_v25_quote_window_closed';end if;
 select * into b from private.party_event_reward_batches_v24
 where reservation_id=o.reservation_id and party_id=o.party_id
  and event_starts_at=o.event_starts_at;
 select * into a from private.party_event_boss_replay_attestations_v23
 where reservation_id=o.reservation_id and party_id=o.party_id
  and event_starts_at=o.event_starts_at;
 if b.reservation_id is null or a.reservation_id is null
  or b.candidate_hash is distinct from a.candidate_hash
  or b.replay_hash is distinct from a.replay_hash
  or a.resource_audit<>'greenfields-verified-gathering-v22'
  or a.reward_band is distinct from o.reward_band
  or b.reward_grants_enabled
 then raise exception 'party_event_v25_unverified_reward_chain';end if;
 if o.personal_points<5
  or (o.eligibility='full' and o.personal_points<15)
  or (o.eligibility='participation' and o.personal_points>=15)
 then raise exception 'party_event_v25_invalid_personal_eligibility';end if;
 select character_id into actor from private.party_event_roster_v11
 where party_id=o.party_id and event_starts_at=o.event_starts_at
  and account_id=p_account_id;
 if actor is distinct from p_character_id
  or not exists(select 1 from public.characters
   where id=p_character_id and account_id=p_account_id)
 then raise exception 'party_event_v25_character_not_owned_or_frozen';end if;

 if o.eligibility='full' then
  select * into chosen from private.party_event_reward_choices_v24
   where offer_id=o.id;
  if not found then raise exception 'party_event_v25_choice_required';end if;
  if chosen.account_id is distinct from p_account_id
   or chosen.choice not in ('warrior','artisan','companion')
   or chosen.claimable or chosen.granted
  then raise exception 'party_event_v25_invalid_locked_choice';end if;
  v_mode:=chosen.choice;
 else
  if exists(select 1 from private.party_event_reward_choices_v24
   where offer_id=o.id)
  then raise exception 'party_event_v25_participation_has_choice';end if;
  v_mode:='participation';
 end if;
 v_scale:=case w.difficulty
  when 'standard' then 1::numeric
  when 'veteran' then 1.2::numeric
  when 'heroic' then 1.35::numeric end;
 if v_scale is null then raise exception 'party_event_v25_unknown_difficulty';end if;
 v_base:=case when v_mode='participation'
  then 300+o.reward_band*120 else 1250+o.reward_band*450 end;
 v_gold:=round(v_base*v_scale)::integer;
 if v_mode<>'participation' then
  v_renown:=case w.difficulty
   when 'standard' then 10 when 'veteran' then 12 else 14 end;
  if v_mode in ('warrior','artisan') then
   v_materials:=jsonb_build_object('GEM_DUST',
    greatest(1,round(3+o.reward_band*0.7)::integer));
  end if;
  if v_mode='warrior' then
   v_combat:=round((1300+o.reward_band*350)*v_scale)::integer;
  elsif v_mode='artisan' then
   v_skill:=round((1800+o.reward_band*450)*v_scale)::integer;
  else
   v_essence:=round((80+o.reward_band*45)*v_scale)::integer;
   v_bondstones:=case when o.reward_band>=5 then 2
    when o.reward_band>=3 then 1 else 0 end;
  end if;
 end if;
 v_quote:=jsonb_build_object(
  'version','party-event-rewards-v2','kind',v_mode,
  'performanceBand',o.reward_band,'personalPoints',o.personal_points,
  'gold',v_gold,'combatXp',v_combat,'skillXp',v_skill,
  'companionEssence',v_essence,'bondstones',v_bondstones,
  'partyRenown',v_renown,'materials',v_materials);
 v_hash:=encode(sha256(convert_to(v_quote::text,'UTF8')),'hex');

 -- Lock the canonical per-character economic stores to verify the planned
 -- destination is present and structurally valid. NO values are changed.
 -- Capacity, level-up and account-wide companion/renown/Inbox paths remain
 -- UNVERIFIED, and therefore the whole quote stays nonclaimable.
 select gold into v_wallet_gold from public.character_wallets
  where character_id=p_character_id for update;
 if not found or v_wallet_gold<0
 then raise exception 'party_event_v25_wallet_unavailable';end if;
 if v_wallet_gold>9223372036854775807::numeric-v_gold
 then raise exception 'party_event_v25_gold_overflow';end if;
 select state into v_state from public.online_game_states
  where account_id=p_account_id and character_id=p_character_id for update;
 if not found or v_state is null
  or jsonb_typeof(v_state#>'{inventory,stacks}')<>'array'
  or jsonb_typeof(coalesce(v_state#>'{settings,lockedItemIds}','[]'::jsonb))<>'array'
 then raise exception 'party_event_v25_online_inventory_unavailable';end if;

 insert into private.party_event_reward_claim_quotes_v25(
  offer_id,reservation_id,party_id,event_starts_at,account_id,
  character_id,request_id,reward_model,reward_kind,difficulty,
  personal_points,reward_band,reward_json,reward_hash)
 values(o.id,o.reservation_id,o.party_id,o.event_starts_at,p_account_id,
  p_character_id,p_request_id,'party-event-rewards-v2',v_mode,
  w.difficulty,o.personal_points,o.reward_band,v_quote,v_hash);
 return jsonb_build_object(
  'replayed',false,'offerId',o.id,
  'accountId',p_account_id,'characterId',p_character_id,
  'difficulty',w.difficulty,'quote',v_quote,'quoteHash',v_hash,
  'storageShapeVerified',true,'inventoryCapacityVerified',false,
  'claimEnabled',false,'claimed',false,'entitlementsCreated',false,
  'economyApplied',false,'inboxDelivered',false);
end;$$;

-- Private, account-scoped quote inbox. Not a native Inbox message and not
-- a claim endpoint. Keep this separate from real economy/claim UI.
create or replace function private.party_event_claim_quote_inbox_v25(
 p_account_id uuid
) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'claimsEnabled',false,'economyApplied',false,'entitlementsCreated',false,
  'quoteCount',count(q.offer_id),
  'quotes',coalesce(jsonb_agg(jsonb_build_object(
   'offerId',q.offer_id,'characterId',q.character_id,
   'eventStartsAt',q.event_starts_at,'rewardKind',q.reward_kind,
   'difficulty',q.difficulty,
   'rewardBand',q.reward_band,'quote',q.reward_json,
   'quoteHash',q.reward_hash,'status','blocked_economy_not_audited',
   'claimable',false,'claimed',false,'inboxDelivered',false)
    order by q.event_starts_at desc)
    filter(where q.offer_id is not null),'[]'::jsonb))
 from private.party_event_reward_claim_quotes_v25 q
 where p_account_id is not null and q.account_id=p_account_id;
$$;

revoke all on function private.prepare_party_event_claim_quote_v25(
 uuid,uuid,uuid,text),
 private.party_event_claim_quote_inbox_v25(uuid)
 from public,anon,authenticated;
grant execute on function private.prepare_party_event_claim_quote_v25(
 uuid,uuid,uuid,text),
 private.party_event_claim_quote_inbox_v25(uuid)
 to service_role;

commit;
