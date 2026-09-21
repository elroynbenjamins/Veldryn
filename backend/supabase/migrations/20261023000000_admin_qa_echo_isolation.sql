create or replace function public.eligible_online_coop_echoes_server_v1(p_actor_account_id uuid, p_min_level integer)
returns jsonb
language sql
stable security definer
set search_path to 'public'
as $function$
 select coalesce(jsonb_agg(jsonb_build_object('profileId',p.id,'sourceAccountId',p.account_id,'publishedAtMs',extract(epoch from p.published_at)*1000,'record',p.loadout_snapshot)),'[]'::jsonb)
 from (
   select e.*,c.account_id,row_number() over(partition by e.role order by e.published_at desc,e.id) as role_rank
   from public.echo_profiles e
   join public.characters c on c.id=e.character_id
   where e.opted_in
     and e.expires_at>now()
     and e.published_at>now()-interval '24 hours'
     and e.content_version='online-coop-loadout-v1'
     and e.preferences->>'pipeline'='online_coop_v1'
     and e.synced_level>=p_min_level
     and c.account_id<>p_actor_account_id
     and (
       coalesce(e.preferences->>'qa_system','false')<>'true'
       or exists(
         select 1
         from auth.users actor
         where actor.id=p_actor_account_id
           and (
             coalesce(actor.raw_app_meta_data,'{}'::jsonb) @> '{"admin_qa":true}'::jsonb
             or coalesce(actor.raw_app_meta_data->'roles','[]'::jsonb) ? 'admin_qa'
           )
       )
     )
     and not exists(
       select 1 from public.player_blocks b
       where (b.blocker_id=c.account_id and b.blocked_id=p_actor_account_id)
          or (b.blocked_id=c.account_id and b.blocker_id=p_actor_account_id)
     )
 ) p
 where p.role_rank<=128;
$function$;

do $block$
begin
  if not exists(select 1 from cron.job where jobname='veldryn_refresh_admin_qa_echoes') then
    perform cron.schedule(
      'veldryn_refresh_admin_qa_echoes',
      '0 */12 * * *',
      $cron$update public.echo_profiles
            set published_at=now(), expires_at=now()+interval '24 hours'
            where preferences->>'qa_system'='true' and opted_in$cron$
    );
  end if;
end
$block$;
