-- Cap successful normal/elite combat-room Expedition Marks at 25 per
-- account per dungeon run, across both Live and Echo/NPC modes.
-- Keep boss completion entitlements separate and never grant donor Echoes.
-- Advisory lock serializes credit across parallel node-result transactions.
begin;

create or replace function public.award_committed_coop_combat_marks_v1()
returns trigger
language plpgsql security definer set search_path = ''
as $function$
declare
 v_nodes jsonb;
 v_kind text;
 v_base_marks integer;
 v_generator text;
 v_paid_marks integer;
 v_already_paid integer;
 v_member record;
 v_ledger_id uuid;
begin
 if not new.success or new.result_json->>'kind' is distinct from 'combat' then return new; end if;

 select ps.state_json #> '{pending,run,graph,nodes}', run.route_graph_json->>'generatorVersion'
 into v_nodes, v_generator
 from public.coop_run_private_state as ps
 join public.expedition_runs as run on run.id=ps.run_id
 where ps.run_id=new.run_id and run.coop_mode in ('qmode','live');

 if pg_catalog.jsonb_typeof(v_nodes) is distinct from 'array' then return new; end if;
 select node.value->>'kind' into v_kind
 from pg_catalog.jsonb_array_elements(v_nodes) as node(value)
 where node.value->>'nodeId'=new.node_id limit 1;

 v_base_marks:=case v_kind when 'battle' then 3 when 'elite' then 5 else 0 end;
 if v_base_marks=0 then return new; end if;

 for v_member in select distinct m.account_id from public.expedition_run_members as m
   where m.run_id=new.run_id and m.member_kind='human' order by m.account_id
 loop
   perform pg_catalog.pg_advisory_xact_lock(
     pg_catalog.hashtextextended('coop-combat-marks:'||new.run_id::text||':'||v_member.account_id::text,0)
   );

   select coalesce(sum(l.amount),0)::integer into v_already_paid
   from public.expedition_currency_ledger as l
   where l.account_id=v_member.account_id and l.run_id=new.run_id
     and l.currency='expedition_mark' and l.reason='coop_combat_room';

   -- Grandfather in-progress pre-Endurance runs; only the new shared queue
   -- adopts the 25-Mark combat cap. Old routes keep their original payout.
   v_paid_marks:=case when v_generator like '%-endurance-v1'
      then least(v_base_marks,greatest(0,25-v_already_paid))
      else v_base_marks end;
   if v_paid_marks=0 then continue; end if;

   v_ledger_id:=null;
   insert into public.expedition_currency_ledger
     (account_id,run_id,currency,amount,reason,idempotency_key)
   values (v_member.account_id,new.run_id,'expedition_mark',v_paid_marks,'coop_combat_room',
     'coop-combat-v1:'||new.run_id::text||':'||new.node_id||':'||v_member.account_id::text)
   on conflict (idempotency_key) do nothing
   returning id into v_ledger_id;

   if v_ledger_id is not null then
     insert into public.expedition_wallets(account_id) values(v_member.account_id)
       on conflict(account_id) do nothing;
     update public.expedition_wallets
       set expedition_marks=expedition_marks+v_paid_marks,updated_at=pg_catalog.clock_timestamp()
       where account_id=v_member.account_id;
   end if;
 end loop;
 return new;
end;
$function$;

revoke all on function public.award_committed_coop_combat_marks_v1()
 from public,anon,authenticated;

-- Receipt counts full room rewards and reports any truncated final award.
-- Historical runs under the cap still return the original fields unchanged.
create or replace function public.coop_run_combat_marks_self_v1(p_run_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare
 v_account_id uuid:=auth.uid();
 v_total integer;
 v_normal integer;
 v_elite integer;
 v_partial integer;
 v_generator text;
begin
 if v_account_id is null then raise exception 'AUTH_REQUIRED';end if;
 select coalesce(sum(l.amount),0)::integer,
   count(*) filter(where room.kind='battle' and l.amount=3)::integer,
   count(*) filter(where room.kind='elite' and l.amount=5)::integer
 into v_total,v_normal,v_elite
 from public.expedition_currency_ledger as l
 join public.expedition_runs as run on run.id=l.run_id
 left join lateral (
   select node.value->>'kind' as kind
   from pg_catalog.jsonb_array_elements(run.route_graph_json->'nodes') as node(value)
   where node.value->>'nodeId'=pg_catalog.split_part(l.idempotency_key,':',3)
   limit 1
 ) as room on true
 where l.account_id=v_account_id and l.run_id=p_run_id
   and l.reason='coop_combat_room' and l.currency='expedition_mark';
 v_partial:=greatest(0,v_total-v_normal*3-v_elite*5);
 select run.route_graph_json->>'generatorVersion' into v_generator
 from public.expedition_runs as run where run.id=p_run_id;

 return pg_catalog.jsonb_build_object(
  'total',v_total,'normal',v_normal,'elite',v_elite,'partial',v_partial,
  'cap',case when v_generator like '%-endurance-v1' then 25 else null end
 );
end;
$function$;
revoke all on function public.coop_run_combat_marks_self_v1(uuid) from public,anon,authenticated;
grant execute on function public.coop_run_combat_marks_self_v1(uuid) to authenticated;
commit;
