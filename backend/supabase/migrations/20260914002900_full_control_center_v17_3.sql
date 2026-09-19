begin;

-- VELDRYN v17.3 Full Control Center.
-- IMPORTANT: the player Market was removed from the product. Migration 028 is historical
-- and may have seeded a Market kill switch. Remove that stale control without rewriting
-- already-applied migration history.
delete from public.ops_remote_config where config_key = 'feature.market.enabled';

create table if not exists public.ops_admin_command_registry (
  command_key text primary key,
  category text not null,
  label text not null,
  description text not null default '',
  target_scope text not null default 'account' check (target_scope in ('none','account','character','account_or_character')),
  min_role text not null default 'owner' check (min_role in ('viewer','editor','owner')),
  risk_tier text not null default 'high' check (risk_tier in ('low','medium','high','critical')),
  handler_key text not null,
  params_schema jsonb not null default '{"fields":[]}'::jsonb,
  reversible boolean not null default false,
  requires_approval boolean not null default false,
  enabled boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ops_admin_commands (
  id uuid primary key default gen_random_uuid(),
  command_key text not null references public.ops_admin_command_registry(command_key),
  target_account_id uuid,
  target_character_id uuid,
  target_ref text,
  parameters_json jsonb not null default '{}'::jsonb,
  reason text not null,
  risk_tier text not null check (risk_tier in ('low','medium','high','critical')),
  status text not null default 'approved' check (status in ('pending_approval','approved','processing','succeeded','failed','cancelled')),
  requested_by uuid not null,
  requested_by_email text,
  requested_by_role text not null check (requested_by_role in ('viewer','editor','owner')),
  approved_by uuid,
  approved_at timestamptz,
  confirmation_text text,
  idempotency_key uuid not null unique default gen_random_uuid(),
  execute_after timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  result_json jsonb,
  error_text text,
  reversible boolean not null default false,
  reversal_of uuid references public.ops_admin_commands(id),
  cancelled_by uuid,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ops_admin_commands_target_account on public.ops_admin_commands(target_account_id, created_at desc);
create index if not exists idx_ops_admin_commands_target_character on public.ops_admin_commands(target_character_id, created_at desc);
create index if not exists idx_ops_admin_commands_worker on public.ops_admin_commands(status, available_at, execute_after, created_at);

create table if not exists public.ops_admin_command_events (
  id bigint generated always as identity primary key,
  command_id uuid not null references public.ops_admin_commands(id),
  event_type text not null,
  actor_account_id uuid,
  actor_email text,
  detail_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_ops_admin_command_events_command on public.ops_admin_command_events(command_id, created_at asc);

create table if not exists public.ops_admin_content_catalog (
  entity_type text not null,
  entity_key text not null,
  label text not null,
  description text not null default '',
  metadata_json jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  source_version text,
  synced_at timestamptz not null default now(),
  primary key(entity_type, entity_key)
);
create index if not exists idx_ops_admin_content_catalog_type on public.ops_admin_content_catalog(entity_type, label);

create table if not exists public.ops_redeem_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_hint text not null,
  label text not null check (char_length(label) between 1 and 120),
  reward_bundle_id text not null,
  max_total_claims integer check (max_total_claims is null or max_total_claims > 0),
  max_claims_per_account integer not null default 1 check (max_claims_per_account between 1 and 20),
  claims_count integer not null default 0 check (claims_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  enabled boolean not null default true,
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index if not exists idx_ops_redeem_codes_active on public.ops_redeem_codes(enabled,starts_at,ends_at);

create table if not exists public.ops_redeem_code_claims (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.ops_redeem_codes(id),
  account_id uuid not null,
  claim_sequence integer not null default 1 check (claim_sequence between 1 and 20),
  reward_bundle_id text not null,
  idempotency_key text not null unique,
  status text not null default 'reserved' check (status in ('reserved','granted','failed')),
  error_text text,
  created_at timestamptz not null default now(),
  granted_at timestamptz,
  unique(code_id,account_id,claim_sequence)
);
create index if not exists idx_ops_redeem_claims_account on public.ops_redeem_code_claims(account_id,created_at desc);


-- Atomic redeem reservation. The authenticated game backend hashes the entered code,
-- resolves the account from its trusted session, then invokes this as service_role.
create or replace function public.reserve_ops_redeem_code_claim(p_code_hash text,p_account_id uuid)
returns table(claim_id uuid,reward_bundle_id text,idempotency_key text)
language plpgsql security definer set search_path=public as $$
declare
  v_code public.ops_redeem_codes%rowtype;
  v_claim public.ops_redeem_code_claims%rowtype;
  v_account_claims integer;
  v_sequence integer;
begin
  if p_account_id is null or coalesce(length(p_code_hash),0) <> 64 then raise exception 'invalid_redeem_request'; end if;
  select * into v_code from public.ops_redeem_codes where code_hash=p_code_hash for update;
  if not found or not v_code.enabled then raise exception 'redeem_code_invalid'; end if;
  if v_code.starts_at is not null and now() < v_code.starts_at then raise exception 'redeem_code_not_started'; end if;
  if v_code.ends_at is not null and now() >= v_code.ends_at then raise exception 'redeem_code_expired'; end if;
  if v_code.max_total_claims is not null and v_code.claims_count >= v_code.max_total_claims then raise exception 'redeem_code_exhausted'; end if;

  select count(*),coalesce(max(claim_sequence),0)+1 into v_account_claims,v_sequence
  from public.ops_redeem_code_claims where code_id=v_code.id and account_id=p_account_id;
  if v_account_claims >= v_code.max_claims_per_account then raise exception 'redeem_code_account_limit'; end if;

  insert into public.ops_redeem_code_claims(code_id,account_id,claim_sequence,reward_bundle_id,idempotency_key,status)
  values(v_code.id,p_account_id,v_sequence,v_code.reward_bundle_id,'redeem-code:'||v_code.id::text||':'||p_account_id::text||':'||v_sequence::text,'reserved')
  returning * into v_claim;
  update public.ops_redeem_codes set claims_count=claims_count+1,updated_at=now() where id=v_code.id;

  return query select v_claim.id,v_claim.reward_bundle_id,v_claim.idempotency_key;
end $$;
revoke all on function public.reserve_ops_redeem_code_claim(text,uuid) from public,anon,authenticated;
grant execute on function public.reserve_ops_redeem_code_claim(text,uuid) to service_role;

create or replace function public.set_ops_redeem_claim_status(p_claim_id uuid,p_status text,p_error text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_status not in ('reserved','granted','failed') then raise exception 'invalid_redeem_claim_status'; end if;
  update public.ops_redeem_code_claims set status=p_status,error_text=case when p_status='granted' then null else left(p_error,1000) end,granted_at=case when p_status='granted' then coalesce(granted_at,now()) else granted_at end
  where id=p_claim_id;
  if not found then raise exception 'redeem_claim_not_found'; end if;
end $$;
revoke all on function public.set_ops_redeem_claim_status(uuid,text,text) from public,anon,authenticated;
grant execute on function public.set_ops_redeem_claim_status(uuid,text,text) to service_role;

create table if not exists public.ops_admin_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  severity text not null default 'info' check (severity in ('info','success','warning','critical')),
  audience_json jsonb not null default '{"kind":"all"}'::jsonb,
  starts_at timestamptz not null,
  ends_at timestamptz,
  in_game_enabled boolean not null default true,
  push_enabled boolean not null default false,
  status text not null default 'scheduled' check (status in ('draft','scheduled','active','ended','cancelled')),
  created_by uuid not null,
  updated_by uuid not null,
  cancelled_by uuid,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index if not exists idx_ops_admin_announcements_schedule on public.ops_admin_announcements(status, starts_at, ends_at);

alter table public.ops_admin_command_registry enable row level security;
alter table public.ops_admin_commands enable row level security;
alter table public.ops_admin_command_events enable row level security;
alter table public.ops_admin_content_catalog enable row level security;
alter table public.ops_redeem_codes enable row level security;
alter table public.ops_redeem_code_claims enable row level security;
alter table public.ops_admin_announcements enable row level security;

revoke all on public.ops_admin_command_registry from anon, authenticated;
revoke all on public.ops_admin_commands from anon, authenticated;
revoke all on public.ops_admin_command_events from anon, authenticated;
revoke all on public.ops_admin_content_catalog from anon, authenticated;
revoke all on public.ops_redeem_codes from anon, authenticated;
revoke all on public.ops_redeem_code_claims from anon, authenticated;
revoke all on public.ops_admin_announcements from anon, authenticated;

-- Command events are an immutable forensic ledger.
create or replace function public.prevent_ops_admin_command_event_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'ops_admin_command_events_are_append_only';
end $$;
drop trigger if exists trg_ops_admin_command_events_append_only on public.ops_admin_command_events;
create trigger trg_ops_admin_command_events_append_only
before update or delete on public.ops_admin_command_events
for each row execute function public.prevent_ops_admin_command_event_mutation();

-- Atomic worker claim; domain-side worker must execute through trusted game services,
-- never by applying arbitrary table patches from the control website.
create or replace function public.claim_ops_admin_commands(p_limit integer default 10)
returns setof public.ops_admin_commands
language plpgsql security definer set search_path=public as $$
begin
  return query
  with picked as (
    select id from public.ops_admin_commands
    where status='approved'
      and available_at <= now()
      and execute_after <= now()
      and attempts < 5
    order by created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit,10),50))
  )
  update public.ops_admin_commands c set
    status='processing',
    attempts=c.attempts+1,
    locked_at=now(),
    started_at=coalesce(c.started_at,now()),
    updated_at=now()
  from picked
  where c.id=picked.id
  returning c.*;
end $$;
revoke all on function public.claim_ops_admin_commands(integer) from public, anon, authenticated;
grant execute on function public.claim_ops_admin_commands(integer) to service_role;

-- Current-system command registry. UI renders these schemas dynamically, so future
-- commands normally require only a registry row + trusted backend handler, not a new page.
insert into public.ops_admin_command_registry
(command_key,category,label,description,target_scope,min_role,risk_tier,handler_key,params_schema,reversible,requires_approval,notes)
values
('account.force_logout','Account','Force sign-out','Invalidate active sessions for an account.','account','owner','high','account.force_logout','{"fields":[]}',false,false,'Useful after account recovery or suspected session compromise.'),
('account.schedule_deletion','Account','Schedule account deletion','Starts the game account deletion workflow; handler must honor the configured grace period.','account','owner','critical','account.schedule_deletion','{"fields":[{"name":"graceHours","label":"Deletion grace period (hours)","type":"integer","required":true,"min":24,"max":720,"default":168}]}',true,true,'Never hard-delete immediately from the control website.'),
('account.cancel_deletion','Account','Cancel scheduled deletion','Cancels a still-pending account deletion request.','account','owner','high','account.cancel_deletion','{"fields":[]}',true,false,''),
('moderation.chat_mute','Moderation','Mute chat','Prevent an account from sending chat messages for a bounded period.','account','editor','medium','moderation.chat_mute','{"fields":[{"name":"durationMinutes","label":"Duration (minutes)","type":"integer","required":true,"min":1,"max":43200,"default":60},{"name":"moderationCode","label":"Reason code","type":"select","required":true,"options":["spam","harassment","abuse","impersonation","other"]}]}',true,false,''),
('moderation.chat_unmute','Moderation','Remove chat mute','Remove the current chat mute after review.','account','editor','medium','moderation.chat_unmute','{"fields":[]}',true,false,''),
('moderation.chat_message_hide','Moderation','Hide chat message','Hide a reported chat message while preserving it for moderation/audit history.','none','editor','medium','moderation.chat_message_hide','{"fields":[{"name":"messageId","label":"Message ID","type":"text","required":true,"minLength":3,"maxLength":160},{"name":"moderationCode","label":"Reason code","type":"select","required":true,"options":["spam","harassment","abuse","impersonation","privacy","other"]}]}',true,false,'Do not hard-delete moderation evidence.'),
('moderation.chat_message_restore','Moderation','Restore chat message','Restore a previously hidden chat message after review.','none','owner','high','moderation.chat_message_restore','{"fields":[{"name":"messageId","label":"Message ID","type":"text","required":true,"minLength":3,"maxLength":160}]}',true,false,''),
('moderation.suspend','Moderation','Suspend account','Temporarily block gameplay login/actions for an account.','account','owner','critical','moderation.suspend','{"fields":[{"name":"durationMinutes","label":"Duration (minutes)","type":"integer","required":true,"min":10,"max":525600,"default":1440},{"name":"moderationCode","label":"Reason code","type":"select","required":true,"options":["cheating","exploitation","harassment","payment_abuse","security","other"]}]}',true,true,''),
('moderation.unsuspend','Moderation','Remove suspension','Remove an active account suspension.','account','owner','high','moderation.unsuspend','{"fields":[]}',true,false,''),
('character.rename','Character','Rename character','Apply an approved support rename through the normal name validation/reservation service.','character','owner','high','character.rename','{"fields":[{"name":"newName","label":"New character name","type":"text","required":true,"minLength":3,"maxLength":24}]}',true,false,'Handler must enforce reserved/prohibited names and uniqueness.'),
('economy.gold_adjust','Economy','Adjust Gold','Add or remove Gold through the authoritative economy ledger.','account_or_character','owner','high','economy.gold_adjust','{"fields":[{"name":"amount","label":"Gold delta","type":"integer","required":true,"min":-1000000,"max":1000000}]}',true,false,'Negative adjustment may not drive the authoritative balance below zero unless recovery policy explicitly allows it.'),
('economy.gold_set','Economy','Set exact Gold','Corruption-recovery control that sets the authoritative Gold balance exactly.','account_or_character','owner','critical','economy.gold_set','{"fields":[{"name":"balance","label":"Exact Gold balance","type":"integer","required":true,"min":0,"max":2000000000}]}',true,true,'Prefer Gold adjustment. Exact set is only for verified corrupted state.'),
('economy.currency_adjust','Economy','Adjust non-premium currency','Adjust a registered non-premium/event currency.','account','owner','high','economy.currency_adjust','{"fields":[{"name":"currencyId","label":"Currency","type":"catalog","catalogType":"currency_nonpremium","required":true},{"name":"amount","label":"Quantity delta","type":"integer","required":true,"min":-1000000,"max":1000000}]}',true,false,''),
('economy.currency_set','Economy','Set exact non-premium currency','Corruption-recovery control that sets one registered non-premium/event currency exactly.','account','owner','critical','economy.currency_set','{"fields":[{"name":"currencyId","label":"Currency","type":"catalog","catalogType":"currency_nonpremium","required":true},{"name":"balance","label":"Exact balance","type":"integer","required":true,"min":0,"max":2000000000}]}',true,true,'Prefer delta adjustment for normal support.'),
('economy.premium_currency_adjust','Economy','Adjust premium currency','Exceptional support-only premium-currency correction.','account','owner','critical','economy.premium_currency_adjust','{"fields":[{"name":"currencyId","label":"Premium currency","type":"catalog","catalogType":"premium_currency","required":true},{"name":"amount","label":"Quantity delta","type":"integer","required":true,"min":-100000,"max":100000},{"name":"externalReference","label":"Store/support reference","type":"text","required":true,"minLength":3,"maxLength":120}]}',true,true,'Prefer receipt reconciliation; use manual adjustment only for explicit support recovery.'),
('inventory.item_adjust','Inventory','Adjust item/material quantity','Grant or remove a registered item/material via authoritative inventory services.','character','owner','high','inventory.item_adjust','{"fields":[{"name":"itemId","label":"Item / material","type":"catalog","catalogType":"item","required":true},{"name":"quantityDelta","label":"Quantity delta","type":"integer","required":true,"min":-99999,"max":99999},{"name":"bound","label":"Bind granted items","type":"boolean","required":false,"default":false}]}',true,false,'Removal must fail safely if insufficient quantity unless the handler has an explicit recovery policy.'),
('inventory.item_set','Inventory','Set exact item/material quantity','Corruption-recovery control that sets an inventory quantity exactly.','character','owner','critical','inventory.item_set','{"fields":[{"name":"itemId","label":"Item / material","type":"catalog","catalogType":"item","required":true},{"name":"quantity","label":"Exact quantity","type":"integer","required":true,"min":0,"max":999999},{"name":"bound","label":"Bound inventory bucket","type":"boolean","required":false,"default":false}]}',true,true,'Prefer quantity adjustment unless repairing corrupted inventory.'),
('rewards.grant_bundle','Rewards','Grant reward bundle','Grant one of the validated reward bundles already registered by the game.','account','owner','critical','rewards.grant_bundle','{"fields":[{"name":"bundleId","label":"Reward bundle","type":"catalog","catalogType":"reward_bundle","required":true},{"name":"quantity","label":"Times to grant","type":"integer","required":true,"min":1,"max":10,"default":1}]}',false,true,'Not automatically reversible after rewards can be spent.'),
('rewards.reissue_claim','Rewards','Reissue failed/missing claim','Re-run a specific idempotent reward claim through the normal claim pipeline.','account','owner','critical','rewards.reissue_claim','{"fields":[{"name":"claimId","label":"Claim / receipt ID","type":"text","required":true,"minLength":3,"maxLength":160}]}',false,true,'Handler must refuse already-successful receipts unless the recovery path explicitly proves a missing settlement.'),
('progression.skill_xp_adjust','Progression','Adjust skill XP','Add or remove XP for one registered skill, then recalculate derived levels/totals.','character','owner','high','progression.skill_xp_adjust','{"fields":[{"name":"skillId","label":"Skill","type":"catalog","catalogType":"skill","required":true},{"name":"xpDelta","label":"XP delta","type":"integer","required":true,"min":-10000000,"max":10000000}]}',true,false,''),
('progression.skill_xp_set','Progression','Set exact skill XP','Set exact XP for one skill and recalculate all derived progression.','character','owner','critical','progression.skill_xp_set','{"fields":[{"name":"skillId","label":"Skill","type":"catalog","catalogType":"skill","required":true},{"name":"xp","label":"Exact XP","type":"integer","required":true,"min":0,"max":2000000000}]}',true,true,'Use adjustment for normal support. Exact set is for corrupted progression recovery.'),
('progression.recalculate_totals','Progression','Recalculate derived totals','Repair Combat Level/Total Level/account-wide derived totals from authoritative skill state.','account','editor','low','progression.recalculate_totals','{"fields":[]}',false,false,''),
('progression.cancel_stuck_activity','Progression','Cancel stuck activity','Safely stop a stuck gathering/crafting/combat activity using its normal settlement/cancellation rules.','character','owner','high','progression.cancel_stuck_activity','{"fields":[{"name":"activityId","label":"Activity/run reference","type":"text","required":true,"minLength":3,"maxLength":160}]}',false,false,''),
('entitlement.grant_override','Entitlements','Grant entitlement override','Grant a temporary/manual account-wide entitlement override.','account','owner','critical','entitlement.grant_override','{"fields":[{"name":"entitlementId","label":"Entitlement","type":"catalog","catalogType":"entitlement","required":true},{"name":"expiresAt","label":"Expires at (optional)","type":"datetime","required":false},{"name":"externalReference","label":"Store/support reference","type":"text","required":true,"minLength":3,"maxLength":120}]}',true,true,'Store purchase receipts remain source of truth; overrides must be clearly marked.'),
('entitlement.revoke_override','Entitlements','Revoke entitlement override','Remove a manual override without altering valid store ownership.','account','owner','critical','entitlement.revoke_override','{"fields":[{"name":"entitlementId","label":"Entitlement","type":"catalog","catalogType":"entitlement","required":true}]}',true,true,''),
('collectible.grant','Collections','Grant collectible','Grant a registered pet/background/border/skin unlock using normal ownership rules.','account_or_character','owner','high','collectible.grant','{"fields":[{"name":"collectibleType","label":"Type","type":"select","required":true,"options":["pet","profile_background","profile_border","skin","achievement","title"]},{"name":"collectibleId","label":"Collectible ID","type":"text","required":true,"minLength":2,"maxLength":160}]}',true,false,'Character-specific skin handlers must require a character target.'),
('collectible.revoke','Collections','Revoke collectible','Exceptional recovery removal of a collectible unlock.','account_or_character','owner','critical','collectible.revoke','{"fields":[{"name":"collectibleType","label":"Type","type":"select","required":true,"options":["pet","profile_background","profile_border","skin","achievement","title"]},{"name":"collectibleId","label":"Collectible ID","type":"text","required":true,"minLength":2,"maxLength":160}]}',true,true,''),
('companion.grant','Companions','Grant companion','Grant a registered companion using normal duplicate-protection rules.','account','owner','high','companion.grant','{"fields":[{"name":"companionId","label":"Companion","type":"catalog","catalogType":"companion","required":true}]}',true,false,''),
('companion.revoke','Companions','Revoke companion','Exceptional removal of an owned companion while preserving companion ownership/progression invariants.','account','owner','critical','companion.revoke','{"fields":[{"name":"companionInstanceId","label":"Owned companion instance","type":"text","required":true,"minLength":3,"maxLength":160}]}',false,true,'Do not use for normal duplicate handling.'),
('companion.xp_adjust','Companions','Adjust companion XP','Adjust owned companion XP and recalculate its derived level/stats.','account','owner','high','companion.xp_adjust','{"fields":[{"name":"companionInstanceId","label":"Owned companion instance","type":"text","required":true,"minLength":3,"maxLength":160},{"name":"xpDelta","label":"XP delta","type":"integer","required":true,"min":-10000000,"max":10000000}]}',true,false,''),
('companion.xp_set','Companions','Set exact companion XP','Corruption-recovery control for one owned companion.','account','owner','critical','companion.xp_set','{"fields":[{"name":"companionInstanceId","label":"Owned companion instance","type":"text","required":true,"minLength":3,"maxLength":160},{"name":"xp","label":"Exact XP","type":"integer","required":true,"min":0,"max":2000000000}]}',true,true,'Prefer XP adjustment for normal support.'),
('social.party_remove_member','Social','Remove Party member','Repair a persistent Party membership using normal leader/member cleanup rules.','account','editor','medium','social.party_remove_member','{"fields":[{"name":"partyId","label":"Party ID","type":"uuid","required":true}]}',false,false,''),
('social.party_disband','Social','Disband Party','Emergency/support disband of a persistent Party.','none','owner','high','social.party_disband','{"fields":[{"name":"partyId","label":"Party ID","type":"uuid","required":true}]}',false,false,''),
('social.party_rename','Social','Rename Party','Moderation/support rename of a persistent Party through normal naming rules.','none','owner','high','social.party_rename','{"fields":[{"name":"partyId","label":"Party ID","type":"uuid","required":true},{"name":"newName","label":"New Party name","type":"text","required":true,"minLength":2,"maxLength":40}]}',true,false,''),
('social.guild_remove_member','Social','Remove Guild member','Repair a Guild membership with normal leadership safeguards.','account','editor','medium','social.guild_remove_member','{"fields":[{"name":"guildId","label":"Guild ID","type":"uuid","required":true}]}',false,false,''),
('social.guild_transfer_leader','Social','Transfer Guild leadership','Exceptional Guild leadership recovery.','account','owner','critical','social.guild_transfer_leader','{"fields":[{"name":"guildId","label":"Guild ID","type":"uuid","required":true}]}',true,true,'Target account becomes leader; handler must verify target is eligible/current member.'),
('social.guild_disband','Social','Disband Guild','Irreversible Guild disband workflow.','none','owner','critical','social.guild_disband','{"fields":[{"name":"guildId","label":"Guild ID","type":"uuid","required":true}]}',false,true,'Handler should preserve audit/history and cancel pending Guild operations safely.'),
('social.guild_rename','Social','Rename Guild','Moderation/support rename of a Guild through normal naming/reservation rules.','none','owner','high','social.guild_rename','{"fields":[{"name":"guildId","label":"Guild ID","type":"uuid","required":true},{"name":"newName","label":"New Guild name","type":"text","required":true,"minLength":2,"maxLength":40}]}',true,false,''),
('dungeon.cancel_stuck_run','Dungeons','Cancel stuck Dungeon run','Safely close a broken Live/Q-Mode run and release reservations.','account_or_character','owner','high','dungeon.cancel_stuck_run','{"fields":[{"name":"runId","label":"Dungeon run ID","type":"text","required":true,"minLength":3,"maxLength":160},{"name":"refundEntry","label":"Refund consumed entry cost if verified","type":"boolean","required":false,"default":true}]}',false,false,''),
('dungeon.release_queue','Dungeons','Release queue reservation','Remove a stale matchmaking reservation without changing completed-run rewards.','account','editor','medium','dungeon.release_queue','{"fields":[{"name":"queueId","label":"Queue / reservation ID","type":"text","required":true,"minLength":3,"maxLength":160}]}',false,false,''),
('system.sync_content_catalog','System','Sync admin content catalog','Refresh dropdown registries (items, skills, currencies, rewards, companions, entitlements) from game source-of-truth definitions.','none','owner','low','system.sync_content_catalog','{"fields":[]}',false,false,'Run after content updates; never makes the catalog itself authoritative for gameplay.')
on conflict(command_key) do update set
  category=excluded.category,label=excluded.label,description=excluded.description,target_scope=excluded.target_scope,
  min_role=excluded.min_role,risk_tier=excluded.risk_tier,handler_key=excluded.handler_key,params_schema=excluded.params_schema,
  reversible=excluded.reversible,requires_approval=excluded.requires_approval,notes=excluded.notes,updated_at=now();

comment on table public.ops_admin_commands is 'Validated admin-command queue. The website queues named commands; a trusted game-domain worker executes them through normal services.';
comment on table public.ops_admin_content_catalog is 'Read-only-for-admin UI mirror of game registries. Gameplay never trusts this table as source of truth.';
comment on table public.ops_admin_command_events is 'Append-only forensic history for admin command lifecycle changes.';

commit;
