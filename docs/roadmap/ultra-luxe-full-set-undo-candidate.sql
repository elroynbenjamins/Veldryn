-- REVIEW CANDIDATE. Apply AFTER six-set grant, combined equip and name authority
-- within an isolated rollback test. Never deploy this file directly.
-- One bounded, private undo record per account. No whole game save, inventory,
-- wallet or client-provided previous appearance. Latest full equip replaces it.
create table private.ultra_luxe_full_set_undo_v1(
 account_id uuid primary key references auth.users(id) on delete cascade,
 character_id uuid not null, equip_request_id text not null,
 before_slots jsonb not null, applied_slots jsonb not null,
 before_name text, applied_name text not null,
 expires_at timestamptz not null
);
alter table private.ultra_luxe_full_set_undo_v1 enable row level security;
revoke all on private.ultra_luxe_full_set_undo_v1 from public,anon,authenticated;
grant select,insert,update,delete on private.ultra_luxe_full_set_undo_v1 to service_role;
create function private.ultra_luxe_undo_slots_v1(hero jsonb) returns jsonb
language sql immutable security invoker set search_path='' as $slots$
 select jsonb_build_object('profileBackgroundId',hero->'profileBackgroundId','profileBorderId',hero->'profileBorderId',
 'selectedCosmeticPetId',hero->'selectedCosmeticPetId','profileTitle',hero->'profileTitle','profileEffectId',hero->'profileEffectId')
$slots$;
revoke all on function private.ultra_luxe_undo_slots_v1(jsonb) from public,anon,authenticated;
grant execute on function private.ultra_luxe_undo_slots_v1(jsonb) to service_role;

-- Wrap the tested combined transaction instead of duplicating its authority.
-- The same account lock spans the pre-image, equip and journal upsert.
alter function public.commit_ultra_luxe_full_set_server_v1(uuid,uuid,text,bigint,bigint,jsonb,text,text,text,jsonb)
 rename to commit_ultra_luxe_full_set_base_v1;
