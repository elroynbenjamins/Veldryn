-- Hidden Party Events v11 ledger regression. Run against a database with
-- 20261113041500_party_event_receipt_ledger_v11.sql already applied.
-- All fixtures are synthetic and rolled back. No rewards or production changes.
begin;
do $$
declare
 a uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 c uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 p uuid:=gen_random_uuid();
 start_at timestamptz:=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC';
 hash text:=repeat('a',64);
 source1 text:='party-v11-source-001';
 source2 text:='party-v11-source-002';
 source3 text:='party-v11-source-003';
 source4 text:='party-v11-source-004';
 source5 text:='party-v11-source-005';
 result1 jsonb;result2 jsonb;replayed jsonb;
 i integer;
begin
 if has_function_privilege('anon','private.record_party_event_action_v11(uuid,timestamptz,text,text,text,text)','execute')
  or has_function_privilege('authenticated','private.record_party_event_action_v11(uuid,timestamptz,text,text,text,text)','execute')
 then raise exception 'V11 client can call internal receipt RPC';end if;
 if has_table_privilege('authenticated','private.party_event_receipts_v11','insert')
  or has_table_privilege('authenticated','private.party_event_sources_v11','select')
  or has_table_privilege('anon','private.party_event_weeks_v11','select')
 then raise exception 'V11 private data has client grants';end if;
 for i in 1..5 loop
  insert into auth.users(id,email) values(a[i],'party-v11-'||a[i]||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id)
  values(c[i],a[i],'Adventure Test '||chr(64+i),
   case i when 1 then 'IRONWARDEN' when 2 then 'WAYFINDER'
    when 3 then 'RAVAGER' when 4 then 'DAWNKEEPER' else 'BASTION' end);
 end loop;
 insert into public.parties(id,leader_account_id,leader_character_id)
 values(p,a[1],c[1]);
 insert into private.party_event_weeks_v11(party_id,event_starts_at,event_ends_at,
  family,variation,seed,difficulty)
 values(p,start_at,start_at+interval '7 days','broken_caravan','bandits_crossing',0,'standard');
 insert into private.party_event_roster_v11
  (party_id,event_starts_at,account_id,character_id,role,joined_at)
 values(p,start_at,a[1],c[1],'tank',start_at),
       (p,start_at,a[2],c[2],'damage',start_at),
       (p,start_at,a[3],c[3],'damage',start_at),
       (p,start_at,a[4],c[4],'support',start_at);

 begin
  insert into private.party_event_roster_v11
   (party_id,event_starts_at,account_id,character_id,role,joined_at)
  values(p,start_at,a[5],c[5],'damage',start_at);
  raise exception 'V11 spoofed class role accepted';
 exception when others then
  if sqlerrm<>'party_event_role_mismatch' then raise;end if;
 end;
 begin
  insert into private.party_event_roster_v11
   (party_id,event_starts_at,account_id,character_id,role,joined_at)
  values(p,start_at,a[5],c[5],'tank',start_at);
  raise exception 'V11 fifth Tank accepted';
 exception when others then
  if sqlerrm<>'party_event_role_capacity' then raise;end if;
 end;

 insert into private.party_event_stages_v11
  (party_id,event_starts_at,stage,opened_at)
 values(p,start_at,1,start_at);
 insert into private.party_event_sources_v11
  (source_event_id,party_id,event_starts_at,account_id,stage,kind,occurred_at,committed_at)
 values(source1,p,start_at,a[1],1,'verified_noncombat',now(),now()),
       (source2,p,start_at,a[2],1,'verified_combat',now(),now());

 result1:=private.record_party_event_action_v11(
  p,start_at,source1,'scout_route','party-v11-request-001',hash);
 if result1->>'replayed'<>'false' or (result1->>'eventPointsGranted')::integer<>0 then
  raise exception 'V11 first receipt not zero-credit';end if;
 replayed:=private.record_party_event_action_v11(
  p,start_at,source1,'scout_route','party-v11-request-001',hash);
 if replayed->>'replayed'<>'true' or replayed->>'receiptId'<>result1->>'receiptId'
 then raise exception 'V11 exact replay not idempotent';end if;
 begin
  perform private.record_party_event_action_v11(
   p,start_at,source1,'scout_route','party-v11-request-002',hash);
  raise exception 'V11 re-requested action accepted';
 exception when others then
  if sqlerrm<>'party_event_action_already_claimed' then raise;end if;
 end;
 begin
  perform private.record_party_event_action_v11(
   p,start_at,source2,'scout_route','party-v11-request-003',hash);
  raise exception 'V11 combat evidence used for scouting';
 exception when others then
  if sqlerrm not in ('party_event_invalid_evidence','party_event_action_already_claimed')
  then raise;end if;
 end;
 begin
  update private.party_event_sources_v11 set account_id=a[3] where source_event_id=source1;
  raise exception 'V11 source evidence was mutable';
 exception when others then
  if sqlerrm<>'party_event_record_immutable' then raise;end if;
 end;
 if (select count(*) from private.party_event_receipts_v11
  where party_id=p and event_starts_at=start_at)<>1
 then raise exception 'V11 duplicate scouting credit';end if;

 -- Stage 2 must have a locked vote, and Stage 1 cannot see it.
 update private.party_event_weeks_v11 set active_stage=2
  where party_id=p and event_starts_at=start_at;
 insert into private.party_event_stages_v11
  (party_id,event_starts_at,stage,opened_at)
 values(p,start_at,2,now()-interval '1 second');
 insert into private.party_event_sources_v11
  (source_event_id,party_id,event_starts_at,account_id,stage,kind,occurred_at,committed_at)
 values(source3,p,start_at,a[1],2,'verified_combat',now(),now());
 begin
  perform private.record_party_event_action_v11(
   p,start_at,source3,'secure_approach','party-v11-request-004',hash);
  raise exception 'V11 unresolved vote accepted';
 exception when others then
  if sqlerrm<>'party_event_vote_not_locked' then raise;end if;
 end;
 update private.party_event_stages_v11
 set vote_choice='safe_pass',vote_locked_at=now()
 where party_id=p and event_starts_at=start_at and stage=2;
 result2:=private.record_party_event_action_v11(
  p,start_at,source3,'secure_approach','party-v11-request-004',hash);
 if result2->>'replayed'<>'false' then raise exception 'V11 stage 2 was not credited';end if;
 begin
  update private.party_event_stages_v11
  set vote_choice='fast_pass' where party_id=p and event_starts_at=start_at and stage=2;
  raise exception 'V11 locked ballot was changed';
 exception when others then
  if sqlerrm<>'party_event_stage_immutable' then raise;end if;
 end;

 insert into private.party_event_sources_v11
  (source_event_id,party_id,event_starts_at,account_id,stage,kind,occurred_at,committed_at)
 values(source4,p,start_at,a[1],2,'verified_noncombat',now(),now()),
       (source5,p,start_at,a[2],2,'verified_noncombat',now(),now());
 begin
  perform private.record_party_event_action_v11(
   p,start_at,source3,'support_expedition','party-v11-request-005',hash);
  raise exception 'V11 same source used twice';
 exception when others then
  if sqlerrm<>'party_event_source_or_request_reused' then raise;end if;
 end;
 begin
  perform private.record_party_event_action_v11(
   p,start_at,source4,'secure_approach','party-v11-request-006',hash);
  raise exception 'V11 duplicate action for same account';
 exception when others then
  if sqlerrm<>'party_event_action_already_claimed' then raise;end if;
 end;
 begin
  perform private.record_party_event_action_v11(
   p,start_at,source5,'support_expedition','party-v11-request-004',hash);
  raise exception 'V11 reused request ID';
 exception when others then
  if sqlerrm<>'party_event_source_or_request_reused' then raise;end if;
 end;
 perform private.record_party_event_action_v11(
  p,start_at,source5,'support_expedition','party-v11-request-007',hash);

 update private.party_event_weeks_v11 set status='closed'
  where party_id=p and event_starts_at=start_at;
 replayed:=private.record_party_event_action_v11(
  p,start_at,source1,'scout_route','party-v11-request-001',hash);
 if replayed->>'replayed'<>'true' then
  raise exception 'V11 closed-week replay lost original receipt';end if;
 begin
  perform private.record_party_event_action_v11(
   p,start_at,source4,'support_expedition','party-v11-request-008',hash);
  raise exception 'V11 created new receipt on closed week';
 exception when others then
  if sqlerrm<>'party_event_window_closed' then raise;end if;
 end;
 if (select count(*) from private.party_event_receipts_v11 where party_id=p)<>3
 then raise exception 'V11 receipt count incorrect';end if;
 if exists(select 1 from private.party_event_receipts_v11 where event_points_awarded<>0)
 then raise exception 'V11 granted event points';end if;
end $$;
select 'PASS: V11 private ledger, role guards, vote lock, idempotency, replay, no EP' result;
rollback;
