-- Staging-only transactional regression. No state persists after ROLLBACK.
-- A successful run returns no rows; any failed assertion aborts and rolls back.
begin;
do $qa$
declare
  a uuid;c1 uuid;c2 uuid;p uuid;j timestamptz;
  old_class text;new_class text;old_role text;new_role text;role_now text;
  members jsonb;m jsonb;v_metric text;v_credit_count integer;
begin
  select c.account_id,c.id,upper(c.class_id::text) into a,c1,old_class
    from public.characters c
    join public.online_game_states s on s.account_id=c.account_id and s.character_id=c.id
    join public.player_profiles prof on prof.account_id=c.account_id
   where c.level>=10 limit 1;
  if a is null then raise exception 'qa_no_fixture';end if;
  old_role:=case when old_class in ('IRONWARDEN','BASTION','DREADGUARD') then 'tank'
    when old_class in ('DAWNKEEPER','STONECALLER') then 'support' else 'damage' end;
  new_class:=case when old_role='support' then 'KNIFE_DANCER' else 'DAWNKEEPER' end;
  new_role:=case when old_role='support' then 'damage' else 'support' end;
  perform set_config('request.jwt.claim.sub',a::text,true);
  insert into public.characters(account_id,name,class_id,level)
    values(a,'QaAltHero',new_class,10) returning id into c2;
  insert into public.parties(leader_account_id,leader_character_id,status)
    values(a,c1,'active') returning id into p;
  insert into public.party_members(party_id,character_id,account_id,role)
    values(p,c1,a,old_role);
  select joined_at into j from public.party_members where party_id=p and account_id=a;

  update public.player_profiles set active_character_id=c2 where account_id=a;
  members:=public.party_social_state_v16() #> '{party,members}';
  select value into m from jsonb_array_elements(members)
    where value->>'accountId'=a::text;
  if m->>'characterId' is distinct from c2::text
     or m->>'role' is distinct from new_role
     or m->>'characterName' is distinct from 'QaAltHero'
  then raise exception 'qa_wrong_party_projection';end if;

  -- A verified action from the alternate character must credit the same
  -- account-owned Party Contract, without needing a second Party member.
  select o.metric into v_metric from public.party_contract_instances_v16 i
    join public.party_contract_objectives_v16 o
      on o.definition_id=i.definition_id and o.definition_version=i.definition_version
   where i.party_id=p and i.status='active'
     and i.starts_at<=now() and i.ends_at>now()
   order by i.starts_at desc limit 1;
  if v_metric is null then raise exception 'qa_contract_fixture_missing';end if;
  v_credit_count:=public.settle_party_activity_v16(c2,v_metric,5,
      'qa-alt-character-contract-credit',now());
  if v_credit_count<=0 then raise exception 'qa_alt_contract_not_credited';end if;

  update public.online_game_states set character_id=c2 where account_id=a;
  select role into role_now from public.party_members where party_id=p and account_id=a;
  if role_now<>new_role then raise exception 'qa_role_sync_failed';end if;
  if (select leader_character_id from public.parties where id=p)<>c2
     then raise exception 'qa_leader_sync_failed';end if;
  if (select joined_at from public.party_members where party_id=p and account_id=a)<>j
     then raise exception 'qa_joined_at_changed';end if;
  if (select character_id from public.party_members where party_id=p and account_id=a)<>c1
     then raise exception 'qa_membership_pk_changed';end if;
  if (select count(*) from public.party_members where account_id=a and left_at is null)<>1
     then raise exception 'qa_duplicate_party_slot';end if;
end
$qa$;
rollback;
