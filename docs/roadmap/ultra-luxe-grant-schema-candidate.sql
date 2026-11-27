-- DRAFT ONLY. Four-collection candidate. Not a migration. Run only in an isolated test database first.
-- The deployment must include transactional game commit and public identity checks.
begin;
create table private.ultra_luxe_collection_grants_v1 (
 account_id uuid not null references auth.users(id) on delete cascade,
 collection_id text not null check(collection_id in ('ascendant-celestial-sovereign','ascendant-draconic-dominion','ascendant-abyssal-majesty','ascendant-paradox-eternal')),
 granted_at timestamptz not null default now(),
 revoked_at timestamptz,
 primary key(account_id,collection_id)
);
create table private.ultra_luxe_grant_audit_v1 (
 id bigint generated always as identity primary key,
 account_id uuid not null,
 collection_id text not null,
 action text not null check(action in ('grant','revoke')),
 reason text not null check(length(trim(reason)) between 1 and 240),
 recorded_at timestamptz not null default now()
);
alter table private.ultra_luxe_collection_grants_v1 enable row level security;
alter table private.ultra_luxe_grant_audit_v1 enable row level security;
revoke all on private.ultra_luxe_collection_grants_v1,private.ultra_luxe_grant_audit_v1 from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update on private.ultra_luxe_collection_grants_v1 to service_role;
grant select,insert on private.ultra_luxe_grant_audit_v1 to service_role;
grant usage on sequence private.ultra_luxe_grant_audit_v1_id_seq to service_role;

-- Existing backend convention: public RPC transport, service role only; invoker security.
create function public.ultra_luxe_grants_server_v1(p_account_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(collection_id order by collection_id),'[]'::jsonb)
 from private.ultra_luxe_collection_grants_v1
 where account_id=p_account_id and revoked_at is null
$$;
revoke all on function public.ultra_luxe_grants_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.ultra_luxe_grants_server_v1(uuid) to service_role;

-- Self-only readback for wardrobe discovery. Never accept a target account ID.
create function public.ultra_luxe_collection_self_v1()
returns jsonb language plpgsql stable security definer set search_path='' as $self_collections$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('accountId',uid,'collectionIds',public.ultra_luxe_grants_server_v1(uid));
end $self_collections$;
revoke all on function public.ultra_luxe_collection_self_v1() from public,anon,authenticated;
grant execute on function public.ultra_luxe_collection_self_v1() to authenticated;

-- Narrow account existence check; no broad auth.users read grant.
create function private.ultra_luxe_account_exists_v1(p_account_id uuid)
returns boolean language sql stable security definer set search_path='' as $exists$
 select exists(select 1 from auth.users where id=p_account_id)
$exists$;
revoke all on function private.ultra_luxe_account_exists_v1(uuid) from public,anon,authenticated;
grant execute on function private.ultra_luxe_account_exists_v1(uuid) to service_role;

