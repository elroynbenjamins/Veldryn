-- Executed after the isolated fixture and V108/V110/V111 SQL.
insert into private.party_registration_state_v110
 (party_id,roster_revision,leader_account_id,minimum_level,activity_locked,qa_fixture_ready)
 values ('00000000-0000-0000-0000-000000000010',7,'00000000-0000-0000-0000-000000000001',10,false,true);
insert into private.party_registration_members_v110(party_id,account_id,character_id,role,joined_at)
 select party_id,account_id,character_id,role,joined_at from public.party_members where left_at is null;
do $test$
declare
 party constant uuid:='00000000-0000-0000-0000-000000000010';
 a constant uuid:='00000000-0000-0000-0000-000000000001';
 b constant uuid:='00000000-0000-0000-0000-000000000002';
 a_tank constant uuid:='00000000-0000-0000-0000-000000000011';
 a_damage constant uuid:='00000000-0000-0000-0000-000000000012';
 b_damage constant uuid:='00000000-0000-0000-0000-000000000021';
 b_tank constant uuid:='00000000-0000-0000-0000-000000000022';
 original jsonb; before_rows jsonb; before_public jsonb; after_rows jsonb;
 proposal uuid; t timestamptz; reply jsonb; i integer;
begin
 select jsonb_agg(to_jsonb(m) order by character_id) into before_public from public.party_members m;
 original:=private.party_registration_snapshot_v110(party);
 before_rows:=original->'members';
 for i in 1..2 loop
  proposal:=gen_random_uuid();t:=clock_timestamp();
  original:=private.party_registration_snapshot_v110(party);
  insert into private.party_role_swap_proposals_v108
   (id,party_id,proposer_account_id,roster_revision,original_roster,original_roster_digest,created_at,expires_at)
  values(proposal,party,a,7+i-1,original,encode(sha256(convert_to(original::text,'UTF8')),'hex'),t,t+interval '5 minutes');
  insert into private.party_role_swap_participants_v108
   (proposal_id,account_id,from_character_id,to_character_id,from_role,to_role)
  values (proposal,a,case when i=1 then a_tank else a_damage end,case when i=1 then a_damage else a_tank end,
    case when i=1 then 'tank' else 'damage' end,case when i=1 then 'damage' else 'tank' end),
   (proposal,b,case when i=1 then b_damage else b_tank end,case when i=1 then b_tank else b_damage end,
    case when i=1 then 'damage' else 'tank' end,case when i=1 then 'tank' else 'damage' end);
  reply:=private.respond_party_registration_swap_v111(party,proposal,a,'accept');
  if reply->>'state'<>'pending' or private.party_registration_snapshot_v110(party) is distinct from original
   then raise exception 'partial response changed roster';end if;
  -- Roll back a deliberately failed final response, including journal and decision.
  if i=1 then
   begin
    perform private.respond_party_registration_swap_v111(party,proposal,b,'accept');
    raise exception 'forced_fixture_rollback';
   exception when raise_exception then
    if sqlerrm<>'forced_fixture_rollback' then raise;end if;
   end;
   if private.party_registration_snapshot_v110(party) is distinct from original
    or exists(select 1 from private.party_registration_exchange_history_v110 where proposal_id=proposal)
    or exists(select 1 from private.party_role_swap_participants_v108 where proposal_id=proposal and account_id=b and decision is not null)
    then raise exception 'rollback did not restore all state';end if;
  end if;
  reply:=private.respond_party_registration_swap_v111(party,proposal,b,'accept');
  if reply->>'state'<>'completed' or (reply->>'committedRevision')::bigint<>7+i
   then raise exception 'final response failed: %',reply;end if;
  reply:=private.respond_party_registration_swap_v111(party,proposal,b,'accept');
  if reply->>'replayed'<>'true' then raise exception 'duplicate response did not replay';end if;
  if (select count(*) from private.party_registration_exchange_history_v110 where proposal_id=proposal)<>2
   then raise exception 'duplicate/missing history';end if;
  if not exists(select 1 from private.party_registration_members_v110 where party_id=party and account_id=a
    and character_id=case when i=1 then a_damage else a_tank end)
   then raise exception 'target hero not registered';end if;
 end loop;
 after_rows:=private.party_registration_snapshot_v110(party)->'members';
 if after_rows is distinct from before_rows then raise exception 'round-trip altered registration ID/joined_at/role';end if;
 if (select jsonb_agg(to_jsonb(m) order by character_id) from public.party_members m) is distinct from before_public
   then raise exception 'legacy public history changed';end if;
 if (select count(*) from private.party_registration_exchange_history_v110)<>4 then raise exception 'history lost';end if;
 if has_function_privilege('authenticated','private.respond_party_registration_swap_v111(uuid,uuid,uuid,text)','execute')
 or has_function_privilege('anon','private.respond_party_registration_swap_v111(uuid,uuid,uuid,text)','execute')
 or has_function_privilege('service_role','private.respond_party_registration_swap_v111(uuid,uuid,uuid,text)','execute')
 then raise exception 'unexpected execute grant';end if;
 raise notice 'PARTY_REGISTRATION_V111_ROUND_TRIP_ROLLBACK_REPLAY_PASS';
end
$test$;
