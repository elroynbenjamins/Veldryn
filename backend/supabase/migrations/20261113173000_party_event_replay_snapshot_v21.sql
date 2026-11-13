-- Party Events v21: one STATEMENT-SNAPSHOT of trusted, frozen replay inputs.
-- Hidden/private, service-only, read-only. Requires v11-v19.
-- Not a win, a reward, a signed combat proof, or an entitlement.
begin;

-- STABLE means all table reads inside one SQL statement use the same MVCC
-- snapshot, so a later donation/client update cannot create a torn bundle.
-- Never call separate per-table RPCs to assemble a boss replay.
create or replace function private.read_party_event_boss_replay_snapshot_v21(
  p_reservation_id uuid
) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 w private.party_event_weeks_v11%rowtype;
 r private.party_event_day8_reservations_v18%rowtype;
 f private.party_event_finale_seals_v18%rowtype;
 c private.party_event_boss_candidates_v19%rowtype;
 v_roster jsonb;
 v_loadouts jsonb;
 v_orders jsonb;
 v_seals jsonb;
 v_votes jsonb;
 v_transitions jsonb;
 v_payload jsonb;
 v_members integer;
 v_loadout_count integer;
 v_required_stage_seals integer;
 v_now timestamptz:=now();
begin
 if p_reservation_id is null then
  raise exception 'party_event_v21_invalid_reservation';end if;
 select * into r from private.party_event_day8_reservations_v18
 where id=p_reservation_id;
 if not found then raise exception 'party_event_v21_reservation_missing';end if;
 select * into w from private.party_event_weeks_v11
 where party_id=r.party_id and event_starts_at=r.event_starts_at;
 if not found then raise exception 'party_event_v21_week_missing';end if;
 select * into f from private.party_event_finale_seals_v18
 where party_id=r.party_id and event_starts_at=r.event_starts_at;
 if not found then raise exception 'party_event_v21_finale_missing';end if;
 select * into c from private.party_event_boss_candidates_v19
 where reservation_id=r.id and party_id=r.party_id
  and event_starts_at=r.event_starts_at;
 if not found then raise exception 'party_event_v21_candidate_missing';end if;

 if w.active_stage<>3 or w.status='settled'
  or v_now<w.event_ends_at+interval '1 hour'
  or r.opened_at<w.event_ends_at+interval '1 hour'
  or f.sealed_at<w.event_starts_at or f.sealed_at>=w.event_ends_at
  or c.captured_at<r.opened_at
  or c.engine_version<>'party-event-day8-combat-v4'
  or r.finale_hash<>f.finale_hash or c.finale_hash<>f.finale_hash
 then raise exception 'party_event_v21_invalid_event_chain';end if;

 select coalesce(jsonb_agg(jsonb_build_object(
  'account_id',x.account_id,'character_id',x.character_id,'role',x.role)
  order by x.account_id),'[]'::jsonb),count(*)::integer
 into v_roster,v_members
 from private.party_event_roster_v11 x
 where x.party_id=r.party_id and x.event_starts_at=r.event_starts_at;

 select coalesce(jsonb_agg(jsonb_build_object(
  'party_id',x.party_id,'event_starts_at',x.event_starts_at,
  'account_id',x.account_id,'character_id',x.character_id,
  'loadout_id',x.loadout_id,'revision',x.revision,
  'content_version',x.content_version,
  'class_id',x.class_id,'character_level',x.character_level,
  'snapshot_hash',x.snapshot_hash,'stat_snapshot',x.stat_snapshot,
  'ability_snapshot',x.ability_snapshot,
  'capability_tags',x.capability_tags,'saved_at',x.saved_at)
  order by x.account_id),'[]'::jsonb),count(*)::integer
 into v_loadouts,v_loadout_count
 from private.party_event_boss_loadouts_v18 x
 where x.party_id=r.party_id and x.event_starts_at=r.event_starts_at;

 select coalesce(jsonb_agg(jsonb_build_object(
  'stage',x.stage,'kind',x.kind,'item_id',x.item_id,
  'category',x.category,'target_quantity',x.target_quantity,
  'donated_quantity',x.donated_quantity)
  order by x.stage,x.kind,x.category,x.item_id),'[]'::jsonb)
 into v_orders
 from private.party_event_supply_orders_v16 x
 where x.party_id=r.party_id and x.event_starts_at=r.event_starts_at;

 select coalesce(jsonb_agg(jsonb_build_object(
  'stage',x.stage,'orders_hash',x.orders_hash)
  order by x.stage),'[]'::jsonb),count(*)::integer
 into v_seals,v_required_stage_seals
 from private.party_event_stage_seals_v17 x
 where x.party_id=r.party_id and x.event_starts_at=r.event_starts_at;

 select coalesce(jsonb_agg(jsonb_build_object(
  'stage',x.stage,'vote_choice',x.vote_choice,
  'vote_locked_at',x.vote_locked_at)
  order by x.stage),'[]'::jsonb)
 into v_votes
 from private.party_event_stages_v11 x
 where x.party_id=r.party_id and x.event_starts_at=r.event_starts_at
  and x.stage in (2,3) and x.vote_locked_at is not null;

 select coalesce(jsonb_agg(jsonb_build_object(
  'from_stage',x.from_stage,'to_stage',x.to_stage)
  order by x.from_stage),'[]'::jsonb)
 into v_transitions
 from private.party_event_stage_transitions_v17 x
 where x.party_id=r.party_id and x.event_starts_at=r.event_starts_at;

 if v_members not between 2 and 4 or v_members<>f.member_count
  or v_loadout_count<>v_members
  or v_required_stage_seals<>3
  or jsonb_array_length(v_votes)<>2
  or jsonb_array_length(v_transitions)<>2
  or jsonb_array_length(v_orders)<9
 then raise exception 'party_event_v21_incomplete_replay_bundle';end if;

 v_payload:=jsonb_build_object(
  'week',jsonb_build_object(
   'party_id',w.party_id,'event_starts_at',w.event_starts_at,
   'event_ends_at',w.event_ends_at,'family',w.family,'variation',w.variation,
   'seed',w.seed,'difficulty',w.difficulty,
   'active_stage',w.active_stage,'status',w.status),
  'roster',v_roster,'loadouts',v_loadouts,
  'orders',v_orders,'seals',v_seals,
  'votes',v_votes,'transitions',v_transitions,
  'finale',jsonb_build_object(
   'party_id',f.party_id,'event_starts_at',f.event_starts_at,
   'finale_hash',f.finale_hash,'loadout_hash',f.loadout_hash,
   'member_count',f.member_count,'verified_points',f.verified_points,
   'stage3_orders_hash',f.stage3_orders_hash,
   'stage3_vote_choice',f.stage3_vote_choice),
  'reservation',jsonb_build_object(
   'id',r.id,'party_id',r.party_id,'event_starts_at',r.event_starts_at,
   'finale_hash',r.finale_hash,'opened_at',r.opened_at),
  'candidate',jsonb_build_object(
   'reservation_id',c.reservation_id,'party_id',c.party_id,
   'event_starts_at',c.event_starts_at,'finale_hash',c.finale_hash,
   'engine_version',c.engine_version,'candidate_hash',c.candidate_hash,
   'result_json',c.result_json));
 return jsonb_build_object(
  'version','private-party-event-replay-snapshot-v21',
  'payload',v_payload,
  'sourceDigest',encode(sha256(convert_to(v_payload::text,'UTF8')),'hex'),
  'serverNowMs',floor(extract(epoch from v_now)*1000)::bigint,
  'auditedCatalogIncluded',false,'combatReplayed',false,
  'rewardGrantAllowed',false);
end;$$;
revoke all on function
 private.read_party_event_boss_replay_snapshot_v21(uuid)
 from public,anon,authenticated;
grant execute on function
 private.read_party_event_boss_replay_snapshot_v21(uuid) to service_role;
commit;
