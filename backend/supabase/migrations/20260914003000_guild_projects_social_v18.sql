begin;

-- VELDRYN v18 — Guild Projects + deeper Guild social systems.
-- Intended after the v16.1/v17/v17.3 dependency chain. Current repository schema remains authoritative during merge.
-- The player Market is removed. This migration does not create or depend on any Market/procurement system.

create table if not exists public.guild_project_definitions(
  template_id text not null,
  version integer not null check(version > 0),
  definition_json jsonb not null,
  config_hash text not null,
  created_by text,
  created_at timestamptz not null default now(),
  primary key(template_id,version)
);

create or replace function public.prevent_guild_project_definition_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'guild project definitions are immutable; publish a new version';
end $$;
drop trigger if exists trg_guild_project_definition_immutable on public.guild_project_definitions;
create trigger trg_guild_project_definition_immutable before update or delete on public.guild_project_definitions
for each row execute function public.prevent_guild_project_definition_mutation();

create table if not exists public.guild_project_board_candidates(
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  cycle_key text not null,
  template_id text not null,
  definition_version integer not null,
  focus text not null check(focus in('combat','skilling','mixed')),
  definition_snapshot jsonb not null,
  config_hash text not null,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'available' check(status in('available','selected','expired','cancelled')),
  unique(guild_id,cycle_key,focus),
  foreign key(template_id,definition_version) references public.guild_project_definitions(template_id,version)
);
create index if not exists idx_guild_project_board_browse on public.guild_project_board_candidates(guild_id,status,cycle_key,expires_at);

create table if not exists public.guild_project_board_votes(
  candidate_id uuid not null references public.guild_project_board_candidates(id) on delete cascade,
  guild_id uuid not null references public.guilds(id) on delete cascade,
  cycle_key text not null,
  account_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(candidate_id,account_id),
  unique(guild_id,cycle_key,account_id)
);

create table if not exists public.guild_project_instances(
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null,
  guild_name_snapshot text,
  template_id text not null,
  definition_version integer not null,
  definition_snapshot jsonb not null,
  config_hash text not null,
  kind text not null check(kind in('weekly_campaign','development','event')),
  focus text not null check(focus in('combat','skilling','mixed','development')),
  slot_index integer not null check(slot_index between 1 and 3),
  cycle_key text,
  status text not null default 'active' check(status in('active','completed','expired','cancelled')),
  started_by_account_id uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  active_member_snapshot integer not null default 0 check(active_member_snapshot >= 0),
  target_points integer not null default 0 check(target_points >= 0),
  minimum_meaningful_contributors integer not null default 0 check(minimum_meaningful_contributors >= 0),
  meaningful_contributor_threshold integer not null default 0 check(meaningful_contributor_threshold >= 0),
  personal_reward_threshold integer not null default 0 check(personal_reward_threshold >= 0),
  single_account_completion_share_cap numeric(6,5) not null default 0 check(single_account_completion_share_cap between 0 and 1),
  mixed_minimum_fraction numeric(6,5),
  completion_points bigint not null default 0 check(completion_points >= 0),
  combat_points bigint not null default 0 check(combat_points >= 0),
  skilling_points bigint not null default 0 check(skilling_points >= 0),
  meaningful_contributors integer not null default 0 check(meaningful_contributors >= 0),
  completion_snapshot jsonb,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by_account_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check(ends_at is null or ends_at > started_at),
  foreign key(template_id,definition_version) references public.guild_project_definitions(template_id,version)
);
create unique index if not exists uq_guild_project_active_slot on public.guild_project_instances(guild_id,slot_index) where status='active';
create unique index if not exists uq_guild_project_one_weekly_active on public.guild_project_instances(guild_id) where status='active' and kind='weekly_campaign';
create index if not exists idx_guild_project_guild_history on public.guild_project_instances(guild_id,started_at desc);
create index if not exists idx_guild_project_due on public.guild_project_instances(status,ends_at) where status='active';

create or replace function public.prevent_guild_project_instance_definition_mutation() returns trigger language plpgsql as $$
begin
  if old.template_id is distinct from new.template_id
    or old.definition_version is distinct from new.definition_version
    or old.definition_snapshot is distinct from new.definition_snapshot
    or old.config_hash is distinct from new.config_hash
    or old.kind is distinct from new.kind
    or old.focus is distinct from new.focus
    or old.target_points is distinct from new.target_points
    or old.active_member_snapshot is distinct from new.active_member_snapshot
    or old.single_account_completion_share_cap is distinct from new.single_account_completion_share_cap
    or old.mixed_minimum_fraction is distinct from new.mixed_minimum_fraction then
    raise exception 'guild project instance definition/balance snapshot is immutable';
  end if;
  return new;
