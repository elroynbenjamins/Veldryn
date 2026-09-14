-- Preserve the existing v15 block list across the new discovery and Party affordances.
create or replace function public.party_social_blocked_v16(p_other_account uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.player_blocks b
 where (b.blocker_id=auth.uid() and b.blocked_id=p_other_account)
    or (b.blocked_id=auth.uid() and b.blocker_id=p_other_account));
$$;
revoke all on function public.party_social_blocked_v16(uuid) from public,anon;
grant execute on function public.party_social_blocked_v16(uuid) to authenticated,service_role;

drop policy "active recruitment browse v16" on public.recruitment_posts;
create policy "active recruitment browse v16" on public.recruitment_posts for select to authenticated
using(owner_account_id=auth.uid() or (status='active' and expires_at>now() and not public.party_social_blocked_v16(owner_account_id)));
create or replace view public.active_recruitment_posts with (security_invoker=true) as
select * from public.recruitment_posts p
where status='active' and expires_at>now() and public.recruitment_scope_valid_v16(p)
and not public.party_social_blocked_v16(owner_account_id);

drop policy "party chat current members read v16" on public.chat_messages;
create policy "party chat current members read v16" on public.chat_messages for select to authenticated using(
 channel_type='party' and not public.party_social_blocked_v16(account_id)
 and exists(select 1 from public.parties p where p.id::text=chat_messages.channel_id and public.is_active_party_member_v16(p.id,auth.uid()))
);

create or replace function public.reject_blocked_party_join_v16()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.left_at is not null then return new; end if;
 if tg_op='UPDATE' and old.left_at is null and old.party_id=new.party_id then return new; end if;
 if exists(select 1 from public.party_members m join public.player_blocks b
   on (b.blocker_id=new.account_id and b.blocked_id=m.account_id) or (b.blocked_id=new.account_id and b.blocker_id=m.account_id)
   where m.party_id=new.party_id and m.left_at is null) then raise exception 'PLAYER_UNAVAILABLE'; end if;
 return new;
end $$;
revoke all on function public.reject_blocked_party_join_v16() from public,anon,authenticated;
create trigger reject_blocked_party_join_v16 before insert or update of party_id,left_at on public.party_members
for each row execute function public.reject_blocked_party_join_v16();

-- Both supported combat receipt formats use one canonical event key. If a worker
-- persists both formats for a node, it cannot credit that node twice.
create or replace function public.party_combat_receipt_v16()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_member record; v_weight record; v_node text; v_units numeric;
begin
 if not new.victory then return new; end if;
 select * into v_weight from public.party_activity_weights_v16 where kind='combat' and content_id=new.encounter_id;
 if not found then return new; end if;
 select n->>'nodeId' into v_node from public.expedition_runs r,jsonb_array_elements(r.route_graph_json->'nodes') n
 where r.id=new.run_id and n->>'contentId'=new.encounter_id and (n->>'depth')::integer=new.node_index limit 1;
 for v_member in select m.character_id,m.account_id,
  count(*) over(partition by pm.party_id) party_participants
  from public.expedition_run_members m join public.party_members pm on pm.character_id=m.character_id and pm.left_at is null
  where m.run_id=new.run_id and m.echo_profile_version is null and coalesce(m.member_kind,'human')='human'
  and (not exists(select 1 from public.expedition_runs r where r.id=new.run_id and r.coop_mode is not null)
       or exists(select 1 from public.coop_run_access_memberships a where a.run_id=new.run_id and a.account_id=m.account_id and a.active))
  order by m.account_id loop
  -- One shared enemy kill is divided among participating humans in the same persistent Party.
  v_units:=v_weight.units_per_action/v_member.party_participants;
  perform public.settle_party_activity_v16(v_member.character_id,v_weight.metric,v_units,
   'combat-node:'||new.run_id||':'||coalesce(v_node,new.node_index::text||':'||new.encounter_id),new.created_at);
 end loop;
 return new;
end $$;

create or replace function public.party_coop_node_receipt_v16()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_member record; v_weight record; v_content text;
begin
 if not new.success then return new; end if;
 select n->>'contentId' into v_content from public.expedition_runs r,jsonb_array_elements(r.route_graph_json->'nodes') n
 where r.id=new.run_id and n->>'nodeId'=new.node_id;
 select * into v_weight from public.party_activity_weights_v16 where kind='combat' and content_id=v_content;
 if not found then return new; end if;
 for v_member in select m.character_id,m.account_id,count(*) over(partition by pm.party_id) party_participants
 from public.expedition_run_members m
 join public.coop_run_access_memberships a on a.run_id=m.run_id and a.account_id=m.active_participant_account_id and a.active
 join public.party_members pm on pm.character_id=m.character_id and pm.left_at is null
 where m.run_id=new.run_id and m.member_kind='human' and m.echo_profile_version is null order by m.account_id loop
  perform public.settle_party_activity_v16(v_member.character_id,v_weight.metric,v_weight.units_per_action/v_member.party_participants,
   'combat-node:'||new.run_id||':'||new.node_id,new.committed_at);
 end loop;
 return new;
end $$;

-- Keep moderation escalation terms blocked, matching the existing server chat policy.
do $$ declare v_function text;begin
 v_function:=pg_get_functiondef('public.send_persistent_party_chat_v16(uuid,text,text)'::regprocedure);
 v_function:=replace(v_function,$source$if v_term.action='block' then$source$,$target$if v_term.action in ('block','mute_review') then$target$);
 execute v_function;
end $$;
