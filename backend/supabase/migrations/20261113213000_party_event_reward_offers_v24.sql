-- Hidden Party Events v24: per-account non-spendable reward OFFER preparation.
-- Depends on v11-v19,v21-v23. These are NOT economy entitlements.
-- No gold/item/XP/renown credit, no Inbox inserts, no public claim RPC.
begin;

create table private.party_event_reward_batches_v24 (
 reservation_id uuid primary key references
  private.party_event_boss_replay_attestations_v23(reservation_id) on delete cascade,
 party_id uuid not null,
 event_starts_at timestamptz not null,
 request_id text not null unique check(length(request_id) between 8 and 180),
 candidate_hash text not null check(candidate_hash ~ '^[a-f0-9]{64}$'),
 replay_hash text not null check(replay_hash ~ '^[a-f0-9]{64}$'),
 preview_hash text not null check(preview_hash ~ '^[a-f0-9]{64}$'),
 member_count smallint not null check(member_count between 2 and 4),
 eligible_count smallint not null check(eligible_count between 0 and 4),
 created_at timestamptz not null default now(),
 reward_grants_enabled boolean not null default false check(reward_grants_enabled=false),
 unique(party_id,event_starts_at),
 foreign key(party_id,event_starts_at)
  references private.party_event_weeks_v11(party_id,event_starts_at) on delete cascade,
 check(eligible_count<=member_count)
);

-- Do not call these spendable entitlements: only a future audited
-- atomic grant transaction can create an actual economy entitlement.
create table private.party_event_reward_offers_v24 (
 id uuid primary key default gen_random_uuid(),
 reservation_id uuid not null references
  private.party_event_reward_batches_v24(reservation_id) on delete cascade,
 party_id uuid not null,
 event_starts_at timestamptz not null,
 account_id uuid not null,
 personal_points smallint not null check(personal_points between 5 and 60),
 eligibility text not null check(eligibility in ('participation','full')),
 reward_band smallint not null check(reward_band between 1 and 6),
 reward_model text not null default 'party-event-rewards-v2'
   check(reward_model='party-event-rewards-v2'),
 created_at timestamptz not null default now(),
 claimable boolean not null default false check(claimable=false),
 granted boolean not null default false check(granted=false),
 unique(reservation_id,account_id),
 unique(event_starts_at,account_id),
 foreign key(party_id,event_starts_at,account_id)
  references private.party_event_reward_previews_v19(party_id,event_starts_at,account_id)
  on delete cascade,
 check((eligibility='participation' and personal_points between 5 and 14)
   or(eligibility='full' and personal_points between 15 and 60))
);

-- Full-tier player choices lock ONCE as a separate append-only record.
-- Participation offers do not choose any chest.
create table private.party_event_reward_choices_v24 (
 offer_id uuid primary key references private.party_event_reward_offers_v24(id)
  on delete cascade,
 account_id uuid not null,
 request_id text not null unique check(length(request_id) between 8 and 180),
 choice text not null check(choice in ('warrior','artisan','companion')),
 chosen_at timestamptz not null default now(),
 claimable boolean not null default false check(claimable=false),
 granted boolean not null default false check(granted=false)
);

alter table private.party_event_reward_batches_v24 enable row level security;
alter table private.party_event_reward_offers_v24 enable row level security;
alter table private.party_event_reward_choices_v24 enable row level security;
revoke all on private.party_event_reward_batches_v24,
 private.party_event_reward_offers_v24,private.party_event_reward_choices_v24
 from public,anon,authenticated,service_role;
grant select on private.party_event_reward_batches_v24,
 private.party_event_reward_offers_v24,private.party_event_reward_choices_v24
 to service_role;

create trigger party_event_reward_batch_immutable_v24 before update
 on private.party_event_reward_batches_v24 for each row
 execute function private.party_event_progress_immutable_v14();
create trigger party_event_reward_offer_immutable_v24 before update
 on private.party_event_reward_offers_v24 for each row
 execute function private.party_event_progress_immutable_v14();
create trigger party_event_reward_choice_immutable_v24 before update
 on private.party_event_reward_choices_v24 for each row
 execute function private.party_event_progress_immutable_v14();

