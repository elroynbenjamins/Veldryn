-- Isolated lifecycle regression after V126/V127. Independent fixture.
do $test$
declare
 p uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
 ca uuid:=gen_random_uuid(); cb uuid:=gen_random_uuid(); cc uuid:=gen_random_uuid();
 before_rows jsonb; before_legacy jsonb; result jsonb; snap jsonb; proposal uuid:=gen_random_uuid(); t timestamptz;
begin
 insert into auth.users values(a),(b),(c);
 insert into public.characters values(ca,a,'IRONWARDEN',25),(cb,b,'WAYFINDER',25),(cc,c,'DAWNKEEPER',25);
 insert into public.parties(id,status,leader_account_id,leader_character_id,minimum_level) values(p,'active',a,ca,10);
 insert into public.party_members values
 (p,ca,a,'tank','2026-11-01 00:00:00+00',null),
 (p,cb,b,'damage','2026-11-02 00:00:00+00',null),
 (p,cc,c,'support','2026-11-03 00:00:00+00',null);
 snap:=private.seed_party_registration_v126(p);
 update private.party_registration_state_v110 set qa_fixture_ready=true,activity_locked=false where party_id=p;
 before_rows:=snap->'members';
 select jsonb_agg(to_jsonb(m) order by character_id) into before_legacy from public.party_members m where party_id=p;
 t:=clock_timestamp();
 insert into private.party_role_swap_proposals_v108
 (id,party_id,proposer_account_id,roster_revision,original_roster,original_roster_digest,created_at,expires_at)
 values(proposal,p,a,1,snap,encode(sha256(convert_to(snap::text,'UTF8')),'hex'),t,t+interval '5 minutes');
 begin
  perform private.change_party_membership_v129(b,p,'NOT_LEADER',1,'remove',c);
  raise exception 'expected authorization denial';
 exception when raise_exception then
  if sqlerrm<>'party_membership_v129_not_leader' then raise;end if;
 end;
 begin
  perform private.change_party_membership_v129(a,p,'TRANSFER',1,'transfer',c);
  raise exception 'forced_lifecycle_rollback';
 exception when raise_exception then
  if sqlerrm<>'forced_lifecycle_rollback' then raise;end if;
 end;
 if private.party_registration_snapshot_v110(p) is distinct from snap
 or (select state from private.party_role_swap_proposals_v108 where id=proposal)<>'pending'
 then raise exception 'lifecycle rollback failed';end if;
 result:=private.change_party_membership_v129(a,p,'TRANSFER',1,'transfer',c);
 if result->>'leaderAccountId'<>c::text or result->>'rosterRevision'<>'2'
 or (select state from private.party_role_swap_proposals_v108 where id=proposal)<>'cancelled'
 or private.party_registration_snapshot_v110(p)->'members' is distinct from before_rows
 then raise exception 'transfer failed';end if;
 if private.change_party_membership_v129(a,p,'TRANSFER',1,'transfer',c)
 is distinct from jsonb_set(result,'{newlyRecorded}','false'::jsonb) then raise exception 'transfer replay failed';end if;
 begin
  perform private.change_party_membership_v129(a,p,'TRANSFER',1,'transfer',b);
  raise exception 'expected conflicting replay';
 exception when raise_exception then
  if sqlerrm<>'party_membership_v129_conflicting_replay' then raise;end if;
 end;
 result:=private.change_party_membership_v129(c,p,'LEAVE',2,'leave');
 if result->>'leaderAccountId'<>a::text or result->>'rosterRevision'<>'3'
 or (select count(*) from private.party_active_members_v126(p))<>2
 or not exists(select 1 from private.party_registration_departures_v129 where party_id=p and account_id=c and reason='leave')
 then raise exception 'leader succession failed';end if;
 if private.change_party_membership_v129(c,p,'LEAVE',2,'leave')->>'newlyRecorded'<>'false'
 then raise exception 'departure replay failed';end if;
 begin
  perform private.change_party_membership_v129(a,p,'STALE_REMOVE',2,'remove',b);
  raise exception 'expected stale denial';
 exception when raise_exception then
  if sqlerrm<>'party_membership_v129_stale_or_locked' then raise;end if;
 end;
 result:=private.change_party_membership_v129(a,p,'REMOVE',3,'remove',b);
 if result->>'rosterRevision'<>'4' or (select count(*) from private.party_active_members_v126(p))<>1
 then raise exception 'remove failed';end if;
 result:=private.change_party_membership_v129(a,p,'DISBAND',4,'disband');
 if result->>'status'<>'disbanded' or result->>'rosterRevision'<>'5' or result->>'leaderAccountId' is not null
 or (select count(*) from private.party_active_members_v126(p))<>0
 or (select count(*) from private.party_registration_departures_v129 where party_id=p)<>3
 then raise exception 'disband failed';end if;
 if exists(select 1 from private.party_registration_departures_v129 d
 where d.party_id=p and not exists(select 1 from jsonb_array_elements(before_rows) j
 where j->>'registrationId'=d.registration_id::text and j->>'characterId'=d.character_id::text
 and (j->>'joinedAt')::timestamptz=d.joined_at))
 then raise exception 'membership history altered';end if;
 if (select jsonb_agg(to_jsonb(m) order by character_id) from public.party_members m where party_id=p) is distinct from before_legacy
 then raise exception 'legacy data altered';end if;
 if has_function_privilege('authenticated','private.change_party_membership_v129(uuid,uuid,text,bigint,text,uuid)','execute')
 or has_function_privilege('anon','private.change_party_membership_v129(uuid,uuid,text,bigint,text,uuid)','execute')
 or has_function_privilege('service_role','private.change_party_membership_v129(uuid,uuid,text,bigint,text,uuid)','execute')
 then raise exception 'unexpected execute grant';end if;
 raise notice 'PARTY_MEMBERSHIP_V129_LIFECYCLE_REPLAY_HISTORY_PASS';
end
$test$;
