-- REVIEW CANDIDATE ONLY. Not a migration. Requires the unified six-set grant
-- catalogue, authoritative private name selection and gameplay wrappers from #1834.
-- Do not apply to production. Service-only entrypoint; authenticated Edge command
-- must derive account/character from current state and compute authoritative p_response.
-- Request hash must cover action kind, character ID, collection, expected name selection,
-- expected revision and exact wardrobe changes; reserve luxe_full_set: for this command.

create function private.ultra_luxe_full_set_definition_v1(p_collection_id text)
returns table(background_id text,border_id text,pet_id text,title_name text,preset_id text)
language sql immutable security invoker set search_path='' as $definition$
 select v.bg,v.border,v.pet,v.title,v.preset from (values
 ('ascendant-celestial-sovereign','ascendant-celestial-astral-sanctum','ascendant-celestial-crown-of-the-cosmos','ascendant-celestial-aetherion','Sovereign of the Stars','ascendant-celestial-name'),
 ('ascendant-draconic-dominion','ascendant-draconic-dominion-of-ash','ascendant-draconic-throne-of-embers','ascendant-draconic-vharaxis','Dragon Sovereign','ascendant-draconic-name'),
 ('ascendant-abyssal-majesty','ascendant-abyssal-forgotten-abyss','ascendant-abyssal-crown-of-the-depths','ascendant-abyssal-nhalzuun','Monarch of the Deep','ascendant-abyssal-name'),
 ('ascendant-paradox-eternal','ascendant-paradox-beyond-the-veil','ascendant-paradox-fractured-eternity','ascendant-paradox-aeon','Beyond Existence','ascendant-paradox-name'),
 ('ascendant-sakura-enchantment','ascendant-sakura-petal-sanctuary','ascendant-sakura-blossom-crown','ascendant-sakura-spirit-fox','Sakura Dreamkeeper','ascendant-sakura-name'),
 ('ascendant-stormforged-sovereign','ascendant-stormforged-thunderkeep','ascendant-stormforged-steel-crown','ascendant-stormforged-direwolf','Stormforged Warden','ascendant-stormforged-name')
 ) as v(id,bg,border,pet,title,preset) where v.id=p_collection_id
$definition$;
revoke all on function private.ultra_luxe_full_set_definition_v1(text) from public,anon,authenticated;

-- Definer only to access private selection table/helper, with an explicit service-role ACL.
-- Never grant this function to authenticated/anon. Existing commit performs the
-- authoritative revision/wallet/receipt validation. Any failed postcondition aborts
-- the entire PostgreSQL transaction, including the gameplay commit and receipt.
create function public.commit_ultra_luxe_full_set_server_v1(
 p_account_id uuid,p_character_id uuid,p_collection_id text,
 p_expected_version bigint,p_expected_gold bigint,p_expected_grants jsonb,
 p_expected_name_id text,p_request_id text,p_request_hash text,p_response jsonb
) returns jsonb language plpgsql security definer set search_path='' as $full_set$
declare
 d record; current_game jsonb; current_grants jsonb; owned_names text[];
 selected_name text; existing_receipt jsonb; ack jsonb; hero jsonb; readback jsonb;
