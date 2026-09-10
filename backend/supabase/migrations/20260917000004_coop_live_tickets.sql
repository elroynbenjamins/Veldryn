alter table public.matchmaking_tickets
 add column if not exists account_id uuid references auth.users(id) on delete cascade,
 add column if not exists tier smallint check (tier between 1 and 5),
 add column if not exists content_version text,
 add column if not exists balance_version text,
 add column if not exists service_region text,
 add column if not exists normalized_readiness numeric,
 add column if not exists loadout_revision bigint,
 add column if not exists loadout_snapshot_hash text,
 add column if not exists heartbeat_expires_at timestamptz,
 add column if not exists reservation_id uuid,
 add column if not exists reservation_expires_at timestamptz;
create unique index if not exists coop_one_active_ticket_per_account on public.matchmaking_tickets(account_id)
 where mode='live' and status in ('queued','matched');
create index if not exists coop_role_bucket_idx on public.matchmaking_tickets(expedition_id,tier,content_version,balance_version,role,created_at)
 where mode='live' and status='queued';
