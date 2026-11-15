-- Account-owned Party membership: keep legacy (party_id, character_id) identity
-- and original joined_at while supporting all characters owned by that account.
-- Intentionally does NOT migrate or rewrite the party_members primary key.
-- The four existing functions are patched against their installed definitions so
-- newer behavior from other migrations is preserved. Refuse unknown definition
-- shapes rather than silently dropping fixes.
do $patch$
declare
  v_old text;
  v_new text;
  v_needle text;
  v_target regprocedure;
begin
  -- Online-game contribution gate must look up account membership even when
  -- the currently selected character differs from the character that joined.
  v_old := pg_get_functiondef('public.commit_online_game_server_v1(uuid,bigint,bigint,text,text,jsonb,jsonb)'::regprocedure);
  v_needle := 'select joined_at into v_joined from public.party_members where character_id=v_id and left_at is null';
  if length(v_old)-length(replace(v_old,v_needle,'')) <> length(v_needle) then
    raise exception 'party_alt_character_online_commit_definition_drift';
  end if;
  v_new := replace(v_old,v_needle,
    'select joined_at into v_joined from public.party_members where account_id=p_account_id and left_at is null');
  execute v_new;

  -- Party Contracts receive verified actions from any of the account's
  -- characters. The original joined_at cutoff and account lock remain.
  v_old := pg_get_functiondef('public.settle_party_activity_v16(uuid,text,numeric,text,timestamptz)'::regprocedure);
  v_needle := 'join public.party_members m on m.character_id=c.id';
  if length(v_old)-length(replace(v_old,v_needle,'')) <> length(v_needle) then
    raise exception 'party_alt_character_settlement_definition_drift';
  end if;
  v_new := replace(v_old,v_needle,
    'join public.party_members m on m.account_id=c.account_id');
  execute v_new;

  -- Preserve the anti-banked-work limitation: only verified gathering since
  -- the account joined the party is eligible.
  v_old := pg_get_functiondef('public.party_gathering_receipt_v16()'::regprocedure);
  v_needle := 'from public.party_members m where m.character_id=v_character and m.left_at is null';
  if length(v_old)-length(replace(v_old,v_needle,'')) <> length(v_needle) then
    raise exception 'party_alt_character_gathering_definition_drift';
  end if;
  v_new := replace(v_old,v_needle,
    'from public.party_members m join public.characters owned on owned.account_id=m.account_id where owned.id=v_character and m.left_at is null');
  execute v_new;

  -- Party UI shows the account's active, owned character instead of the
  -- character originally recorded in the immutable membership row.
  -- Production keeps the original roster projection in a wrapped helper
  -- (party_social_state_before_weekly_tiers_v1); staging uses the v16 RPC
  -- directly. Patch the function that actually emits the Party members.
  v_target := to_regprocedure('public.party_social_state_before_weekly_tiers_v1()');
  if v_target is null then
    v_target := 'public.party_social_state_v16()'::regprocedure;
  end if;
  v_old := pg_get_functiondef(v_target);
  v_needle := 'join public.characters c on c.id=m.character_id';
  if length(v_old)-length(replace(v_old,v_needle,'')) <> length(v_needle) then
    raise exception 'party_alt_character_social_projection_definition_drift';
  end if;
  v_new := replace(v_old,v_needle,
    'left join public.player_profiles active_profile on active_profile.account_id=m.account_id left join public.characters active_char on active_char.id=active_profile.active_character_id and active_char.account_id=m.account_id join public.characters c on c.id=coalesce(active_char.id,m.character_id) and c.account_id=m.account_id');
  v_needle := '''role'',m.role,''isLeader''';
  if length(v_new)-length(replace(v_new,v_needle,'')) <> length(v_needle) then
    raise exception 'party_alt_character_social_role_definition_drift';
  end if;
  v_new := replace(v_new,v_needle,
    '''role'',case when c.class_id in (''IRONWARDEN'',''BASTION'',''DREADGUARD'') then ''tank'' when c.class_id in (''DAWNKEEPER'',''STONECALLER'') then ''support'' when c.class_id in (''WAYFINDER'',''RAVAGER'',''HEXWEAVER'',''KNIFE_DANCER'') then ''damage'' else m.role end,''isLeader''');
  execute v_new;
end
$patch$;

-- Keep Party role and legacy leader display identity in sync when the account
-- changes character. Retain the membership character PK and its joined_at.
create or replace function public.sync_party_active_character_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $sync$
declare
  v_class_id text;
  v_role text;
begin
  if new.character_id is null
     or new.character_id is not distinct from old.character_id then
    return new;
  end if;
  select c.class_id into v_class_id
    from public.characters c
   where c.id=new.character_id and c.account_id=new.account_id;
  if not found then
    raise exception 'party_active_character_not_owned';
  end if;
  v_role := case
    when v_class_id in ('IRONWARDEN','BASTION','DREADGUARD') then 'tank'
    when v_class_id in ('DAWNKEEPER','STONECALLER') then 'support'
    when v_class_id in ('WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER') then 'damage'
    else null
  end;
  if v_role is not null then
    update public.party_members m
       set role=v_role
     where m.account_id=new.account_id
       and m.left_at is null
       and m.role is distinct from v_role;
  end if;
  update public.parties p
     set leader_character_id=new.character_id,
         updated_at=now()
   where p.leader_account_id=new.account_id
     and p.status<>'disbanded'
     and p.leader_character_id is distinct from new.character_id
     and exists(
       select 1 from public.party_members m
        where m.party_id=p.id and m.account_id=new.account_id and m.left_at is null
     );
  return new;
end
$sync$;

drop trigger if exists sync_party_active_character_v1 on public.online_game_states;
create trigger sync_party_active_character_v1
after update of character_id on public.online_game_states
for each row
when (old.character_id is distinct from new.character_id)
execute function public.sync_party_active_character_v1();

revoke all on function public.sync_party_active_character_v1() from public, anon, authenticated;

-- Existing Party Contract entitlements already have a unique key on
-- (instance_id,account_id,reward_key): do not create second entitlements by
-- character, and do not alter existing account-wide claim semantics.