-- Batch creation is server-only, serialized on the week (same order as
-- combat attestation). It accepts NO points, eligibility or reward amounts.
-- All account EP is independently recalculated from v14 + v15 against
-- v19's immutable preview, which itself cannot be claimed or edited.
create or replace function private.prepare_party_event_reward_offers_v24(
 p_reservation_id uuid,p_request_id text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 r private.party_event_day8_reservations_v18%rowtype;
 w private.party_event_weeks_v11%rowtype;
 a private.party_event_boss_replay_attestations_v23%rowtype;
 c private.party_event_boss_candidates_v19%rowtype;
 prior private.party_event_reward_batches_v24%rowtype;
 v_members integer;
 v_invalid integer;
 v_eligible integer;
 v_preview_hash text;
 v_inserted integer;
begin
 if p_reservation_id is null or p_request_id is null
  or length(p_request_id) not between 8 and 180
 then raise exception 'party_event_v24_invalid_prepare_request';end if;

 select * into r from private.party_event_day8_reservations_v18
  where id=p_reservation_id;
 if not found then raise exception 'party_event_v24_reservation_missing';end if;
 select * into w from private.party_event_weeks_v11
  where party_id=r.party_id and event_starts_at=r.event_starts_at for update;
 if not found then raise exception 'party_event_v24_week_missing';end if;
 select * into prior from private.party_event_reward_batches_v24
  where reservation_id=p_reservation_id
    or request_id=p_request_id
    or (party_id=r.party_id and event_starts_at=r.event_starts_at)
  for update;
 if found then
  if prior.reservation_id is distinct from p_reservation_id
   or prior.request_id is distinct from p_request_id
  then raise exception 'party_event_v24_prepare_conflict';end if;
  return jsonb_build_object('replayed',true,'reservationId',p_reservation_id,
   'memberCount',prior.member_count,'offerCount',prior.eligible_count,
   'offersPrepared',true,'entitlementsCreated',false,
   'rewardsClaimable',false,'rewardsGranted',false);
 end if;

 -- The v23 record attests a trusted worker replay, NOT a SQL verification
 -- of the actual combat engine. Preparing an offer never triggers payout.
 if w.active_stage<>3 or w.status='settled'
  or now()<w.event_ends_at+interval '1 hour'
 then raise exception 'party_event_v24_prepare_window_closed';end if;
 select * into a from private.party_event_boss_replay_attestations_v23
  where reservation_id=r.id and party_id=r.party_id
   and event_starts_at=r.event_starts_at;
 select * into c from private.party_event_boss_candidates_v19
  where reservation_id=r.id and party_id=r.party_id
   and event_starts_at=r.event_starts_at;
 if a.reservation_id is null or c.reservation_id is null
  or a.candidate_hash is distinct from c.candidate_hash
  or a.reward_band is distinct from c.reward_band
  or a.tiers_cleared is distinct from c.tiers_cleared
  or a.ruleset<>'party-event-day8-combat-v4'
  or a.resource_audit<>'greenfields-verified-gathering-v22'
 then raise exception 'party_event_v24_replay_attestation_missing';end if;

 select count(*)::integer,
  count(*) filter(where
   preview.account_id is null
   or preview.reservation_id is distinct from r.id
   or preview.reward_band is distinct from a.reward_band
   or preview.personal_points is distinct from
      coalesce(activity.activity_points,0)+coalesce(special.special_points,0)
   or preview.eligibility is distinct from
     case
      when coalesce(activity.activity_points,0)+coalesce(special.special_points,0)>=15 then 'full'
      when coalesce(activity.activity_points,0)+coalesce(special.special_points,0)>=5 then 'participation'
      else 'none' end)::integer,
  count(*) filter(where preview.eligibility in ('participation','full'))::integer
 into v_members,v_invalid,v_eligible
 from private.party_event_roster_v11 roster
 left join private.party_event_reward_previews_v19 preview
  on preview.party_id=roster.party_id
   and preview.event_starts_at=roster.event_starts_at
   and preview.account_id=roster.account_id
 left join private.party_event_member_progress_v14 activity
  on activity.party_id=roster.party_id
   and activity.event_starts_at=roster.event_starts_at
   and activity.account_id=roster.account_id
 left join lateral(
  select coalesce(sum(points_credited),0)::integer special_points
  from private.party_event_special_credits_v15 s
  where s.party_id=roster.party_id
   and s.event_starts_at=roster.event_starts_at
   and s.account_id=roster.account_id
 ) special on true
 where roster.party_id=r.party_id and roster.event_starts_at=r.event_starts_at;
 if v_members not between 2 and 4 or v_invalid<>0
  or exists(select 1 from private.party_event_reward_previews_v19 preview
   where preview.party_id=r.party_id
     and preview.event_starts_at=r.event_starts_at
     and not exists(
      select 1 from private.party_event_roster_v11 roster
      where roster.party_id=preview.party_id
       and roster.event_starts_at=preview.event_starts_at
       and roster.account_id=preview.account_id))
 then raise exception 'party_event_v24_verified_points_mismatch';end if;

 select encode(sha256(convert_to(coalesce(string_agg(
  concat_ws(':',preview.account_id,preview.personal_points,
   preview.eligibility,preview.reward_band),
  '|' order by preview.account_id),'')::text,'UTF8')),'hex')
 into v_preview_hash
 from private.party_event_reward_previews_v19 preview
 where preview.party_id=r.party_id and preview.event_starts_at=r.event_starts_at;

 insert into private.party_event_reward_batches_v24(
  reservation_id,party_id,event_starts_at,request_id,candidate_hash,
  replay_hash,preview_hash,member_count,eligible_count)
 values(r.id,r.party_id,r.event_starts_at,p_request_id,
  a.candidate_hash,a.replay_hash,v_preview_hash,v_members,v_eligible);

 insert into private.party_event_reward_offers_v24(
  reservation_id,party_id,event_starts_at,account_id,
  personal_points,eligibility,reward_band)
 select r.id,preview.party_id,preview.event_starts_at,preview.account_id,
  preview.personal_points,preview.eligibility,preview.reward_band
 from private.party_event_reward_previews_v19 preview
 where preview.party_id=r.party_id and preview.event_starts_at=r.event_starts_at
  and preview.reservation_id=r.id
  and preview.eligibility in ('participation','full');
 get diagnostics v_inserted=row_count;
 if v_inserted<>v_eligible
 then raise exception 'party_event_v24_offer_count_mismatch';end if;
 return jsonb_build_object('replayed',false,'reservationId',p_reservation_id,
  'memberCount',v_members,'offerCount',v_eligible,
  'offersPrepared',true,'entitlementsCreated',false,
  'rewardsClaimable',false,'rewardsGranted',false);
end;$$;

-- Choice is append-only and can only be locked for a FULL offer.
-- A change of choice or request ID is rejected, including on retries.
create or replace function private.lock_party_event_reward_choice_v24(
 p_offer_id uuid,p_account_id uuid,p_choice text,p_request_id text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 o private.party_event_reward_offers_v24%rowtype;
 prior private.party_event_reward_choices_v24%rowtype;
begin
 if p_offer_id is null or p_account_id is null
  or p_choice not in ('warrior','artisan','companion')
  or p_request_id is null or length(p_request_id) not between 8 and 180
 then raise exception 'party_event_v24_invalid_choice';end if;
 select * into o from private.party_event_reward_offers_v24
  where id=p_offer_id for update;
 if not found then raise exception 'party_event_v24_offer_missing';end if;
 if o.account_id is distinct from p_account_id
 then raise exception 'party_event_v24_choice_not_owned';end if;
 if o.eligibility<>'full'
 then raise exception 'party_event_v24_participation_has_no_choice';end if;
 select * into prior from private.party_event_reward_choices_v24
  where offer_id=p_offer_id or request_id=p_request_id for update;
 if found then
  if prior.offer_id is distinct from p_offer_id
    or prior.account_id is distinct from p_account_id
    or prior.choice is distinct from p_choice
    or prior.request_id is distinct from p_request_id
  then raise exception 'party_event_v24_choice_conflict';end if;
  return jsonb_build_object('replayed',true,'offerId',p_offer_id,
   'choice',prior.choice,'choiceLocked',true,
   'rewardsClaimable',false,'rewardsGranted',false);
 end if;
 insert into private.party_event_reward_choices_v24(
  offer_id,account_id,request_id,choice)
 values(p_offer_id,p_account_id,p_request_id,p_choice);
 return jsonb_build_object('replayed',false,'offerId',p_offer_id,
  'choice',p_choice,'choiceLocked',true,
  'rewardsClaimable',false,'rewardsGranted',false);
end;$$;

-- Private Inbox PREVIEW, not a claim method. The caller must supply the
-- account ID obtained from its trusted server session (not from HTTP JSON).
create or replace function private.party_event_reward_inbox_preview_v24(
 p_account_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v_rows jsonb;
begin
 if p_account_id is null
 then raise exception 'party_event_v24_invalid_account';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'offerId',o.id,'eventStartsAt',o.event_starts_at,
  'reservationId',o.reservation_id,'eligibility',o.eligibility,
  'personalPoints',o.personal_points,'rewardBand',o.reward_band,
  'selectedChoice',choice.choice,'choiceLocked',choice.offer_id is not null,
  'status',case when o.eligibility='participation' then 'participation_preview'
    when choice.offer_id is not null then 'choice_locked_preview'
    else 'awaiting_choice_preview' end,
  'claimable',false,'granted',false,'entitlement',false)
  order by o.event_starts_at desc),'[]'::jsonb) into v_rows
 from private.party_event_reward_offers_v24 o
 left join private.party_event_reward_choices_v24 choice
  on choice.offer_id=o.id
 where o.account_id=p_account_id;
 return jsonb_build_object('offers',v_rows,'claimEnabled',false,
  'entitlementsCreated',false,'rewardsGranted',false);
end;$$;
revoke all on function private.prepare_party_event_reward_offers_v24(uuid,text),
 private.lock_party_event_reward_choice_v24(uuid,uuid,text,text),
 private.party_event_reward_inbox_preview_v24(uuid)
 from public,anon,authenticated;
grant execute on function private.prepare_party_event_reward_offers_v24(uuid,text),
 private.lock_party_event_reward_choice_v24(uuid,uuid,text,text),
 private.party_event_reward_inbox_preview_v24(uuid) to service_role;
commit;
