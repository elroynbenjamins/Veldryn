-- Read construction contributions scoped to a verified account's current Guild.
-- No cross-guild donation totals or writable resources are exposed.
create or replace function public.guild_construction_snapshot_server_v1(p_account_id uuid)
returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(
  jsonb_build_object(
   'templateId', p.template_id,
   'completed', p.completed_at is not null,
   'resources', coalesce((
    select jsonb_object_agg(progress.resource_id,progress.total)
    from (
     select d.resource_id,sum(d.amount) as total
     from public.guild_construction_donations d
     where d.guild_id=p.guild_id and d.template_id=p.template_id
     group by d.resource_id
    ) progress
   ),'{}'::jsonb)
  ) order by p.template_id),'[]'::jsonb)
 from public.guild_construction_projects p
 where p.guild_id=(
  select m.guild_id::text from public.guild_members m
  where m.account_id=p_account_id
  limit 1
 )
$$;
revoke all on function public.guild_construction_snapshot_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.guild_construction_snapshot_server_v1(uuid) to service_role;
