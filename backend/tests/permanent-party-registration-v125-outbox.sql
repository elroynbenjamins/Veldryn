-- Disposable fixture after V121/V122 and V124, with V125 triggers loaded
-- before those actions. No external service or push notification.
do $test$
declare
 party constant uuid:='00000000-0000-0000-0000-000000000010';
 leader constant uuid:='00000000-0000-0000-0000-000000000001';
 member constant uuid:='00000000-0000-0000-0000-000000000002';
 applicant constant uuid:='00000000-0000-0000-0000-000000000003';
 other uuid:=gen_random_uuid();
 events jsonb;
 event_id uuid;
 leader_notice uuid;
 applicant_notice uuid;
 before_count integer;
begin
 -- Each successful V122 receipt produced exactly two hints in its original
 -- two-person roster; retries and rolled-back receipt inserts produced none.
 if (select count(*) from private.party_chat_action_receipts_v108 where kind='role_swap')<>7
 or (select count(*) from private.party_chat_outbox_v125 where kind='role_swap')<>14
 then raise exception 'missing or duplicated role swap notices';end if;
 if exists(select 1 from private.party_chat_outbox_v125 n where n.kind='role_swap'
  and not exists(select 1 from private.party_role_swap_effects_v122 e where n.event_key='swap:'||e.id::text))
 then raise exception 'orphan swap notice';end if;
 if (select count(*) from private.party_chat_outbox_v125 where kind='role_swap' and roster_changed)<>4
 then raise exception 'invalid swap roster notices';end if;
 if exists(select 1 from private.party_chat_outbox_v125 n
  where n.kind='recruitment_request' and not n.terminal and n.recipient_account_id<>leader)
 then raise exception 'pending application leaked to member';end if;
 if (select count(*) from private.party_chat_outbox_v125 where kind='recruitment_request' and not terminal)<>3
 then raise exception 'unexpected recruitment opens';end if;
 if (select count(*) from private.party_chat_outbox_v125 where kind='recruitment_request' and roster_changed)<>7
 then raise exception 'unexpected accepted recruitment hints';end if;
 events:=private.read_party_chat_outbox_v125(member,party,50);
 if jsonb_array_length(events)=0 or exists(select 1 from jsonb_array_elements(events) e
  where e->>'accountId'<>member::text or e ? 'sourceId' or e ? 'applicantName'
  or e ? 'characterId' or (e->>'needsResponse')::boolean)
 then raise exception 'member projection invalid';end if;
 event_id:=(events->0->>'eventId')::uuid;
 if private.ack_party_chat_outbox_v125(leader,party,array[event_id])<>0
 or private.ack_party_chat_outbox_v125(member,other,array[event_id])<>0
 then raise exception 'foreign ack allowed';end if;
 if private.ack_party_chat_outbox_v125(member,party,array[event_id])<>1
 or private.ack_party_chat_outbox_v125(member,party,array[event_id])<>0
 then raise exception 'ack not idempotent';end if;
 if exists(select 1 from jsonb_array_elements(private.read_party_chat_outbox_v125(member,party,50)) e
  where e->>'eventId'=event_id::text)
 then raise exception 'acked notice still visible';end if;
 if jsonb_array_length(private.read_party_chat_outbox_v125(leader,party,1))<>1
 or jsonb_array_length(private.read_party_chat_outbox_v125(other,party,50))<>0
 then raise exception 'read bounds or outsider scope failed';end if;
 select id into strict applicant_notice from private.party_chat_outbox_v125
 where recipient_account_id=applicant and audience='applicant' and roster_changed;
 select id into leader_notice from private.party_chat_outbox_v125
 where recipient_account_id=leader and audience='leader' order by created_at limit 1;
 if leader_notice is null then raise exception 'leader notice missing';end if;
 -- Test role change and departure visibility without leaving altered data.
 begin
  update private.party_registration_state_v110 set leader_account_id=member where party_id=party;
  if exists(select 1 from jsonb_array_elements(private.read_party_chat_outbox_v125(leader,party,50)) e
   where e->>'eventId'=leader_notice::text) then raise exception 'former leader still sees private application';end if;
  delete from private.party_registration_members_v110 where party_id=party and account_id=member;
  if jsonb_array_length(private.read_party_chat_outbox_v125(member,party,50))<>0
  then raise exception 'departed member still sees Party hints';end if;
  delete from private.party_registration_members_v110 where party_id=party and account_id=applicant;
  if not exists(select 1 from jsonb_array_elements(private.read_party_chat_outbox_v125(applicant,party,50)) e
   where e->>'eventId'=applicant_notice::text) then raise exception 'applicant lost own result';end if;
  raise exception 'forced_v125_visibility_rollback';
 exception when raise_exception then
  if sqlerrm<>'forced_v125_visibility_rollback' then raise;end if;
 end;
 -- Prove acknowledgement changes roll back with the enclosing transaction.
 select count(*) into before_count from private.party_chat_outbox_v125 where acknowledged_at is not null;
 begin
  perform private.ack_party_chat_outbox_v125(leader,party,array[leader_notice]);
  raise exception 'forced_v125_ack_rollback';
 exception when raise_exception then
  if sqlerrm<>'forced_v125_ack_rollback' then raise;end if;
 end;
 if (select count(*) from private.party_chat_outbox_v125 where acknowledged_at is not null)<>before_count
 then raise exception 'ack rollback failed';end if;
 for events in select to_jsonb(x) from (values('anon'),('authenticated'),('service_role')) as x(role_name) loop
  if has_function_privilege(events->>'role_name','private.read_party_chat_outbox_v125(uuid,uuid,integer)','execute')
  or has_function_privilege(events->>'role_name','private.ack_party_chat_outbox_v125(uuid,uuid,uuid[])','execute')
  or has_table_privilege(events->>'role_name','private.party_chat_outbox_v125','select')
  then raise exception 'unexpected outbox grant';end if;
 end loop;
 raise notice 'PARTY_OUTBOX_V125_SCOPED_ACK_ATOMIC_PASS';
end
$test$;
