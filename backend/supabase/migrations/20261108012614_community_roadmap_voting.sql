-- Community voting is separate from guild-project voting and gameplay progression.
-- Service-role staff tools manage which major expansions appear on the ballot.
create table if not exists public.community_roadmap_features (
 id text primary key check (id ~ '^[a-z][a-z0-9_]{2,48}$'),
 title text not null check (char_length(title) between 3 and 90),
 description text not null check (char_length(description) between 10 and 320),
 category text not null check (char_length(category) between 2 and 30),
 status text not null default 'considering' check (status in ('considering','planned','in_progress','released')),
 sort_order integer not null default 100,
 published boolean not null default false,
 release_version text,
 updated_at timestamptz not null default now()
);
create table if not exists public.community_roadmap_votes (
 account_id uuid not null references auth.users(id) on delete cascade,
 feature_id text not null references public.community_roadmap_features(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (account_id, feature_id)
);
create index if not exists community_roadmap_votes_feature_idx on public.community_roadmap_votes (feature_id);

alter table public.community_roadmap_features enable row level security;
alter table public.community_roadmap_votes enable row level security;
-- Only the explicitly granted, server-owned RPCs expose aggregate counts and
-- control voter writes. Clients cannot read another account's voting rows.
revoke all on public.community_roadmap_features from public, anon, authenticated;
revoke all on public.community_roadmap_votes from public, anon, authenticated;

create or replace function public.community_roadmap_snapshot()
returns jsonb
language sql stable security definer set search_path = ''
as $$
 select pg_catalog.jsonb_build_object(
   'features', coalesce((
     select pg_catalog.jsonb_agg(
       pg_catalog.jsonb_build_object(
         'id',f.id,'title',f.title,'description',f.description,
         'category',f.category,'status',f.status,'release_version',f.release_version,
         'votes',(select count(*) from public.community_roadmap_votes v where v.feature_id=f.id),
         'voted',exists(select 1 from public.community_roadmap_votes mine where mine.feature_id=f.id and mine.account_id=(select auth.uid()))
       ) order by f.sort_order,f.id
     )
     from public.community_roadmap_features f where f.published
   ),'[]'::jsonb),
   'votes_used',(select count(*) from public.community_roadmap_votes mine where mine.account_id=(select auth.uid())),
   'vote_limit',3
 );
$$;

create or replace function public.community_roadmap_toggle_vote(p_feature_id text)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
 v_account uuid := auth.uid();
 v_status text;
begin
 if v_account is null then
   raise exception 'Sign in to vote.' using errcode = '28000';
 end if;
 -- Serializes all vote operations for one account, including parallel devices.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_account::text,130903));
 select status into v_status from public.community_roadmap_features
 where id=p_feature_id and published for share;
 if v_status is null or v_status <> 'considering' then
   raise exception 'This expansion is not open for voting.' using errcode = '22023';
 end if;
 if exists(select 1 from public.community_roadmap_votes where account_id=v_account and feature_id=p_feature_id) then
   delete from public.community_roadmap_votes where account_id=v_account and feature_id=p_feature_id;
 else
   if (select count(*) from public.community_roadmap_votes where account_id=v_account)>=3 then
     raise exception 'All three votes are in use. Remove a vote to choose another expansion.' using errcode = '22023';
   end if;
   insert into public.community_roadmap_votes(account_id,feature_id) values(v_account,p_feature_id);
 end if;
 return public.community_roadmap_snapshot();
end;
$$;

-- Moving an idea out of consideration refunds every player's vote automatically.
create schema if not exists roadmap_internal;
create or replace function roadmap_internal.refund_community_votes()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if old.status='considering' and new.status<>'considering' then
   delete from public.community_roadmap_votes where feature_id=new.id;
 end if;
 return new;
end;
$$;
revoke all on function roadmap_internal.refund_community_votes() from public,anon,authenticated;
drop trigger if exists community_roadmap_refund_votes on public.community_roadmap_features;
create trigger community_roadmap_refund_votes
 after update of status on public.community_roadmap_features
 for each row execute function roadmap_internal.refund_community_votes();

revoke all on function public.community_roadmap_snapshot() from public, anon, authenticated;
revoke all on function public.community_roadmap_toggle_vote(text) from public, anon, authenticated;
grant execute on function public.community_roadmap_snapshot() to anon,authenticated;
grant execute on function public.community_roadmap_toggle_vote(text) to authenticated;

insert into public.community_roadmap_features
 (id,title,description,category,status,sort_order,published) values
 ('party_events','Party Events','Cooperative limited-time adventures with shared objectives, unique encounters and event rewards.','Co-op','considering',10,true),
 ('guild_pvp','Guild PvP','Guild-versus-guild competition, seasonal rivalries and asynchronous team battles.','Guilds','considering',20,true),
 ('guild_pve','Guild PvE','Larger guild-wide raids and collaborative progression beyond existing weekly boss encounters.','Guilds','considering',30,true),
 ('arena','Arena','Competitive asynchronous player battles with divisions, seasons and cosmetic rewards.','PvP','considering',40,true),
 ('leaderboards','Leaderboards','Seasonal and lifetime rankings for combat, professions, dungeons and guilds.','Competition','considering',50,true),
 ('world_boss','World Bosses','Server-wide bosses where players contribute together toward shared victories and rewards.','PvE','considering',60,true)
on conflict (id) do nothing;

comment on table public.community_roadmap_features is 'Admin-curated, account-wide major expansion ballot; not guild project voting.';
comment on table public.community_roadmap_votes is 'Private, one vote per feature per account, maximum three active selections.';
