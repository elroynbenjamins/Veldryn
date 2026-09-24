-- Contract writes are executable only by service_role, or by trusted receipt
-- triggers.  Those triggers preserve the player's JWT, so membership checks
-- here must validate the Party relationship instead of the caller identity.

create or replace function public.record_party_contract_contribution_v16(
  p_instance_id uuid,p_account_id uuid,p_objective_id text,p_delta_units numeric,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_instance public.party_contract_instances_v16; v_target numeric; v_budget integer;
 v_old_units numeric:=0; v_new_units numeric; v_old_points integer:=0; v_new_points integer;
 v_delta_points integer; v_existing public.party_contract_contributions_v16; v_total integer;
begin
 perform 1 from public.party_contract_instances_v16 where id=p_instance_id for update;
 if p_delta_units is null or p_delta_units::text in ('NaN','Infinity','-Infinity') or p_delta_units<=0 then raise exception 'invalid_contribution_delta'; end if;
 if char_length(coalesce(p_idempotency_key,'')) not between 8 and 160 then raise exception 'invalid_idempotency_key'; end if;
 select * into v_existing from public.party_contract_contributions_v16 where instance_id=p_instance_id and idempotency_key=p_idempotency_key;
 if found then
  if v_existing.account_id<>p_account_id or v_existing.objective_id<>p_objective_id then raise exception 'contribution_idempotency_conflict'; end if;
  return jsonb_build_object('replayed',true,'accepted_units',v_existing.accepted_units,'normalized_points',v_existing.normalized_points);
 end if;
 select * into v_instance from public.party_contract_instances_v16 where id=p_instance_id for update;
 if v_instance.id is null then raise exception 'party_contract_not_found'; end if;
 if v_instance.status<>'active' or now()<v_instance.starts_at or now()>=v_instance.ends_at then raise exception 'party_contract_inactive'; end if;
 if not exists(select 1 from public.party_members pm join public.parties p on p.id=pm.party_id where pm.party_id=v_instance.party_id and pm.account_id=p_account_id and pm.left_at is null and p.status<>'disbanded') then raise exception 'contributor_not_party_member'; end if;
 select target_units,point_budget into v_target,v_budget from public.party_contract_objectives_v16 where definition_id=v_instance.definition_id and definition_version=v_instance.definition_version and objective_id=p_objective_id;
 if v_target is null then raise exception 'party_contract_objective_not_found'; end if;
 insert into public.party_contract_progress_v16(instance_id,objective_id,units,normalized_points) values(p_instance_id,p_objective_id,0,0) on conflict(instance_id,objective_id) do nothing;
 select units,normalized_points into v_old_units,v_old_points from public.party_contract_progress_v16 where instance_id=p_instance_id and objective_id=p_objective_id for update;
 v_new_units:=least(v_target,v_old_units+round(p_delta_units,4)); v_new_points:=floor(v_budget*v_new_units/v_target)::integer; v_delta_points:=greatest(0,v_new_points-v_old_points);
 update public.party_contract_progress_v16 set units=v_new_units,normalized_points=v_new_points,updated_at=now() where instance_id=p_instance_id and objective_id=p_objective_id;
 insert into public.party_contract_member_progress_v16(instance_id,account_id,normalized_points,updated_at) values(p_instance_id,p_account_id,v_delta_points,now()) on conflict(instance_id,account_id) do update set normalized_points=public.party_contract_member_progress_v16.normalized_points+excluded.normalized_points,updated_at=now();
 insert into public.party_contract_contributions_v16(instance_id,account_id,objective_id,accepted_units,normalized_points,idempotency_key) values(p_instance_id,p_account_id,p_objective_id,v_new_units-v_old_units,v_delta_points,p_idempotency_key);
 if not exists(select 1 from public.party_contract_objectives_v16 o left join public.party_contract_progress_v16 p on p.instance_id=p_instance_id and p.objective_id=o.objective_id where o.definition_id=v_instance.definition_id and o.definition_version=v_instance.definition_version and coalesce(p.units,0)<o.target_units) then update public.party_contract_instances_v16 set status='completed',completed_at=coalesce(completed_at,now()) where id=p_instance_id; end if;
 select coalesce(sum(normalized_points),0)::integer into v_total from public.party_contract_progress_v16 where instance_id=p_instance_id;
 if v_instance.cadence='mini_event' and exists(select 1 from public.party_ranked_events_v16 e where e.event_key=v_instance.season_key and now()>=e.starts_at and now()<e.ends_at) then
  insert into public.party_rankings_v16(event_key,party_id,normalized_points,completed_at,updated_at) values(v_instance.season_key,v_instance.party_id,v_total,(select completed_at from public.party_contract_instances_v16 where id=p_instance_id),now()) on conflict(event_key,party_id) do update set normalized_points=greatest(public.party_rankings_v16.normalized_points,excluded.normalized_points),completed_at=coalesce(public.party_rankings_v16.completed_at,excluded.completed_at),updated_at=now();
 end if;
 return jsonb_build_object('replayed',false,'accepted_units',v_new_units-v_old_units,'normalized_points',v_delta_points,'total_points',v_total);
end $$;

create or replace function public.settle_party_activity_v16(p_character_id uuid,p_metric text,p_units numeric,p_event_key text,p_occurred_at timestamptz)
returns integer language plpgsql security definer set search_path=public as $$
declare v_account uuid; v_party uuid; v_instance record; v_count integer:=0;
begin
 if p_units is null or p_units<=0 or p_units::text in ('NaN','Infinity','-Infinity') then return 0; end if;
 select c.account_id,m.party_id into v_account,v_party from public.characters c join public.party_members m on m.character_id=c.id where c.id=p_character_id and m.left_at is null and m.joined_at<=p_occurred_at;
 if v_party is null then return 0; end if;
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||v_account,0));
 if not exists(select 1 from public.party_members pm join public.parties p on p.id=pm.party_id where pm.party_id=v_party and pm.account_id=v_account and pm.left_at is null and p.status<>'disbanded') then return 0; end if;
 perform public.ensure_party_contracts_v16(v_party);
 for v_instance in select i.id,o.objective_id from public.party_contract_instances_v16 i join public.party_contract_objectives_v16 o on o.definition_id=i.definition_id and o.definition_version=i.definition_version where i.party_id=v_party and i.status='active' and o.metric=p_metric and i.starts_at<=p_occurred_at and i.ends_at>now() order by i.id,o.objective_id loop
  perform public.record_party_contract_contribution_v16(v_instance.id,v_account,v_instance.objective_id,p_units,encode(sha256(convert_to(p_event_key||':'||p_character_id||':'||p_metric||':'||v_instance.objective_id,'UTF8')),'hex'));
  v_count:=v_count+1;
 end loop;
 return v_count;
end $$;

revoke all on function public.record_party_contract_contribution_v16(uuid,uuid,text,numeric,text),public.settle_party_activity_v16(uuid,text,numeric,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_party_contract_contribution_v16(uuid,uuid,text,numeric,text),public.settle_party_activity_v16(uuid,text,numeric,text,timestamptz) to service_role;