create function public.commit_ultra_luxe_full_set_server_v1(
 p_account_id uuid,p_character_id uuid,p_collection_id text,p_expected_version bigint,p_expected_gold bigint,
 p_expected_grants jsonb,p_expected_name_id text,p_request_id text,p_request_hash text,p_response jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $equip$
declare previous_game jsonb; result jsonb; previous_slots jsonb; next_slots jsonb;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ultra-luxe-account:'||p_account_id::text,0));
 previous_game:=public.load_online_game_ultra_luxe_v1(p_account_id);
 result:=public.commit_ultra_luxe_full_set_base_v1(p_account_id,p_character_id,p_collection_id,p_expected_version,p_expected_gold,p_expected_grants,p_expected_name_id,p_request_id,p_request_hash,p_response);
 if not (result->>'replayed')::boolean then
  previous_slots:=private.ultra_luxe_undo_slots_v1(previous_game#>'{state,character}');
  next_slots:=private.ultra_luxe_undo_slots_v1(result#>'{gameplay,state,character}');
  insert into private.ultra_luxe_full_set_undo_v1(account_id,character_id,equip_request_id,before_slots,applied_slots,before_name,applied_name,expires_at)
  values(p_account_id,p_character_id,p_request_id,previous_slots,next_slots,p_expected_name_id,result#>>'{nameSelection,selectedId}',clock_timestamp()+interval '10 minutes')
  on conflict(account_id) do update set character_id=excluded.character_id,equip_request_id=excluded.equip_request_id,
   before_slots=excluded.before_slots,applied_slots=excluded.applied_slots,before_name=excluded.before_name,applied_name=excluded.applied_name,expires_at=excluded.expires_at;
 end if;
 return result||jsonb_build_object('undoEquipRequestId',(select equip_request_id from private.ultra_luxe_full_set_undo_v1
  where account_id=p_account_id and character_id=p_character_id and equip_request_id=p_request_id and expires_at>clock_timestamp()));
end $equip$;
revoke all on function public.commit_ultra_luxe_full_set_server_v1(uuid,uuid,text,bigint,bigint,jsonb,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.commit_ultra_luxe_full_set_server_v1(uuid,uuid,text,bigint,bigint,jsonb,text,text,text,jsonb) to service_role;

-- Invalidate the stored pre-image on any grant revocation for the account.
-- Regrant never revives an old undo. No additional public permissions.
create function private.ultra_luxe_invalidate_undo_v1() returns trigger
language plpgsql security invoker set search_path='' as $invalidate$
begin
 delete from private.ultra_luxe_full_set_undo_v1 where account_id=new.account_id;
 return new;
end $invalidate$;
revoke all on function private.ultra_luxe_invalidate_undo_v1() from public,anon,authenticated;
grant execute on function private.ultra_luxe_invalidate_undo_v1() to service_role;
create trigger ultra_luxe_invalidate_undo_v1 after update of revoked_at on private.ultra_luxe_collection_grants_v1
 for each row when (old.revoked_at is null and new.revoked_at is not null) execute function private.ultra_luxe_invalidate_undo_v1();

-- Undo takes only a receipt ID and current expected revision, never old slots
-- or name colors from the client. A later manual edit of a slot is preserved.
-- Current gameplay is loaded inside the lock. Commit both appearance and name
-- via the existing gameplay transaction; replay never consumes a newer journal.
create function public.undo_ultra_luxe_full_set_server_v1(
 p_account_id uuid,p_character_id uuid,p_equip_request_id text,p_expected_version bigint,
 p_request_id text,p_request_hash text
) returns jsonb language plpgsql security invoker set search_path='' as $undo$
declare j private.ultra_luxe_full_set_undo_v1%rowtype; prior jsonb; g jsonb; s jsonb; hero jsonb; old_hero jsonb;
 grants jsonb; current_slots jsonb; f text; val jsonb; name_now text; name_target text; names text[]; ack jsonb; changed boolean:=false;
begin
 if p_account_id is null or p_character_id is null or p_expected_version is null or p_expected_version<0
  or p_equip_request_id is null or p_equip_request_id !~ '^luxe_full_set_[A-Za-z0-9_-]{16,80}$'
  or p_request_id is null or p_request_id !~ '^luxe_undo_set_[A-Za-z0-9_-]{16,80}$'
  or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_ULTRA_LUXE_UNDO_REQUEST';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ultra-luxe-account:'||p_account_id::text,0));
 prior:=public.read_online_game_receipt_ultra_luxe_v1(p_account_id,p_request_id);
 if prior is not null then
  if prior->>'requestHash' is distinct from p_request_hash then raise exception 'ULTRA_LUXE_REQUEST_HASH_MISMATCH';end if;
  return jsonb_build_object('replayed',true,'gameplay',public.load_online_game_ultra_luxe_v1(p_account_id),'nameSelection',
   jsonb_build_object('accountId',p_account_id,'ownedIds',private.ultra_luxe_owned_names_v1(p_account_id),'selectedId',private.ultra_luxe_selected_name_v1(p_account_id)));
 end if;
 select * into j from private.ultra_luxe_full_set_undo_v1 where account_id=p_account_id and character_id=p_character_id and equip_request_id=p_equip_request_id and expires_at>clock_timestamp();
 if not found then raise exception 'STALE_ULTRA_LUXE_UNDO';end if;
 g:=public.load_online_game_ultra_luxe_v1(p_account_id);s:=g->'state';hero:=s->'character';old_hero:=hero;
 if hero->>'id' is distinct from p_character_id::text or (g->>'version')::bigint is distinct from p_expected_version then raise exception 'STALE_ULTRA_LUXE_GAMEPLAY';end if;
 grants:=g->'ultraLuxeCollectionIds';names:=private.ultra_luxe_owned_names_v1(p_account_id);
 name_now:=private.ultra_luxe_selected_name_v1(p_account_id);name_target:=name_now;
 current_slots:=private.ultra_luxe_undo_slots_v1(hero);
 foreach f in array array['profileBackgroundId','profileBorderId','selectedCosmeticPetId','profileTitle','profileEffectId'] loop
  if current_slots->f is not distinct from j.applied_slots->f and j.before_slots->f is distinct from j.applied_slots->f then
   val:=j.before_slots->f;
   if val is null or val='null'::jsonb then hero:=hero-f;else hero:=jsonb_set(hero,array[f],val);end if;
  end if;
 end loop;
 -- Private IDs are validated against current grants. Ordinary previous slots
 -- come from a trusted saved pre-image; no arbitrary client patch is accepted.
 hero:=private.ultra_luxe_project_hero_v1(hero,grants);
 if name_now=j.applied_name then
  name_target:=case when j.before_name=any(names) then j.before_name else null end;
 end if;
 changed:=hero is distinct from old_hero or name_target is distinct from name_now;
 if not changed then raise exception 'STALE_ULTRA_LUXE_UNDO_NO_CHANGES';end if;
 hero:=jsonb_set(hero,'{gold}',g->'walletGold');
 s:=jsonb_set(s,'{character}',hero);
 ack:=public.commit_online_game_ultra_luxe_v1(p_account_id,p_expected_version,(g->>'walletGold')::bigint,p_request_id,p_request_hash,
  jsonb_build_object('accountId',p_account_id,'state',s,'version',p_expected_version+1,'serverNow',g->'serverNow'),'[]'::jsonb,grants);
 if private.ultra_luxe_undo_slots_v1(ack#>'{state,character}') is distinct from private.ultra_luxe_undo_slots_v1(hero) then raise exception 'ULTRA_LUXE_UNDO_COMMIT_MISMATCH';end if;
 if name_target is distinct from name_now then
  if name_target is null then delete from private.ultra_luxe_name_selection_v1 where account_id=p_account_id;
  else insert into private.ultra_luxe_name_selection_v1(account_id,preset_id) values(p_account_id,name_target) on conflict(account_id) do update set preset_id=excluded.preset_id;end if;
 end if;
 if private.ultra_luxe_selected_name_v1(p_account_id) is distinct from name_target then raise exception 'ULTRA_LUXE_UNDO_NAME_MISMATCH';end if;
 delete from private.ultra_luxe_full_set_undo_v1 where account_id=p_account_id and equip_request_id=p_equip_request_id;
 return jsonb_build_object('replayed',false,'gameplay',ack,'nameSelection',jsonb_build_object('accountId',p_account_id,'ownedIds',names,'selectedId',name_target));
end $undo$;
revoke all on function public.undo_ultra_luxe_full_set_server_v1(uuid,uuid,text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.undo_ultra_luxe_full_set_server_v1(uuid,uuid,text,bigint,text,text) to service_role;
