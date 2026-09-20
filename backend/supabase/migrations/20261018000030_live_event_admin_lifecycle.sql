begin;

-- Reconcile the player-facing annual/general event registry with the Live-Ops
-- control plane. A normal event end preserves claims; enabled=false remains the
-- emergency master switch and therefore closes both visibility and claims.
create index if not exists live_events_admin_window_idx
  on public.live_events(enabled, starts_at, ends_at, priority desc);


-- Keep the single-player-event presentation invariant inside Postgres as well
-- as in the Control Center API. The advisory transaction lock serializes event
-- window mutations so two operators cannot race past the preflight check.
create or replace function public.enforce_single_visible_live_event()
returns trigger
language plpgsql
set search_path=public
as $
declare
  v_visible_end timestamptz;
  v_conflict text;
begin
  if not coalesce(new.enabled,false) or new.starts_at is null or new.ends_at is null then
    return new;
  end if;

  if new.ends_at<=new.starts_at then
    raise exception 'player_event_end_before_start';
  end if;

  v_visible_end:=coalesce(
    new.grace_ends_at,
    new.ends_at+make_interval(days=>coalesce((new.config->>'claimGraceDays')::integer,7))
  );

  if v_visible_end<new.ends_at then
    raise exception 'player_event_grace_before_end';
  end if;

  perform pg_advisory_xact_lock(hashtext('veldryn:single-visible-live-event'));

  select e.event_id
    into v_conflict
  from public.live_events e
  where e.enabled
    and e.event_id<>new.event_id
    and e.starts_at is not null
    and e.ends_at is not null
    and new.starts_at < coalesce(
      e.grace_ends_at,
      e.ends_at+make_interval(days=>coalesce((e.config->>'claimGraceDays')::integer,7))
    )
    and e.starts_at < v_visible_end
  order by e.priority desc,e.event_id
  limit 1;

  if v_conflict is not null then
    raise exception 'player_event_visibility_overlap:%',v_conflict;
  end if;

  return new;
end $;

drop trigger if exists live_events_single_visible_guard on public.live_events;
create trigger live_events_single_visible_guard
before insert or update of enabled,starts_at,ends_at,grace_ends_at,config
on public.live_events
for each row
execute function public.enforce_single_visible_live_event();

create or replace function public.event_claim_open(p_event_id text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.live_events e
    where e.event_id=p_event_id
      and e.enabled
      and (e.starts_at is null or e.starts_at<=now())
      and (
        e.ends_at is null
        or coalesce(
          e.grace_ends_at,
          e.ends_at+make_interval(days=>coalesce((e.config->>'claimGraceDays')::integer,7))
        )>now()
      )
  );
$$;

revoke all on function public.event_claim_open(text) from public;
grant execute on function public.event_claim_open(text) to authenticated;

-- Authoritative gameplay snapshots now carry the exact server claim boundary and
-- presentation metadata instead of making the client reconstruct it.
create or replace function public.load_online_game_server_v1(p_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  g public.online_game_states;
  v_event jsonb;
  v_community jsonb;
  v_gold bigint;
begin
  if not exists(select 1 from auth.users where id=p_account_id) then
    raise exception 'account_not_found';
  end if;

  insert into public.online_game_states(account_id) values(p_account_id) on conflict do nothing;
  select * into g from public.online_game_states where account_id=p_account_id;

  if g.character_id is not null then
    select gold into v_gold from public.character_wallets where character_id=g.character_id;
  end if;

  select jsonb_build_object(
    'eventId',e.event_id,
    'enabled',true,
    'startsAtMs',floor(extract(epoch from e.starts_at)*1000),
    'endsAtMs',floor(extract(epoch from e.ends_at)*1000),
    'graceEndsAtMs',case when coalesce(e.grace_ends_at,e.claim_ends_at) is null then null else floor(extract(epoch from coalesce(e.grace_ends_at,e.claim_ends_at))*1000) end,
    'priority',e.priority,
    'modules',to_jsonb(e.modules)
  )
  into v_event
  from public.visible_live_events() e
  where e.starts_at is not null and e.ends_at is not null
  limit 1;

  -- Reuse the existing contribution ledger; online progression never simulates
  -- community completion locally.
  select coalesce(
    jsonb_object_agg(
      e.event_id,
      least(100,floor(coalesce(t.total,0)*100/greatest(1,coalesce((e.config->>'communityGoal')::numeric,100000))))
    ),
    '{}'::jsonb
  )
  into v_community
  from public.live_events e
  left join lateral (
    select sum(quantity) as total
    from public.event_contributions
    where event_id=e.event_id
  ) t on true;

  return jsonb_build_object(
    'state',g.state,
    'version',g.revision,
    'characterId',g.character_id,
    'walletGold',v_gold,
    'serverNow',floor(extract(epoch from clock_timestamp())*1000),
    'guildMember',exists(select 1 from public.guild_members where account_id=p_account_id),
    'liveEvent',v_event,
    'communityProgress',v_community
  );
end $$;

revoke all on function public.load_online_game_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.load_online_game_server_v1(uuid) to service_role;

commit;
