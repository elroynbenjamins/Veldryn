-- Live Quick Match demand + short-lived co-op LFG board.
-- LFG posts disappear from browse results at exactly 30 minutes and are physically cleaned shortly after.
begin;

create table if not exists public.online_coop_lfg_posts(
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid not null unique references auth.users(id) on delete cascade,
  character_id uuid not null,
  dungeon_id text not null check(dungeon_id in ('EXP_001','EXP_002','EXP_003','EXP_004','EXP_005','EXP_006','EXP_007','EXP_008')),
  role text not null check(role in ('tank','damage','support')),
  max_tier smallint not null check(max_tier between 1 and 5),
  note text not null default '' check(char_length(note)<=140),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  closed_at timestamptz
);
create index if not exists online_coop_lfg_expiry_idx on public.online_coop_lfg_posts(expires_at) where closed_at is null;
create index if not exists online_coop_lfg_dungeon_idx on public.online_coop_lfg_posts(dungeon_id,role,created_at) where closed_at is null;
alter table public.online_coop_lfg_posts enable row level security;

create or replace function public.close_online_coop_lfg_on_ticket_state_v1() returns trigger
language plpgsql security definer set search_path=public as $
begin
 if new.mode='live' and new.account_id is not null and new.status in ('reserved','matched','cancelled','expired') and old.status is distinct from new.status then
  update public.online_coop_lfg_posts set closed_at=clock_timestamp() where owner_account_id=new.account_id and closed_at is null;
 end if;
 return new;
end $;
drop trigger if exists close_online_coop_lfg_on_ticket_state_v1 on public.matchmaking_tickets;
create trigger close_online_coop_lfg_on_ticket_state_v1 after update of status on public.matchmaking_tickets
 for each row execute function public.close_online_coop_lfg_on_ticket_state_v1();
revoke all on public.online_coop_lfg_posts from public,anon,authenticated;
grant all on public.online_coop_lfg_posts to service_role;

create or replace function public.online_live_quick_match_demand_server_v1(p_account_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $
declare v_now timestamptz:=clock_timestamp();v_rows jsonb;
begin
 with demand as (
  select expedition_id,
   count(*) filter(where role='tank')::integer as tank,
   count(*) filter(where role='damage')::integer as damage,
   count(*) filter(where role='support')::integer as support,
   min(created_at) as oldest
  from public.matchmaking_tickets
  where mode='live' and status='queued' and heartbeat_expires_at>v_now and content_version='online-coop-loadout-v1'
   and account_id is distinct from p_account_id
  group by expedition_id
 )
 select coalesce(jsonb_agg(jsonb_build_object('expeditionId',expedition_id,'tank',tank,'damage',damage,'support',support,
  'oldestQueuedAtMs',floor(extract(epoch from oldest)*1000)) order by expedition_id),'[]'::jsonb) into v_rows from demand;
 return jsonb_build_object('serverNow',floor(extract(epoch from v_now)*1000),'demands',v_rows);
end $$;

create or replace function public.browse_online_coop_lfg_server_v1(p_account_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_now timestamptz:=clock_timestamp();v_rows jsonb;
begin
 delete from public.online_coop_lfg_posts where expires_at<=v_now or closed_at is not null;
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',p.id,'dungeonId',p.dungeon_id,'ownerName',coalesce(g.state#>>'{character,name}','Adventurer'),
   'role',p.role,'maxTier',p.max_tier,'note',p.note,
   'createdAtMs',floor(extract(epoch from p.created_at)*1000),
   'expiresAtMs',floor(extract(epoch from p.expires_at)*1000),
   'mine',p.owner_account_id=p_account_id
 ) order by p.expires_at,p.created_at),'[]'::jsonb) into v_rows
 from (
  select * from public.online_coop_lfg_posts
  where closed_at is null and expires_at>v_now
  order by expires_at,created_at
  limit 50
 ) p join public.online_game_states g on g.account_id=p.owner_account_id;
 return v_rows;
end $$;

