-- Account-bound friends. Character details are resolved only for presentation.
alter table public.player_profiles
  add column if not exists active_character_id uuid references public.characters(id) on delete set null;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> recipient_id)
);

create unique index if not exists friend_requests_one_pending_pair_idx
  on public.friend_requests (least(requester_id,recipient_id),greatest(requester_id,recipient_id))
  where status='pending';
create index if not exists friend_requests_recipient_idx on public.friend_requests(recipient_id,status,created_at desc);
create index if not exists friend_requests_requester_idx on public.friend_requests(requester_id,status,created_at desc);

create table if not exists public.friendships (
  account_a uuid not null references auth.users(id) on delete cascade,
  account_b uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(account_a,account_b),
  check(account_a < account_b)
);
create index if not exists friendships_account_b_idx on public.friendships(account_b);

create table if not exists public.player_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id,blocked_id),
  check(blocker_id <> blocked_id)
);
create index if not exists player_blocks_blocked_idx on public.player_blocks(blocked_id);

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.player_blocks enable row level security;

create policy "participants read friend requests" on public.friend_requests
  for select to authenticated using(auth.uid() in (requester_id,recipient_id));
create policy "participants read friendships" on public.friendships
  for select to authenticated using(auth.uid() in (account_a,account_b));
create policy "owners read blocks" on public.player_blocks
  for select to authenticated using(blocker_id=auth.uid());

create or replace function public.send_friend_request(p_target_account_id uuid)
returns text language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_target_account_id=v_uid then raise exception 'CANNOT_FRIEND_SELF'; end if;
  if not exists(select 1 from auth.users where id=p_target_account_id) then raise exception 'PLAYER_NOT_FOUND'; end if;
  if exists(select 1 from public.player_blocks where (blocker_id=v_uid and blocked_id=p_target_account_id) or (blocker_id=p_target_account_id and blocked_id=v_uid)) then raise exception 'PLAYER_UNAVAILABLE'; end if;
  if exists(select 1 from public.friendships where account_a=least(v_uid,p_target_account_id) and account_b=greatest(v_uid,p_target_account_id)) then return 'already_friends'; end if;
  if exists(select 1 from public.friend_requests where requester_id=v_uid and recipient_id=p_target_account_id and status='pending') then return 'already_pending'; end if;
  if exists(select 1 from public.friend_requests where requester_id=p_target_account_id and recipient_id=v_uid and status='pending') then return 'incoming_request_exists'; end if;
  insert into public.friend_requests(requester_id,recipient_id) values(v_uid,p_target_account_id);
  return 'sent';
end $$;

create or replace function public.respond_friend_request(p_request_id uuid,p_accept boolean)
returns text language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_request public.friend_requests%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_request from public.friend_requests where id=p_request_id for update;
  if not found or v_request.recipient_id<>v_uid then raise exception 'REQUEST_NOT_FOUND'; end if;
  if v_request.status<>'pending' then raise exception 'REQUEST_ALREADY_HANDLED'; end if;
  if not p_accept then
    update public.friend_requests set status='declined',responded_at=now() where id=p_request_id;
    return 'declined';
  end if;
  if exists(select 1 from public.player_blocks where (blocker_id=v_uid and blocked_id=v_request.requester_id) or (blocker_id=v_request.requester_id and blocked_id=v_uid)) then raise exception 'PLAYER_UNAVAILABLE'; end if;
  insert into public.friendships(account_a,account_b,created_by)
    values(least(v_uid,v_request.requester_id),greatest(v_uid,v_request.requester_id),v_request.requester_id)
    on conflict do nothing;
  update public.friend_requests set status='accepted',responded_at=now() where id=p_request_id;
  return 'accepted';
end $$;

