begin;

-- Safe mobile interaction transport for the existing v18 Guild Project board.
-- Vote/start are enabled because they can be fully validated against server-owned Guild membership,
-- role permissions, immutable candidate snapshots, slot caps and active-project constraints.
-- Resource donations and reward claims intentionally remain unavailable here until their wallet/inventory
-- settlement is atomic with authoritative gameplay.

create or replace function public.guild_project_board_state_v1()
returns table(
  candidate_id uuid,
  cycle_key text,
  template_id text,
  name text,
  description text,
  focus text,
  expires_at timestamptz,
  vote_count integer,
  my_vote boolean,
  can_start boolean
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_role text;
begin
  if v_uid is null then return; end if;
  select gm.guild_id,gm.role into v_gid,v_role
  from public.guild_members gm
  where gm.account_id=v_uid
  limit 1;
  if v_gid is null then return; end if;

  return query
  select
    c.id,
    c.cycle_key,
    c.template_id,
    coalesce(nullif(trim(c.definition_snapshot->>'name'),''),initcap(replace(c.template_id,'_',' ')))::text,
    coalesce(nullif(trim(c.definition_snapshot->>'description'),''),'Shared weekly Guild Project.')::text,
    c.focus::text,
    c.expires_at,
    (select count(*)::integer from public.guild_project_board_votes v where v.candidate_id=c.id),
    exists(select 1 from public.guild_project_board_votes v where v.candidate_id=c.id and v.account_id=v_uid),
    v_role in('leader','guild_master','co_leader','officer','quartermaster')
  from public.guild_project_board_candidates c
  where c.guild_id=v_gid
    and c.status='available'
    and c.expires_at>clock_timestamp()
  order by c.cycle_key desc,
    (select count(*) from public.guild_project_board_votes v where v.candidate_id=c.id) desc,
    c.focus asc,
    c.id asc;
end $$;

revoke all on function public.guild_project_board_state_v1() from public,anon;
grant execute on function public.guild_project_board_state_v1() to authenticated,service_role;

create or replace function public.guild_project_vote_v1(p_candidate_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_candidate public.guild_project_board_candidates;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select gm.guild_id into v_gid
  from public.guild_members gm
  where gm.account_id=v_uid
  limit 1;
  if v_gid is null then raise exception 'GUILD_MEMBERSHIP_REQUIRED'; end if;

  select * into v_candidate
  from public.guild_project_board_candidates c
  where c.id=p_candidate_id and c.guild_id=v_gid
  for update;
  if not found then raise exception 'GUILD_PROJECT_CANDIDATE_NOT_FOUND'; end if;
  if v_candidate.status<>'available' or v_candidate.expires_at<=clock_timestamp() then
    raise exception 'GUILD_PROJECT_CANDIDATE_CLOSED';
  end if;

  delete from public.guild_project_board_votes v
  where v.guild_id=v_gid and v.cycle_key=v_candidate.cycle_key and v.account_id=v_uid;

  insert into public.guild_project_board_votes(candidate_id,guild_id,cycle_key,account_id)
  values(v_candidate.id,v_gid,v_candidate.cycle_key,v_uid);

  return v_candidate.id;
end $$;

revoke all on function public.guild_project_vote_v1(uuid) from public,anon;
grant execute on function public.guild_project_vote_v1(uuid) to authenticated,service_role;

create or replace function public.guild_project_start_v1(p_candidate_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_role text;
  v_level integer:=1;
  v_guild_name text;
  v_candidate public.guild_project_board_candidates;
  v_kind text;
  v_min_level integer:=1;
  v_active integer:=2;
  v_slot_cap integer:=0;
  v_slot integer;
  v_target integer:=6000;
  v_min_contributors integer:=2;
  v_share_cap numeric(6,5):=0.60;
  v_personal_threshold integer:=300;
  v_meaningful_threshold integer:=250;
  v_mixed_fraction numeric(6,5);
  v_instance_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select gm.guild_id,gm.role into v_gid,v_role
  from public.guild_members gm
  where gm.account_id=v_uid
  limit 1;
  if v_gid is null then raise exception 'GUILD_MEMBERSHIP_REQUIRED'; end if;
  if v_role not in('leader','guild_master','co_leader','officer','quartermaster') then
    raise exception 'GUILD_PROJECT_START_PERMISSION_REQUIRED';
  end if;

  perform 1 from public.guilds g where g.id=v_gid for update;
  select g.level,g.name into v_level,v_guild_name from public.guilds g where g.id=v_gid;

  select * into v_candidate
  from public.guild_project_board_candidates c
  where c.id=p_candidate_id and c.guild_id=v_gid
  for update;
  if not found then raise exception 'GUILD_PROJECT_CANDIDATE_NOT_FOUND'; end if;
  if v_candidate.status<>'available' or v_candidate.expires_at<=clock_timestamp() then
    raise exception 'GUILD_PROJECT_CANDIDATE_CLOSED';
  end if;

  v_kind:=coalesce(nullif(v_candidate.definition_snapshot->>'kind',''),'weekly_campaign');
  if v_kind not in('weekly_campaign','event') then raise exception 'UNSUPPORTED_GUILD_PROJECT_CANDIDATE_KIND'; end if;
  begin
    v_min_level:=greatest(1,coalesce((v_candidate.definition_snapshot->>'minGuildLevel')::integer,1));
  exception when others then
    v_min_level:=1;
  end;
  if v_level<v_min_level then raise exception 'GUILD_PROJECT_LEVEL_REQUIRED'; end if;

  v_slot_cap:=case when v_level<5 then 0 when v_level<10 then 1 else 2 end;
  if v_slot_cap<=0 then raise exception 'GUILD_PROJECT_SLOTS_LOCKED'; end if;

  if v_kind='weekly_campaign' and exists(
    select 1 from public.guild_project_instances p
    where p.guild_id=v_gid and p.status='active' and p.kind='weekly_campaign'
  ) then
    raise exception 'GUILD_WEEKLY_PROJECT_ALREADY_ACTIVE';
  end if;

  select slots.slot_no into v_slot
  from generate_series(1,v_slot_cap) as slots(slot_no)
  where not exists(
    select 1 from public.guild_project_instances p
    where p.guild_id=v_gid and p.status='active' and p.slot_index=slot_no
  )
  order by slot_no
  limit 1;
  if v_slot is null then raise exception 'GUILD_PROJECT_SLOTS_FULL'; end if;

  select least(40,greatest(2,count(*)::integer)) into v_active
  from public.guild_members gm
  where gm.guild_id=v_gid;

  v_target:=least(32000,greatest(6000,4000+v_active*700));
  v_min_contributors:=least(10,greatest(2,ceil(v_active*0.20)::integer));
  v_share_cap:=case
    when v_active<=2 then 0.60
    when v_active<=5 then 0.50
    when v_active<=12 then 0.40
    when v_active<=25 then 0.35
    else 0.30
  end;
  v_personal_threshold:=greatest(300,ceil(v_target*0.02)::integer);
  v_meaningful_threshold:=greatest(250,ceil(v_target*0.015)::integer);

  if v_candidate.focus='mixed' then
    begin
      v_mixed_fraction:=coalesce((v_candidate.definition_snapshot->>'mixedMinimumFraction')::numeric,0.30);
    exception when others then
      v_mixed_fraction:=0.30;
    end;
    v_mixed_fraction:=least(1,greatest(0,v_mixed_fraction));
  else
    v_mixed_fraction:=null;
  end if;

  insert into public.guild_project_instances(
    guild_id,guild_name_snapshot,template_id,definition_version,definition_snapshot,config_hash,
    kind,focus,slot_index,cycle_key,status,started_by_account_id,started_at,ends_at,
    active_member_snapshot,target_points,minimum_meaningful_contributors,meaningful_contributor_threshold,
    personal_reward_threshold,single_account_completion_share_cap,mixed_minimum_fraction
  )
  values(
    v_gid,v_guild_name,v_candidate.template_id,v_candidate.definition_version,v_candidate.definition_snapshot,v_candidate.config_hash,
    v_kind,v_candidate.focus,v_slot,v_candidate.cycle_key,'active',v_uid,clock_timestamp(),v_candidate.expires_at,
    v_active,v_target,v_min_contributors,v_meaningful_threshold,v_personal_threshold,v_share_cap,v_mixed_fraction
  )
  returning id into v_instance_id;

  update public.guild_project_board_candidates c
  set status=case when c.id=v_candidate.id then 'selected' else 'cancelled' end
  where c.guild_id=v_gid
    and c.cycle_key=v_candidate.cycle_key
    and c.status='available';

  insert into public.guild_activity_feed(guild_id,kind,actor_account_id,title,body,payload_json)
  values(
    v_gid,'project_started',v_uid,'Guild Project started',
    coalesce(v_candidate.definition_snapshot->>'name',v_candidate.template_id)||' is now active.',
    jsonb_build_object('projectInstanceId',v_instance_id,'candidateId',v_candidate.id,'cycleKey',v_candidate.cycle_key,'slotIndex',v_slot)
  );

  return v_instance_id;
end $$;

revoke all on function public.guild_project_start_v1(uuid) from public,anon;
grant execute on function public.guild_project_start_v1(uuid) to authenticated,service_role;

commit;
