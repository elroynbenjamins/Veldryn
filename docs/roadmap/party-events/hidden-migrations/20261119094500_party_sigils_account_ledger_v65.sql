-- V65 PRIVATE PARTY SIGILS CURRENCY -- REVIEW ONLY, DO NOT APPLY TO ANY DB.
-- This is ONE proposed canonical Party Sigils wallet, not a second currency.
-- Depends on private.party_event_reward_receipts_v61 and auth.users.
-- No public data API, service-role write grants, mounted claim RPC, or payouts.
begin;

create table private.party_sigils_wallet_v65(
 account_id uuid primary key references auth.users(id) on delete cascade,
 balance bigint not null default 0 check (balance between 0 and 2147483647),
 updated_at timestamptz not null default now()
);
create table private.party_sigils_ledger_v65(
 source_key text primary key,
 account_id uuid not null references auth.users(id) on delete cascade,
 delta integer not null check (delta in (8,10,16,-60)),
 balance_after bigint not null check (balance_after between 0 and 2147483647),
 created_at timestamptz not null default now(),
 foreign key (source_key) references
  private.party_event_reward_receipts_v61(source_key) on delete cascade,
 foreign key(account_id) references
  private.party_sigils_wallet_v65(account_id) on delete cascade
);
create index party_sigils_ledger_account_v65
 on private.party_sigils_ledger_v65(account_id,created_at);

alter table private.party_sigils_wallet_v65 enable row level security;
alter table private.party_sigils_ledger_v65 enable row level security;
revoke all on private.party_sigils_wallet_v65,private.party_sigils_ledger_v65
 from public,anon,authenticated,service_role;
grant select on private.party_sigils_wallet_v65,
 private.party_sigils_ledger_v65 to service_role;

-- There is deliberately NO service-role INSERT/UPDATE grant. The eventual
-- private writer must run as a separately audited transaction-capable role.
-- Defense in depth: even an inadvertently privileged SQL caller cannot
-- forge a ledger row with the wrong account, receipt delta or resulting wallet.
create or replace function private.party_sigils_v65_insert_guard()
returns trigger language plpgsql security invoker set search_path='' as $$
declare r private.party_event_reward_receipts_v61%rowtype;
v_balance bigint;
begin
 select * into r from private.party_event_reward_receipts_v61
 where source_key=new.source_key for update;
 select balance into v_balance from private.party_sigils_wallet_v65
 where account_id=new.account_id for update;
 if not found or r.source_key is null or
    r.account_id is distinct from new.account_id or
    r.party_sigils_delta is distinct from new.delta or
    v_balance is distinct from new.balance_after
 then raise exception 'party_sigils_v65_noncanonical_ledger_row';end if;
 return new;
end;$$;
create trigger party_sigils_v65_ledger_insert_guard
 before insert on private.party_sigils_ledger_v65
 for each row execute function private.party_sigils_v65_insert_guard();

-- Each ledger row is append-only; rollback can undo a whole transaction.
create or replace function private.party_sigils_v65_append_only()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 raise exception 'party_sigils_v65_immutable_record';
end;$$;
create trigger party_sigils_v65_ledger_no_update
 before update on private.party_sigils_ledger_v65
 for each row execute function private.party_sigils_v65_append_only();

-- Any future writer must use this single SQL operation on the same physical
-- connection as the V61 chest receipt and every Gold/XP/item/Inbox grant.
-- The stored receipt, not a caller-provided amount, determines the delta.
create or replace function private.apply_party_sigils_from_receipt_v65(
 p_account_id uuid,p_source_key text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 r private.party_event_reward_receipts_v61%rowtype;
 v_new_balance bigint;
 v_amount integer;
begin
 if p_account_id is null or p_source_key is null or
    length(p_source_key) not between 30 and 180
 then raise exception 'party_sigils_v65_invalid_source'; end if;

 select * into r from private.party_event_reward_receipts_v61
 where source_key=p_source_key and account_id=p_account_id for update;
 if not found then raise exception 'party_sigils_v65_receipt_missing';end if;
 if r.origin not in ('chest','exchange') or
    r.party_sigils_delta not in (8,10,16,-60)
 then raise exception 'party_sigils_v65_invalid_receipt_amount';end if;
 v_amount:=r.party_sigils_delta;

 if exists(select 1 from private.party_sigils_ledger_v65
           where source_key=p_source_key)
 then raise exception 'party_sigils_v65_source_already_applied';end if;

 insert into private.party_sigils_wallet_v65(account_id,balance)
 values (p_account_id,0) on conflict(account_id) do nothing;

 update private.party_sigils_wallet_v65
 set balance=balance+v_amount,updated_at=now()
 where account_id=p_account_id
  and balance+v_amount between 0 and 2147483647
 returning balance into v_new_balance;
 if not found then raise exception 'party_sigils_v65_insufficient_or_overflow';end if;

 insert into private.party_sigils_ledger_v65(
 source_key,account_id,delta,balance_after)
 values(p_source_key,p_account_id,v_amount,v_new_balance);

 return jsonb_build_object('sourceKey',p_source_key,
  'accountId',p_account_id,'delta',v_amount,'balanceAfter',v_new_balance,
  'replayed',false);
end;$$;

revoke all on function private.party_sigils_v65_insert_guard()
 from public,anon,authenticated,service_role;
revoke all on function private.party_sigils_v65_append_only()
 from public,anon,authenticated,service_role;
revoke all on function private.apply_party_sigils_from_receipt_v65(uuid,text)
 from public,anon,authenticated,service_role;

comment on table private.party_sigils_wallet_v65 is
 'HIDDEN proposed ONE canonical Party Sigils balance. DO NOT DEPLOY.';
comment on function private.apply_party_sigils_from_receipt_v65(uuid,text) is
 'HIDDEN draft. No EXECUTE grants. Only derives delta from immutable V61 receipt, requires same DB transaction as remaining reward legs.';
commit;
