-- Forward migration from rollback-only staging-verified performance review.
CREATE OR REPLACE FUNCTION private.reward_inbox_sync_v1(uid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 -- One inbox row per account/definition/season/reward scope, even when
 -- multiple party instances produced entitlements for that same scope.
 -- Prefer evidence of a completed claim; otherwise choose the earliest
 -- entitlement deterministically. Never sum awards across duplicate scopes.
 with party_rows as (
  select r.id as source_id,i.definition_id,i.season_key,r.reward_key,
    r.reward_json,r.created_at,
    coalesce(r.claimed_at,(select min(a.created_at) from public.server_action_receipts a
      where a.account_id=uid and a.action='party_contract_reward'
        and a.idempotency_key=i.definition_id||':'||i.season_key||':'||r.reward_key)) as claimed_at
  from public.party_contract_reward_entitlements_v16 r
  join public.party_contract_instances_v16 i on i.id=r.instance_id
  where r.account_id=uid
 ), canonical as (
  select distinct on (definition_id,season_key,reward_key) *
  from party_rows
  order by definition_id,season_key,reward_key,(claimed_at is null),
    claimed_at asc nulls last,created_at asc,source_id asc
 )
 insert into private.reward_inbox_v1(account_id,source_key,source_kind,source_id,title,body,attachments,created_at,claimed_at)
 select uid,'party:'||definition_id||':'||season_key||':'||reward_key,'party',source_id,
  case when reward_key like 'tier:%' then initcap(substr(reward_key,6))||' party reward' else 'Party contract reward' end,
  'Earned together. Your reward remains available after the weekly reset.',
  jsonb_build_array(jsonb_build_object('kind','gold','resourceId','gold','name','Gold','quantity',coalesce((reward_json->>'gold')::integer,0))),created_at,claimed_at
 from canonical
 on conflict(account_id,source_key) do update set claimed_at=excluded.claimed_at
 where private.reward_inbox_v1.claimed_at is null and excluded.claimed_at is not null;
 insert into private.reward_inbox_v1(account_id,source_key,source_kind,source_id,title,body,attachments,claimed_at)
 select uid,'guild:'||p.id,'guild',p.id,'Guild weekly reward','Your personal contribution qualified for this completed guild project.',
  '[{"kind":"gold","resourceId":"gold","name":"Gold","quantity":500}]',r.claimed_at
 from public.guild_project_instances p join public.guild_project_member_progress m on m.project_instance_id=p.id and m.account_id=uid
 left join public.guild_project_reward_claims r on r.project_instance_id=p.id and r.account_id=uid and r.reward_key='completion'
 where p.template_id='guild_weekly_shared_effort' and p.status='completed' and m.raw_points>=p.personal_reward_threshold
 on conflict(account_id,source_key) do update set claimed_at=excluded.claimed_at where private.reward_inbox_v1.claimed_at is null and excluded.claimed_at is not null;
 insert into private.reward_inbox_v1(account_id,source_key,source_kind,source_id,title,body,attachments,created_at,claimed_at)
 select uid,'dungeon:'||e.id,'dungeon',e.id,'Dungeon reward','Reward charges and bonuses are calculated when claimed.',
  jsonb_build_array(jsonb_build_object('kind','marks','resourceId','expedition_marks','name','Expedition Marks','quantity',coalesce((e.reward_json->>'marks')::integer,(e.reward_json->>'enhanced_marks')::integer,0))),e.period_date_key::timestamptz,e.claimed_at
 from public.coop_reward_entitlements e where e.recipient_account_id=uid
 on conflict(account_id,source_key) do update set claimed_at=excluded.claimed_at where private.reward_inbox_v1.claimed_at is null and excluded.claimed_at is not null;
end $function$
;
