-- Instance-backed foundation for server-authoritative tempering and gem sockets.
-- Upgrade rolls and inventory costs must be applied by a transactional RPC, never by the client.
alter table public.item_instances
  add column if not exists upgrade_failures smallint not null default 0 check(upgrade_failures between 0 and 100),
  add column if not exists enhancement_revision bigint not null default 0;

create table if not exists public.item_instance_sockets(
  item_instance_id uuid not null references public.item_instances(id) on delete cascade,
  socket_index smallint not null check(socket_index between 0 and 1),
  gem_instance_id uuid not null unique references public.item_instances(id) on delete restrict,
  socketed_at timestamptz not null default now(),
  primary key(item_instance_id,socket_index),
  check(item_instance_id<>gem_instance_id)
);

alter table public.item_instance_sockets enable row level security;
drop policy if exists item_socket_owner_read on public.item_instance_sockets;
create policy item_socket_owner_read on public.item_instance_sockets for select to authenticated using(
  exists(select 1 from public.item_instances equipment join public.characters c on c.id=equipment.character_id where equipment.id=item_instance_id and c.account_id=auth.uid())
);

create index if not exists item_instance_sockets_gem_idx on public.item_instance_sockets(gem_instance_id);

comment on column public.item_instances.upgrade_failures is 'Consecutive failed rolls used for bounded pity; reset on success.';
comment on column public.item_instances.enhancement_revision is 'Optimistic concurrency revision for idempotent upgrade/socket RPCs.';
comment on column public.item_instance_sockets.socket_index is 'Exactly two named equipment sockets: 0 = Stat Gem, 1 = Effect Gem.';
comment on table public.item_instance_sockets is 'Equipped gems by owned equipment instance. Mutations are reserved for security-definer economy RPCs.';
