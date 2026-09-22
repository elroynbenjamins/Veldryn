-- Regional combat interrupted-run recovery and anti-stockpiling.
-- Only one unexpired unresolved receipt per account+encounter may exist.
begin;

alter table public.regional_combat_receipts_v1
  add column if not exists expires_at timestamptz;

update public.regional_combat_receipts_v1
set expires_at=created_at+interval '15 minutes'
where expires_at is null;

alter table public.regional_combat_receipts_v1
  alter column expires_at set default (clock_timestamp()+interval '15 minutes'),
  alter column expires_at set not null;

create index if not exists regional_combat_receipts_pending_v1
  on public.regional_combat_receipts_v1(account_id,encounter_id,expires_at desc)
  where result is null;

create or replace function public.pending_regional_combat_server_v1(
  p_account_id uuid
) returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'receiptId',r.receipt_id,
    'characterId',r.character_id,
    'encounterId',r.encounter_id,
    'zoneId',r.zone_id,
    'kind',r.encounter_kind,
    'contentId',r.content_id,
    'createdAtMs',floor(extract(epoch from r.created_at)*1000),
    'expiresAtMs',floor(extract(epoch from r.expires_at)*1000)
  ) order by r.created_at desc),'[]'::jsonb)
  from public.regional_combat_receipts_v1 r
  where r.account_id=p_account_id
    and r.result is null
    and r.expires_at>clock_timestamp();
$$;

