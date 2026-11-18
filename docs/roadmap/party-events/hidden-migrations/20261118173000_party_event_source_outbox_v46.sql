-- Veldryn Party Events V46 — UNPROMOTED canonical receipt outbox.
-- DRAFT ONLY: do not execute against production or staging without review.
-- No worker, scheduler, EP write, player reward, client endpoint or launch flag.
-- Both triggers execute in the SAME transaction as each committed source row.
begin;

create table private.party_event_source_outbox_v46 (
 source_type text not null check (source_type in ('craft','idle')),
 source_ref uuid not null,
 source_occurred_at timestamptz not null,
 queued_at timestamptz not null default now(),
 state text not null default 'pending'
  check (state in ('pending','leased','complete','terminal')),
 attempt_count integer not null default 0 check (attempt_count between 0 and 100),
 next_attempt_at timestamptz not null default now(),
 lease_expires_at timestamptz,
 completed_at timestamptz,
 last_error_code text check (last_error_code is null or
  last_error_code ~ '^[a-z0-9_]{1,64}$'),
 primary key (source_type,source_ref),
 constraint party_event_v46_completed_shape check (
  (state in ('complete','terminal') and completed_at is not null)
  or (state in ('pending','leased') and completed_at is null))
);
create index party_event_source_outbox_v46_available
 on private.party_event_source_outbox_v46(next_attempt_at,queued_at)
 where state='pending';
comment on table private.party_event_source_outbox_v46 is
 'UNRELEASED V46: durable, nonpaying source identities only, created in the same transaction as canonical crafting and idle receipts.';

create or replace function private.enqueue_party_event_source_v46()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 v_kind text;
 v_ref uuid;
begin
 if tg_op<>'INSERT' or tg_table_schema<>'public' then
  raise exception 'party_event_v46_untrusted_trigger';
 end if;
 if tg_table_name='craft_receipts' then
  v_kind:='craft';
  v_ref:=new.receipt_id;
 elsif tg_table_name='idle_claim_receipts' then
  v_kind:='idle';
  v_ref:=new.claim_id;
 else
  raise exception 'party_event_v46_unrecognized_source';
 end if;
 if v_ref is null or new.created_at is null then
  raise exception 'party_event_v46_missing_source_provenance';
 end if;
 insert into private.party_event_source_outbox_v46(
  source_type,source_ref,source_occurred_at)
 values (v_kind,v_ref,new.created_at)
 on conflict (source_type,source_ref) do nothing;
 return new;
end;$$;

create trigger party_event_v46_after_craft
 after insert on public.craft_receipts
 for each row execute function private.enqueue_party_event_source_v46();
create trigger party_event_v46_after_idle
 after insert on public.idle_claim_receipts
 for each row execute function private.enqueue_party_event_source_v46();

revoke all on table private.party_event_source_outbox_v46
 from public,anon,authenticated,service_role;
grant select,update on private.party_event_source_outbox_v46 to service_role;
revoke all on function private.enqueue_party_event_source_v46()
 from public,anon,authenticated,service_role;

commit;
