-- Party recruitment matching subscriptions.
-- The mobile client polls this authenticated RPC; push delivery can be layered on later.
create table if not exists public.recruitment_alert_subscriptions (
  account_id uuid primary key references auth.users(id) on delete cascade,
  filters jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  last_checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recruitment_alert_subscriptions enable row level security;
drop policy if exists recruitment_alert_subscriptions_owner on public.recruitment_alert_subscriptions;
create policy recruitment_alert_subscriptions_owner on public.recruitment_alert_subscriptions
  for all to authenticated
  using (account_id = auth.uid())
  with check (account_id = auth.uid());

revoke all on public.recruitment_alert_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.recruitment_alert_subscriptions to authenticated;

create or replace function public.validate_recruitment_matching_v1()
returns trigger language plpgsql security invoker set search_path=public as $$
declare tag text; count_value integer;
begin
  foreach tag in array coalesce(new.availability_tags,'{}') loop
    if tag like 'at:%' and substring(tag from 4) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}' then
      raise exception 'invalid_recruitment_start_time';
    end if;
  end loop;
  foreach tag in array coalesce(new.playstyle_tags,'{}') loop
    if tag like 'need:%' then
      begin count_value := (split_part(tag,':',3))::integer; exception when others then raise exception 'invalid_recruitment_role_count'; end;
      if split_part(tag,':',2) not in ('tank','damage','support') or count_value not between 1 and 4 then raise exception 'invalid_recruitment_role_count'; end if;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists validate_recruitment_matching_v1 on public.recruitment_posts;
create trigger validate_recruitment_matching_v1 before insert or update on public.recruitment_posts
for each row execute function public.validate_recruitment_matching_v1();
revoke all on function public.validate_recruitment_matching_v1() from public,anon,authenticated;

create or replace function public.set_recruitment_alert_subscription_v1(p_filters jsonb default '{}', p_enabled boolean default true)
returns public.recruitment_alert_subscriptions
language plpgsql security invoker set search_path=public
as $$
declare v public.recruitment_alert_subscriptions;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  insert into public.recruitment_alert_subscriptions(account_id,filters,enabled,updated_at)
  values(auth.uid(),coalesce(p_filters,'{}'::jsonb),coalesce(p_enabled,true),now())
  on conflict(account_id) do update set filters=excluded.filters,enabled=excluded.enabled,updated_at=now()
  returning * into v;
  return v;
end $$;

create or replace function public.recruitment_match_alerts_v1(p_limit integer default 20)
returns jsonb
language sql security invoker set search_path=public
as $$
with subscription as (
  select * from public.recruitment_alert_subscriptions where account_id=auth.uid() and enabled
), matches as (
  select p.*, coalesce(pp.display_name,'Adventurer') owner_name, g.name guild_name,
    case when p.post_type='party_recruiting' then greatest(0,4-(select count(*) from public.party_members m where m.party_id=p.party_id and m.left_at is null)) else null end actual_open_spots
  from public.recruitment_posts p
  left join public.player_profiles pp on pp.account_id=p.owner_account_id
  left join public.guilds g on g.id=p.guild_id
  cross join subscription s
  where auth.uid() is not null and p.owner_account_id<>auth.uid() and p.status='active' and p.expires_at>now() and p.created_at>s.last_checked_at
    and public.recruitment_scope_valid_v16(p)
    and (coalesce(jsonb_array_length(s.filters->'postTypes'),0)=0 or p.post_type in (select jsonb_array_elements_text(s.filters->'postTypes')))
    and (coalesce(jsonb_array_length(s.filters->'focuses'),0)=0 or p.focus in (select jsonb_array_elements_text(s.filters->'focuses')))
    and (coalesce(jsonb_array_length(s.filters->'roles'),0)=0 or p.roles && array(select jsonb_array_elements_text(s.filters->'roles')))
    and (coalesce(jsonb_array_length(s.filters->'activityTags'),0)=0 or p.activity_tags && array(select jsonb_array_elements_text(s.filters->'activityTags')))
    and (not coalesce((s.filters->>'requireOpenPartySpot')::boolean,false) or p.post_type<>'party_recruiting' or (select count(*) from public.party_members m where m.party_id=p.party_id and m.left_at is null)<4)
  order by p.created_at desc,p.id
  limit greatest(1,least(coalesce(p_limit,20),50))
)
select coalesce(jsonb_agg(to_jsonb(matches)),'[]'::jsonb) from matches;
$$;

create or replace function public.ack_recruitment_match_alerts_v1()
returns void language sql security invoker set search_path=public as $$
  update public.recruitment_alert_subscriptions set last_checked_at=now(),updated_at=now() where account_id=auth.uid();
$$;

revoke all on function public.set_recruitment_alert_subscription_v1(jsonb,boolean),public.recruitment_match_alerts_v1(integer),public.ack_recruitment_match_alerts_v1() from public,anon;
grant execute on function public.set_recruitment_alert_subscription_v1(jsonb,boolean),public.recruitment_match_alerts_v1(integer),public.ack_recruitment_match_alerts_v1() to authenticated;
