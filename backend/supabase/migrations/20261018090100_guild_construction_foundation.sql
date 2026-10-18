-- Guild construction persistence. Donation deductions must be performed by a future
-- server transaction using the existing inventory/gold accounting tables.
create table if not exists public.guild_construction_projects (
 guild_id text not null,
 template_id text not null,
 completed_at timestamptz,
 primary key (guild_id, template_id)
);
create table if not exists public.guild_construction_donations (
 guild_id text not null,
 template_id text not null,
 account_id uuid not null references auth.users(id) on delete cascade,
 donation_key text not null,
 resource_id text not null,
 amount bigint not null check (amount > 0),
 created_at timestamptz not null default now(),
 primary key (account_id, donation_key),
 foreign key (guild_id, template_id) references public.guild_construction_projects(guild_id,template_id)
);
create index if not exists guild_construction_donations_project_idx
 on public.guild_construction_donations(guild_id,template_id,resource_id);
alter table public.guild_construction_projects enable row level security;
alter table public.guild_construction_donations enable row level security;
revoke all on public.guild_construction_projects, public.guild_construction_donations from anon, authenticated;
