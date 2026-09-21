begin;

-- Typed equipment socket parity.
-- Existing generic socket rows are preserved: index 0 becomes the Stat socket and any
-- additional rows become legacy/extract-only entries until the player removes them.
alter table public.item_instance_sockets
  add column if not exists socket_kind text;

update public.item_instance_sockets
set socket_kind=case when socket_index=0 then 'stat' else 'legacy' end
where socket_kind is null;

alter table public.item_instance_sockets
  alter column socket_kind set default 'legacy',
  alter column socket_kind set not null;

alter table public.item_instance_sockets
  drop constraint if exists item_instance_sockets_socket_kind_check;
alter table public.item_instance_sockets
  add constraint item_instance_sockets_socket_kind_check
  check(socket_kind in('stat','effect','legacy'));

alter table public.item_instance_sockets
  drop constraint if exists item_instance_sockets_socket_index_check;
alter table public.item_instance_sockets
  add constraint item_instance_sockets_socket_index_check
  check(socket_index between 0 and 3);

create unique index if not exists uq_item_socket_one_stat
  on public.item_instance_sockets(item_instance_id)
  where socket_kind='stat';

create unique index if not exists uq_item_socket_one_effect
  on public.item_instance_sockets(item_instance_id)
  where socket_kind='effect';

comment on column public.item_instance_sockets.socket_kind is
  'Typed socket role: one Stat Gem, one Effect Gem, plus temporary legacy entries retained for safe extraction.';

commit;
