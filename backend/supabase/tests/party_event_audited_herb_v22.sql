-- Party Events v22: real starter gather sources, server-only private sinks.
-- Execute with all migrations in outer BEGIN; discard via ROLLBACK.
begin;
do $$
declare
 p uuid:=gen_random_uuid();
 a uuid[]:=array[gen_random_uuid(),gen_random_uuid()];
 c uuid[]:=array[gen_random_uuid(),gen_random_uuid()];
 w timestamptz:=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC';
 v_herb uuid;v_again uuid;v_before integer;v_after integer;
 i integer;
begin
 if (select count(*) from private.party_event_supply_catalogue_v16
  where enabled and
   ((item_id='GREENWOOD_LOG' and category='wood')
   or(item_id='COPPER_ORE' and category='ore')
   or(item_id='DEWLEAF' and category='herb')))<>3
  or (select count(*) from private.party_event_supply_catalogue_v16
    where enabled)<>3
  or (select enabled from private.party_event_supply_catalogue_v16
    where item_id='THORN_SAP') is distinct from false
 then raise exception 'V22 auditable starter supply allowlist violated';end if;
 if has_table_privilege('service_role',
   'private.party_event_supply_catalogue_v16','update')
  or has_table_privilege('authenticated',
   'private.party_event_supply_catalogue_v16','select')
  or has_function_privilege('authenticated',
    'private.freeze_party_event_supply_order_v16(uuid,timestamptz,integer,text,text,integer)','execute')
 then raise exception 'V22 new herb wrongly exposed to untrusted role';end if;

 for i in 1..2 loop
  insert into auth.users(id,email)
  values(a[i],'v22-'||a[i]||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id)
  values(c[i],a[i],'Audit Source '||chr(64+i),
   case i when 1 then 'IRONWARDEN' else 'WAYFINDER' end);
 end loop;
 insert into public.parties(id,leader_account_id,leader_character_id)
 values(p,a[1],c[1]);
 insert into private.party_event_weeks_v11(
  party_id,event_starts_at,event_ends_at,family,variation,seed,difficulty)
 values(p,w,w+interval '7 days','broken_caravan','bandits_crossing',0,'standard');
 insert into private.party_event_roster_v11(
  party_id,event_starts_at,account_id,character_id,role,joined_at)
 values(p,w,a[1],c[1],'tank',w),(p,w,a[2],c[2],'damage',w);
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at)
 values(p,w,1,w);
 insert into public.online_game_states(account_id,character_id,state,revision)
 values(a[1],c[1],
  '{"inventory":{"stacks":[{"itemId":"DEWLEAF","quantity":5},{"itemId":"THORN_SAP","quantity":15}]},"settings":{"lockedItemIds":[]}}'::jsonb,0);

 v_herb:=private.freeze_party_event_supply_order_v16(
  p,w,1,'DEWLEAF','required',3);
 v_again:=private.freeze_party_event_supply_order_v16(
  p,w,1,'DEWLEAF','required',3);
 if v_herb is null or v_again<>v_herb
 then raise exception 'V22 verified herb order missing or not idempotent';end if;
 begin
  perform private.freeze_party_event_supply_order_v16(
   p,w,1,'THORN_SAP','required',2);
  raise exception 'V22 accepted recipe-only Thorn Sap as herb supply';
 exception when others then
  if sqlerrm<>'party_event_v16_resource_unverified' then raise;end if;
 end;
 begin
  perform private.freeze_party_event_supply_order_v16(
   p,w,1,'IRONWOOD_LOG','required',2);
  raise exception 'V22 accepted higher-tier ungeared gathering source';
 exception when others then
  if sqlerrm<>'party_event_v16_resource_unverified' then raise;end if;
 end;

 select sum((item->>'quantity')::integer) into v_before
 from public.online_game_states game,
 lateral jsonb_array_elements(game.state#>'{inventory,stacks}') item
 where game.account_id=a[1] and item->>'itemId'='DEWLEAF';
 perform private.donate_party_event_supply_v16(
  p,w,v_herb,a[1],2,'v22-dewleaf-donation-001');
 select sum((item->>'quantity')::integer) into v_after
 from public.online_game_states game,
 lateral jsonb_array_elements(game.state#>'{inventory,stacks}') item
 where game.account_id=a[1] and item->>'itemId'='DEWLEAF';
 if v_before<>5 or v_after<>3
  or (select donated_quantity from private.party_event_supply_orders_v16
   where id=v_herb)<>2
  or (select revision from public.online_game_states where account_id=a[1])<>1
 then raise exception 'V22 verified Dewleaf inventory debit not atomic';end if;
 if (select sum((item->>'quantity')::integer)
  from public.online_game_states game,
  lateral jsonb_array_elements(game.state#>'{inventory,stacks}') item
  where game.account_id=a[1] and item->>'itemId'='THORN_SAP')<>15
 then raise exception 'V22 unrelated recipe resource consumed';end if;
 if (select count(*) from private.party_event_boss_candidates_v19)>0
  or (select count(*) from private.party_event_reward_previews_v19)>0
 then raise exception 'V22 herb sink fabricated boss progress or rewards';end if;
end $$;
select 'PASS: v22 real Dewleaf herb, Level 1 starter allowlist, atomic sink, zero rewards' as result;
rollback;
