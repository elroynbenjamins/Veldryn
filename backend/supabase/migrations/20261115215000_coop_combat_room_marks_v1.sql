-- Grant fixed, immediate Expedition Marks for successful dungeon combat rooms.
-- Boss kills keep their existing final entitlement; failures and utility rooms pay nothing.
begin;

create or replace function public.award_committed_coop_combat_marks_v1()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_nodes jsonb;
  v_kind text;
  v_marks integer;
  v_member record;
  v_ledger_id uuid;
begin
  if not new.success or new.result_json->>'kind' is distinct from 'combat' then
    return new;
  end if;

  -- The pending run contains the server-owned graph and committed result.
  -- It is still present when the authoritative node-result row is inserted.
  select ps.state_json #> '{pending,run,graph,nodes}'
    into v_nodes
    from public.coop_run_private_state as ps
    join public.expedition_runs as run on run.id = ps.run_id
   where ps.run_id = new.run_id and run.coop_mode in ('qmode','live');

  if pg_catalog.jsonb_typeof(v_nodes) is distinct from 'array' then
    return new;
  end if;

  select node.value->>'kind'
    into v_kind
    from pg_catalog.jsonb_array_elements(v_nodes) as node(value)
   where node.value->>'nodeId' = new.node_id
   limit 1;

  v_marks := case v_kind when 'battle' then 3 when 'elite' then 5 else 0 end;
  if v_marks = 0 then return new; end if;

  -- Live pays each human participant; Q-Mode pays its controlling human.
  -- NPCs and Echo companions never collect these participation awards.
  for v_member in
    select distinct m.account_id
      from public.expedition_run_members as m
     where m.run_id = new.run_id and m.member_kind = 'human'
     order by m.account_id
  loop
    v_ledger_id := null;
    insert into public.expedition_currency_ledger
      (account_id,run_id,currency,amount,reason,idempotency_key)
    values
      (v_member.account_id,new.run_id,'expedition_mark',v_marks,
       'coop_combat_room',
       'coop-combat-v1:' || new.run_id::text || ':' || new.node_id || ':' || v_member.account_id::text)
    on conflict (idempotency_key) do nothing
    returning id into v_ledger_id;

    if v_ledger_id is not null then
      insert into public.expedition_wallets(account_id)
      values (v_member.account_id)
      on conflict (account_id) do nothing;

      update public.expedition_wallets
         set expedition_marks = expedition_marks + v_marks,
             updated_at = pg_catalog.clock_timestamp()
       where account_id = v_member.account_id;
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.award_committed_coop_combat_marks_v1()
  from public,anon,authenticated;

drop trigger if exists coop_node_result_combat_marks_v1 on public.coop_node_results;
create trigger coop_node_result_combat_marks_v1
  after insert on public.coop_node_results
  for each row
  execute function public.award_committed_coop_combat_marks_v1();

commit;