create or replace function public.reserve_regional_combat_server_v1(
  p_account_id uuid,p_character_id uuid,p_request_id text,p_request_hash text,
  p_receipt_id uuid,p_encounter_id text,p_zone_id text,p_encounter_kind text,p_content_id text,
  p_server_seed text,p_player_definition jsonb
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v public.regional_combat_receipts_v1%rowtype;
  v_cadence jsonb;
  v_ready_at_ms bigint;
  v_daily_wins integer;
  v_daily_cap integer;
  v_now timestamptz:=clock_timestamp();
  v_now_ms bigint:=floor(extract(epoch from v_now)*1000);
begin
  if p_request_id !~ '^[a-zA-Z0-9_-]{8,128}$' or p_request_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_request';end if;
  if p_encounter_kind not in ('standard','elite','regional_boss') then raise exception 'invalid_regional_encounter_kind';end if;

  perform pg_advisory_xact_lock(hashtextextended('regional-combat:'||p_account_id::text,0));

  select * into v from public.regional_combat_receipts_v1
  where account_id=p_account_id and request_id=p_request_id;
  if found then
    if v.request_hash<>p_request_hash then raise exception 'idempotency_key_conflict';end if;
    if v.result is null and v.expires_at<=v_now then raise exception 'regional_combat_receipt_expired';end if;
    return jsonb_build_object('receiptId',v.receipt_id,'accountId',v.account_id,'characterId',v.character_id,'encounterId',v.encounter_id,'zoneId',v.zone_id,'kind',v.encounter_kind,'contentId',v.content_id,'serverSeed',v.server_seed,'player',v.player_definition,'createdAtMs',floor(extract(epoch from v.created_at)*1000));
  end if;

  select * into v from public.regional_combat_receipts_v1
  where account_id=p_account_id
    and encounter_id=p_encounter_id
    and result is null
    and expires_at>v_now
  order by created_at desc
  limit 1;
  if found then raise exception 'regional_combat_pending';end if;

  if not exists(select 1 from public.characters c where c.id=p_character_id and c.account_id=p_account_id) then raise exception 'character_not_owned';end if;
  if p_player_definition is null or jsonb_typeof(p_player_definition)<>'object' then raise exception 'invalid_player_definition';end if;

  v_cadence:=public.regional_combat_cadence_server_v1(p_account_id,p_encounter_id,p_encounter_kind);
  v_ready_at_ms:=nullif(v_cadence->>'readyAtMs','')::bigint;
  v_daily_wins:=coalesce((v_cadence->>'dailyWins')::integer,0);
  v_daily_cap:=nullif(v_cadence->>'dailyCap','')::integer;

  if v_ready_at_ms is not null and v_ready_at_ms>v_now_ms then raise exception 'regional_combat_cooldown';end if;
  if v_daily_cap is not null and v_daily_wins>=v_daily_cap then raise exception 'regional_boss_daily_cap';end if;

  insert into public.regional_combat_receipts_v1(receipt_id,account_id,character_id,request_id,request_hash,encounter_id,zone_id,encounter_kind,content_id,server_seed,player_definition,expires_at)
  values(p_receipt_id,p_account_id,p_character_id,p_request_id,p_request_hash,p_encounter_id,p_zone_id,p_encounter_kind,p_content_id,p_server_seed,p_player_definition,v_now+interval '15 minutes')
  returning * into v;

  return jsonb_build_object('receiptId',v.receipt_id,'accountId',v.account_id,'characterId',v.character_id,'encounterId',v.encounter_id,'zoneId',v.zone_id,'kind',v.encounter_kind,'contentId',v.content_id,'serverSeed',v.server_seed,'player',v.player_definition,'createdAtMs',floor(extract(epoch from v.created_at)*1000));
end $$;

create or replace function public.load_regional_combat_server_v1(
  p_account_id uuid,p_receipt_id uuid
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.regional_combat_receipts_v1%rowtype;
begin
  select * into v from public.regional_combat_receipts_v1 where receipt_id=p_receipt_id and account_id=p_account_id;
  if not found then raise exception 'regional_receipt_not_found';end if;
  if v.result is null and v.expires_at<=clock_timestamp() then raise exception 'regional_combat_receipt_expired';end if;
  return jsonb_build_object(
    'reservation',jsonb_build_object('receiptId',v.receipt_id,'accountId',v.account_id,'characterId',v.character_id,'encounterId',v.encounter_id,'zoneId',v.zone_id,'kind',v.encounter_kind,'contentId',v.content_id,'serverSeed',v.server_seed,'player',v.player_definition,'createdAtMs',floor(extract(epoch from v.created_at)*1000)),
    'result',v.result
  );
end $$;

create or replace function public.commit_regional_combat_result_server_v1(
  p_account_id uuid,p_receipt_id uuid,p_result jsonb
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.regional_combat_receipts_v1%rowtype;v_duplicate boolean:=false;
begin
  perform pg_advisory_xact_lock(hashtextextended('regional-combat-receipt:'||p_receipt_id::text,0));
  select * into v from public.regional_combat_receipts_v1 where receipt_id=p_receipt_id and account_id=p_account_id for update;
  if not found then raise exception 'regional_receipt_not_found';end if;
  if v.result is not null then v_duplicate:=true;
  else
    if v.expires_at<=clock_timestamp() then raise exception 'regional_combat_receipt_expired';end if;
    if p_result is null or jsonb_typeof(p_result)<>'object' or not (p_result ? 'victory') or not (p_result ? 'eventDigest') then raise exception 'invalid_regional_combat_result';end if;
    update public.regional_combat_receipts_v1 set result=p_result,completed_at=clock_timestamp() where receipt_id=p_receipt_id returning * into v;
  end if;
  return jsonb_build_object('duplicate',v_duplicate,'result',v.result);
end $$;

revoke all on function public.pending_regional_combat_server_v1(uuid) from public,anon,authenticated;
revoke all on function public.reserve_regional_combat_server_v1(uuid,uuid,text,text,uuid,text,text,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.load_regional_combat_server_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.commit_regional_combat_result_server_v1(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pending_regional_combat_server_v1(uuid) to service_role;
grant execute on function public.reserve_regional_combat_server_v1(uuid,uuid,text,text,uuid,text,text,text,text,text,jsonb) to service_role;
grant execute on function public.load_regional_combat_server_v1(uuid,uuid) to service_role;
grant execute on function public.commit_regional_combat_result_server_v1(uuid,uuid,jsonb) to service_role;

commit;
