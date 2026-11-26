-- NON-EXECUTABLE RELEASE DRAFT: normal account ownership, not commerce.
-- Keep approval false until certified client AND server build, public projection
-- migration, authenticated equip/persistence tests and device QA are verified.
-- One-time operator transaction; no new RPC, entitlement or public permission.
begin;
do $wave2_grant$
declare
  v_release_approved constant boolean := false;
  v_target constant text := 'IScaredMeAHat';
  v_matches uuid[];
  v_account_id uuid;
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
  -- Match the profile first, not merely loaded states. Ambiguity aborts.
  select array_agg(distinct p.account_id) into v_matches
    from public.player_profiles p
    where lower(p.social_name)=lower(v_target) or lower(p.display_name)=lower(v_target);
  if coalesce(cardinality(v_matches),0) <> 1 then raise exception 'WAVE2_TARGET_NOT_UNIQUE';end if;
  v_account_id:=v_matches[1];
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
  raise notice 'Wave 2 grant: added %, revision %',v_added,v_after_revision;
end
$wave2_grant$;
commit;