end $$;
drop trigger if exists trg_guild_project_instance_immutable on public.guild_project_instances;
create trigger trg_guild_project_instance_immutable before update on public.guild_project_instances
for each row execute function public.prevent_guild_project_instance_definition_mutation();

create table if not exists public.guild_project_cycle_bindings(
  cycle_key text not null,
  account_id uuid not null references auth.users(id) on delete cascade,
  guild_id uuid not null,
  guild_name_snapshot text,
  bound_at timestamptz not null default now(),
  points_at_bind integer not null check(points_at_bind > 0),
  primary key(cycle_key,account_id)
);
create index if not exists idx_guild_project_cycle_binding_guild on public.guild_project_cycle_bindings(cycle_key,guild_id);

create table if not exists public.guild_project_member_progress(
  project_instance_id uuid not null references public.guild_project_instances(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  raw_points bigint not null default 0 check(raw_points >= 0),
  completion_points bigint not null default 0 check(completion_points >= 0),
  combat_points bigint not null default 0 check(combat_points >= 0),
  skilling_points bigint not null default 0 check(skilling_points >= 0),
  was_member_at_start boolean not null default false,
  joined_at_snapshot timestamptz,
  progress_fraction_at_join numeric(8,6),
  first_contribution_at timestamptz,
  last_contribution_at timestamptz,
  primary key(project_instance_id,account_id)
);
create index if not exists idx_guild_project_member_account on public.guild_project_member_progress(account_id,project_instance_id);

create table if not exists public.guild_project_contribution_receipts(
  project_instance_id uuid not null references public.guild_project_instances(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  source_event_id text not null,
  date_key date not null,
  category text not null check(category in('combat','skilling')),
  raw_points integer not null check(raw_points >= 0),
  credited_points integer not null check(credited_points >= 0),
  completion_credited_points integer not null check(completion_credited_points >= 0),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key(project_instance_id,account_id,source_event_id)
);
create index if not exists idx_guild_project_receipts_daily on public.guild_project_contribution_receipts(project_instance_id,account_id,date_key);

create table if not exists public.guild_project_contribution_daily_breakdown(
  project_instance_id uuid not null references public.guild_project_instances(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  date_key date not null,
  activity_kind text not null,
  content_id text not null,
  points bigint not null default 0 check(points >= 0),
  units numeric not null default 0 check(units >= 0),
  updated_at timestamptz not null default now(),
  primary key(project_instance_id,account_id,date_key,activity_kind,content_id)
);

create table if not exists public.guild_project_resource_progress(
  project_instance_id uuid not null references public.guild_project_instances(id) on delete cascade,
  resource_kind text not null check(resource_kind in('gold','item')),
  resource_id text not null,
  target_amount bigint not null check(target_amount > 0),
  contributed_amount bigint not null default 0 check(contributed_amount >= 0),
  primary key(project_instance_id,resource_kind,resource_id),
  check(contributed_amount <= target_amount)
);

create table if not exists public.guild_project_donation_receipts(
  id uuid primary key default gen_random_uuid(),
  project_instance_id uuid not null references public.guild_project_instances(id) on delete cascade,
  guild_id uuid not null,
  account_id uuid not null references auth.users(id) on delete cascade,
  resource_kind text not null check(resource_kind in('gold','item')),
  resource_id text not null,
  amount bigint not null check(amount > 0),
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists idx_guild_project_donations_member on public.guild_project_donation_receipts(project_instance_id,account_id,created_at desc);

create table if not exists public.guild_project_donor_progress(
  project_instance_id uuid not null references public.guild_project_instances(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  normalized_project_share numeric(10,8) not null default 0 check(normalized_project_share between 0 and 1),
  last_donation_at timestamptz,
  primary key(project_instance_id,account_id)
);

create table if not exists public.guild_project_reward_claims(
  project_instance_id uuid not null references public.guild_project_instances(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  reward_key text not null,
  reward_bundle_id text,
  claimed_at timestamptz not null default now(),
  primary key(project_instance_id,account_id,reward_key)
);

create table if not exists public.guild_decree_selection_windows(
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null,
  guild_name_snapshot text,
  source_project_instance_id uuid not null references public.guild_project_instances(id) on delete cascade,
  candidate_decree_ids text[] not null,
  status text not null default 'open' check(status in('open','selected','expired','cancelled')),
  opens_at timestamptz not null default now(),
  closes_at timestamptz not null,
  selected_decree_id text,
  selected_at timestamptz,
  check(closes_at > opens_at)
);
create unique index if not exists uq_guild_decree_window_project on public.guild_decree_selection_windows(source_project_instance_id);

create table if not exists public.guild_decree_votes(
  window_id uuid not null references public.guild_decree_selection_windows(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  decree_id text not null,
  created_at timestamptz not null default now(),
  primary key(window_id,account_id)
);

create table if not exists public.guild_decree_instances(
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null,
  guild_name_snapshot text,
  decree_id text not null,
  definition_snapshot jsonb not null,
  source_project_instance_id uuid references public.guild_project_instances(id) on delete set null,
  status text not null default 'active' check(status in('scheduled','active','ended','cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  selected_by_account_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check(ends_at > starts_at)
);
create unique index if not exists uq_guild_one_active_decree on public.guild_decree_instances(guild_id) where status='active';
create index if not exists idx_guild_decree_due on public.guild_decree_instances(status,ends_at);

create table if not exists public.guild_bulletins(
  guild_id uuid primary key references public.guilds(id) on delete cascade,
  body text not null default '' check(char_length(body) <= 280),
  updated_by_account_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.guild_bulletin_revisions(
  id bigint generated always as identity primary key,
  guild_id uuid not null,
  body text not null check(char_length(body) <= 280),
  actor_account_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_guild_bulletin_history on public.guild_bulletin_revisions(guild_id,created_at desc);

create table if not exists public.guild_activity_feed(
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null,
  kind text not null,
  actor_account_id uuid references auth.users(id) on delete set null,
  title text not null,
  body text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);
create index if not exists idx_guild_activity_feed_recent on public.guild_activity_feed(guild_id,created_at desc);

create table if not exists public.guild_project_season_completions(
  season_key text not null,
  guild_id uuid not null,
  guild_name_snapshot text,
  template_id text not null,
  completion_no integer not null check(completion_no > 0),
  score_awarded integer not null check(score_awarded >= 0),
  completed_at timestamptz not null,
  project_instance_id uuid not null references public.guild_project_instances(id) on delete restrict,
  primary key(season_key,guild_id,template_id,completion_no)
);

create table if not exists public.guild_project_season_scores(
  season_key text not null,
  guild_id uuid not null,
  guild_name_snapshot text,
  score bigint not null default 0 check(score >= 0),
  unique_templates integer not null default 0 check(unique_templates >= 0),
  completed_projects integer not null default 0 check(completed_projects >= 0),
  last_completed_at timestamptz,
  primary key(season_key,guild_id)
);
create index if not exists idx_guild_project_season_rank on public.guild_project_season_scores(season_key,score desc,unique_templates desc,last_completed_at asc,guild_id asc);

-- Helper used only by SELECT RLS. Writes remain trusted-service/backend/RPC operations.
create or replace function public.is_guild_member_v18(p_guild_id uuid,p_account_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.guild_members gm where gm.guild_id=p_guild_id and gm.account_id=p_account_id)
$$;
revoke all on function public.is_guild_member_v18(uuid,uuid) from public,anon;
grant execute on function public.is_guild_member_v18(uuid,uuid) to authenticated,service_role;

alter table public.guild_project_definitions enable row level security;
alter table public.guild_project_board_candidates enable row level security;
alter table public.guild_project_board_votes enable row level security;
alter table public.guild_project_instances enable row level security;
alter table public.guild_project_cycle_bindings enable row level security;
alter table public.guild_project_member_progress enable row level security;
alter table public.guild_project_contribution_receipts enable row level security;
alter table public.guild_project_contribution_daily_breakdown enable row level security;
alter table public.guild_project_resource_progress enable row level security;
alter table public.guild_project_donation_receipts enable row level security;
alter table public.guild_project_donor_progress enable row level security;
alter table public.guild_project_reward_claims enable row level security;
alter table public.guild_decree_selection_windows enable row level security;
alter table public.guild_decree_votes enable row level security;
alter table public.guild_decree_instances enable row level security;
alter table public.guild_bulletins enable row level security;
alter table public.guild_bulletin_revisions enable row level security;
alter table public.guild_activity_feed enable row level security;
alter table public.guild_project_season_completions enable row level security;
alter table public.guild_project_season_scores enable row level security;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='guild_project_board_candidates' and policyname='guild members read project board') then
    create policy "guild members read project board" on public.guild_project_board_candidates for select using(public.is_guild_member_v18(guild_id,auth.uid()));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='guild_project_board_votes' and policyname='guild members read project votes') then
    create policy "guild members read project votes" on public.guild_project_board_votes for select using(public.is_guild_member_v18(guild_id,auth.uid()));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='guild_project_instances' and policyname='guild members read projects') then
    create policy "guild members read projects" on public.guild_project_instances for select using(public.is_guild_member_v18(guild_id,auth.uid()));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='guild_project_cycle_bindings' and policyname='accounts read own guild project binding') then
    create policy "accounts read own guild project binding" on public.guild_project_cycle_bindings for select using(account_id=auth.uid());
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='guild_project_member_progress' and policyname='guild members read member project progress') then
    create policy "guild members read member project progress" on public.guild_project_member_progress for select using(exists(select 1 from public.guild_project_instances gpi where gpi.id=project_instance_id and public.is_guild_member_v18(gpi.guild_id,auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='guild_project_contribution_daily_breakdown' and policyname='members read own project breakdown') then
    create policy "members read own project breakdown" on public.guild_project_contribution_daily_breakdown for select using(account_id=auth.uid());
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='guild_project_resource_progress' and policyname='guild members read project resources') then
    create policy "guild members read project resources" on public.guild_project_resource_progress for select using(exists(select 1 from public.guild_project_instances gpi where gpi.id=project_instance_id and public.is_guild_member_v18(gpi.guild_id,auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='guild_project_donor_progress' and policyname='guild members read donor progress') then
    create policy "guild members read donor progress" on public.guild_project_donor_progress for select using(exists(select 1 from public.guild_project_instances gpi where gpi.id=project_instance_id and public.is_guild_member_v18(gpi.guild_id,auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='guild_decree_selection_windows' and policyname='guild members read decree windows') then
    create policy "guild members read decree windows" on public.guild_decree_selection_windows for select using(public.is_guild_member_v18(guild_id,auth.uid()));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='guild_decree_instances' and policyname='guild members read decrees') then
    create policy "guild members read decrees" on public.guild_decree_instances for select using(public.is_guild_member_v18(guild_id,auth.uid()));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='guild_bulletins' and policyname='guild members read bulletin') then
    create policy "guild members read bulletin" on public.guild_bulletins for select using(public.is_guild_member_v18(guild_id,auth.uid()));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='guild_activity_feed' and policyname='guild members read activity feed') then
    create policy "guild members read activity feed" on public.guild_activity_feed for select using(public.is_guild_member_v18(guild_id,auth.uid()));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='guild_project_season_scores' and policyname='public guild project ranking') then
    create policy "public guild project ranking" on public.guild_project_season_scores for select using(true);
  end if;
end $$;

-- v18 role normalization: preserve existing custom/current values while standardizing obvious legacy owner/member rows.
update public.guild_members gm set role='guild_master'
where exists(select 1 from public.guilds g where g.id=gm.guild_id and g.owner_account_id=gm.account_id)
  and gm.role in('leader','owner','member','guild_master');

-- Extend the v17.2 reset/control plane only when present. Codex should wire handlers into the current reset worker.
do $$ begin
  if to_regclass('public.ops_remote_config') is not null then
    insert into public.ops_remote_config(config_key,category,label,description,value_type,default_value,current_value,exposure,risk_tier,live_change_safe,rollout_percent,constraints_json,notes)
    values
      ('feature.guild_projects.enabled','Guild','Guild Projects','Emergency gate for starting/new Guild Project progress. Existing authoritative settlements may still finish safely.','boolean','true'::jsonb,'true'::jsonb,'server_only','critical',true,100,'{}'::jsonb,'Do not delete project history when disabled.'),
      ('feature.guild_decrees.enabled','Guild','Guild Decrees','Emergency gate for new decree activation.','boolean','true'::jsonb,'true'::jsonb,'server_only','critical',true,100,'{}'::jsonb,'Existing decree expiry still processes.'),
      ('guild.projects.daily_credit_cap','Guild','Guild Project daily credit cap','Safety ceiling for daily standardized contribution credited to one weekly Guild Project.','integer','2400'::jsonb,'2400'::jsonb,'server_only','medium',true,100,'{"min":500,"max":2400}'::jsonb,'May be reduced live for incident response; increases above design cap require code review.')
    on conflict(config_key) do nothing;
  end if;
  if to_regclass('public.ops_reset_definitions') is not null then
    insert into public.ops_reset_definitions(reset_key,label,description,cadence,utc_hour,utc_minute,day_of_week,handler_key,catch_up_policy,max_catchup_runs,enabled)
    values('guild.projects.weekly_board','Guild Project weekly board','Generate/expire weekly Guild Project candidate boards each Monday at 00:00 UTC.','weekly',0,0,1,'guild_projects.generate_weekly_boards','latest_only',1,true)
    on conflict(reset_key) do update set label=excluded.label,description=excluded.description,handler_key=excluded.handler_key,enabled=true,updated_at=now();
  end if;
  if to_regclass('public.ops_admin_command_registry') is not null then
    insert into public.ops_admin_command_registry(command_key,category,label,description,target_scope,min_role,risk_tier,handler_key,params_schema,reversible,requires_approval,notes)
    values
      ('guild.project.regenerate_board','Guild','Regenerate Guild Project board','Rebuild a corrupted weekly candidate board from deterministic server rotation.','none','owner','low','guild.project.regenerate_board','{"fields":[{"name":"guildId","label":"Guild ID","type":"uuid","required":true},{"name":"cycleKey","label":"Cycle key","type":"text","required":true}]}',false,false,'No Market dependency.'),
      ('guild.project.cancel_stuck','Guild','Cancel stuck Guild Project','Safely cancel a stuck project and release its slot.','none','owner','high','guild.project.cancel_stuck','{"fields":[{"name":"projectInstanceId","label":"Project instance","type":"uuid","required":true}]}',false,false,'Development donations are not automatically refunded.'),
      ('guild.project.repair_progress','Guild','Repair Guild Project progress','Critical corruption repair for exact category/progress totals.','none','owner','critical','guild.project.repair_progress','{"fields":[{"name":"projectInstanceId","label":"Project instance","type":"uuid","required":true},{"name":"completionPoints","label":"Completion points","type":"integer","required":true,"min":0},{"name":"combatPoints","label":"Combat points","type":"integer","required":true,"min":0},{"name":"skillingPoints","label":"Skilling points","type":"integer","required":true,"min":0},{"name":"incidentReference","label":"Incident reference","type":"text","required":true,"minLength":3,"maxLength":120}]}',true,true,'Use only for proven corruption.'),
      ('guild.project.force_finalize','Guild','Force finalize Guild Project','Re-run normal completion evaluation after worker failure; cannot bypass unmet requirements.','none','owner','high','guild.project.force_finalize','{"fields":[{"name":"projectInstanceId","label":"Project instance","type":"uuid","required":true}]}',false,false,''),
      ('guild.decree.cancel','Guild','Cancel active Guild Decree','Emergency cancellation of a broken decree.','none','owner','high','guild.decree.cancel','{"fields":[{"name":"guildId","label":"Guild ID","type":"uuid","required":true},{"name":"decreeInstanceId","label":"Decree instance","type":"uuid","required":true}]}',false,false,'')
    on conflict(command_key) do update set category=excluded.category,label=excluded.label,description=excluded.description,risk_tier=excluded.risk_tier,handler_key=excluded.handler_key,params_schema=excluded.params_schema,reversible=excluded.reversible,requires_approval=excluded.requires_approval,notes=excluded.notes,updated_at=now();
  end if;
end $$;

comment on table public.guild_project_instances is 'Immutable-snapshot Guild Projects. Weekly campaigns use standardized effort; development projects use atomic direct donations.';
comment on table public.guild_project_donation_receipts is 'Project-scoped donations only. v18 intentionally has no player Market/Guild Procurement dependency.';
comment on table public.guild_project_season_scores is 'Cosmetic/prestige Guild Project Architects leaderboard aggregate with diminishing repeat-template value.';

commit;
