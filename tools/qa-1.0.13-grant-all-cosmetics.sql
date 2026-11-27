-- STAGING QA ONLY: use Supabase project iqfmmpvwanvvmxcftfxw, never production.
-- Grant six premium collections plus 16 Wave 2 items to exactly one confirmed
-- disposable account. No preview entitlement, checkout or auto-equip.
-- Default refuses execution. Operator must explicitly set approval, UUID, email
-- and change final ROLLBACK to COMMIT after readback and staging login.
begin;
do $wave2_grant$
declare
  v_release_approved constant boolean := false;
  v_account_id constant uuid := null;
  v_target_email constant text := 'REPLACE@example.invalid';
  v_collection text;
  v_grants jsonb;
  v_expected_grants constant jsonb := '["ascendant-abyssal-majesty","ascendant-celestial-sovereign","ascendant-draconic-dominion","ascendant-paradox-eternal","ascendant-sakura-enchantment","ascendant-stormforged-sovereign"]'::jsonb;
  g public.online_game_states%rowtype;
  v_state jsonb;
  v_account jsonb;
  v_field text;
  v_ids text[];
  v_id text;
  v_owned jsonb;
  v_added integer := 0;
  v_after_revision bigint;
begin
  if not v_release_approved then raise exception 'WAVE2_RELEASE_NOT_APPROVED'; end if;
  if current_user <> 'postgres' then raise exception 'WAVE2_OPERATOR_REQUIRED'; end if;
  if v_account_id is null or lower(v_target_email) not like '%@example.invalid'
     or not exists(select 1 from auth.users u where u.id=v_account_id and lower(u.email)=lower(v_target_email)
       and u.email_confirmed_at is not null and nullif(u.encrypted_password,'') is not null) then
    raise exception 'QA_CONFIRMED_DISPOSABLE_ACCOUNT_REQUIRED';
  end if;
  -- Same account lock used by premium/gameplay commit RPCs. Acquire before
  -- locking game state to keep lock ordering consistent.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ultra-luxe-account:'||v_account_id::text,0));
  select * into g from public.online_game_states where account_id=v_account_id for update;
  if not found or g.revision is null or jsonb_typeof(g.state->'account') is distinct from 'object' then
    raise exception 'WAVE2_INVALID_AUTHORITATIVE_STATE';
  end if;
  v_state:=g.state;
  v_account:=v_state->'account';
  for v_field,v_ids in select * from (values
    ('unlockedProfileBorderIds',array['cosmetic:tideborne:pearlframe','cosmetic:clockwork:mechanism','cosmetic:stormforged:thunderframe','cosmetic:crimson-oath:oathguard']::text[]),
    ('unlockedProfileEffectIds',array['effect_tideborne_tidal_reverie','effect_clockwork_aetherwork_pulse','effect_stormforged_static_surge','effect_crimson_oath_scarlet_reverence']::text[]),
    ('unlockedProfileIconIds',array['cosmetic:tideborne:portrait-siren','cosmetic:tideborne:portrait-corsair','cosmetic:clockwork:portrait-artificer','cosmetic:clockwork:portrait-engineer','cosmetic:stormforged:portrait-tempest','cosmetic:stormforged:portrait-sentinel','cosmetic:crimson-oath:portrait-justicar','cosmetic:crimson-oath:portrait-knight']::text[])
  ) as grant_fields(field,ids)
  loop
    v_owned:=coalesce(v_account->v_field,'[]'::jsonb);
    if jsonb_typeof(v_owned) is distinct from 'array' then raise exception 'WAVE2_INVALID_OWNERSHIP_ARRAY: %',v_field;end if;
    if exists(select 1 from jsonb_array_elements(v_owned) e where jsonb_typeof(e.value)<>'string') then raise exception 'WAVE2_INVALID_OWNERSHIP_ELEMENT: %',v_field;end if;
    foreach v_id in array v_ids loop
      if not(v_owned @> jsonb_build_array(v_id)) then
        v_owned:=v_owned||jsonb_build_array(v_id);
        v_added:=v_added+1;
      end if;
    end loop;
    v_account:=jsonb_set(v_account,array[v_field],v_owned,true);
  end loop;
  if v_added>0 then
    v_state:=jsonb_set(v_state,'{account}',v_account,false);
    update public.online_game_states set state=v_state,revision=revision+1,updated_at=now()
      where account_id=v_account_id and revision=g.revision returning revision into v_after_revision;
    if not found or v_after_revision<>g.revision+1 then raise exception 'WAVE2_REVISION_CONFLICT';end if;
  else
    v_after_revision:=g.revision;
  end if;
  -- No auto-equip; verify exact authoritative state after update, including
  -- unchanged character, inventory, entitlement and unrelated account fields.
  if not exists(select 1 from public.online_game_states s where s.account_id=v_account_id
       and s.revision=v_after_revision and s.state=v_state) then raise exception 'WAVE2_READBACK_MISMATCH';end if;
  for v_collection in select jsonb_array_elements_text(v_expected_grants) loop
    perform public.set_ultra_luxe_grant_server_v1(v_account_id,v_collection,true,'Staging 1.0.13 owner cosmetic QA');
  end loop;
  v_grants:=public.ultra_luxe_grants_server_v1(v_account_id);
  if v_grants is distinct from v_expected_grants then raise exception 'QA_PREMIUM_GRANT_READBACK_MISMATCH'; end if;
  raise notice 'Staging QA: added % standard pieces, revision %, six premium grants verified',v_added,v_after_revision;
end
$wave2_grant$;
rollback;
