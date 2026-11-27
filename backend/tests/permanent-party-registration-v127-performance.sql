-- Synthetic benchmark ONLY, disposable CI service. All generated rows roll back.
-- No latency SLO: capture comparable server timing and indexed lookup plan.
begin;
set local statement_timeout='60s';
create temp table qa_v127_people on commit drop as
 select n,gen_random_uuid() as account_id,gen_random_uuid() as character_id
 from generate_series(1,4000) n;
create temp table qa_v127_parties on commit drop as
 select n,gen_random_uuid() as party_id from generate_series(1,1000) n;
insert into auth.users(id) select account_id from qa_v127_people;
insert into public.characters(id,account_id,class_id,level)
 select character_id,account_id,'WAYFINDER',25 from qa_v127_people;
insert into public.parties(id,status,leader_account_id,leader_character_id,minimum_level)
 select p.party_id,'active',a.account_id,a.character_id,10
 from qa_v127_parties p join qa_v127_people a on a.n=(p.n-1)*4+1;
insert into private.party_registration_state_v110(party_id,roster_revision,leader_account_id,minimum_level,activity_locked,qa_fixture_ready)
 select p.party_id,1,a.account_id,10,false,true
 from qa_v127_parties p join qa_v127_people a on a.n=(p.n-1)*4+1;
insert into private.party_registration_members_v110(party_id,account_id,character_id,role,joined_at)
 select p.party_id,a.account_id,a.character_id,'damage',now()-interval '10 days'
 from qa_v127_people a join qa_v127_parties p on p.n=(a.n-1)/4+1;
-- Terminal synthetic hints are query-load fixtures only, not authentic receipts.
-- 40 per account, 10 unread, plus a deliberately hot account with 2000 unread.
insert into private.party_chat_outbox_v125
 (recipient_account_id,party_id,kind,source_id,event_key,audience,terminal,roster_changed,created_at,acknowledged_at)
 select a.account_id,p.party_id,'role_swap',gen_random_uuid(),'bench:'||g.n,'member',true,false,
 now()-interval '1 day'+g.n*interval '1 second',
 case when g.n<=30 then now() else null end
 from qa_v127_people a join qa_v127_parties p on p.n=(a.n-1)/4+1
 cross join generate_series(1,40) g(n);
insert into private.party_chat_outbox_v125
 (recipient_account_id,party_id,kind,source_id,event_key,audience,terminal,roster_changed,created_at)
 select a.account_id,p.party_id,'role_swap',gen_random_uuid(),'hot:'||g.n,'member',true,false,
 now()-interval '1 hour'+g.n*interval '1 second'
 from qa_v127_people a cross join qa_v127_parties p cross join generate_series(1,2000) g(n)
 where a.n=1 and p.n=1;
analyze private.party_chat_outbox_v125;
analyze private.party_registration_state_v110;
analyze private.party_registration_members_v110;
analyze public.parties;
do $test$
declare
 a uuid; p uuid; row record; lim integer; previous jsonb; candidate jsonb;
 t timestamptz; ms_old double precision[]:=array[]::double precision[];
 ms_new double precision[]:=array[]::double precision[];
 i integer; report jsonb; query_plan jsonb;
begin
 -- Exact equality on realistic prior V121–V126 effects, including applicants
 -- and previously acknowledged notifications, within the same SQL statement.
 for row in select distinct recipient_account_id,party_id from private.party_chat_outbox_v125
 where event_key not like 'bench:%' and event_key not like 'hot:%'
 loop
  foreach lim in array array[1,10,50] loop
   if private.read_party_chat_outbox_v125(row.recipient_account_id,row.party_id,lim)
     is distinct from private.read_party_chat_outbox_v127(row.recipient_account_id,row.party_id,lim)
   then raise exception 'V127 real fixture reader parity mismatch';end if;
  end loop;
 end loop;
 select account_id into a from qa_v127_people where n=1;
 select party_id into p from qa_v127_parties where n=1;
 previous:=private.read_party_chat_outbox_v125(a,p,50);
 candidate:=private.read_party_chat_outbox_v127(a,p,50);
 if previous is distinct from candidate or jsonb_array_length(candidate)<>50
 then raise exception 'V127 hot account parity/limit mismatch';end if;
 if private.read_party_chat_outbox_v127(a,gen_random_uuid(),50)<>'[]'::jsonb
 or private.read_party_chat_outbox_v127(gen_random_uuid(),p,50)<>'[]'::jsonb
 then raise exception 'V127 outsider read leaked';end if;
 -- Warm both implementations, then alternate measurement order.
 for i in 1..5 loop
  perform private.read_party_chat_outbox_v125(a,p,50);
  perform private.read_party_chat_outbox_v127(a,p,50);
 end loop;
 for i in 1..40 loop
  if i%2=0 then
   t:=clock_timestamp();perform private.read_party_chat_outbox_v125(a,p,50);
   ms_old:=array_append(ms_old,extract(epoch from clock_timestamp()-t)::double precision*1000);
   t:=clock_timestamp();perform private.read_party_chat_outbox_v127(a,p,50);
   ms_new:=array_append(ms_new,extract(epoch from clock_timestamp()-t)::double precision*1000);
  else
   t:=clock_timestamp();perform private.read_party_chat_outbox_v127(a,p,50);
   ms_new:=array_append(ms_new,extract(epoch from clock_timestamp()-t)::double precision*1000);
   t:=clock_timestamp();perform private.read_party_chat_outbox_v125(a,p,50);
   ms_old:=array_append(ms_old,extract(epoch from clock_timestamp()-t)::double precision*1000);
  end if;
 end loop;
 select jsonb_build_object('sampleCount',40,'syntheticParties',1000,'syntheticAccounts',4000,
  'syntheticOutboxRows',162000,'hotUnread',2010,
  'baselineP50Ms',(select percentile_cont(.5) within group(order by v) from unnest(ms_old) v),
  'baselineP95Ms',(select percentile_cont(.95) within group(order by v) from unnest(ms_old) v),
  'candidateP50Ms',(select percentile_cont(.5) within group(order by v) from unnest(ms_new) v),
  'candidateP95Ms',(select percentile_cont(.95) within group(order by v) from unnest(ms_new) v)) into report;
 raise notice 'PARTY_V127_SYNTHETIC_BENCHMARK %',report;
 execute 'explain (analyze,buffers,format json) select id from private.party_chat_outbox_v125
 where recipient_account_id=$1 and party_id=$2 and acknowledged_at is null order by created_at,id limit 50'
 into query_plan using a,p;
 raise notice 'PARTY_V127_UNREAD_LOOKUP_PLAN %',query_plan;
 if not exists(select 1 from jsonb_path_query(query_plan,'$.**."Index Name"') x
  where x=to_jsonb('party_chat_outbox_pending_v125'::text))
 then raise exception 'V127 indexed unread lookup not selected';end if;
 if has_function_privilege('authenticated','private.read_party_chat_outbox_v127(uuid,uuid,integer)','execute')
 or has_function_privilege('anon','private.read_party_chat_outbox_v127(uuid,uuid,integer)','execute')
 or has_function_privilege('service_role','private.read_party_chat_outbox_v127(uuid,uuid,integer)','execute')
 then raise exception 'V127 unexpected reader grant';end if;
 raise notice 'PARTY_V127_READER_PARITY_AND_INDEX_PASS';
end
$test$;
rollback;
