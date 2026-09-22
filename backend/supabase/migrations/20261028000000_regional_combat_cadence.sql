-- Server-owned cadence for authoritative regional combat.
-- Prevents instant endpoint spam from accelerating regional Gem progression.
begin;

create index if not exists regional_combat_receipts_account_encounter_created_v1
  on public.regional_combat_receipts_v1(account_id,encounter_id,created_at desc);
create index if not exists regional_combat_receipts_account_kind_completed_v1
  on public.regional_combat_receipts_v1(account_id,encounter_kind,completed_at desc)
  where completed_at is not null;

create or replace function public.regional_combat_cadence_server_v1(
  p_account_id uuid,p_encounter_id text,p_encounter_kind text
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_now timestamptz:=clock_timestamp();
  v_last timestamptz;
  v_cooldown_seconds integer;
  v_ready_at timestamptz;
  v_day_start timestamptz:=(date_trunc('day',v_now at time zone 'UTC') at time zone 'UTC');
  v_daily_wins integer:=0;
  v_daily_cap integer:=null;
begin
  v_cooldown_seconds:=case p_encounter_kind
    when 'standard' then 30
    when 'elite' then 90
    when 'regional_boss' then 300
    else raise exception 'invalid_regional_encounter_kind'
  end;
  if p_encounter_kind='regional_boss' then v_daily_cap:=3;end if;

  select max(r.created_at) into v_last
  from public.regional_combat_receipts_v1 r
  where r.account_id=p_account_id and r.encounter_id=p_encounter_id;

  if v_last is not null then v_ready_at:=v_last+make_interval(secs=>v_cooldown_seconds);end if;

  if v_daily_cap is not null then
    select count(*)::integer into v_daily_wins
    from public.regional_combat_receipts_v1 r
    where r.account_id=p_account_id
      and r.encounter_kind='regional_boss'
      and r.completed_at>=v_day_start
      and coalesce((r.result->>'victory')::boolean,false)=true;
  end if;

  return jsonb_build_object(
    'cooldownSeconds',v_cooldown_seconds,
    'readyAtMs',case when v_ready_at is null then null else floor(extract(epoch from v_ready_at)*1000) end,
    'dailyWins',v_daily_wins,
    'dailyCap',v_daily_cap,
    'dailyResetAtMs',case when v_daily_cap is null then null else floor(extract(epoch from (v_day_start+interval '1 day'))*1000) end
  );
end $$;

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
  v_now_ms bigint:=floor(extract(epoch from clock_timestamp())*1000);
begin
  if p_request_id !~ '^[a-zA-Z0-9_-]{8,128}$' or p_request_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_request';end if;
  if p_encounter_kind not in ('standard','elite','regional_boss') then raise exception 'invalid_regional_encounter_kind';end if;

  perform pg_advisory_xact_lock(hashtextextended('regional-combat:'||p_account_id::text,0));

  select * into v from public.regional_combat_receipts_v1
  where account_id=p_account_id and request_id=p_request_id;
  if found then
    if v.request_hash<>p_request_hash then raise exception 'idempotency_key_conflict';end if;
    return jsonb_build_object('receiptId',v.receipt_id,'accountId',v.account_id,'characterId',v.character_id,'encounterId',v.encounter_id,'zoneId',v.zone_id,'kind',v.encounter_kind,'contentId',v.content_id,'serverSeed',v.server_seed,'player',v.player_definition,'createdAtMs',floor(extract(epoch from v.created_at)*1000));
  end if;

  if not exists(select 1 from public.characters c where c.id=p_character_id and c.account_id=p_account_id) then raise exception 'character_not_owned';end if;
  if p_player_definition is null or jsonb_typeof(p_player_definition)<>'object' then raise exception 'invalid_player_definition';end if;

  v_cadence:=public.regional_combat_cadence_server_v1(p_account_id,p_encounter_id,p_encounter_kind);
  v_ready_at_ms:=nullif(v_cadence->>'readyAtMs','')::bigint;
  v_daily_wins:=coalesce((v_cadence->>'dailyWins')::integer,0);
  v_daily_cap:=nullif(v_cadence->>'dailyCap','')::integer;

  if v_ready_at_ms is not null and v_ready_at_ms>v_now_ms then raise exception 'regional_combat_cooldown';end if;
  if v_daily_cap is not null and v_daily_wins>=v_daily_cap then raise exception 'regional_boss_daily_cap';end if;

  insert into public.regional_combat_receipts_v1(receipt_id,account_id,character_id,request_id,request_hash,encounter_id,zone_id,encounter_kind,content_id,server_seed,player_definition)
  values(p_receipt_id,p_account_id,p_character_id,p_request_id,p_request_hash,p_encounter_id,p_zone_id,p_encounter_kind,p_content_id,p_server_seed,p_player_definition)
  returning * into v;

  return jsonb_build_object('receiptId',v.receipt_id,'accountId',v.account_id,'characterId',v.character_id,'encounterId',v.encounter_id,'zoneId',v.zone_id,'kind',v.encounter_kind,'contentId',v.content_id,'serverSeed',v.server_seed,'player',v.player_definition,'createdAtMs',floor(extract(epoch from v.created_at)*1000));
end $$;

revoke all on function public.regional_combat_cadence_server_v1(uuid,text,text) from public,anon,authenticated;
revoke all on function public.reserve_regional_combat_server_v1(uuid,uuid,text,text,uuid,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.regional_combat_cadence_server_v1(uuid,text,text) to service_role;
grant execute on function public.reserve_regional_combat_server_v1(uuid,uuid,text,text,uuid,text,text,text,text,text,jsonb) to service_role;

commit;
