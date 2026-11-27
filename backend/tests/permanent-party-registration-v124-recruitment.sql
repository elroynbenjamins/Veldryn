-- Disposable fixture after V111 round-trip and V121/V122 concurrency tests.
do $test$
declare
 party constant uuid:='00000000-0000-0000-0000-000000000010';
 leader constant uuid:='00000000-0000-0000-0000-000000000001';
 member constant uuid:='00000000-0000-0000-0000-000000000002';
 a constant uuid:='00000000-0000-0000-0000-000000000003';
 b constant uuid:='00000000-0000-0000-0000-000000000004';
 c constant uuid:='00000000-0000-0000-0000-000000000005';
 ca constant uuid:='00000000-0000-0000-0000-000000000051';
 cb constant uuid:='00000000-0000-0000-0000-000000000052';
 cc constant uuid:='00000000-0000-0000-0000-000000000053';
 other_party uuid:=gen_random_uuid();
 app_a uuid:=gen_random_uuid(); app_b uuid:=gen_random_uuid();
 app_b2 uuid:=gen_random_uuid(); app_c uuid:=gen_random_uuid();
 ma uuid:=gen_random_uuid();mb uuid:=gen_random_uuid();
 mb2 uuid:=gen_random_uuid();mc uuid:=gen_random_uuid();
 before_roster jsonb;before_public jsonb;result jsonb;rev bigint;
begin
 insert into auth.users values(a),(b),(c);
 insert into public.characters values(ca,a,'DAWNKEEPER',25),(cb,b,'WAYFINDER',25),(cc,c,'BASTION',25);
 insert into public.parties values(other_party,'active');
 insert into public.chat_messages values
 (ma,null,'party',party::text,true),(mb,null,'party',party::text,true),
 (mb2,null,'party',party::text,true),(mc,c,'party',party::text,false);
 before_roster:=private.party_registration_snapshot_v110(party);
 rev:=(before_roster->>'rosterRevision')::bigint;
 select jsonb_agg(to_jsonb(m) order by character_id) into before_public from public.party_members m;
 begin
  perform private.open_party_recruitment_application_v124(app_c,c,party,ca,mc);
  raise exception 'expected ownership denial';
 exception when raise_exception then
  if sqlerrm<>'party_recruit_v124_not_owned' then raise;end if;
 end;
 begin
  perform private.open_party_recruitment_application_v124(app_c,c,party,cc,mc);
  raise exception 'expected spoof denial';
 exception when raise_exception then
  if sqlerrm<>'party_recruit_v124_unverified_message' then raise;end if;
 end;
 if private.open_party_recruitment_application_v124(app_a,a,party,ca,ma)<>app_a then raise exception 'missing application';end if;
 if private.open_party_recruitment_application_v124(app_a,a,party,ca,ma)<>app_a then raise exception 'missing replay';end if;
 perform private.open_party_recruitment_application_v124(app_b,b,party,cb,mb);
 if private.party_registration_snapshot_v110(party) is distinct from before_roster then raise exception 'application changed membership';end if;
 begin
  perform private.respond_party_recruitment_application_v124(member,party,app_a,'accept');
  raise exception 'expected leader denial';
 exception when raise_exception then
  if sqlerrm<>'party_recruit_v124_not_leader' then raise;end if;
 end;
 -- Existing direct join elsewhere after application invalidates approval.
 insert into public.party_members values(other_party,ca,a,'support',clock_timestamp(),null);
 begin
  perform private.respond_party_recruitment_application_v124(leader,party,app_a,'accept');
  raise exception 'expected existing party denial';
 exception when raise_exception then
  if sqlerrm<>'party_recruit_v124_already_in_party' then raise;end if;
 end;
 delete from public.party_members where party_id=other_party and account_id=a;
 -- Revalidate the exact hero's level, not just eligibility at application.
 update public.characters set level=1 where id=ca;
 begin
  perform private.respond_party_recruitment_application_v124(leader,party,app_a,'accept');
  raise exception 'expected level denial';
 exception when raise_exception then
  if sqlerrm<>'party_recruit_v124_ineligible' then raise;end if;
 end;
 update public.characters set level=25 where id=ca;
 begin
  perform private.respond_party_recruitment_application_v124(leader,party,app_a,'accept');
  raise exception 'forced_v124_rollback';
 exception when raise_exception then
  if sqlerrm<>'forced_v124_rollback' then raise;end if;
 end;
 if private.party_registration_snapshot_v110(party) is distinct from before_roster
 or (select state from private.party_recruitment_applications_v124 where id=app_a)<>'pending'
 then raise exception 'approval rollback failed';end if;
 result:=private.respond_party_recruitment_application_v124(leader,party,app_a,'accept');
 if result->>'state'<>'accepted' or (result->>'committedRevision')::bigint<>rev+1
 or not exists(select 1 from private.party_registration_members_v110 where party_id=party and account_id=a and character_id=ca and role='support')
 then raise exception 'valid approval did not join';end if;
 if private.respond_party_recruitment_application_v124(leader,party,app_a,'accept')->>'replayed'<>'true'
 then raise exception 'missing approval replay';end if;
 begin
  perform private.respond_party_recruitment_application_v124(leader,party,app_b,'accept');
  raise exception 'expected stale roster';
 exception when raise_exception then
  if sqlerrm<>'party_recruit_v124_stale_roster' then raise;end if;
 end;
 if private.respond_party_recruitment_application_v124(b,party,app_b,'withdraw')->>'state'<>'withdrawn'
 then raise exception 'withdrawal failed';end if;
 perform private.open_party_recruitment_application_v124(app_b2,b,party,cb,mb2);
 if private.respond_party_recruitment_application_v124(leader,party,app_b2,'accept')->>'state'<>'accepted'
 then raise exception 'reapplication failed';end if;
 if (select count(*) from private.party_registration_members_v110 where party_id=party)<>4
 then raise exception 'membership count incorrect';end if;
 update public.chat_messages set account_id=null,is_system=true where id=mc;
 begin
  perform private.open_party_recruitment_application_v124(app_c,c,party,cc,mc);
  raise exception 'expected full party denial';
 exception when raise_exception then
  if sqlerrm<>'party_recruit_v124_full' then raise;end if;
 end;
 if (select jsonb_agg(to_jsonb(m) order by character_id) from public.party_members m) is distinct from before_public
 then raise exception 'legacy memberships changed';end if;
 if (select roster_revision from private.party_registration_state_v110 where party_id=party)<>rev+2
 then raise exception 'duplicate revision changes';end if;
 for result in select to_jsonb(x) from (values('anon'),('authenticated'),('service_role')) as x(role_name) loop
  if has_function_privilege(result->>'role_name','private.open_party_recruitment_application_v124(uuid,uuid,uuid,uuid,uuid)','execute')
  or has_function_privilege(result->>'role_name','private.respond_party_recruitment_application_v124(uuid,uuid,uuid,text)','execute')
  then raise exception 'unexpected execute grant';end if;
 end loop;
 raise notice 'PARTY_RECRUITMENT_V124_CONSENT_CAPACITY_ROLLBACK_PASS';
end
$test$;
