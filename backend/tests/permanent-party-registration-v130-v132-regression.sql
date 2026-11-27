-- Disposable fixture after V129. No credit, deletion or external writes.
do $test$
declare
 p uuid:=gen_random_uuid(); q uuid:=gen_random_uuid();
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
 ca uuid:=gen_random_uuid(); cb uuid:=gen_random_uuid(); cc uuid:=gen_random_uuid();
 first_b uuid; second_b uuid; reg_a uuid; result jsonb; before_rows jsonb;
 joined_b timestamptz; t timestamptz; snapshot jsonb;
 app_id uuid:=gen_random_uuid(); msg_id uuid:=gen_random_uuid();
begin
 insert into auth.users values(a),(b),(c);
 insert into public.characters values(ca,a,'IRONWARDEN',25),(cb,b,'WAYFINDER',25),(cc,c,'DAWNKEEPER',25);
 -- A seeded legacy Party proves frozen rows do not prevent rejoining.
 insert into public.parties(id,status,leader_account_id,leader_character_id,minimum_level)
 values(p,'active',a,ca,10);
 insert into public.party_members values(p,ca,a,'tank','2026-11-01 00:00:00+00',null),
 (p,cb,b,'damage','2026-11-02 00:00:00+00',null);
 snapshot:=private.seed_party_registration_v126(p);
 update private.party_registration_state_v110 set qa_fixture_ready=true,activity_locked=false where party_id=p;
 select registration_id into first_b from private.party_registration_members_v110 where party_id=p and account_id=b;
 select registration_id into reg_a from private.party_registration_members_v110 where party_id=p and account_id=a;
 select jsonb_agg(to_jsonb(m) order by character_id) into before_rows from public.party_members m where party_id=p;
 t:=clock_timestamp();
 result:=private.capture_party_contract_scope_v130(b,p,first_b,cb,1,t);
 if result->>'canCredit'<>'false' or result->>'registrationId'<>first_b::text
 then raise exception 'custody capture invalid';end if;
 begin
  perform private.capture_party_contract_scope_v130(b,p,first_b,ca,1,t);
  raise exception 'expected wrong hero rejection';
 exception when raise_exception then
  if sqlerrm<>'party_custody_v130_ineligible' then raise;end if;
 end;
 perform private.change_party_membership_v129(b,p,'LEAVE_V131',1,'leave');
 begin
  perform private.capture_party_contract_scope_v130(b,p,first_b,cb,1,t);
  raise exception 'expected stale custody rejection';
 exception when raise_exception then
  if sqlerrm<>'party_custody_v130_stale' then raise;end if;
 end;
 if not private.party_entry_account_available_v131(b) then raise exception 'frozen legacy row blocked rejoin';end if;
 result:=private.enter_party_registration_v131(b,p,cb,'REJOIN_V131',2,'join');
 second_b:=(result->>'registrationId')::uuid;
 if second_b=first_b or result->>'rosterRevision'<>'3'
 or not exists(select 1 from private.party_registration_departures_v129 where registration_id=first_b)
 then raise exception 'rejoin identity/history failure';end if;
 if private.enter_party_registration_v131(b,p,cb,'REJOIN_V131',2,'join')
 is distinct from jsonb_set(result,'{newlyRecorded}','false'::jsonb) then raise exception 'entry replay failed';end if;
 select joined_at into joined_b from private.party_registration_members_v110 where registration_id=second_b;
 begin
  perform private.capture_party_contract_scope_v130(b,p,second_b,cb,3,joined_b-interval '1 microsecond');
  raise exception 'expected prejoin activity rejection';
 exception when raise_exception then
  if sqlerrm<>'party_custody_v130_ineligible' then raise;end if;
 end;
 begin
  perform private.capture_party_contract_scope_v130(b,p,first_b,cb,3,clock_timestamp());
  raise exception 'expected previous registration rejection';
 exception when raise_exception then
  if sqlerrm<>'party_custody_v130_ineligible' then raise;end if;
 end;
 result:=private.inspect_party_deletion_v132(b,cb);
 if result->>'activeRegistrations'<>'1' or result->>'departureHistory'<>'1'
 or result->>'legacyRows'<>'1' or result->>'canDelete'<>'false'
 then raise exception 'deletion preflight missed references';end if;
 begin
  perform private.inspect_party_deletion_v132(b,ca);
  raise exception 'expected deletion ownership denial';
 exception when raise_exception then
  if sqlerrm<>'party_deletion_v132_not_owned' then raise;end if;
 end;
 begin
  perform private.enter_party_registration_v131(b,q,cb,'DOUBLE_PARTY',0,'create');
  raise exception 'expected cross-party membership denial';
 exception when raise_exception then
  if sqlerrm<>'party_entry_v131_already_member' then raise;end if;
 end;
 begin
  perform private.enter_party_registration_v131(c,q,cc,'CREATE_V131',0,'create');
  raise exception 'forced_create_rollback';
 exception when raise_exception then
  if sqlerrm<>'forced_create_rollback' then raise;end if;
 end;
 if exists(select 1 from public.parties where id=q)
 then raise exception 'failed creation leaked parent';end if;
 result:=private.enter_party_registration_v131(c,q,cc,'CREATE_V131',0,'create');
 if result->>'rosterRevision'<>'1' or result->>'role'<>'support'
 or (select count(*) from private.party_active_members_v126(q))<>1
 then raise exception 'creation failed';end if;
 if private.enter_party_registration_v131(c,q,cc,'CREATE_V131',0,'create')
 is distinct from jsonb_set(result,'{newlyRecorded}','false'::jsonb) then raise exception 'create replay failed';end if;
 result:=private.inspect_party_deletion_v132(c,null);
 if result->>'leaderReferences'<>'1' or result->>'activeRegistrations'<>'1'
 or result->>'canDelete'<>'false' then raise exception 'account deletion preflight failed';end if;
 -- V135: old fenced membership cannot block a recruitment-based join.
 perform private.change_party_membership_v129(b,p,'LEAVE_AGAIN_V135',3,'leave');
 insert into public.chat_messages values(msg_id,null,'party',q::text,true);
 perform private.open_party_recruitment_application_v124(app_id,b,q,cb,msg_id);
 result:=private.read_party_recruitment_chat_v128(c,q,msg_id);
 if result is null or result->>'status'<>'pending' or result->'allowedActions'<>'["accept","decline"]'::jsonb
 then raise exception 'shared eligibility mismatch in recruitment projection';end if;
 result:=private.respond_party_recruitment_chat_v128(c,'JOIN_V135',q,app_id,msg_id,1,1,'accept');
 if result->'response'->>'state'<>'accepted'
 or (select count(*) from private.party_active_members_v126(q))<>2
 or exists(select 1 from private.party_active_members_v126(p) m where m.account_id=b)
 then raise exception 'shared eligibility mismatch in recruitment join';end if;
 if jsonb_array_length(private.read_party_chat_outbox_v125(b,q,50))=0
 or private.read_party_chat_outbox_v125(b,q,50) is distinct from private.read_party_chat_outbox_v127(b,q,50)
 then raise exception 'outbox parity before disband';end if;
 perform private.change_party_membership_v129(c,q,'DISBAND_V135',2,'disband');
 if private.read_party_chat_outbox_v125(b,q,50)<>'[]'::jsonb
 or private.read_party_chat_outbox_v127(b,q,50)<>'[]'::jsonb
 or private.read_party_recruitment_chat_v128(c,q,msg_id) is not null
 or (select count(*) from private.party_active_members_v126(q))<>0
 then raise exception 'private disband leaked active Party data';end if;
 if (select jsonb_agg(to_jsonb(m) order by character_id) from public.party_members m where party_id=p) is distinct from before_rows
 then raise exception 'legacy rows modified';end if;
 if has_function_privilege('authenticated','private.enter_party_registration_v131(uuid,uuid,uuid,text,bigint,text)','execute')
 or has_function_privilege('authenticated','private.capture_party_contract_scope_v130(uuid,uuid,uuid,uuid,bigint,timestamptz)','execute')
 or has_function_privilege('authenticated','private.inspect_party_deletion_v132(uuid,uuid)','execute')
 then raise exception 'unexpected execute grant';end if;
 raise notice 'PARTY_V130_V132_CUSTODY_ENTRY_DELETION_PREFLIGHT_PASS';
end
$test$;
