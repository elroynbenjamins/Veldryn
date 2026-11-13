-- Hidden Party Events v25: nonpaying, exactly-once claim PREFLIGHT only.
-- Not an entitlement, grant, claim receipt, inventory reservation, or payout.
-- All rewards still unclaimable. Requires v11-v19,v21-v24.
begin;

-- Pinned to server v2 reward formulas (positive quantities -> PG round equals
-- JS Math.round). No amount is accepted from a player or SQL RPC caller.
create or replace function private.party_event_reward_values_v25(
 p_difficulty text,p_band integer,p_personal_points integer,p_kind text
) returns jsonb language plpgsql immutable security definer set search_path='' as $$
declare
 v_multiplier numeric;
 v_base integer;
 v_gold integer;
 v_combat integer:=0;
 v_skill integer:=0;
 v_companion integer:=0;
 v_bondstones integer:=0;
 v_renown integer:=0;
 v_materials jsonb:='{}'::jsonb;
begin
 if p_difficulty not in ('standard','veteran','heroic')
  or p_band not between 1 and 6
  or p_personal_points not between 5 and 60
  or p_kind not in ('participation','warrior','artisan','companion')
  or (p_personal_points<15 and p_kind<>'participation')
  or (p_personal_points>=15 and p_kind='participation')
 then raise exception 'party_event_v25_invalid_reward_values';end if;
 v_multiplier:=case p_difficulty
   when 'standard' then 1.0
   when 'veteran' then 1.2
   when 'heroic' then 1.35 end;
 if p_kind='participation' then
  v_gold:=round((300+p_band*120)*v_multiplier);
 else
  v_gold:=round((1250+p_band*450)*v_multiplier);
  v_renown:=case p_difficulty
    when 'standard' then 10 when 'veteran' then 12
    when 'heroic' then 14 end;
  if p_kind='warrior' then
   v_combat:=round((1300+p_band*350)*v_multiplier);
   v_materials:=jsonb_build_object('GEM_DUST',
     greatest(1,round(3+p_band*0.7)));
  elsif p_kind='artisan' then
   v_skill:=round((1800+p_band*450)*v_multiplier);
   v_materials:=jsonb_build_object('GEM_DUST',
     greatest(1,round(3+p_band*0.7)));
  else
   v_companion:=round((80+p_band*45)*v_multiplier);
   v_bondstones:=case when p_band>=5 then 2
     when p_band>=3 then 1 else 0 end;
  end if;
 end if;
 return jsonb_build_object(
  'version','party-event-rewards-v2','kind',p_kind,
  'performanceBand',p_band,'personalPoints',p_personal_points,
  'gold',v_gold,'combatXp',v_combat,'skillXp',v_skill,
  'companionEssence',v_companion,'bondstones',v_bondstones,
  'partyRenown',v_renown,'materials',v_materials);
end;$$;

create table private.party_event_claim_preflights_v25 (
 offer_id uuid primary key references private.party_event_reward_offers_v24(id)
  on delete cascade,
 reservation_id uuid not null references
  private.party_event_reward_batches_v24(reservation_id) on delete cascade,
 party_id uuid not null,
 event_starts_at timestamptz not null,
 account_id uuid not null,
 character_id uuid not null,
 request_id text not null unique check(length(request_id) between 8 and 180),
 reward_model text not null check(reward_model='party-event-rewards-v2'),
 reward_kind text not null check(reward_kind in
  ('participation','warrior','artisan','companion')),
 reward_json jsonb not null check(jsonb_typeof(reward_json)='object'),
 reward_hash text not null check(reward_hash ~ '^[0-9a-f]{64}$'),
 source_candidate_hash text not null check(source_candidate_hash ~ '^[0-9a-f]{64}$'),
 source_replay_hash text not null check(source_replay_hash ~ '^[0-9a-f]{64}$'),
 inventory_revision bigint not null check(inventory_revision>=0),
 inventory_capacity integer not null check(inventory_capacity>=1),
 inventory_stacks_used integer not null check(inventory_stacks_used>=0),
 conservative_slots_needed integer not null
  check(conservative_slots_needed between 0 and 1),
 requires_skill_target boolean not null,
 requires_combat_xp_router boolean not null,
 requires_companion_router boolean not null,
 created_at timestamptz not null default now(),
 -- Deliberately impossible to turn these on in v25.
 authorized_for_payout boolean not null default false
  check(authorized_for_payout=false),
 claimed boolean not null default false check(claimed=false),
 currency_credited boolean not null default false check(currency_credited=false),
 inventory_credited boolean not null default false check(inventory_credited=false),
 unique(event_starts_at,account_id),
 -- v24 uniquely identifies each account/week; that key is the
 -- enforceable SQL FK (the party_id is checked against the offer in writer).
 foreign key(event_starts_at,account_id)
  references private.party_event_reward_offers_v24(
   event_starts_at,account_id) on delete cascade,
 foreign key(character_id,account_id)
  references public.characters(id,account_id) on delete cascade
);

