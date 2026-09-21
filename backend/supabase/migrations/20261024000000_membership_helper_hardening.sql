create or replace function public.can_read_live_party_chat_v16(p_channel text, p_account uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
 select (
   p_account = auth.uid()
   or coalesce(auth.jwt()->>'role','') = 'service_role'
 ) and exists(
   select 1
   from public.coop_run_access_memberships a
   join public.expedition_runs r on r.id=a.run_id
   where r.coop_mode='live'
     and a.active
     and a.account_id=p_account
     and split_part(p_channel,':',1)=a.run_id::text
     and split_part(p_channel,':',2)=a.channel_epoch::text
 );
$function$;

create or replace function public.is_active_party_member_v16(p_party_id uuid, p_account_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
 select (
   p_account_id = auth.uid()
   or coalesce(auth.jwt()->>'role','') = 'service_role'
 ) and exists (
   select 1
   from public.party_members pm
   join public.parties p on p.id=pm.party_id
   where pm.party_id=p_party_id
     and pm.account_id=p_account_id
     and pm.left_at is null
     and p.status<>'disbanded'
 );
$function$;

create or replace function public.is_guild_member_v18(p_guild_id uuid, p_account_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
 select (
   p_account_id = auth.uid()
   or coalesce(auth.jwt()->>'role','') = 'service_role'
 ) and exists(
   select 1
   from public.guild_members gm
   where gm.guild_id=p_guild_id
     and gm.account_id=p_account_id
 );
$function$;
