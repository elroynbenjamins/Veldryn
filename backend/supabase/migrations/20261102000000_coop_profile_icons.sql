-- Current public-profile cosmetics for identities already visible in co-op.
-- The CLI-generated migration is ordered after the repository's forward-dated
-- profile-icon migration. No gameplay snapshot, hash, or owner ID is published.
begin;

-- Owner mappings remain in a non-exposed schema. This helper needs privileged
-- reads of server-only rosters, so each scope authorizes the signed-in viewer
-- before resolving any public profile. The caller cannot supply an account ID.
create or replace function private.coop_profile_icons_v1(p_scope text, p_ids uuid[])
returns table(subject_id uuid, profile_icon_id text, icon_class_id text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_viewer uuid := auth.uid();
  v_context_id uuid;
  v_roster jsonb;
  v_now timestamptz := statement_timestamp();
begin
  if v_viewer is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;
  if p_scope is null or p_scope not in ('run', 'ready', 'lfg')
    or p_ids is null or cardinality(p_ids) > 100
    or coalesce(array_ndims(p_ids), 1) <> 1 then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  if array_position(p_ids, null) is not null then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  if p_scope in ('run', 'ready') then
    if cardinality(p_ids) <> 1 then
      raise exception 'invalid_request' using errcode = '22023';
    end if;
    v_context_id := p_ids[array_lower(p_ids, 1)];
  end if;

  if p_scope = 'run' then
    -- Match the existing client-snapshot RLS, including completed runs whose
    -- access remains active. Echo ownership never grants participant access.
    if not exists (
      select 1
      from public.coop_run_access_memberships a
      join public.expedition_runs r on r.id = a.run_id
      where a.run_id = v_context_id and a.account_id = v_viewer and a.active
        and r.coop_mode in ('live', 'qmode', 'event')
    ) then
      raise exception 'NOT_PARTICIPANT' using errcode = '42501';
    end if;

    return query
      select m.character_id,
        profile.document #>> '{character,profileIconId}',
        profile.document #>> '{character,classId}'
      from public.expedition_run_members m
      cross join lateral public.profile_public_v43(
        coalesce(m.source_account_id, m.account_id)
      ) as profile(document)
      where m.run_id = v_context_id
      order by m.slot_id, m.character_id;
    return;
  end if;

  if p_scope = 'ready' then
    -- Use the same roster-membership rule as online_live_ready_state_server_v1.
    -- Reading cosmetics must not expire, refill, or otherwise change the check.
    select c.roster_json into v_roster
    from public.coop_ready_checks c where c.id = v_context_id;
    if not found or not exists (
      select 1 from jsonb_array_elements(v_roster) as member(document)
      where member.document ->> 'accountId' = v_viewer::text
    ) then
      raise exception 'NOT_PARTICIPANT' using errcode = '42501';
    end if;

    return query
      select (member.document ->> 'characterId')::uuid,
        profile.document #>> '{character,profileIconId}',
        profile.document #>> '{character,classId}'
      from jsonb_array_elements(v_roster) as member(document)
      cross join lateral public.profile_public_v43(
        (member.document ->> 'accountId')::uuid
      ) as profile(document);
    return;
  end if;

  if cardinality(p_ids) = 0 then return; end if;
  -- Preserve browse_online_coop_lfg_server_v1's discovery window. Apply its
  -- first-50 limit before the game-state join and the requested-ID filter;
  -- looking up a post cannot discover extra, expired, or closed recruitment.
  return query
    with visible_posts as materialized (
      select p.id, p.owner_account_id, p.expires_at, p.created_at
      from public.online_coop_lfg_posts p
      where p.closed_at is null and p.expires_at > v_now
      order by p.expires_at, p.created_at
      limit 50
    )
    select p.id,
      profile.document #>> '{character,profileIconId}',
      profile.document #>> '{character,classId}'
    from visible_posts p
    join public.online_game_states g on g.account_id = p.owner_account_id
    cross join lateral public.profile_public_v43(p.owner_account_id) as profile(document)
    where p.id = any(p_ids)
    order by p.expires_at, p.created_at;
end;
$$;

-- The SQL-standard body binds the private helper at creation time. Its caller
-- needs EXECUTE on the helper, without any new USAGE or table grants on private.
create or replace function public.coop_profile_icons_v1(p_scope text, p_ids uuid[])
returns table(subject_id uuid, profile_icon_id text, icon_class_id text)
language sql
volatile
security invoker
set search_path = ''
begin atomic
  select icons.subject_id, icons.profile_icon_id, icons.icon_class_id
  from private.coop_profile_icons_v1(p_scope, p_ids) as icons;
end;

revoke all on function private.coop_profile_icons_v1(text, uuid[]) from public, anon, authenticated, service_role;
revoke all on function public.coop_profile_icons_v1(text, uuid[]) from public, anon, authenticated, service_role;
grant execute on function private.coop_profile_icons_v1(text, uuid[]) to authenticated;
grant execute on function public.coop_profile_icons_v1(text, uuid[]) to authenticated;

comment on function public.coop_profile_icons_v1(text, uuid[]) is
  'Authenticated public-profile cosmetics for authorized run/ready members or existing visible LFG posts. Subject IDs identify characters for run/ready and posts for lfg. NULL metadata preserves profile privacy; icon_class_id does not change frozen combat class.';

commit;
