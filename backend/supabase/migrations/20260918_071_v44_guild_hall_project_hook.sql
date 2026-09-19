begin;

-- V44 Guild Hall integration with the production Guild Projects authority.
-- Hall Progress is cumulative progression. It is not spendable, purchasable, transferable, or a currency.

create or replace function public.guild_hall_project_completion_v44()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_event_id text;
  v_fingerprint text:='guild-project-completed:v44';
  v_hall_award integer;
  v_facility text;
  v_facility_award integer;
  v_facilities jsonb;
  v_progress bigint;
  v_project_name text;
begin
  if tg_op<>'UPDATE' or old.status='completed' or new.status<>'completed' then
    return new;
  end if;

  v_event_id:='project:'||new.id::text;
  if exists(select 1 from private.guild_hall_receipts r where r.guild_id=new.guild_id and r.event_id=v_event_id) then
    return new;
  end if;

  v_hall_award:=case new.kind when 'development' then 350 when 'event' then 250 else 200 end;
  v_facility:=new.definition_snapshot->>'guildHallFacilityId';
  if v_facility not in ('banner_gallery','trophy_room','training_room','workshop','expedition_board','raid_memorial') then
    v_facility:=null;
  end if;
  begin
    v_facility_award:=greatest(0,coalesce((new.definition_snapshot->>'guildHallFacilityProgress')::integer,0));
  exception when others then
    v_facility_award:=0;
  end;

  insert into public.guild_halls(guild_id,hall_progress,lifetime_projects_completed,facilities,revision,updated_at)
  values(new.guild_id,v_hall_award,1,'{}'::jsonb,1,coalesce(new.completed_at,now()))
  on conflict(guild_id) do update
  set hall_progress=public.guild_halls.hall_progress+v_hall_award,
      lifetime_projects_completed=public.guild_halls.lifetime_projects_completed+1,
      revision=public.guild_halls.revision+1,
      updated_at=coalesce(new.completed_at,now())
  returning hall_progress,facilities into v_progress,v_facilities;

  if v_facility is not null and v_facility_award>0 then
    v_facilities:=jsonb_set(
      coalesce(v_facilities,'{}'::jsonb),
      array[v_facility],
      jsonb_build_object(
        'facilityId',v_facility,
        'progress',coalesce((v_facilities->v_facility->>'progress')::integer,0)+v_facility_award,
        'updatedAtMs',(extract(epoch from coalesce(new.completed_at,now()))*1000)::bigint
      ),
      true
    );
    update public.guild_halls
    set facilities=v_facilities,revision=revision+1,updated_at=coalesce(new.completed_at,now())
    where guild_id=new.guild_id;
  end if;

  v_project_name:=coalesce(new.definition_snapshot->>'name',new.definition_snapshot->>'title',new.template_id,'Guild Project');
  insert into public.guild_hall_trophies(guild_id,trophy_key,label,description,source_kind,source_id,earned_at)
  values(new.guild_id,'project:'||new.id::text,left(v_project_name,80),'Completed Guild Project','guild_project',new.id::text,coalesce(new.completed_at,now()))
  on conflict(guild_id,trophy_key) do nothing;

  insert into private.guild_hall_receipts(guild_id,event_id,fingerprint,result)
  values(new.guild_id,v_event_id,v_fingerprint,jsonb_build_object('hallProgressAward',v_hall_award,'facilityId',v_facility,'facilityProgressAward',v_facility_award))
  on conflict(guild_id,event_id) do nothing;

  return new;
end $$;

drop trigger if exists trg_guild_hall_project_completion_v44 on public.guild_project_instances;
create trigger trg_guild_hall_project_completion_v44
after update of status on public.guild_project_instances
for each row execute function public.guild_hall_project_completion_v44();

revoke all on function public.guild_hall_project_completion_v44() from public,anon,authenticated;
grant execute on function public.guild_hall_project_completion_v44() to service_role;

commit;
