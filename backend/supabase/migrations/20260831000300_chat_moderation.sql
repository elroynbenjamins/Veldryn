create table if not exists public.chat_filter_terms (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  normalized_term text not null,
  severity smallint not null check (severity between 1 and 4),
  action text not null default 'block' check (action in ('mask','block','mute_review')),
  locale text not null default '*',
  category text not null default 'profanity',
  enabled boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(normalized_term, locale)
);

-- Reconcile projects that were initialized from the earlier compact chat schema.
alter table public.chat_filter_terms add column if not exists id uuid default gen_random_uuid();
alter table public.chat_filter_terms add column if not exists term text;
alter table public.chat_filter_terms add column if not exists severity smallint not null default 2;
alter table public.chat_filter_terms add column if not exists locale text not null default '*';
alter table public.chat_filter_terms add column if not exists category text not null default 'profanity';
alter table public.chat_filter_terms add column if not exists notes text;
alter table public.chat_filter_terms add column if not exists created_at timestamptz not null default now();
alter table public.chat_filter_terms add column if not exists updated_at timestamptz not null default now();
update public.chat_filter_terms set term = normalized_term where term is null;
alter table public.chat_filter_terms alter column id set not null;
alter table public.chat_filter_terms alter column term set not null;
create unique index if not exists chat_filter_terms_id_idx on public.chat_filter_terms(id);
create unique index if not exists chat_filter_terms_normalized_locale_idx
  on public.chat_filter_terms(normalized_term, locale);

create table if not exists public.chat_filter_allowlist (
  normalized_term text primary key,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  channel_type text not null check (channel_type in ('world','guild','party','private')),
  channel_id text not null,
  body text not null check (char_length(body) between 1 and 300),
  moderation_action text not null default 'allow' check (moderation_action in ('allow','mask')),
  created_at timestamptz not null default now()
);
alter table public.chat_messages
  add column if not exists moderation_action text not null default 'allow';
create index if not exists chat_messages_channel_created_idx on public.chat_messages(channel_type, channel_id, created_at desc);
create index if not exists chat_messages_account_created_idx on public.chat_messages(account_id, created_at desc);

create table if not exists public.chat_moderation_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  channel_type text not null,
  channel_id text not null,
  message_hash text not null,
  action text not null check (action in ('mask','block','mute_review','rate_limit')),
  matched_term_ids uuid[] not null default '{}',
  max_severity smallint,
  reason text,
  server_ts timestamptz not null default now()
);
create index if not exists chat_moderation_events_account_idx on public.chat_moderation_events(account_id, server_ts desc);

create table if not exists public.chat_account_sanctions (
  account_id uuid primary key references auth.users(id) on delete cascade,
  muted_until timestamptz,
  strike_points integer not null default 0 check (strike_points >= 0),
  manual_review boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.chat_account_sanctions
  add column if not exists strike_points integer not null default 0;
alter table public.chat_account_sanctions
  add column if not exists manual_review boolean not null default false;

alter table public.chat_filter_terms enable row level security;
alter table public.chat_filter_allowlist enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_moderation_events enable row level security;
alter table public.chat_account_sanctions enable row level security;

-- Clients can only read chat messages that a separate channel-membership layer authorizes.
-- Until that layer exists, no broad SELECT policy is intentionally created.
-- Filter configuration, moderation logs, and sanctions are service-role/admin only.

-- Small starter seed. Keep the production list configurable in DB/admin tooling;
-- do not hard-code a giant list into the mobile client.
insert into public.chat_filter_terms(term, normalized_term, severity, action, category, notes)
values
  ('fuck', 'fuck', 2, 'mask', 'profanity', 'starter English profanity'),
  ('shit', 'shit', 2, 'mask', 'profanity', 'starter English profanity'),
  ('bitch', 'bitch', 2, 'mask', 'insult', 'starter English insult'),
  ('cunt', 'cunt', 3, 'block', 'sexual_insult', 'starter severe profanity')
on conflict (normalized_term, locale) do nothing;