create or replace function public.cancel_friend_request(p_request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();
begin
  update public.friend_requests set status='cancelled',responded_at=now()
    where id=p_request_id and requester_id=v_uid and status='pending';
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
end $$;

create or replace function public.remove_friend(p_target_account_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from public.friendships where account_a=least(v_uid,p_target_account_id) and account_b=greatest(v_uid,p_target_account_id);
end $$;

create or replace function public.set_player_block(p_target_account_id uuid,p_blocked boolean)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_target_account_id=v_uid then raise exception 'CANNOT_BLOCK_SELF'; end if;
  if p_blocked then
    insert into public.player_blocks(blocker_id,blocked_id) values(v_uid,p_target_account_id) on conflict do nothing;
    delete from public.friendships where account_a=least(v_uid,p_target_account_id) and account_b=greatest(v_uid,p_target_account_id);
    update public.friend_requests set status='cancelled',responded_at=now()
      where status='pending' and least(requester_id,recipient_id)=least(v_uid,p_target_account_id) and greatest(requester_id,recipient_id)=greatest(v_uid,p_target_account_id);
  else
    delete from public.player_blocks where blocker_id=v_uid and blocked_id=p_target_account_id;
  end if;
end $$;

create or replace function public.social_player_search(p_query text,p_limit integer default 20)
returns table(account_id uuid,display_name text,character_name text,class_id text,level integer,profile_title text,relationship text)
language sql security definer set search_path=public as $$
  select pp.account_id,coalesce(nullif(pp.display_name,''),'Adventurer'),c.name,c.class_id,c.level,c.profile_title,
    case
      when f.account_a is not null then 'friend'
      when outgoing.id is not null then 'outgoing_pending'
      when incoming.id is not null then 'incoming_pending'
      else 'none'
    end
  from public.player_profiles pp
  left join lateral(select name,class_id,level,profile_title from public.characters where account_id=pp.account_id order by (id=pp.active_character_id) desc,level desc,updated_at desc limit 1)c on true
  left join public.friendships f on f.account_a=least(auth.uid(),pp.account_id) and f.account_b=greatest(auth.uid(),pp.account_id)
  left join public.friend_requests outgoing on outgoing.requester_id=auth.uid() and outgoing.recipient_id=pp.account_id and outgoing.status='pending'
  left join public.friend_requests incoming on incoming.requester_id=pp.account_id and incoming.recipient_id=auth.uid() and incoming.status='pending'
  where auth.uid() is not null and pp.account_id<>auth.uid()
    and char_length(trim(p_query))>=2
    and pp.display_name ilike replace(replace(trim(p_query),'%','\%'),'_','\_')||'%' escape '\'
    and not exists(select 1 from public.player_blocks b where (b.blocker_id=auth.uid() and b.blocked_id=pp.account_id) or (b.blocker_id=pp.account_id and b.blocked_id=auth.uid()))
  order by pp.display_name
  limit least(greatest(coalesce(p_limit,20),1),20);
$$;

create or replace function public.friend_list()
returns table(account_id uuid,display_name text,character_name text,class_id text,level integer,profile_title text,friends_since timestamptz)
language sql security definer set search_path=public as $$
  select other.account_id,coalesce(nullif(pp.display_name,''),'Adventurer'),c.name,c.class_id,c.level,c.profile_title,f.created_at
  from public.friendships f
  cross join lateral(values(case when f.account_a=auth.uid() then f.account_b else f.account_a end)) other(account_id)
  left join public.player_profiles pp on pp.account_id=other.account_id
  left join lateral(select name,class_id,level,profile_title from public.characters where account_id=other.account_id order by (id=pp.active_character_id) desc,level desc,updated_at desc limit 1)c on true
  where auth.uid() in(f.account_a,f.account_b)
  order by pp.display_name;
$$;

create or replace function public.friend_request_list()
returns table(request_id uuid,account_id uuid,display_name text,direction text,created_at timestamptz)
language sql security definer set search_path=public as $$
  select r.id,
    case when r.requester_id=auth.uid() then r.recipient_id else r.requester_id end,
    coalesce(nullif(pp.display_name,''),'Adventurer'),
    case when r.requester_id=auth.uid() then 'outgoing' else 'incoming' end,
    r.created_at
  from public.friend_requests r
  join public.player_profiles pp on pp.account_id=case when r.requester_id=auth.uid() then r.recipient_id else r.requester_id end
  where r.status='pending' and auth.uid() in(r.requester_id,r.recipient_id)
  order by r.created_at desc;
$$;

create or replace function public.blocked_player_list()
returns table(account_id uuid,display_name text,blocked_at timestamptz)
language sql security definer set search_path=public as $$
  select b.blocked_id,coalesce(nullif(pp.display_name,''),'Adventurer'),b.created_at
  from public.player_blocks b
  left join public.player_profiles pp on pp.account_id=b.blocked_id
  where b.blocker_id=auth.uid()
  order by b.created_at desc;
$$;

revoke all on function public.send_friend_request(uuid),public.respond_friend_request(uuid,boolean),public.cancel_friend_request(uuid),public.remove_friend(uuid),public.set_player_block(uuid,boolean),public.social_player_search(text,integer),public.friend_list(),public.friend_request_list(),public.blocked_player_list() from public;
grant execute on function public.send_friend_request(uuid),public.respond_friend_request(uuid,boolean),public.cancel_friend_request(uuid),public.remove_friend(uuid),public.set_player_block(uuid,boolean),public.social_player_search(text,integer),public.friend_list(),public.friend_request_list(),public.blocked_player_list() to authenticated;
