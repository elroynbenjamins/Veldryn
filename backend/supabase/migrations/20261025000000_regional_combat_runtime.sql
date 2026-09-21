-- Authoritative Sunscar regional combat receipts.
-- Clients may request authored encounter IDs, but never submit stats, enemy data,
-- combat results, seeds, pity, or rewards.
begin;

create table if not exists public.regional_combat_receipts_v1(
  receipt_id uuid primary key,
  account_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  request_id text not null,
  request_hash text not null,
  encounter_id text not null,
  zone_id text not null,
  encounter_kind text not null check(encounter_kind in ('standard','elite','regional_boss')),
  content_id text not null,
  server_seed text not null,
  player_definition jsonb not null,
  result jsonb,
  created_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  unique(account_id,request_id),
  check(request_id ~ '^[a-zA-Z0-9_-]{8,128}$'),
  check(request_hash ~ '^[a-f0-9]{64}$')
);
alter table public.regional_combat_receipts_v1 enable row level security;
revoke all on public.regional_combat_receipts_v1 from public,anon,authenticated;
grant all on public.regional_combat_receipts_v1 to service_role;

create or replace function public.regional_combat_access_server_v1(
  p_account_id uuid,p_character_id uuid,p_zone_id text,p_content_id text,p_required_level integer
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_level integer;
  v_story integer:=0;
  v_required_story integer;
  v_type text;
begin
  select c.level into v_level
  from public.characters c
  where c.id=p_character_id and c.account_id=p_account_id;
  if not found then raise exception 'character_not_owned';end if;
  if v_level<p_required_level then return jsonb_build_object('allowed',false,'reason','character_below_level');end if;

  if not exists(
    select 1 from public.active_region_content_records_v21 r
    where r.region_id='REG_002' and r.record_type='zone' and r.record_id=p_zone_id
  ) then return jsonb_build_object('allowed',false,'reason','regional_zone_not_active');end if;

  select r.record_type into v_type
  from public.active_region_content_records_v21 r
  where r.region_id='REG_002' and r.record_id=p_content_id and r.record_type in ('monster','boss')
  limit 1;
  if v_type is null then return jsonb_build_object('allowed',false,'reason','regional_encounter_not_active');end if;

  select coalesce(p.story_completed,0) into v_story
  from public.region_progress_v21 p
  where p.account_id=p_account_id and p.region_id='REG_002';
  if not found then v_story:=0;end if;

  v_required_story:=case p_zone_id
    when 'ZONE_006' then 1
    when 'ZONE_007' then 3
    when 'ZONE_008' then 5
    when 'ZONE_009' then 6
    when 'ZONE_010' then 8
    else 99
  end;
  if v_story<v_required_story then return jsonb_build_object('allowed',false,'reason','regional_story_locked');end if;
  return jsonb_build_object('allowed',true,'storyCompleted',v_story,'contentType',v_type);
end $$;

create or replace function public.reserve_regional_combat_server_v1(
  p_account_id uuid,p_character_id uuid,p_request_id text,p_request_hash text,
  p_receipt_id uuid,p_encounter_id text,p_zone_id text,p_encounter_kind text,p_content_id text,
  p_server_seed text,p_player_definition jsonb
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.regional_combat_receipts_v1%rowtype;
begin
  if p_request_id !~ '^[a-zA-Z0-9_-]{8,128}$' or p_request_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_request';end if;
  perform pg_advisory_xact_lock(hashtextextended('regional-combat:'||p_account_id::text,0));
  select * into v from public.regional_combat_receipts_v1 where account_id=p_account_id and request_id=p_request_id;
  if found then
    if v.request_hash<>p_request_hash then raise exception 'idempotency_key_conflict';end if;
    return jsonb_build_object('receiptId',v.receipt_id,'accountId',v.account_id,'characterId',v.character_id,'encounterId',v.encounter_id,'zoneId',v.zone_id,'kind',v.encounter_kind,'contentId',v.content_id,'serverSeed',v.server_seed,'player',v.player_definition,'createdAtMs',floor(extract(epoch from v.created_at)*1000));
  end if;
  if not exists(select 1 from public.characters c where c.id=p_character_id and c.account_id=p_account_id) then raise exception 'character_not_owned';end if;
  if p_player_definition is null or jsonb_typeof(p_player_definition)<>'object' then raise exception 'invalid_player_definition';end if;
  insert into public.regional_combat_receipts_v1(receipt_id,account_id,character_id,request_id,request_hash,encounter_id,zone_id,encounter_kind,content_id,server_seed,player_definition)
  values(p_receipt_id,p_account_id,p_character_id,p_request_id,p_request_hash,p_encounter_id,p_zone_id,p_encounter_kind,p_content_id,p_server_seed,p_player_definition)
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
    if p_result is null or jsonb_typeof(p_result)<>'object' or not (p_result ? 'victory') or not (p_result ? 'eventDigest') then raise exception 'invalid_regional_combat_result';end if;
    update public.regional_combat_receipts_v1 set result=p_result,completed_at=clock_timestamp() where receipt_id=p_receipt_id returning * into v;
  end if;
  return jsonb_build_object('duplicate',v_duplicate,'result',v.result);
end $$;

revoke all on function public.regional_combat_access_server_v1(uuid,uuid,text,text,integer) from public,anon,authenticated;
revoke all on function public.reserve_regional_combat_server_v1(uuid,uuid,text,text,uuid,text,text,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.load_regional_combat_server_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.commit_regional_combat_result_server_v1(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.regional_combat_access_server_v1(uuid,uuid,text,text,integer) to service_role;
grant execute on function public.reserve_regional_combat_server_v1(uuid,uuid,text,text,uuid,text,text,text,text,text,jsonb) to service_role;
grant execute on function public.load_regional_combat_server_v1(uuid,uuid) to service_role;
grant execute on function public.commit_regional_combat_result_server_v1(uuid,uuid,jsonb) to service_role;

commit;