alter table private.party_event_claim_preflights_v25 enable row level security;
revoke all on private.party_event_claim_preflights_v25
 from public,anon,authenticated,service_role;
grant select on private.party_event_claim_preflights_v25 to service_role;
create trigger party_event_claim_preflight_immutable_v25
 before update on private.party_event_claim_preflights_v25 for each row
 execute function private.party_event_progress_immutable_v14();

-- A trusted, session-authorized server passes the account ID. The private
-- function cross-checks against frozen roster and current account ownership.
-- It serializes on the event week -> offer -> online inventory snapshot.
-- NO balance is moved. Inventory revision/capacity are only a DRY-RUN
-- diagnostic and MUST be rechecked in a future atomic grant transaction.
create or replace function private.prepare_party_event_claim_preflight_v25(
 p_offer_id uuid,p_account_id uuid,p_character_id uuid,p_request_id text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 o private.party_event_reward_offers_v24%rowtype;
 w private.party_event_weeks_v11%rowtype;
 b private.party_event_reward_batches_v24%rowtype;
 a private.party_event_boss_replay_attestations_v23%rowtype;
 choice private.party_event_reward_choices_v24%rowtype;
 prior private.party_event_claim_preflights_v25%rowtype;
 game public.online_game_states%rowtype;
 v_cap integer;
 v_used integer;
 v_slots integer;
 v_kind text;
 v_reward jsonb;
 v_hash text;
 v_row private.party_event_claim_preflights_v25%rowtype;
begin
 if p_offer_id is null or p_account_id is null or p_character_id is null
  or p_request_id is null or length(p_request_id) not between 8 and 180
 then raise exception 'party_event_v25_invalid_preflight';end if;
 select * into o from private.party_event_reward_offers_v24
  where id=p_offer_id;
 if not found then raise exception 'party_event_v25_offer_missing';end if;
 select * into w from private.party_event_weeks_v11
  where party_id=o.party_id and event_starts_at=o.event_starts_at
  for update;
 if not found then raise exception 'party_event_v25_event_missing';end if;
 select * into o from private.party_event_reward_offers_v24
  where id=p_offer_id for update;
 if o.account_id is distinct from p_account_id
 then raise exception 'party_event_v25_not_offer_owner';end if;
 if not exists(select 1 from private.party_event_roster_v11 roster
  where roster.party_id=o.party_id and roster.event_starts_at=o.event_starts_at
   and roster.account_id=p_account_id
   and roster.character_id=p_character_id)
 or not exists(select 1 from public.characters c
  where c.id=p_character_id and c.account_id=p_account_id)
 then raise exception 'party_event_v25_character_not_eligible';end if;
 select * into prior from private.party_event_claim_preflights_v25
  where offer_id=p_offer_id or request_id=p_request_id
   or (event_starts_at=o.event_starts_at and account_id=p_account_id)
  for update;
 if found then
  if prior.offer_id is distinct from p_offer_id
   or prior.account_id is distinct from p_account_id
   or prior.character_id is distinct from p_character_id
   or prior.request_id is distinct from p_request_id
  then raise exception 'party_event_v25_preflight_conflict';end if;
  return jsonb_build_object('replayed',true,
   'offerId',prior.offer_id,'accountId',prior.account_id,
   'rewardHash',prior.reward_hash,'reward',prior.reward_json,
   'inventoryRevision',prior.inventory_revision,
   'conservativeSlotsNeeded',prior.conservative_slots_needed,
   'needsSkillTarget',prior.requires_skill_target,
   'needsCombatXpRouter',prior.requires_combat_xp_router,
   'needsCompanionRouter',prior.requires_companion_router,
   'preflightRecorded',true,'payoutAuthorized',false,
   'claimable',false,'claimed',false,'rewardsGranted',false);
 end if;
 if now()<w.event_ends_at+interval '1 hour'
 then raise exception 'party_event_v25_preflight_window_closed';end if;
 select * into b from private.party_event_reward_batches_v24
  where reservation_id=o.reservation_id and party_id=o.party_id
   and event_starts_at=o.event_starts_at;
 select * into a from private.party_event_boss_replay_attestations_v23
  where reservation_id=o.reservation_id;
 if b.reservation_id is null or a.reservation_id is null
  or b.candidate_hash is distinct from a.candidate_hash
  or b.replay_hash is distinct from a.replay_hash
  or o.claimable or o.granted or b.reward_grants_enabled
 then raise exception 'party_event_v25_source_chain_not_verified';end if;
 if not exists(select 1 from private.party_event_reward_previews_v19 preview
   where preview.party_id=o.party_id
    and preview.event_starts_at=o.event_starts_at
    and preview.account_id=p_account_id
    and preview.reservation_id=o.reservation_id
    and preview.eligibility=o.eligibility
    and preview.reward_band=o.reward_band
    and preview.personal_points=o.personal_points
    and preview.granted=false)
 then raise exception 'party_event_v25_offer_preview_changed';end if;

 select * into choice from private.party_event_reward_choices_v24
  where offer_id=o.id;
 if o.eligibility='full' then
  if choice.offer_id is null or choice.account_id is distinct from p_account_id
   or choice.claimable or choice.granted
  then raise exception 'party_event_v25_full_choice_required';end if;
  v_kind:=choice.choice;
 elsif o.eligibility='participation' then
  if choice.offer_id is not null
  then raise exception 'party_event_v25_unexpected_participation_choice';end if;
  v_kind:='participation';
 else raise exception 'party_event_v25_invalid_eligibility';end if;
 v_reward:=private.party_event_reward_values_v25(
  w.difficulty,o.reward_band,o.personal_points,v_kind);
 v_hash:=encode(sha256(convert_to(v_reward::text,'UTF8')),'hex');

 select c.inventory_capacity into v_cap from public.characters c
  where id=p_character_id and account_id=p_account_id for update;
 if not found or v_cap<1 or v_cap>10000
 then raise exception 'party_event_v25_invalid_capacity';end if;
 select * into game from public.online_game_states
  where account_id=p_account_id and character_id=p_character_id for update;
 if not found or game.state is null or game.revision<0
  or jsonb_typeof(game.state#>'{inventory,stacks}')<>'array'
 then raise exception 'party_event_v25_online_inventory_required';end if;
 v_used:=jsonb_array_length(game.state#>'{inventory,stacks}');
 -- Conservative reservation calculation: GEM_DUST needs one free slot even
 -- when an existing stack might merge. No stack is mutated or reserved.
 v_slots:=case when coalesce((v_reward#>>'{materials,GEM_DUST}')::integer,0)>0
  then 1 else 0 end;
 if v_used+v_slots>v_cap
 then raise exception 'party_event_v25_inventory_capacity_insufficient';end if;

 insert into private.party_event_claim_preflights_v25(
  offer_id,reservation_id,party_id,event_starts_at,account_id,
  character_id,request_id,reward_model,reward_kind,reward_json,
  reward_hash,source_candidate_hash,source_replay_hash,
  inventory_revision,inventory_capacity,inventory_stacks_used,
  conservative_slots_needed,requires_skill_target,
  requires_combat_xp_router,requires_companion_router)
 values(o.id,o.reservation_id,o.party_id,o.event_starts_at,p_account_id,
  p_character_id,p_request_id,'party-event-rewards-v2',v_kind,v_reward,
  v_hash,b.candidate_hash,b.replay_hash,game.revision,v_cap,v_used,v_slots,
  v_kind='artisan',v_kind='warrior',v_kind='companion')
 returning * into v_row;

 return jsonb_build_object('replayed',false,
  'offerId',v_row.offer_id,'accountId',v_row.account_id,
  'rewardHash',v_hash,'reward',v_reward,
  'inventoryRevision',v_row.inventory_revision,
  'conservativeSlotsNeeded',v_slots,
  'needsSkillTarget',v_row.requires_skill_target,
  'needsCombatXpRouter',v_row.requires_combat_xp_router,
  'needsCompanionRouter',v_row.requires_companion_router,
  'preflightRecorded',true,'payoutAuthorized',false,
  'claimable',false,'claimed',false,'rewardsGranted',false);
end;$$;

-- This is an explicitly hard-disabled claim endpoint for any future internal
-- wiring. It never credits balances and cannot silently become a payout
-- through a flag or generic service-role table write.
create or replace function private.claim_party_event_reward_v25(
 p_offer_id uuid,p_account_id uuid,p_request_id text
) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 raise exception 'party_event_v25_claim_disabled_pending_economy_audit';
end;$$;

revoke all on function private.party_event_reward_values_v25(
 text,integer,integer,text),
 private.prepare_party_event_claim_preflight_v25(uuid,uuid,uuid,text),
 private.claim_party_event_reward_v25(uuid,uuid,text)
 from public,anon,authenticated;
grant execute on function private.party_event_reward_values_v25(
 text,integer,integer,text),
 private.prepare_party_event_claim_preflight_v25(uuid,uuid,uuid,text),
 private.claim_party_event_reward_v25(uuid,uuid,text)
 to service_role;
commit;
