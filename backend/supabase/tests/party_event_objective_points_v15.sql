-- Veldryn Party Events v15: immutable objective receipts earn 5 EP exactly once.
-- Must run after v11-v15 migrations under BEGIN/ROLLBACK.
begin;
do $$
declare
 a uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); p uuid:=gen_random_uuid();
 start_at timestamptz:=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC';
 source_id text; action_name text; kind text; request_id text;
 rid uuid; out_a jsonb; out_b jsonb; readiness jsonb;
 ix integer;stage_id smallint;
begin
 if has_table_privilege('service_role','private.party_event_special_credits_v15','insert')
  or has_function_privilege('authenticated',
   'private.credit_party_event_objective_v15(uuid,timestamptz,uuid)','execute')
  or has_function_privilege('anon',
   'private.party_event_stage_readiness_v15(uuid,timestamptz)','execute')
 then raise exception 'V15 permissions too broad';end if;

 insert into auth.users(id,email) values(a,'v15-'||a||'@example.invalid');
 insert into public.characters(id,account_id,name,class_id)
 values(c,a,'Special Objective Tester','IRONWARDEN');
 insert into public.parties(id,leader_account_id,leader_character_id) values(p,a,c);
 insert into private.party_event_weeks_v11(
  party_id,event_starts_at,event_ends_at,family,variation,seed,difficulty)
 values(p,start_at,start_at+interval '7 days',
  'broken_caravan','bandits_crossing',0,'standard');
 insert into private.party_event_roster_v11(
  party_id,event_starts_at,account_id,character_id,role,joined_at)
 values(p,start_at,a,c,'tank',start_at);
 -- Readiness requires >=2, so enroll second actual player.
 declare
  a2 uuid:=gen_random_uuid();c2 uuid:=gen_random_uuid();
 begin
  insert into auth.users(id,email) values(a2,'v15-'||a2||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id)
   values(c2,a2,'Other Objective Tester','WAYFINDER');
  insert into private.party_event_roster_v11(
   party_id,event_starts_at,account_id,character_id,role,joined_at)
  values(p,start_at,a2,c2,'damage',start_at);
 end;
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at)
 values(p,start_at,1,start_at);

 for ix in 1..4 loop
  stage_id:=case when ix=1 then 1 when ix=4 then 3 else 2 end;
  action_name:=case ix when 1 then 'scout_route'
   when 2 then 'secure_approach'
   when 3 then 'support_expedition'
   else 'prepare_finale' end;
  kind:=case ix when 2 then 'verified_combat' else 'verified_noncombat' end;
  if stage_id=2 and ix=2 then
   update private.party_event_weeks_v11 set active_stage=2
   where party_id=p and event_starts_at=start_at;
   insert into private.party_event_stages_v11(
    party_id,event_starts_at,stage,opened_at)
   values(p,start_at,2,now()-interval '2 seconds');
   update private.party_event_stages_v11
    set vote_choice='safe_pass',vote_locked_at=now()-interval '1 second'
   where party_id=p and event_starts_at=start_at and stage=2;
  elsif stage_id=3 then
   update private.party_event_weeks_v11 set active_stage=3
   where party_id=p and event_starts_at=start_at;
   insert into private.party_event_stages_v11(
    party_id,event_starts_at,stage,opened_at)
   values(p,start_at,3,now()-interval '0.5 seconds');
   update private.party_event_stages_v11
    set vote_choice='brace_wagons',vote_locked_at=now()
   where party_id=p and event_starts_at=start_at and stage=3;
  end if;
  source_id:='v15:source:'||ix::text||':'||p::text;
  request_id:='v15:objective:'||ix::text||':'||p::text;
  -- Synthetic private source inserted only by database-privileged TEST.
  -- Canonical gameplay provenance was independently verified in v12/v13.
  insert into private.party_event_sources_v11(
   source_event_id,party_id,event_starts_at,account_id,stage,kind,
   occurred_at,committed_at)
  values(source_id,p,start_at,a,stage_id,kind,now(),now());
  select (private.record_party_event_action_v11(p,start_at,source_id,
   action_name,request_id,repeat('a',64))->>'receiptId')::uuid into rid;
  out_a:=private.credit_party_event_objective_v15(p,start_at,rid);
  if out_a->>'replayed'<>'false' or
   (out_a->>'eventPointsGranted')::int<>5
  then raise exception 'V15 first claim must earn exactly 5 EP';end if;
  out_b:=private.credit_party_event_objective_v15(p,start_at,rid);
  if out_b->>'replayed'<>'true' or
   (out_b->>'eventPointsGranted')::int<>0 or
   (out_b->>'originalPointsCredited')::int<>5
  then raise exception 'V15 replay awarded again';end if;

  readiness:=private.party_event_stage_readiness_v15(p,start_at);
  if (readiness->>'verifiedSpecialPoints')::int<>ix*5
   or (readiness->>'verifiedTotalEventPoints')::int<>ix*5
   or (readiness->>'stageReadyToAdvance')::boolean
   or (readiness->>'requiredSuppliesVerified')::boolean
  then raise exception 'V15 readiness bypassed missing resource proofs';end if;
 end loop;

 if (select count(*) from private.party_event_special_credits_v15
  where party_id=p and account_id=a)<>4
  or (select sum(points_credited) from private.party_event_special_credits_v15
   where party_id=p and account_id=a)<>20
  or exists(select 1 from private.party_event_receipts_v11
   where party_id=p and event_points_awarded<>0)
 then raise exception 'V15 immutable objective or 20 special EP cap violated';end if;
 begin
  perform private.credit_party_event_objective_v15(
   p,start_at,gen_random_uuid());
  raise exception 'V15 forged receipt accepted';
 exception when others then
  if sqlerrm<>'party_event_v15_unverified_objective' then raise;end if;
 end;
 update private.party_event_weeks_v11 set status='closed'
 where party_id=p and event_starts_at=start_at;
 out_b:=private.credit_party_event_objective_v15(p,start_at,rid);
 if out_b->>'replayed'<>'true' or (out_b->>'eventPointsGranted')::int<>0
 then raise exception 'V15 postclose replay failed';end if;
 begin
  perform private.credit_party_event_objective_v15(
   p,start_at,gen_random_uuid());
  raise exception 'V15 new credit permitted after closing';
 exception when others then
  if sqlerrm<>'party_event_v15_window_closed' then raise;end if;
 end;
end $$;
select 'PASS: V15 objective EP from verified immutable v11 receipts, 20 cap, replay and conservative readiness' result;
rollback;