create function public.set_ultra_luxe_grant_server_v1(p_account_id uuid,p_collection_id text,p_granted boolean,p_reason text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
 if p_account_id is null or p_collection_id is null or p_collection_id not in ('ascendant-celestial-sovereign','ascendant-draconic-dominion','ascendant-abyssal-majesty','ascendant-paradox-eternal') or p_granted is null or p_reason is null or length(trim(p_reason)) not between 1 and 240 then
  raise exception 'INVALID_ULTRA_LUXE_GRANT';
 end if;
 -- The account must exist even for a no-op revoke.
 if not private.ultra_luxe_account_exists_v1(p_account_id) then raise exception 'ACCOUNT_NOT_FOUND';end if;
 -- Serialize grants and gameplay commits for the same account.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ultra-luxe-account:'||p_account_id::text,0));
 if p_granted then
  insert into private.ultra_luxe_collection_grants_v1(account_id,collection_id)
  values(p_account_id,p_collection_id)
  on conflict(account_id,collection_id) do update set granted_at=now(),revoked_at=null
  where private.ultra_luxe_collection_grants_v1.revoked_at is not null;
 else
  update private.ultra_luxe_collection_grants_v1 set revoked_at=now()
  where account_id=p_account_id and collection_id=p_collection_id and revoked_at is null;
 end if;
 get diagnostics changed=row_count;
 if changed>0 then
  insert into private.ultra_luxe_grant_audit_v1(account_id,collection_id,action,reason)
  values(p_account_id,p_collection_id,case when p_granted then 'grant' else 'revoke' end,trim(p_reason));
 end if;
 return jsonb_build_object('changed',changed>0,'collectionIds',public.ultra_luxe_grants_server_v1(p_account_id));
end $$;
revoke all on function public.set_ultra_luxe_grant_server_v1(uuid,text,boolean,text) from public,anon,authenticated;
grant execute on function public.set_ultra_luxe_grant_server_v1(uuid,text,boolean,text) to service_role;
-- Helpers operate exclusively on trusted grant lists; no client grant RPC.
create function private.ultra_luxe_project_hero_v1(hero jsonb, grants jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $hero$
declare
 c boolean:=coalesce(grants ? 'ascendant-celestial-sovereign',false);
 d boolean:=coalesce(grants ? 'ascendant-draconic-dominion',false);
 a boolean:=coalesce(grants ? 'ascendant-abyssal-majesty',false);
 p boolean:=coalesce(grants ? 'ascendant-paradox-eternal',false);
 field text; val text;
begin
 if jsonb_typeof(hero) is distinct from 'object' then return hero;end if;
 foreach field in array array['profileBackgroundId','profileBorderId','selectedCosmeticPetId','profileIconId'] loop
  val:=hero->>field;
  if left(val,10)='ascendant-' or left(val,10)='ascendant_' then
   if not ((c and val=case field when 'profileBackgroundId' then 'ascendant-celestial-astral-sanctum' when 'profileBorderId' then 'ascendant-celestial-crown-of-the-cosmos' when 'selectedCosmeticPetId' then 'ascendant-celestial-aetherion' else 'ascendant-celestial-crown-icon' end) or
           (d and val=case field when 'profileBackgroundId' then 'ascendant-draconic-dominion-of-ash' when 'profileBorderId' then 'ascendant-draconic-throne-of-embers' when 'selectedCosmeticPetId' then 'ascendant-draconic-vharaxis' else 'ascendant-draconic-ruby-icon' end)
           or (a and coalesce(val=case field when 'profileBackgroundId' then 'ascendant-abyssal-forgotten-abyss' when 'profileBorderId' then 'ascendant-abyssal-crown-of-the-depths' when 'selectedCosmeticPetId' then 'ascendant-abyssal-nhalzuun' end,false))
           or (p and coalesce(val=case field when 'profileBackgroundId' then 'ascendant-paradox-beyond-the-veil' when 'profileBorderId' then 'ascendant-paradox-fractured-eternity' when 'selectedCosmeticPetId' then 'ascendant-paradox-aeon' end,false))) then
    if field='profileBackgroundId' then hero:=jsonb_set(hero,array[field],to_jsonb('asterfall-night'::text));
    elsif field='profileIconId' then hero:=jsonb_set(hero,array[field],to_jsonb('class:'||coalesce(hero->>'classId','IRONWARDEN')));
    else hero:=hero-field;end if;
   end if;
  end if;
 end loop;
 val:=lower(trim(hero->>'profileTitle'));
 if (val='sovereign of the stars' and not c) or (val='dragon sovereign' and not d) or (val='monarch of the deep' and not a) or (val='beyond existence' and not p) then
  hero:=jsonb_set(hero,'{profileTitle}',to_jsonb('New Adventurer'::text));
 end if;
 return hero;
end $hero$;

create function private.ultra_luxe_project_state_v1(s jsonb, grants jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $state$
declare
 a jsonb; field text; item text; celestial text; draconic text; abyssal text; paradox text; clean jsonb; roster jsonb;
begin
 if jsonb_typeof(s) is distinct from 'object' then return s;end if;
 a:=case when jsonb_typeof(s->'account')='object' then s->'account' else '{}'::jsonb end;
 foreach field in array array['unlockedProfileBackgroundIds','unlockedProfileBorderIds','unlockedCosmeticPetIds','unlockedProfileIconIds','unlockedTitleIds'] loop
  select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into clean
  from jsonb_array_elements(case when jsonb_typeof(a->field)='array' then a->field else '[]'::jsonb end) with ordinality t(value,ord)
  where jsonb_typeof(value)='string' and left(value#>>'{}',10) not in ('ascendant-','ascendant_');
  celestial:=case field when 'unlockedProfileBackgroundIds' then 'ascendant-celestial-astral-sanctum' when 'unlockedProfileBorderIds' then 'ascendant-celestial-crown-of-the-cosmos' when 'unlockedCosmeticPetIds' then 'ascendant-celestial-aetherion' when 'unlockedProfileIconIds' then 'ascendant-celestial-crown-icon' else 'ascendant-celestial-title' end;
  draconic:=case field when 'unlockedProfileBackgroundIds' then 'ascendant-draconic-dominion-of-ash' when 'unlockedProfileBorderIds' then 'ascendant-draconic-throne-of-embers' when 'unlockedCosmeticPetIds' then 'ascendant-draconic-vharaxis' when 'unlockedProfileIconIds' then 'ascendant-draconic-ruby-icon' else 'ascendant-draconic-title' end;
  if grants ? 'ascendant-celestial-sovereign' then clean:=clean||jsonb_build_array(celestial);end if;
  if grants ? 'ascendant-draconic-dominion' then clean:=clean||jsonb_build_array(draconic);end if;
  abyssal:=case field when 'unlockedProfileBackgroundIds' then 'ascendant-abyssal-forgotten-abyss' when 'unlockedProfileBorderIds' then 'ascendant-abyssal-crown-of-the-depths' when 'unlockedCosmeticPetIds' then 'ascendant-abyssal-nhalzuun' when 'unlockedTitleIds' then 'ascendant-abyssal-title' end;
  paradox:=case field when 'unlockedProfileBackgroundIds' then 'ascendant-paradox-beyond-the-veil' when 'unlockedProfileBorderIds' then 'ascendant-paradox-fractured-eternity' when 'unlockedCosmeticPetIds' then 'ascendant-paradox-aeon' when 'unlockedTitleIds' then 'ascendant-paradox-title' end;
  if abyssal is not null and grants ? 'ascendant-abyssal-majesty' then clean:=clean||jsonb_build_array(abyssal);end if;
  if paradox is not null and grants ? 'ascendant-paradox-eternal' then clean:=clean||jsonb_build_array(paradox);end if;
  a:=jsonb_set(a,array[field],clean);
 end loop;
 -- The shared social portrait also needs the same private-ID sanitation.
 item:=a->>'profileIconId';
 if left(item,10) in ('ascendant-','ascendant_') and not (coalesce(a->'unlockedProfileIconIds','[]'::jsonb) ? item) then
  if jsonb_typeof(s->'character')='object' then
   a:=jsonb_set(a,'{profileIconId}',to_jsonb('class:'||coalesce(s#>>'{character,classId}','IRONWARDEN')));
  else a:=a-'profileIconId';end if;
 end if;
 s:=jsonb_set(s,'{account}',a);
 if jsonb_typeof(s->'character')='object' then s:=jsonb_set(s,'{character}',private.ultra_luxe_project_hero_v1(s->'character',grants));end if;
 if jsonb_typeof(s->'otherCharacters')='array' then
  select coalesce(jsonb_agg(case when jsonb_typeof(value->'character')='object' then jsonb_set(value,'{character}',private.ultra_luxe_project_hero_v1(value->'character',grants)) else value end order by ord),'[]'::jsonb)
   into roster from jsonb_array_elements(s->'otherCharacters') with ordinality t(value,ord);
  s:=jsonb_set(s,'{otherCharacters}',roster);
 end if;
 return s;
end $state$;

create function private.ultra_luxe_project_response_v1(r jsonb, grants jsonb)
returns jsonb language sql immutable security invoker set search_path='' as $response$
 select case when jsonb_typeof(r->'state')='object' then jsonb_set(r,'{state}',private.ultra_luxe_project_state_v1(r->'state',grants)) else r end
$response$;

create function public.load_online_game_ultra_luxe_v1(p_account_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $load$
declare grants jsonb; result jsonb;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ultra-luxe-account:'||p_account_id::text,0));
 grants:=public.ultra_luxe_grants_server_v1(p_account_id);
 result:=public.load_online_game_server_v1(p_account_id);
 return private.ultra_luxe_project_response_v1(result,grants)||jsonb_build_object('ultraLuxeCollectionIds',grants);
end $load$;

create function public.read_online_game_receipt_ultra_luxe_v1(p_account_id uuid,p_request_id text)
returns jsonb language plpgsql security invoker set search_path='' as $receipt$
declare r jsonb; grants jsonb;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ultra-luxe-account:'||p_account_id::text,0));
 grants:=public.ultra_luxe_grants_server_v1(p_account_id);
 r:=public.read_online_game_receipt_server_v1(p_account_id,p_request_id);
 if r is null then return null;end if;
 return jsonb_set(r,'{response}',private.ultra_luxe_project_response_v1(r->'response',grants));
end $receipt$;

create function public.commit_online_game_ultra_luxe_v1(p_account_id uuid,p_expected_version bigint,p_expected_gold bigint,p_request_id text,p_request_hash text,p_response jsonb,p_contributions jsonb,p_expected_grants jsonb,p_deleted_character_id uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $commit$
declare grants jsonb; r jsonb;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ultra-luxe-account:'||p_account_id::text,0));
 grants:=public.ultra_luxe_grants_server_v1(p_account_id);
 if grants is distinct from p_expected_grants then raise exception 'stale_state_ultra_luxe_grants';end if;
 r:=public.commit_online_game_guild_pve_v1(p_account_id,p_expected_version,p_expected_gold,p_request_id,p_request_hash,private.ultra_luxe_project_response_v1(p_response,grants),p_contributions,p_deleted_character_id);
 return private.ultra_luxe_project_response_v1(r,grants);
end $commit$;

revoke all on function private.ultra_luxe_project_hero_v1(jsonb,jsonb),private.ultra_luxe_project_state_v1(jsonb,jsonb),private.ultra_luxe_project_response_v1(jsonb,jsonb) from public,anon,authenticated;
grant execute on function private.ultra_luxe_project_hero_v1(jsonb,jsonb),private.ultra_luxe_project_state_v1(jsonb,jsonb),private.ultra_luxe_project_response_v1(jsonb,jsonb) to service_role;
revoke all on function public.load_online_game_ultra_luxe_v1(uuid),public.read_online_game_receipt_ultra_luxe_v1(uuid,text),public.commit_online_game_ultra_luxe_v1(uuid,bigint,bigint,text,text,jsonb,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.load_online_game_ultra_luxe_v1(uuid),public.read_online_game_receipt_ultra_luxe_v1(uuid,text),public.commit_online_game_ultra_luxe_v1(uuid,bigint,bigint,text,text,jsonb,jsonb,jsonb,uuid) to service_role;

-- Public profile filtering happens AFTER the existing authenticated visibility and block gates.
-- No collection ownership list is exposed to another player.
create function private.ultra_luxe_project_public_v1(p_account_id uuid,p_profile jsonb)
returns jsonb language plpgsql stable security invoker set search_path='' as $public_profile$
declare
 g jsonb; hero jsonb; projected jsonb; allowed_ids text[]:=array[]::text[]; showcase jsonb;
 field text; output_field text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if jsonb_typeof(p_profile) is distinct from 'object' then return p_profile;end if;
 g:=public.ultra_luxe_grants_server_v1(p_account_id);
 hero:=jsonb_build_object('classId',p_profile#>>'{character,classId}',
  'profileTitle',p_profile->>'title','profileBackgroundId',p_profile->>'backgroundId',
  'profileBorderId',p_profile->>'borderId','selectedCosmeticPetId',p_profile->>'petId',
  'profileIconId',p_profile#>>'{character,profileIconId}');
 projected:=private.ultra_luxe_project_hero_v1(hero,g);
 foreach field in array array['profileTitle','profileBackgroundId','profileBorderId','selectedCosmeticPetId'] loop
  output_field:=case field when 'profileTitle' then 'title' when 'profileBackgroundId' then 'backgroundId' when 'profileBorderId' then 'borderId' else 'petId' end;
  if projected->field is distinct from hero->field then
   p_profile:=jsonb_set(p_profile,array[output_field],coalesce(projected->field,'null'::jsonb));
  end if;
 end loop;
 if projected->'profileIconId' is distinct from hero->'profileIconId' then
  p_profile:=jsonb_set(p_profile,'{character,profileIconId}',coalesce(projected->'profileIconId','null'::jsonb));
 end if;
 p_profile:=(p_profile-'ultraLuxeTitleId'-'ultraLuxeAppearanceVerified')||jsonb_build_object('ultraLuxeAppearanceVerified',true);
 if g ? 'ascendant-celestial-sovereign' and p_profile->>'title'='Sovereign of the Stars' then
  p_profile:=p_profile||jsonb_build_object('ultraLuxeTitleId','ascendant-celestial-title');
 elsif g ? 'ascendant-draconic-dominion' and p_profile->>'title'='Dragon Sovereign' then
  p_profile:=p_profile||jsonb_build_object('ultraLuxeTitleId','ascendant-draconic-title');
 elsif g ? 'ascendant-abyssal-majesty' and p_profile->>'title'='Monarch of the Deep' then
  p_profile:=p_profile||jsonb_build_object('ultraLuxeTitleId','ascendant-abyssal-title');
 elsif g ? 'ascendant-paradox-eternal' and p_profile->>'title'='Beyond Existence' then
  p_profile:=p_profile||jsonb_build_object('ultraLuxeTitleId','ascendant-paradox-title');
 end if;
 if g ? 'ascendant-celestial-sovereign' then allowed_ids:=allowed_ids||array['ascendant-celestial-astral-sanctum','ascendant-celestial-crown-of-the-cosmos','ascendant-celestial-aetherion','ascendant-celestial-crown-icon'];end if;
 if g ? 'ascendant-draconic-dominion' then allowed_ids:=allowed_ids||array['ascendant-draconic-dominion-of-ash','ascendant-draconic-throne-of-embers','ascendant-draconic-vharaxis','ascendant-draconic-ruby-icon'];end if;
 if g ? 'ascendant-abyssal-majesty' then allowed_ids:=allowed_ids||array['ascendant-abyssal-forgotten-abyss','ascendant-abyssal-crown-of-the-depths','ascendant-abyssal-nhalzuun'];end if;
 if g ? 'ascendant-paradox-eternal' then allowed_ids:=allowed_ids||array['ascendant-paradox-beyond-the-veil','ascendant-paradox-fractured-eternity','ascendant-paradox-aeon'];end if;
 if jsonb_typeof(p_profile->'collectionShowcase')='array' then
  select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into showcase
  from jsonb_array_elements(p_profile->'collectionShowcase') with ordinality t(value,ord)
  where coalesce(left(value->>'id',10),'') not in ('ascendant-','ascendant_') or value->>'id'=any(allowed_ids);
  p_profile:=jsonb_set(p_profile,'{collectionShowcase}',showcase);
 end if;
 if left(p_profile->>'effectId',10) in ('ascendant-','ascendant_') then p_profile:=jsonb_set(p_profile,'{effectId}','null'::jsonb);end if;
 return p_profile;
end $public_profile$;
revoke all on function private.ultra_luxe_project_public_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function private.ultra_luxe_project_public_v1(uuid,jsonb) to service_role;

-- Guarded edits of the existing definer entrypoints, preserving their original ACLs,
-- visibility, character ownership and block checks. Fail on function shape drift.
do $patch_public$
declare v_def text; v_old text; v_new text; v_tail text; v_sig regprocedure;
begin
 foreach v_sig in array array['public.profile_public_v43(uuid)'::regprocedure,'public.profile_character_public_v1(uuid,uuid)'::regprocedure] loop
  v_def:=replace(pg_get_functiondef(v_sig),chr(13),'');
  if position('private.ultra_luxe_project_public_v1(p_target_account_id,' in v_def)>0 then continue;end if;
  if v_sig='public.profile_public_v43(uuid)'::regprocedure then
   if position('auth.uid()' in v_def)=0 or position('public.player_blocks' in v_def)=0 or position('if not v_allowed then return null' in v_def)=0 then raise exception 'ULTRA_LUXE_PROFILE_PRIVACY_DRIFT';end if;
   v_old:='return jsonb_build_object(';
   v_new:='return private.ultra_luxe_project_public_v1(p_target_account_id,jsonb_build_object(';
  else
   if position('v_base:=public.profile_public_v43(p_target_account_id)' in v_def)=0 or position('if v_base is null then return null' in v_def)=0 or position('c.account_id=p_target_account_id' in v_def)=0 then raise exception 'ULTRA_LUXE_CHARACTER_PRIVACY_DRIFT';end if;
   v_old:='return v_base || jsonb_build_object(';
   v_new:='return private.ultra_luxe_project_public_v1(p_target_account_id,v_base || jsonb_build_object(';
  end if;
  if length(v_def)-length(replace(v_def,v_old,''))<>length(v_old) then raise exception 'ULTRA_LUXE_PROFILE_RETURN_DRIFT';end if;
  v_tail:=substring(v_def from $rx$\);[[:space:]]*end[[:space:]]*\$function\$[[:space:]]*$rx$);
  if v_tail is null then raise exception 'ULTRA_LUXE_PROFILE_TAIL_DRIFT';end if;
  v_def:=replace(v_def,v_old,v_new);
  v_def:=left(v_def,length(v_def)-length(v_tail))||')'||v_tail;
  -- The legacy base response did not project profile icons in all server versions.
  if v_sig='public.profile_public_v43(uuid)'::regprocedure and position('''profileIconId''' in substring(v_def from position(v_new in v_def)))=0 then
   v_old:='''selectedSkinId'',coalesce(v_character->>''selectedSkinId'',''starting''))';
   if position(v_old in v_def)=0 then raise exception 'ULTRA_LUXE_LEGACY_ICON_DRIFT';end if;
   v_def:=replace(v_def,v_old,'''profileIconId'',coalesce(nullif(v_character->>''profileIconId'',''''),''class:''||coalesce(v_character->>''classId'',''IRONWARDEN'')), '||v_old);
  end if;
  execute v_def;
 end loop;
end $patch_public$;

-- Verified private name selection: only preset IDs, never client color stops.
create table private.ultra_luxe_name_selection_v1(
 account_id uuid primary key references auth.users(id) on delete cascade,
 preset_id text not null check(preset_id in ('ascendant-celestial-name','ascendant-draconic-name'))
);
alter table private.ultra_luxe_name_selection_v1 enable row level security;
revoke all on private.ultra_luxe_name_selection_v1 from public,anon,authenticated;
create function private.ultra_luxe_owned_names_v1(p_account_id uuid) returns text[]
language sql stable security invoker set search_path='' as $names$
 select coalesce(array_agg(case collection_id when 'ascendant-celestial-sovereign' then 'ascendant-celestial-name' when 'ascendant-draconic-dominion' then 'ascendant-draconic-name' end order by collection_id),array[]::text[])
 from private.ultra_luxe_collection_grants_v1 where account_id=p_account_id and revoked_at is null and collection_id in ('ascendant-celestial-sovereign','ascendant-draconic-dominion')
$names$;
create function private.ultra_luxe_selected_name_v1(p_account_id uuid) returns text
language sql stable security invoker set search_path='' as $selected$
 select preset_id from private.ultra_luxe_name_selection_v1 where account_id=p_account_id and preset_id=any(private.ultra_luxe_owned_names_v1(p_account_id))
$selected$;
create function private.ultra_luxe_name_style_v1(p_account_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $style$
 select case private.ultra_luxe_selected_name_v1(p_account_id)
 when 'ascendant-celestial-name' then '{"mode":"gradient","gradientColors":["#F3C86F","#FFF4D9","#D6E8FF"],"animation":"flow","ultraLuxePresetId":"ascendant-celestial-name"}'::jsonb
 when 'ascendant-draconic-name' then '{"mode":"gradient","gradientColors":["#FF9460","#FFE0A1","#EE6651"],"animation":"flow","ultraLuxePresetId":"ascendant-draconic-name"}'::jsonb else null end
$style$;
revoke all on function private.ultra_luxe_owned_names_v1(uuid),private.ultra_luxe_selected_name_v1(uuid),private.ultra_luxe_name_style_v1(uuid) from public,anon,authenticated;

create function public.ultra_luxe_name_self_v1() returns jsonb
language plpgsql stable security definer set search_path='' as $self$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('accountId',uid,'ownedIds',private.ultra_luxe_owned_names_v1(uid),'selectedId',private.ultra_luxe_selected_name_v1(uid));
end $self$;
create function public.ultra_luxe_name_select_v1(p_preset_id text default null) returns jsonb
language plpgsql security definer set search_path='' as $select$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ultra-luxe-account:'||uid::text,0));
 if p_preset_id is null then
  delete from private.ultra_luxe_name_selection_v1 where account_id=uid;
 else
  if not (p_preset_id=any(private.ultra_luxe_owned_names_v1(uid))) then raise exception 'ULTRA_LUXE_NAME_NOT_OWNED';end if;
  insert into private.ultra_luxe_name_selection_v1(account_id,preset_id) values(uid,p_preset_id)
  on conflict(account_id) do update set preset_id=excluded.preset_id;
 end if;
 return public.ultra_luxe_name_self_v1();
end $select$;
revoke all on function public.ultra_luxe_name_self_v1(),public.ultra_luxe_name_select_v1(text) from public,anon,authenticated;
grant execute on function public.ultra_luxe_name_self_v1(),public.ultra_luxe_name_select_v1(text) to authenticated;

-- Reuse the existing badge authority and canonical IDs. Independent historical
-- manual badge grants remain valid; the new collection entitlement adds no row
-- to the legacy grant table and does not auto-equip a badge.
do $badge_patch$
declare d text; old text:=' ) unlocked;'; new text:=$union$
  union
  select case collection_id when 'ascendant-celestial-sovereign' then 'ascendant_sovereign_of_stars' when 'ascendant-draconic-dominion' then 'ascendant_dragon_sovereign' when 'ascendant-abyssal-majesty' then 'ascendant_monarch_of_deep' when 'ascendant-paradox-eternal' then 'ascendant_beyond_existence' end,6
  from private.ultra_luxe_collection_grants_v1 where account_id=p_account_id and revoked_at is null
 ) unlocked;$union$;
begin
 d:=replace(pg_get_functiondef('private.player_badge_unlocks_v1(uuid)'::regprocedure),chr(13),'');
 if position('private.ultra_luxe_collection_grants_v1' in d)=0 then
  if length(d)-length(replace(d,old,''))<>length(old) then raise exception 'ULTRA_LUXE_BADGE_UNLOCK_DRIFT';end if;
  execute replace(d,old,new);
 end if;
end $badge_patch$;

-- Keep legacy VIP+/Supporter preference unchanged; selected private name wins
-- only while its grant is active. Existing v2 reads use this same name source.
do $social_patch$
declare d text; old text:=$old$g.tag_color_id,
    case$old$; new text:=$new$g.tag_color_id,
    coalesce(private.ultra_luxe_name_style_v1(ids.account_id),case$new$;
begin
 d:=replace(pg_get_functiondef('public.guild_identities(uuid[])'::regprocedure),chr(13),'');
 if position('private.ultra_luxe_name_style_v1' in d)=0 then
  if position('where auth.uid() is not null' in d)=0 or length(d)-length(replace(d,old,''))<>length(old) or position(E'    end\n  from unnest' in d)=0 then raise exception 'ULTRA_LUXE_SOCIAL_DRIFT';end if;
  d:=replace(d,old,new);d:=replace(d,E'    end\n  from unnest',E'    end)\n  from unnest');execute d;
 end if;
end $social_patch$;

-- Do not let a revoked preset auto-activate on later regrant.
create function private.ultra_luxe_revoke_selection_v1() returns trigger
language plpgsql security definer set search_path='' as $revoke$
declare badge text; preset text;
begin
 if old.revoked_at is null and new.revoked_at is not null then
  badge:=case new.collection_id when 'ascendant-celestial-sovereign' then 'ascendant_sovereign_of_stars' when 'ascendant-draconic-dominion' then 'ascendant_dragon_sovereign' when 'ascendant-abyssal-majesty' then 'ascendant_monarch_of_deep' when 'ascendant-paradox-eternal' then 'ascendant_beyond_existence' end;
  preset:=case new.collection_id when 'ascendant-celestial-sovereign' then 'ascendant-celestial-name' when 'ascendant-draconic-dominion' then 'ascendant-draconic-name' end;
  if preset is not null then delete from private.ultra_luxe_name_selection_v1 where account_id=new.account_id and preset_id=preset;end if;
  if not exists(select 1 from private.player_collectible_badges_v1 where account_id=new.account_id and badge_id=badge) then
   update private.player_badge_preferences_v1 set equipped_badge_id=case when equipped_badge_id=badge then 'none' else equipped_badge_id end,
    featured_badge_ids=array_remove(featured_badge_ids,badge),profile_badge_ids=array_remove(profile_badge_ids,badge)
   where account_id=new.account_id and (equipped_badge_id=badge or badge=any(featured_badge_ids) or badge=any(profile_badge_ids));
  end if;
 end if;
 return new;
end $revoke$;
revoke all on function private.ultra_luxe_revoke_selection_v1() from public,anon,authenticated;
create trigger ultra_luxe_revoke_selection_v1 after update of revoked_at on private.ultra_luxe_collection_grants_v1 for each row execute function private.ultra_luxe_revoke_selection_v1();

commit;
-- Before migration: verify service_role permissions (including auth.users read),
-- RLS/execute privileges, no-op audit behavior, pair serialization, revocation,
-- receipt replay sanitization, and existing profile privacy/block enforcement.
