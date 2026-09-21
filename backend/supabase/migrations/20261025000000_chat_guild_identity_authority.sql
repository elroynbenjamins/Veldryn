create or replace function public.send_world_chat(p_channel_id text, p_body text, p_sender_name text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid:=auth.uid();
  v_body text:=trim(p_body);
  v_term public.chat_filter_terms%rowtype;
  v_id uuid;
  v_sender_name text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_channel_id not in ('world-1','world-2','world-3','world-4') then raise exception 'INVALID_WORLD_CHANNEL'; end if;
  if char_length(v_body) not between 1 and 300 then raise exception 'INVALID_MESSAGE_LENGTH'; end if;
  if exists(select 1 from public.chat_account_sanctions where account_id=v_uid and muted_until>now()) then raise exception 'CHAT_MUTED'; end if;
  if (select count(*) from public.chat_messages where account_id=v_uid and created_at>now()-interval '10 seconds')>=3 then raise exception 'CHAT_COOLDOWN'; end if;
  if (select count(*) from public.chat_messages where account_id=v_uid and created_at>now()-interval '1 minute')>=15 then raise exception 'CHAT_RATE_LIMIT'; end if;

  for v_term in select * from public.chat_filter_terms where enabled loop
    if position(v_term.normalized_term in lower(v_body))>0 then
      if v_term.action='block' then raise exception 'MESSAGE_BLOCKED'; end if;
      v_body:=replace(lower(v_body),v_term.normalized_term,repeat('•',char_length(v_term.normalized_term)));
    end if;
  end loop;

  select coalesce(nullif(trim(pp.display_name),''),nullif(trim(c.name),''),'Adventurer')
    into v_sender_name
  from public.player_profiles pp
  left join public.characters c on c.id=pp.active_character_id and c.account_id=v_uid
  where pp.account_id=v_uid;

  v_sender_name:=coalesce(v_sender_name,'Adventurer');

  insert into public.chat_messages(account_id,channel_type,channel_id,sender_name,body)
  values(v_uid,'world',p_channel_id,left(v_sender_name,20),v_body)
  returning id into v_id;

  return v_id;
end
$function$;

create or replace function public.apply_to_guild(p_guild_id uuid, p_character_id uuid, p_note text default '')
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid:=auth.uid();
  v_id uuid;
  v_cap integer;
  v_count integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.characters where id=p_character_id and account_id=v_uid) then
    raise exception 'character_not_owned';
  end if;
  if exists(select 1 from public.guild_members where account_id=v_uid) then raise exception 'already_in_guild'; end if;

  select member_cap into v_cap from public.guilds where id=p_guild_id for update;
  if v_cap is null then raise exception 'guild_not_found'; end if;
  select count(*) into v_count from public.guild_members where guild_id=p_guild_id;
  if v_count>=v_cap then raise exception 'guild_full'; end if;

  insert into public.guild_applications(guild_id,account_id,character_id,note,status,expires_at)
  values(p_guild_id,v_uid,p_character_id,left(coalesce(p_note,''),180),'pending',now()+interval '72 hours')
  on conflict (guild_id,account_id) do update
    set character_id=excluded.character_id,note=excluded.note,status='pending',expires_at=excluded.expires_at,created_at=now()
  returning id into v_id;
  return v_id;
end
$function$;

create or replace function public.respond_guild_invite(p_invite_id uuid, p_character_id uuid, p_accept boolean)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid:=auth.uid();
  v_inv record;
  v_cap integer;
  v_count integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.characters where id=p_character_id and account_id=v_uid) then
    raise exception 'character_not_owned';
  end if;

  select * into v_inv from public.guild_invites where id=p_invite_id and account_id=v_uid for update;
  if v_inv.id is null or v_inv.status<>'pending' then raise exception 'invite_not_available'; end if;
  if v_inv.expires_at<=now() then
    update public.guild_invites set status='expired',responded_at=now() where id=v_inv.id;
    raise exception 'invite_expired';
  end if;
  if not p_accept then
    update public.guild_invites set status='declined',responded_at=now() where id=v_inv.id;
    return false;
  end if;
  if exists(select 1 from public.guild_members where account_id=v_uid) then raise exception 'already_in_guild'; end if;

  select member_cap into v_cap from public.guilds where id=v_inv.guild_id for update;
  select count(*) into v_count from public.guild_members where guild_id=v_inv.guild_id;
  if v_count>=v_cap then raise exception 'guild_full'; end if;

  insert into public.guild_members(guild_id,account_id,role) values(v_inv.guild_id,v_uid,'member');
  update public.guild_invites set status='accepted',responded_at=now() where id=v_inv.id;
  return true;
end
$function$;
