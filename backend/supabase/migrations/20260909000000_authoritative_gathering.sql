-- First authoritative progression loop: gathering only. Canonical recipe and
-- combat catalogues follow in later content migrations.
create table if not exists public.server_action_receipts (
  account_id uuid not null references auth.users(id) on delete cascade,
  action text not null, idempotency_key text not null, response jsonb not null,
  created_at timestamptz not null default now(), primary key(account_id,action,idempotency_key)
);
alter table public.server_action_receipts enable row level security;

create or replace function public.start_gathering_activity(p_character_id uuid,p_activity_id text)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_skill text;v_min_level int;
begin
 if not exists(select 1 from public.characters where id=p_character_id and account_id=v_uid) then raise exception 'CHARACTER_NOT_OWNED';end if;
 select skill,min_level into v_skill,v_min_level from (values
  ('COPPER_VEIN','mining',1),('ASTER_IRON_VEIN','mining',8),('OATHSTONE_SEAM','mining',16),
  ('GREENWOOD_TREE','woodcutting',1),('IRONWOOD_TREE','woodcutting',7),('CROWNWOOD_TREE','woodcutting',15),
  ('SILVERBROOK_SHOAL','fishing',1),('RIVER_EEL_POOL','fishing',8),('OATHSCALE_POOL','fishing',16)
 ) as a(id,skill,min_level) where id=p_activity_id;
 if v_skill is null then raise exception 'INVALID_GATHERING_ACTIVITY';end if;
 if coalesce((select level from public.character_skills where character_id=p_character_id and skill_id=v_skill),1)<v_min_level then raise exception 'SKILL_LEVEL_TOO_LOW';end if;
 insert into public.character_activities(character_id,activity_id,started_at,last_claim_at,metadata) values(p_character_id,p_activity_id,now(),now(),jsonb_build_object('kind','gathering'))
 on conflict(character_id) do update set activity_id=excluded.activity_id,started_at=excluded.started_at,last_claim_at=excluded.last_claim_at,state_version=character_activities.state_version+1,metadata=excluded.metadata;
end $$;

create or replace function public.claim_gathering_activity(p_character_id uuid,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_activity public.character_activities%rowtype;v_seconds int;v_xp int;v_item text;v_skill text;v_cycles int;v_elapsed int;v_result jsonb;
begin
 if v_uid is null or not exists(select 1 from public.characters where id=p_character_id and account_id=v_uid) then raise exception 'CHARACTER_NOT_OWNED';end if;
 select response into v_result from public.server_action_receipts where account_id=v_uid and action='claim_gathering' and idempotency_key=p_idempotency_key;if found then return v_result||jsonb_build_object('replayed',true);end if;
 select * into v_activity from public.character_activities where character_id=p_character_id for update;if not found or v_activity.metadata->>'kind'<>'gathering' then raise exception 'NO_GATHERING_ACTIVITY';end if;
 select seconds,xp,item,skill into v_seconds,v_xp,v_item,v_skill from (values
  ('COPPER_VEIN',23,9,'COPPER_ORE','mining'),('ASTER_IRON_VEIN',36,18,'ASTER_IRON_ORE','mining'),('OATHSTONE_SEAM',54,29,'OATHSTONE_ORE','mining'),
  ('GREENWOOD_TREE',21,8,'GREENWOOD_LOG','woodcutting'),('IRONWOOD_TREE',36,17,'IRONWOOD_LOG','woodcutting'),('CROWNWOOD_TREE',54,27,'CROWNWOOD_LOG','woodcutting'),
  ('SILVERBROOK_SHOAL',26,9,'SILVERFIN','fishing'),('RIVER_EEL_POOL',44,18,'RIVER_EEL','fishing'),('OATHSCALE_POOL',62,28,'OATHSCALE_PIKE','fishing')
 ) as a(id,seconds,xp,item,skill) where id=v_activity.activity_id;
 v_elapsed:=least(129600,greatest(0,floor(extract(epoch from now()-v_activity.last_claim_at))::int));v_cycles:=floor(v_elapsed/v_seconds);
 if v_cycles=0 then return jsonb_build_object('cycles',0,'xp',0,'items',0);end if;
 insert into public.item_instances(character_id,item_id,quantity) values(p_character_id,v_item,v_cycles);
 insert into public.character_skills(character_id,skill_id,level,xp) values(p_character_id,v_skill,1,v_cycles*v_xp) on conflict(character_id,skill_id) do update set xp=character_skills.xp+excluded.xp;
 update public.character_activities set last_claim_at=now(),state_version=state_version+1 where character_id=p_character_id;
 v_result:=jsonb_build_object('cycles',v_cycles,'xp',v_cycles*v_xp,'item_id',v_item,'items',v_cycles,'replayed',false);
 insert into public.server_action_receipts(account_id,action,idempotency_key,response) values(v_uid,'claim_gathering',p_idempotency_key,v_result);return v_result;
end $$;
revoke all on function public.start_gathering_activity(uuid,text),public.claim_gathering_activity(uuid,text) from public;
grant execute on function public.start_gathering_activity(uuid,text),public.claim_gathering_activity(uuid,text) to authenticated;
