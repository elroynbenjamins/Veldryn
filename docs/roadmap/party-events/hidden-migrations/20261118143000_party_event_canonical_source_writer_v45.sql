-- Veldryn Party Events V45 — UNPROMOTED, server-only receipt writer.
-- AUTHORING DRAFT. Do not deploy to staging/production or mount this RPC.
-- The V44 packet is produced by executeGameCommand, never from client JSON.
-- This wrapper commits the ordinary online action + canonical craft/idle
-- receipt inserts in ONE PostgreSQL transaction. NO Event Points or rewards.
begin;

create or replace function private.commit_online_game_party_sources_v45(
 p_account_id uuid,
 p_expected_version bigint,
 p_expected_gold bigint,
 p_request_id text,
 p_request_hash text,
 p_response jsonb,
 p_contributions jsonb,
 p_packet jsonb,
 p_deleted_character_id uuid default null
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 v_prior boolean;
 v_result jsonb;
 v_character_id uuid;
 v_crafts jsonb;
 v_row jsonb;
 v_idle jsonb;
 v_activity_id text;
 v_primary_item text;
 v_actual_quantity bigint;
 v_expected_elapsed integer;
 v_count integer;
begin
 -- Fail before the existing commit. Client JSON must never reach this
 -- private service-only boundary; the existing online command gateway still
 -- verifies account, revision, wallet, request hash and canonical game state.
 if p_account_id is null or p_deleted_character_id is not null
   or p_request_id !~ '^[a-zA-Z0-9_-]{8,128}$'
   or p_request_hash !~ '^[a-f0-9]{64}$'
   or jsonb_typeof(p_contributions)<>'array'
   or jsonb_array_length(p_contributions)>4
   or jsonb_typeof(p_packet)<>'object'
   or p_packet->>'kind'<>'party-event-canonical-source-packet-v44'
   or p_packet->>'accountId' is distinct from p_account_id::text
   or p_packet->>'requestId' is distinct from p_request_id
   or p_packet->>'writesAuthorized'<>'false'
   or p_packet->>'rewardsGranted'<>'false'
   or p_packet->>'eventPointsGranted'<>'0'
   or jsonb_typeof(p_packet->'craft')<>'array'
   or jsonb_typeof(p_packet->'idle')<>'array'
   or jsonb_array_length(p_packet->'craft')>4
   or jsonb_array_length(p_packet->'idle')>1
 then raise exception 'party_event_v45_invalid_trusted_packet';end if;

 v_character_id:=(p_response#>>'{state,character,id}')::uuid;
 if v_character_id is null or p_packet->>'characterId' is distinct from v_character_id::text
 then raise exception 'party_event_v45_character_mismatch';end if;

 -- One craft record for EACH verified server-emitted crafting action.
 -- The packet's order-index keys and recipe/quantity MUST match exactly
 -- what the online gateway is already about to commit. Never infer from
 -- a device-supplied recipe or a queue job that has not been claimed.
 select coalesce(jsonb_agg(jsonb_build_object(
  'kind','craft',
  'idempotencyKey','pe44:'||p_request_id||':craft:'||(ordinal-1)::text,
  'recipeId',v->>'contentId','quantity',(v->>'units')::integer
 ) order by ordinal),'[]'::jsonb)
 into v_crafts
 from jsonb_array_elements(p_contributions) with ordinality as activity(v,ordinal)
 where v->>'kind'='crafting';
 if v_crafts is distinct from p_packet->'craft'
 then raise exception 'party_event_v45_craft_packet_mismatch';end if;

 -- Gathering is deliberately limited to one non-queued full interval.
 -- A queued multi-stage reward has no single trustworthy start/end pair
 -- in the current persisted command and is not legal Party Event evidence.
 if jsonb_array_length(p_packet->'idle')>0 then
  if jsonb_typeof(p_response#>'{reward,activityResults}')='array'
     and jsonb_array_length(p_response#>'{reward,activityResults}')>0
  then raise exception 'party_event_v45_queued_gathering_not_a_receipt';end if;
  v_idle:=p_packet->'idle'->0;
  v_activity_id:=v_idle->>'activityId';
  v_primary_item:=case v_activity_id
   when 'GREENWOOD_TREE' then 'GREENWOOD_LOG'
   when 'GREENFIELDS_COPPER_OUTCROP' then 'COPPER_ORE'
   when 'DEWLEAF_PATCH' then 'DEWLEAF'
   else null end;
  if v_primary_item is null or v_idle->>'kind'<>'idle'
    or v_idle->>'idempotencyKey' is distinct from 'pe44:'||p_request_id||':idle:0'
    or (v_idle->>'elapsedSec')::integer not between 60 and 86400
    or (v_idle->>'resourceAmount')::bigint<=0
    or (v_idle->>'xpAmount')::bigint<0
    or (p_response#>>'{reward,xp}')::bigint is distinct from (v_idle->>'xpAmount')::bigint
    or (p_response#>>'{reward,elapsedSeconds}')::numeric < 60
  then raise exception 'party_event_v45_invalid_idle_evidence';end if;
  v_expected_elapsed:=floor((p_response#>>'{reward,elapsedSeconds}')::numeric)::integer;
  if (v_idle->>'elapsedSec')::integer is distinct from v_expected_elapsed
  then raise exception 'party_event_v45_idle_interval_mismatch';end if;
  select coalesce(sum((item->>'quantity')::bigint),0) into v_actual_quantity
  from jsonb_array_elements(coalesce(p_response#>'{reward,items}','[]'::jsonb)) item
  where item->>'itemId'=v_primary_item;
  if v_actual_quantity is distinct from (v_idle->>'resourceAmount')::bigint
    or not exists (
      select 1 from jsonb_array_elements(p_contributions) contribution
      where contribution->>'kind'='gathering'
       and contribution->>'contentId'=v_activity_id
       and (contribution->>'questUnits')::numeric>0)
  then raise exception 'party_event_v45_idle_not_from_canonical_gather';end if;
 end if;

 -- Serialize the account with the existing online-game writer and detect
 -- exact retries BEFORE the normal commit. No independent reward grant.
 perform pg_advisory_xact_lock(
  hashtextextended('party-account:'||p_account_id::text,0));
 select exists(select 1 from public.server_action_receipts
  where account_id=p_account_id and action='online_game_v1'
   and idempotency_key=p_request_id) into v_prior;

 v_result:=public.commit_online_game_guild_pve_v1(
  p_account_id,p_expected_version,p_expected_gold,p_request_id,
  p_request_hash,p_response,p_contributions,p_deleted_character_id);
 if v_prior then return v_result;end if;

 for v_row in select value from jsonb_array_elements(p_packet->'craft') value loop
  insert into public.craft_receipts(
   character_id,idempotency_key,recipe_id,quantity)
  values(v_character_id,v_row->>'idempotencyKey',
   v_row->>'recipeId',(v_row->>'quantity')::integer)
  on conflict(character_id,idempotency_key) do nothing;
  if not found then raise exception 'party_event_v45_duplicate_craft_source';end if;
 end loop;

 if v_idle is not null then
  insert into public.idle_claim_receipts(
   character_id,idempotency_key,activity_id,elapsed_sec,
   resource_amount,xp_amount)
  values(v_character_id,v_idle->>'idempotencyKey',v_activity_id,
   (v_idle->>'elapsedSec')::integer,(v_idle->>'resourceAmount')::bigint,
   (v_idle->>'xpAmount')::bigint)
  on conflict(character_id,idempotency_key) do nothing;
  if not found then raise exception 'party_event_v45_duplicate_idle_source';end if;
 end if;
 return v_result;
end;$$;

revoke all on function private.commit_online_game_party_sources_v45(
 uuid,bigint,bigint,text,text,jsonb,jsonb,jsonb,uuid)
 from public,anon,authenticated,service_role;
grant execute on function private.commit_online_game_party_sources_v45(
 uuid,bigint,bigint,text,text,jsonb,jsonb,jsonb,uuid) to service_role;

comment on function private.commit_online_game_party_sources_v45(
 uuid,bigint,bigint,text,text,jsonb,jsonb,jsonb,uuid) is
 'UNRELEASED V45: same transaction online game commit and provenance-validated craft/idle receipts; zero EP/rewards, no public route.';

commit;