begin
 if p_account_id is null or p_character_id is null or p_expected_version is null or p_expected_gold is null
  or p_request_id is null or p_request_id !~ '^luxe_full_set:[A-Za-z0-9_-]{16,80}$'
  or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$' then
  raise exception 'INVALID_ULTRA_LUXE_FULL_SET_REQUEST';
 end if;
 select * into d from private.ultra_luxe_full_set_definition_v1(p_collection_id);
 if not found then raise exception 'UNKNOWN_ULTRA_LUXE_SET';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ultra-luxe-account:'||p_account_id::text,0));
 -- Receipt handling precedes any writes, including private-name upserts.
 -- Replay returns CURRENT authority, not a stale name or a historical character equip.
 existing_receipt:=public.read_online_game_receipt_ultra_luxe_v1(p_account_id,p_request_id);
 if existing_receipt is not null then
  if existing_receipt->>'requestHash' is distinct from p_request_hash then raise exception 'ULTRA_LUXE_REQUEST_HASH_MISMATCH';end if;
  current_game:=public.load_online_game_ultra_luxe_v1(p_account_id);
  return jsonb_build_object('replayed',true,'gameplay',current_game,
   'nameSelection',jsonb_build_object('accountId',p_account_id,'ownedIds',private.ultra_luxe_owned_names_v1(p_account_id),'selectedId',private.ultra_luxe_selected_name_v1(p_account_id)));
 end if;
 current_game:=public.load_online_game_ultra_luxe_v1(p_account_id);
 current_grants:=public.ultra_luxe_grants_server_v1(p_account_id);
 owned_names:=private.ultra_luxe_owned_names_v1(p_account_id);
 selected_name:=private.ultra_luxe_selected_name_v1(p_account_id);
 if current_game#>>'{state,character,id}' is distinct from p_character_id::text then raise exception 'STALE_ULTRA_LUXE_CHARACTER';end if;
 if current_grants is distinct from p_expected_grants or not coalesce(current_grants ? p_collection_id,false)
  or not coalesce(d.preset_id=any(owned_names),false) then raise exception 'STALE_ULTRA_LUXE_FULL_SET_GRANT';end if;
 if selected_name is distinct from p_expected_name_id then raise exception 'STALE_ULTRA_LUXE_NAME_SELECTION';end if;
 if (current_game->>'version')::bigint is distinct from p_expected_version
  or (current_game->>'walletGold')::bigint is distinct from p_expected_gold then raise exception 'STALE_ULTRA_LUXE_GAMEPLAY';end if;
 -- The trusted Edge action is cosmetic-only and must preserve every other field
 -- except normal engine reconciliation. Do not expose this service function to a client.
 hero:=p_response#>'{state,character}';
 if p_response->>'accountId' is distinct from p_account_id::text
  or hero->>'id' is distinct from p_character_id::text
  or hero->>'profileBackgroundId' is distinct from d.background_id
  or hero->>'profileBorderId' is distinct from d.border_id
  or hero->>'selectedCosmeticPetId' is distinct from d.pet_id
  or hero->>'profileTitle' is distinct from d.title_name
  or coalesce(hero->>'profileEffectId','')<>'' then raise exception 'INVALID_ULTRA_LUXE_FULL_SET_APPEARANCE';end if;
 ack:=public.commit_online_game_ultra_luxe_v1(p_account_id,p_expected_version,p_expected_gold,p_request_id,p_request_hash,p_response,'[]'::jsonb,p_expected_grants);
 hero:=ack#>'{state,character}';
 if hero->>'id' is distinct from p_character_id::text
  or hero->>'profileBackgroundId' is distinct from d.background_id
  or hero->>'profileBorderId' is distinct from d.border_id
  or hero->>'selectedCosmeticPetId' is distinct from d.pet_id
  or hero->>'profileTitle' is distinct from d.title_name
  or coalesce(hero->>'profileEffectId','')<>'' then raise exception 'ULTRA_LUXE_FULL_SET_COMMIT_MISMATCH';end if;
 insert into private.ultra_luxe_name_selection_v1(account_id,preset_id) values(p_account_id,d.preset_id)
 on conflict(account_id) do update set preset_id=excluded.preset_id;
 if private.ultra_luxe_selected_name_v1(p_account_id) is distinct from d.preset_id then raise exception 'ULTRA_LUXE_FULL_SET_NAME_MISMATCH';end if;
 readback:=jsonb_build_object('accountId',p_account_id,'ownedIds',private.ultra_luxe_owned_names_v1(p_account_id),'selectedId',private.ultra_luxe_selected_name_v1(p_account_id));
 return jsonb_build_object('replayed',false,'gameplay',ack,'nameSelection',readback);
end $full_set$;
revoke all on function public.commit_ultra_luxe_full_set_server_v1(uuid,uuid,text,bigint,bigint,jsonb,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.commit_ultra_luxe_full_set_server_v1(uuid,uuid,text,bigint,bigint,jsonb,text,text,text,jsonb) to service_role;
-- Not yet executed. Validate against the unified candidate schema, actual gameplay
-- action contract, SQL role ownership and receipt format; test rollback of both
-- fields, revocation/regrant, concurrent name edit, replay after later edit,
-- account/character switch, request-hash mismatch, and no wallet/gear mutations.
-- The combined command intentionally equips dedicated canonical pieces; legacy
-- alias compatibility must be resolved at the trusted Edge action boundary.
