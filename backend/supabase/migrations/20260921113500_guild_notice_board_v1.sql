begin;

-- Member-only Guild Notice Board with server-authoritative Leader/Officer editing.
-- Read access is membership-gated by the RPC itself. Direct table writes remain unavailable.

create or replace function public.guild_notice_board_state_v1()
returns table(
  guild_id uuid,
  body text,
  updated_at timestamptz,
  updated_by_account_id uuid,
  can_edit boolean
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
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select gm.guild_id,gm.role into v_gid,v_role
  from public.guild_members gm
  where gm.account_id=v_uid
  limit 1;

  if v_gid is null then return; end if;

  return query
  select v_gid,
         coalesce(gb.body,''),
         gb.updated_at,
         gb.updated_by_account_id,
         (v_role in('leader','officer') and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false))
  from (select 1) seed
  left join public.guild_bulletins gb on gb.guild_id=v_gid;
end $$;

create or replace function public.update_guild_notice_board_v1(p_body text)
returns table(
  guild_id uuid,
  body text,
  updated_at timestamptz,
  updated_by_account_id uuid,
  can_edit boolean
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_role text;
  v_body text:=trim(coalesce(p_body,''));
  v_now timestamptz:=now();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'LINK_ACCOUNT_REQUIRED'; end if;

  select gm.guild_id,gm.role into v_gid,v_role
  from public.guild_members gm
  where gm.account_id=v_uid
  limit 1;

  if v_gid is null then raise exception 'NOT_IN_GUILD'; end if;
  if v_role not in('leader','officer') then raise exception 'GUILD_OFFICER_REQUIRED'; end if;
  if char_length(v_body)>280 then raise exception 'GUILD_NOTICE_TOO_LONG'; end if;
  if v_body ~ '[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]' then raise exception 'INVALID_GUILD_NOTICE'; end if;

  insert into public.guild_bulletins(guild_id,body,updated_by_account_id,updated_at)
  values(v_gid,v_body,v_uid,v_now)
  on conflict(guild_id) do update
    set body=excluded.body,
        updated_by_account_id=excluded.updated_by_account_id,
        updated_at=excluded.updated_at;

  insert into public.guild_bulletin_revisions(guild_id,body,actor_account_id,created_at)
  values(v_gid,v_body,v_uid,v_now);

  insert into public.guild_activity_feed(guild_id,kind,actor_account_id,title,body,payload_json,created_at,expires_at)
  values(
    v_gid,
    'bulletin_updated',
    v_uid,
    case when v_body='' then 'Guild Notice Board cleared' else 'Guild Notice Board updated' end,
    case when v_body='' then 'Leadership cleared the member notice.' else 'Leadership posted a new member notice.' end,
    jsonb_build_object('noticeLength',char_length(v_body)),
    v_now,
    v_now+interval '30 days'
  );

  return query
  select v_gid,gb.body,gb.updated_at,gb.updated_by_account_id,true
  from public.guild_bulletins gb
  where gb.guild_id=v_gid;
end $$;

revoke all on function public.guild_notice_board_state_v1() from public,anon;
revoke all on function public.update_guild_notice_board_v1(text) from public,anon;
grant execute on function public.guild_notice_board_state_v1() to authenticated;
grant execute on function public.update_guild_notice_board_v1(text) to authenticated;

commit;
