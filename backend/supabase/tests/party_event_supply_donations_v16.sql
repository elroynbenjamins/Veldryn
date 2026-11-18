-- v16: atomic private resource sink, trusted catalogue, locks and replay.
-- Run after v11..v16 migrations under one transaction; ROLLBACK all fixtures.
begin;
do $$
declare
 a uuid[]:=array[gen_random_uuid(),gen_random_uuid()];
 c uuid[]:=array[gen_random_uuid(),gen_random_uuid()];
 p uuid:=gen_random_uuid();
 start_at timestamptz:=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC';
 ore uuid;wood uuid;herb uuid;resp jsonb;again jsonb;report jsonb;
 i integer;
begin
 if has_function_privilege('authenticated',
  'private.donate_party_event_supply_v16(uuid,timestamptz,uuid,uuid,integer,text)','execute')
  or has_function_privilege('anon',
  'private.freeze_party_event_supply_order_v16(uuid,timestamptz,integer,text,text,integer)','execute')
  or has_table_privilege('service_role','private.party_event_supply_orders_v16','insert')
  or has_table_privilege('service_role','private.party_event_supply_donations_v16','insert')
  or has_table_privilege('authenticated','private.party_event_supply_donations_v16','select')
 then raise exception 'V16 donation privileges must remain private';end if;
 if (select enabled from private.party_event_supply_catalogue_v16
   where item_id='THORN_SAP')<>false
 then raise exception 'V16 unverified herb unlocked by default';end if;

 for i in 1..2 loop
  insert into auth.users(id,email)
  values(a[i],'v16-'||a[i]||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id)
  values(c[i],a[i],'Supply Tester '||chr(64+i),
   case i when 1 then 'IRONWARDEN' else 'WAYFINDER' end);
 end loop;
 insert into public.parties(id,leader_account_id,leader_character_id)
 values(p,a[1],c[1]);
 insert into private.party_event_weeks_v11(
  party_id,event_starts_at,event_ends_at,family,variation,seed,difficulty)
 values(p,start_at,start_at+interval '7 days',
  'broken_caravan','bandits_crossing',0,'standard');
 insert into private.party_event_roster_v11(
  party_id,event_starts_at,account_id,character_id,role,joined_at)
 values(p,start_at,a[1],c[1],'tank',start_at),
  (p,start_at,a[2],c[2],'damage',start_at);
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at)
 values(p,start_at,1,start_at);

 insert into public.online_game_states(account_id,character_id,state,revision)
 values(a[1],c[1],
  '{"inventory":{"stacks":[{"itemId":"COPPER_ORE","quantity":10},{"itemId":"COPPER_ORE","quantity":5,"locked":true},{"itemId":"THORN_SAP","quantity":2}]},"settings":{"lockedItemIds":[]}}'::jsonb,0),
  (a[2],c[2],
  '{"inventory":{"stacks":[{"itemId":"GREENWOOD_LOG","quantity":2},{"itemId":"GREENWOOD_LOG","quantity":4,"bound":true},{"itemId":"COPPER_ORE","quantity":4}]},"settings":{"lockedItemIds":[]}}'::jsonb,0);

 ore:=private.freeze_party_event_supply_order_v16(
  p,start_at,1,'COPPER_ORE','required',3);
 wood:=private.freeze_party_event_supply_order_v16(
  p,start_at,1,'GREENWOOD_LOG','required',2);
 if ore<>private.freeze_party_event_supply_order_v16(
   p,start_at,1,'COPPER_ORE','required',3)
 then raise exception 'V16 exact order replay changed ID';end if;
 begin
  perform private.freeze_party_event_supply_order_v16(
   p,start_at,1,'COPPER_ORE','required',4);
  raise exception 'V16 frozen order target changed';
 exception when others then
  if sqlerrm<>'party_event_v16_order_conflict' then raise;end if;
 end;
 begin
  perform private.freeze_party_event_supply_order_v16(
   p,start_at,1,'THORN_SAP','required',1);
  raise exception 'V16 unverified herb accepted';
 exception when others then
  if sqlerrm<>'party_event_v16_resource_unverified' then raise;end if;
 end;
 report:=private.party_event_stage_readiness_v16(p,start_at);
 if (report->>'requiredSupplyCategories')::int<>2
  or (report->>'requiredSupplyPlanComplete')::boolean
  or (report->>'requiredSuppliesVerified')::boolean
 then raise exception 'V16 missing-herb category incorrectly complete';end if;

 -- Test-only enablement emulates a future audited herb source; it is NOT
 -- enabled by the production migration and no service-role UPDATE exists.
 update private.party_event_supply_catalogue_v16
  set enabled=true where item_id='THORN_SAP';
 herb:=private.freeze_party_event_supply_order_v16(
  p,start_at,1,'THORN_SAP','required',1);
 report:=private.party_event_stage_readiness_v16(p,start_at);
 if (report->>'requiredSupplyPlanComplete')::boolean is distinct from true
  or (report->>'requiredSuppliesRemaining')::int<>6
 then raise exception 'V16 complete frozen plan calculation invalid';end if;

 begin
  perform private.donate_party_event_supply_v16(
   p,start_at,ore,a[2],5,'v16-invalid-overfill');
  raise exception 'V16 overfill accepted';
 exception when others then
  if sqlerrm<>'party_event_v16_order_overfill' then raise;end if;
 end;
 begin
  perform private.donate_party_event_supply_v16(
   p,start_at,herb,a[2],1,'v16-missing-herb');
  raise exception 'V16 nonexistent stack consumed';
 exception when others then
  if sqlerrm<>'party_event_v16_insufficient_items' then raise;end if;
 end;

 resp:=private.donate_party_event_supply_v16(
  p,start_at,ore,a[1],3,'v16-donate-ore-001');
 if resp->>'replayed'<>'false' or (resp->>'itemsConsumed')::int<>3
  or (resp->>'remaining')::int<>0
 then raise exception 'V16 ore not burned correctly';end if;
 again:=private.donate_party_event_supply_v16(
  p,start_at,ore,a[1],3,'v16-donate-ore-001');
 if again->>'replayed'<>'true' or
   (again->>'itemsConsumed')::int<>0 or
   again->>'donationId'<>resp->>'donationId'
 then raise exception 'V16 exact donation retry burned again';end if;
 begin
  perform private.donate_party_event_supply_v16(
   p,start_at,ore,a[1],2,'v16-donate-ore-001');
  raise exception 'V16 changed donation request accepted';
 exception when others then
  if sqlerrm<>'party_event_v16_donation_request_conflict' then raise;end if;
 end;
 if (select revision from public.online_game_states
   where account_id=a[1])<>1
  or (select sum((stack->>'quantity')::integer) from public.online_game_states g,
    lateral jsonb_array_elements(g.state#>'{inventory,stacks}') stack
    where g.account_id=a[1] and stack->>'itemId'='COPPER_ORE')<>12
 then raise exception 'V16 inventory not atomically decremented once';end if;

 -- Resource lock protects a full material item, even if stack unlocked.
 update public.online_game_states set
  state=jsonb_set(state,'{settings,lockedItemIds}','["GREENWOOD_LOG"]'::jsonb)
 where account_id=a[2];
 begin
  perform private.donate_party_event_supply_v16(
   p,start_at,wood,a[2],2,'v16-locked-wood-001');
  raise exception 'V16 locked resource donated';
 exception when others then
  if sqlerrm<>'party_event_v16_item_locked' then raise;end if;
 end;
 update public.online_game_states set
  state=jsonb_set(state,'{settings,lockedItemIds}','[]'::jsonb)
 where account_id=a[2];
 resp:=private.donate_party_event_supply_v16(
  p,start_at,wood,a[2],2,'v16-donate-wood-001');
 if resp->>'replayed'<>'false'
  or (select sum((stack->>'quantity')::integer) from public.online_game_states g,
   lateral jsonb_array_elements(g.state#>'{inventory,stacks}') stack
   where g.account_id=a[2] and stack->>'itemId'='GREENWOOD_LOG')<>4
 then raise exception 'V16 bound stack should survive unlocked donation';end if;

 resp:=private.donate_party_event_supply_v16(
  p,start_at,herb,a[1],1,'v16-donate-herb-001');
 if resp->>'replayed'<>'false' then
  raise exception 'V16 simulated verified herb donation failed';end if;
 report:=private.party_event_stage_readiness_v16(p,start_at);
 if (report->>'requiredSuppliesVerified')::boolean is distinct from true
  or (report->>'requiredSuppliesRemaining')::int<>0
  or (report->>'status')<>'awaiting_progress'
  or (report->>'stageReadyToAdvance')::boolean
 then raise exception 'V16 supply goals bypassed EP stage check';end if;

 -- Synthetic score row is test-only; v14 proves the real scorer separately.
 insert into private.party_event_member_progress_v14(
  party_id,event_starts_at,account_id,activity_points)
 values(p,start_at,a[1],25);
 report:=private.party_event_stage_readiness_v16(p,start_at);
 if (report->>'status')<>'ready_for_manual_advance'
  or (report->>'verifiedTotalEventPoints')::int<>25
  or (report->>'stageReadyToAdvance')::boolean
  or (select active_stage from private.party_event_weeks_v11
    where party_id=p and event_starts_at=start_at)<>1
 then raise exception 'V16 progressed stages without manual proof or under threshold';end if;

 update private.party_event_weeks_v11 set status='closed'
 where party_id=p and event_starts_at=start_at;
 again:=private.donate_party_event_supply_v16(
  p,start_at,ore,a[1],3,'v16-donate-ore-001');
 if again->>'replayed'<>'true' then
  raise exception 'V16 donation replay after closure failed';end if;
 begin
  perform private.donate_party_event_supply_v16(
   p,start_at,wood,a[1],1,'v16-new-closed-001');
  raise exception 'V16 new donation accepted after event closure';
 exception when others then
  if sqlerrm<>'party_event_v16_donations_closed' then raise;end if;
 end;
 if (select count(*) from private.party_event_supply_donations_v16
  where party_id=p)<>3
  or exists(select 1 from private.party_event_receipts_v11
    where party_id=p and event_points_awarded<>0)
 then raise exception 'V16 duplicate donation or EP grant detected';end if;
end $$;
select 'PASS: V16 canonical material burn, frozen goals, locks, replay, supply readiness and zero rewards' result;
rollback;