create or replace function public.publish_online_coop_lfg_server_v1(
 p_account_id uuid,p_request_id text,p_request_hash text,p_character_id uuid,p_dungeon_id text,p_role text,p_max_tier smallint,p_note text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare g public.online_game_states;v_prior jsonb;v_now timestamptz:=clock_timestamp();v_post public.online_coop_lfg_posts;v_response jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('online-coop-lfg:'||p_account_id::text,0));
 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'coop_lfg_publish_v1',p_account_id::text,p_request_id);
 if v_prior is not null then
  if v_prior->>'requestHash' is distinct from p_request_hash then raise exception 'idempotency_key_conflict';end if;
  return v_prior->'response';
 end if;
 if p_request_id is null or p_request_id!~'^[a-zA-Z0-9_-]{8,128}$' or p_request_hash is null or p_request_hash!~'^[a-f0-9]{64}$'
  or p_dungeon_id not in ('EXP_001','EXP_002','EXP_003','EXP_004','EXP_005','EXP_006','EXP_007','EXP_008')
  or p_role not in ('tank','damage','support') or p_max_tier not between 1 and 5 or char_length(coalesce(p_note,''))>140 then raise exception 'invalid_request';end if;
 select * into g from public.online_game_states where account_id=p_account_id for share;
 if not found or g.character_id is null then raise exception 'character_required';end if;
 if g.character_id is distinct from p_character_id then raise exception 'character_not_owned';end if;
 insert into public.online_coop_lfg_posts(id,owner_account_id,character_id,dungeon_id,role,max_tier,note,created_at,expires_at,closed_at)
 values(gen_random_uuid(),p_account_id,p_character_id,p_dungeon_id,p_role,p_max_tier,coalesce(p_note,''),v_now,v_now+interval '30 minutes',null)
 on conflict(owner_account_id) do update set id=gen_random_uuid(),character_id=excluded.character_id,dungeon_id=excluded.dungeon_id,
  role=excluded.role,max_tier=excluded.max_tier,note=excluded.note,created_at=v_now,expires_at=v_now+interval '30 minutes',closed_at=null
 returning * into v_post;
 v_response:=jsonb_build_object('id',v_post.id,'dungeonId',v_post.dungeon_id,'ownerName',coalesce(g.state#>>'{character,name}','Adventurer'),
  'role',v_post.role,'maxTier',v_post.max_tier,'note',v_post.note,'createdAtMs',floor(extract(epoch from v_post.created_at)*1000),
  'expiresAtMs',floor(extract(epoch from v_post.expires_at)*1000),'mine',true);
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json)
 values(p_account_id,'coop_lfg_publish_v1',p_account_id::text,p_request_id,p_request_hash,v_response);
 return v_response;
end $$;

create or replace function public.close_online_coop_lfg_server_v1(p_account_id uuid,p_request_id text,p_request_hash text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_prior jsonb;v_response jsonb:=jsonb_build_object('closed',true);
begin
 perform pg_advisory_xact_lock(hashtextextended('online-coop-lfg:'||p_account_id::text,0));
 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'coop_lfg_close_v1',p_account_id::text,p_request_id);
 if v_prior is not null then
  if v_prior->>'requestHash' is distinct from p_request_hash then raise exception 'idempotency_key_conflict';end if;
  return v_prior->'response';
 end if;
 if p_request_id is null or p_request_id!~'^[a-zA-Z0-9_-]{8,128}$' or p_request_hash is null or p_request_hash!~'^[a-f0-9]{64}$' then raise exception 'invalid_request';end if;
 update public.online_coop_lfg_posts set closed_at=clock_timestamp() where owner_account_id=p_account_id;
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json)
 values(p_account_id,'coop_lfg_close_v1',p_account_id::text,p_request_id,p_request_hash,v_response);
 return v_response;
end $$;

revoke all on function public.close_online_coop_lfg_on_ticket_state_v1() from public,anon,authenticated;
revoke all on function public.online_live_quick_match_demand_server_v1(uuid) from public,anon,authenticated;
revoke all on function public.browse_online_coop_lfg_server_v1(uuid) from public,anon,authenticated;
revoke all on function public.publish_online_coop_lfg_server_v1(uuid,text,text,uuid,text,text,smallint,text) from public,anon,authenticated;
revoke all on function public.close_online_coop_lfg_server_v1(uuid,text,text) from public,anon,authenticated;
grant execute on function public.online_live_quick_match_demand_server_v1(uuid),public.browse_online_coop_lfg_server_v1(uuid),
 public.publish_online_coop_lfg_server_v1(uuid,text,text,uuid,text,text,smallint,text),public.close_online_coop_lfg_server_v1(uuid,text,text) to service_role;

do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('veldryn-online-coop-lfg-cleanup','* * * * *','delete from public.online_coop_lfg_posts where expires_at<=clock_timestamp() or closed_at is not null');
 end if;
end $$;

commit;
