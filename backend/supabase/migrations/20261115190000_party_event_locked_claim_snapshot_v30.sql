-- Party Events v30: locked, account-scoped INSPECTION ONLY.
-- DRAFT. Requires hidden v11-v29. DOES NOT pay, reserve or claim a reward.
-- A one-shot RPC releases its locks when the call ends. Never mistake this
-- inspection for an atomic transaction spanning a subsequent payout call.
begin;

create or replace function private.inspect_party_event_claim_lock_v30(
 p_offer_id uuid,p_account_id uuid
) returns jsonb language plpgsql volatile security definer
set search_path='' as $$
declare
 o record;w record;b record;a record;r record;choice_row record;
 i record;pre record;quote_row record;
 g record;c record;wallet record;
 v_quote jsonb;v_hash text;v_kind text;v_gold text;
begin
 if p_offer_id is null or p_account_id is null then
  raise exception 'party_event_v30_trusted_ids_required';
 end if;

 -- EXACT same account lock key acquired by the authoritative online save.
 -- Every future writer MUST keep this lock through both the economy writes
 -- and the paired paid-receipt/Inbox INSERT/COMMIT.
 perform pg_advisory_xact_lock(
  hashtextextended('party-account:'||p_account_id::text,0));

 select * into o from private.party_event_reward_offers_v24
  where id=p_offer_id and account_id=p_account_id for update;
 if not found then raise exception 'party_event_v30_offer_not_owned';end if;
 if o.reward_model<>'party-event-rewards-v2'
  or o.claimable or o.granted
 then raise exception 'party_event_v30_offer_status_invalid';end if;

 select * into w from private.party_event_weeks_v11
  where party_id=o.party_id and event_starts_at=o.event_starts_at
  for update;
 if not found or w.active_stage<>3
  or w.status not in ('active','closed')
  or now()<w.event_ends_at+interval '1 hour'
 then raise exception 'party_event_v30_window_unavailable';end if;

 select * into r from private.party_event_roster_v11
  where party_id=o.party_id and event_starts_at=o.event_starts_at
   and account_id=p_account_id for share;
 if not found or r.character_id is null
 then raise exception 'party_event_v30_frozen_roster_missing';end if;

 select * into b from private.party_event_reward_batches_v24
  where reservation_id=o.reservation_id
   and party_id=o.party_id and event_starts_at=o.event_starts_at
  for share;
 if not found or b.reward_grants_enabled
 then raise exception 'party_event_v30_reward_batch_invalid';end if;

 select * into a from private.party_event_boss_replay_attestations_v23
  where reservation_id=o.reservation_id
   and party_id=o.party_id and event_starts_at=o.event_starts_at
  for share;
 if not found or a.candidate_hash is distinct from b.candidate_hash
  or a.replay_hash is distinct from b.replay_hash
  or a.reward_band is distinct from o.reward_band
  or a.ruleset<>'party-event-day8-combat-v4'
  or a.resource_audit<>'greenfields-verified-gathering-v22'
  or a.rewards_granted or a.reward_entitlement_created
 then raise exception 'party_event_v30_unverified_boss_replay';end if;

 select * into choice_row from private.party_event_reward_choices_v24
  where offer_id=o.id and account_id=o.account_id for share;
 if o.eligibility='participation' then
  if found or o.personal_points not between 5 and 14 then
   raise exception 'party_event_v30_participation_choice_invalid';
  end if;
  v_kind:='participation';
 elsif o.eligibility='full' then
  if not found or o.personal_points not between 15 and 60
    or choice_row.choice not in ('warrior','artisan','companion')
    or choice_row.claimable or choice_row.granted
  then raise exception 'party_event_v30_locked_choice_missing';end if;
  v_kind:=choice_row.choice;
 else raise exception 'party_event_v30_eligibility_invalid';
 end if;

 -- Verify independent historical drafts. All are immutable/nonpaying.
 select * into i from private.party_event_claim_intents_v25
  where offer_id=p_offer_id and account_id=p_account_id for share;
 if not found or i.character_id is distinct from r.character_id
   or i.reservation_id is distinct from o.reservation_id
   or i.event_starts_at is distinct from o.event_starts_at
   or i.reward_kind<>v_kind or i.reward_model<>o.reward_model
   or i.state<>'blocked_unreleased'
   or i.claimable or i.claimed or i.rewards_granted
   or i.entitlement_created
 then raise exception 'party_event_v30_claim_intent_missing';end if;

 select * into pre from private.party_event_claim_preflights_v25
  where offer_id=p_offer_id and account_id=p_account_id for share;
 if not found or pre.character_id is distinct from r.character_id
   or pre.reservation_id is distinct from o.reservation_id
   or pre.event_starts_at is distinct from o.event_starts_at
   or pre.difficulty<>w.difficulty or pre.reward_kind<>v_kind
   or pre.source_candidate_hash<>a.candidate_hash
   or pre.source_replay_hash<>a.replay_hash
   or pre.authorized_for_payout or pre.claimed
   or pre.currency_credited or pre.inventory_credited
 then raise exception 'party_event_v30_preflight_missing';end if;

 select * into quote_row from private.party_event_reward_claim_quotes_v25
  where offer_id=p_offer_id and account_id=p_account_id for share;
 if not found or quote_row.character_id is distinct from r.character_id
   or quote_row.reservation_id is distinct from o.reservation_id
   or quote_row.event_starts_at is distinct from o.event_starts_at
   or quote_row.difficulty<>w.difficulty
   or quote_row.reward_kind<>v_kind
   or quote_row.claimable or quote_row.claimed
   or quote_row.economy_applied or quote_row.inbox_delivered
 then raise exception 'party_event_v30_quote_missing';end if;

 -- Recompute the v2 model from the frozen v24 offer; no caller payout args.
 v_quote:=private.party_event_reward_quote_v25(p_offer_id,p_account_id);
 v_hash:=encode(sha256(convert_to(v_quote::text,'UTF8')),'hex');
 if i.quote_hash<>v_hash or pre.reward_hash<>v_hash
   or quote_row.reward_hash<>v_hash
   or i.reward_quote is distinct from v_quote
   or pre.reward_json is distinct from v_quote
   or quote_row.reward_json is distinct from v_quote
   or i.reward_kind<>v_quote->>'kind'
 then raise exception 'party_event_v30_immutable_quote_disagrees';end if;

 -- Account -> state -> character -> wallet lock order. A simple read
 -- outside this transaction is NOT sufficient for a future payment.
 select * into g from public.online_game_states
  where account_id=p_account_id for update;
 if not found or g.state is null
  or g.character_id is distinct from r.character_id
  or g.state#>>'{character,id}'<>r.character_id::text
  or g.revision<0 or g.revision>9007199254740990
 then raise exception 'party_event_v30_online_character_unavailable';end if;

 select * into c from public.characters
  where id=r.character_id and account_id=p_account_id for update;
 if not found then raise exception 'party_event_v30_character_unowned';end if;

 select * into wallet from public.character_wallets
  where character_id=r.character_id for update;
 v_gold:=g.state#>>'{character,gold}';
 if not found or wallet.gold<0 or c.gold<0
   or v_gold is null or v_gold !~ '^[0-9]{1,16}$'
   or wallet.gold is distinct from c.gold
   or wallet.gold::text<>v_gold
   or wallet.gold>9007199254740991
 then raise exception 'party_event_v30_gold_projection_mismatch';end if;

 -- Paid-receipt replays are not authorized by this function. A later
 -- payable writer must use exact request-key checks BEFORE attempting payout.
 if exists(select 1 from private.party_event_paid_claim_receipts_v29
   where offer_id=p_offer_id or
   (event_starts_at=o.event_starts_at and account_id=p_account_id))
 then raise exception 'party_event_v30_already_paid';end if;

 return jsonb_build_object(
  'schema','party-event-locked-snapshot-v30',
  'offerId',o.id,'partyId',o.party_id,'reservationId',o.reservation_id,
  'eventStartsAt',o.event_starts_at,'accountId',p_account_id,
  'characterId',r.character_id,'difficulty',w.difficulty,
  'rewardHash',v_hash,'reward',v_quote,
  'onlineRevision',g.revision,'walletGold',wallet.gold,
  'characterGold',c.gold,'state',g.state,
  'checked',true,'previewOnly',true,
  'claimable',false,'claimed',false,'economyApplied',false,
  'inboxDelivered',false,'locksReleasedAtRpcEnd',true);
end;$$;

revoke all on function private.inspect_party_event_claim_lock_v30(uuid,uuid)
 from public,anon,authenticated,service_role;
grant execute on function private.inspect_party_event_claim_lock_v30(uuid,uuid)
 to service_role;

-- No grant writer, no INSERT, no player Claim endpoint, no release switch.
commit;
