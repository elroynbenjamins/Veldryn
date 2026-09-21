-- Character deletion is a destructive roster mutation. Keep the online JSON
-- state and relational/social projections consistent in one database transaction.

create or replace function public.character_delete_coop_guard_server_v1(p_account_id uuid,p_character_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if exists(
    select 1
    from public.matchmaking_tickets t
    where t.account_id=p_account_id
      and t.character_id=p_character_id
      and t.mode='live'
      and t.content_version='online-coop-loadout-v1'
      and (
        t.status in ('reserved','matched')
        or (t.status='queued' and t.heartbeat_expires_at>clock_timestamp())
      )
  ) then
    return jsonb_build_object(
      'blocked',true,
      'reason','Leave the Live co-op queue or ready check before deleting this character.'
    );
  end if;

  if exists(
    select 1
    from public.coop_run_access_memberships a
    join public.expedition_runs r on r.id=a.run_id
    join public.expedition_run_members m
      on m.run_id=r.id
     and m.account_id=p_account_id
     and m.character_id=p_character_id
    where a.account_id=p_account_id
      and a.active
      and (
        r.status='active'
        or exists(
          select 1
          from public.coop_reward_entitlements e
          where e.run_id=r.id
            and e.recipient_account_id=p_account_id
            and e.claimed_at is null
        )
      )
  ) then
    return jsonb_build_object(
      'blocked',true,
      'reason','Finish or abandon this character''s dungeon run and claim any pending rewards before deleting it.'
    );
  end if;

  return jsonb_build_object('blocked',false);
end $$;

-- v2 wraps the existing authoritative commit rather than duplicating it.
-- If cleanup fails, PostgreSQL rolls back the wrapped v1 commit and receipt too.
create or replace function public.commit_online_game_server_v2(
  p_account_id uuid,
  p_expected_version bigint,
  p_expected_gold bigint,
  p_request_id text,
  p_request_hash text,
  p_response jsonb,
  p_contributions jsonb,
  p_deleted_character_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_guard jsonb;
  v_result jsonb;
  v_party record;
  v_next_account uuid;
  v_next_character uuid;
begin
  if p_deleted_character_id is null then raise exception 'deleted_character_required';end if;

  -- Serialize against queue/ready/run mutations so a character cannot enter
  -- Live co-op between the preflight check and the destructive commit.
  perform pg_advisory_xact_lock(hashtextextended('online-coop:'||p_account_id::text,0));
  v_guard:=public.character_delete_coop_guard_server_v1(p_account_id,p_deleted_character_id);
  if coalesce((v_guard->>'blocked')::boolean,false) then
    raise exception '%',coalesce(v_guard->>'reason','Leave co-op before deleting this character.');
  end if;

  if p_response#>>'{state,character,id}'=p_deleted_character_id::text
     or exists(
       select 1
       from jsonb_array_elements(coalesce(p_response#>'{state,otherCharacters}','[]'::jsonb)) entry
       where entry#>>'{character,id}'=p_deleted_character_id::text
     )
  then raise exception 'character_delete_state_mismatch';end if;

  v_result:=public.commit_online_game_server_v1(
    p_account_id,p_expected_version,p_expected_gold,p_request_id,p_request_hash,p_response,p_contributions
  );

  -- Leaving a persistent Party is part of deletion. Preserve the Party when
  -- possible by handing leadership to the oldest remaining active member.
  for v_party in
    select distinct p.id,p.leader_character_id,p.leader_account_id
    from public.parties p
    join public.party_members pm on pm.party_id=p.id
    where pm.character_id=p_deleted_character_id and pm.left_at is null
  loop
    update public.party_members
       set left_at=clock_timestamp()
     where party_id=v_party.id and character_id=p_deleted_character_id and left_at is null;

    if not exists(select 1 from public.party_members where party_id=v_party.id and left_at is null) then
      update public.parties set status='disbanded',updated_at=clock_timestamp() where id=v_party.id;
    elsif v_party.leader_character_id=p_deleted_character_id then
      select pm.account_id,pm.character_id
        into v_next_account,v_next_character
        from public.party_members pm
       where pm.party_id=v_party.id and pm.left_at is null
       order by pm.joined_at asc,pm.account_id asc
       limit 1;
      update public.parties
         set leader_account_id=v_next_account,leader_character_id=v_next_character,updated_at=clock_timestamp()
       where id=v_party.id;
    else
      update public.parties set updated_at=clock_timestamp() where id=v_party.id;
    end if;
  end loop;

  -- Old/disbanded Parties may still retain the deleted character as their
  -- historical leader. Repoint when another historical member exists.
  for v_party in
    select p.id from public.parties p where p.leader_character_id=p_deleted_character_id
  loop
    v_next_account:=null;v_next_character:=null;
    select pm.account_id,pm.character_id
      into v_next_account,v_next_character
      from public.party_members pm
     where pm.party_id=v_party.id and pm.character_id<>p_deleted_character_id
     order by (pm.left_at is null) desc,pm.joined_at asc,pm.account_id asc
     limit 1;
    if v_next_character is not null then
      update public.parties
         set leader_account_id=v_next_account,leader_character_id=v_next_character,updated_at=clock_timestamp()
       where id=v_party.id;
    else
      delete from public.parties where id=v_party.id;
    end if;
  end loop;

  -- Character-scoped projections that either have restrictive foreign keys or
  -- intentionally lack FKs are reconciled before the canonical row is removed.
  update public.party_contract_reward_entitlements_v16
     set claimed_character_id=null
   where claimed_character_id=p_deleted_character_id;
  delete from public.party_members where character_id=p_deleted_character_id;
  delete from public.echo_profiles where character_id=p_deleted_character_id;
  delete from public.crafting_jobs where character_id=p_deleted_character_id;
  delete from public.account_squad_members where character_id=p_deleted_character_id;
  delete from public.matchmaking_tickets where account_id=p_account_id and character_id=p_deleted_character_id;
  delete from public.online_coop_lfg_posts where owner_account_id=p_account_id and character_id=p_deleted_character_id;
  delete from public.live_dungeon_account_slots where account_id=p_account_id and character_id=p_deleted_character_id;
  delete from public.character_wallets where character_id=p_deleted_character_id;

  -- Cascades clear character inventory/skills/activity, saved co-op loadouts,
  -- onboarding preferences, applications, and other explicitly character-bound rows.
  delete from public.characters where id=p_deleted_character_id and account_id=p_account_id;

  return v_result;
end $$;

revoke all on function public.character_delete_coop_guard_server_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.commit_online_game_server_v2(uuid,bigint,bigint,text,text,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.character_delete_coop_guard_server_v1(uuid,uuid) to service_role;
grant execute on function public.commit_online_game_server_v2(uuid,bigint,bigint,text,text,jsonb,jsonb,uuid) to service_role;
