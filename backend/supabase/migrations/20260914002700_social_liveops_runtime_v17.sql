-- v17 runtime wiring: settlement envelopes, launch definitions, and the protected worker tick.
-- This is additive and leaves the already-applied v16 migration untouched.

alter table public.party_activity_weights_v16
  add column if not exists social_activity_kind text not null default 'combat',
  add column if not exists social_expected_seconds numeric(12,3) not null default 3600,
  add column if not exists social_challenge text not null default 'routine',
  add column if not exists social_region_id text,
  add column if not exists social_tags text[] not null default '{}';

-- Launch definitions are immutable rows; later balance changes require a new version.
insert into public.liveops_event_definitions(event_id,version,scope,definition_json,config_hash,created_by)
select v.event_id,1,'party',v.definition_json,encode(sha256(convert_to(v.event_id||':1','UTF8')),'hex'),'system-v17'
from (values
 ('party_event_rift_surge', '{"name":"Rift Surge","shortDescription":"Stabilize a spreading Rift through combat and realm-support activities.","durationHours":48,"eventTags":["rift","mixed","party_event"],"dailyAccountCreditCap":2400,"allowedCategories":["combat","skilling"],"minimumCategoryFraction":{"combat":0.30,"skilling":0.30},"rankedMinimumPartyPoints":4000,"meaningfulContributorPoints":250,"rankedMinimumMeaningfulContributors":2,"partyBindingLockPoints":250,"personalMilestones":[250,750,1500,2500],"partyMilestones":[2000,4000,6000,9000],"rankingRewards":{"qualified":"party_event_participation_v1","top25Percent":"party_event_rank_top25_v1","top10Percent":"party_event_rank_top10pct_v1","top100":"party_event_rank_top100_v1","top10":"party_event_rank_top10_v1"}}'::jsonb),
 ('party_event_sunscar_invasion', '{"name":"Sunscar Invasion","shortDescription":"Drive back an invasion with efficient combat.","durationHours":48,"eventTags":["sunscar","combat","party_event"],"dailyAccountCreditCap":2400,"allowedCategories":["combat"],"allowedActivityKinds":["combat"],"allowedRegionIds":["sunscar"],"rankedMinimumPartyPoints":4000,"meaningfulContributorPoints":250,"rankedMinimumMeaningfulContributors":2,"partyBindingLockPoints":250,"personalMilestones":[250,750,1500,2500],"partyMilestones":[2000,4000,6000,9000],"rankingRewards":{"qualified":"party_event_participation_v1","top25Percent":"party_event_rank_top25_v1","top10Percent":"party_event_rank_top10pct_v1","top100":"party_event_rank_top100_v1","top10":"party_event_rank_top10_v1"}}'::jsonb),
 ('party_event_asterfall_reconstruction', '{"name":"Rebuild Asterfall","shortDescription":"Gather, process and craft frontier supplies.","durationHours":48,"eventTags":["asterfall","skilling","party_event"],"dailyAccountCreditCap":2400,"allowedCategories":["skilling"],"allowedActivityKinds":["gathering","processing","crafting","delivery"],"allowedRegionIds":["asterfall"],"rankedMinimumPartyPoints":4000,"meaningfulContributorPoints":250,"rankedMinimumMeaningfulContributors":2,"partyBindingLockPoints":250,"personalMilestones":[250,750,1500,2500],"partyMilestones":[2000,4000,6000,9000],"rankingRewards":{"qualified":"party_event_participation_v1","top25Percent":"party_event_rank_top25_v1","top10Percent":"party_event_rank_top10pct_v1","top100":"party_event_rank_top100_v1","top10":"party_event_rank_top10_v1"}}'::jsonb),
 ('party_event_frostmarch_supply_crisis', '{"name":"Frostmarch Supply Crisis","shortDescription":"Keep remote settlements supplied.","durationHours":48,"eventTags":["frostmarch","skilling","party_event"],"dailyAccountCreditCap":2400,"allowedCategories":["skilling"],"allowedActivityKinds":["fishing","hunting","gathering","processing","crafting","delivery"],"allowedRegionIds":["frostmarch"],"rankedMinimumPartyPoints":4000,"meaningfulContributorPoints":250,"rankedMinimumMeaningfulContributors":2,"partyBindingLockPoints":250,"personalMilestones":[250,750,1500,2500],"partyMilestones":[2000,4000,6000,9000],"rankingRewards":{"qualified":"party_event_participation_v1","top25Percent":"party_event_rank_top25_v1","top10Percent":"party_event_rank_top10pct_v1","top100":"party_event_rank_top100_v1","top10":"party_event_rank_top10_v1"}}'::jsonb),
 ('party_event_blackened_wells', '{"name":"Blackened Wells","shortDescription":"Contain poisoned threats and produce emergency remedies.","durationHours":48,"eventTags":["mixed","poison","party_event"],"dailyAccountCreditCap":2400,"allowedCategories":["combat","skilling"],"allowedActivityKinds":["combat","gathering","alchemy","crafting"],"requiredAnyTags":["poison","antidote","tainted"],"minimumCategoryFraction":{"combat":0.25,"skilling":0.25},"rankedMinimumPartyPoints":4000,"meaningfulContributorPoints":250,"rankedMinimumMeaningfulContributors":2,"partyBindingLockPoints":250,"personalMilestones":[250,750,1500,2500],"partyMilestones":[2000,4000,6000,9000],"rankingRewards":{"qualified":"party_event_participation_v1","top25Percent":"party_event_rank_top25_v1","top10Percent":"party_event_rank_top10pct_v1","top100":"party_event_rank_top100_v1","top10":"party_event_rank_top10_v1"}}'::jsonb)
) as v(event_id,definition_json)
on conflict(event_id,version) do nothing;

-- Rename the v16 settlement implementation, then wrap it so every trusted settlement
-- commits its legacy contract receipt and its v17 outbox envelope atomically.
do $$
begin
  if to_regprocedure('public.settle_party_activity_v16_legacy(uuid,text,numeric,text,timestamptz)') is null then
    alter function public.settle_party_activity_v16(uuid,text,numeric,text,timestamptz) rename to settle_party_activity_v16_legacy;
  end if;
end $$;
create or replace function public.settle_party_activity_v16(p_character_id uuid,p_metric text,p_units numeric,p_event_key text,p_occurred_at timestamptz)
returns integer language plpgsql security definer set search_path=public as $$
declare v_account uuid; v_party uuid; v_count integer; v_weight record; v_events jsonb;
begin
  v_count:=public.settle_party_activity_v16_legacy(p_character_id,p_metric,p_units,p_event_key,p_occurred_at);
  if p_units is null or p_units<=0 then return v_count; end if;
  select c.account_id,m.party_id into v_account,v_party
  from public.characters c join public.party_members m on m.character_id=c.id
  where c.id=p_character_id and m.left_at is null and m.joined_at<=p_occurred_at;
  if v_party is null then return v_count; end if;
  select * into v_weight from public.party_activity_weights_v16 where metric=p_metric limit 1;
  if v_weight is null then return v_count; end if;
  select coalesce(jsonb_agg(i.id),'[]'::jsonb) into v_events
  from public.liveops_event_instances i
  where i.status in ('scheduled','active','settling') and i.starts_at<=p_occurred_at and i.ends_at>p_occurred_at;
  if jsonb_array_length(v_events)=0 then return v_count; end if;
  insert into public.social_contribution_outbox(source_event_id,account_id,party_id_at_settlement,party_name_at_settlement,event_json,targets_json)
  values (
    'party-activity-v17:'||p_event_key||':'||p_character_id::text,
    v_account,v_party,'Party '||left(v_party::text,8),
    jsonb_build_object('sourceEventId','party-activity-v17:'||p_event_key||':'||p_character_id::text,'accountId',v_account,'occurredAtMs',floor(extract(epoch from p_occurred_at)*1000)::bigint,'dateKey',p_occurred_at::date,'partyIdAtSettlement',v_party,'partyNameAtSettlement','Party '||left(v_party::text,8),'profile',jsonb_build_object('id',coalesce(v_weight.content_id,p_metric),'category',case when v_weight.kind='combat' then 'combat' else 'skilling' end,'expectedSecondsPerUnit',v_weight.social_expected_seconds,'challenge',v_weight.social_challenge),'units',p_units,'activityKind',v_weight.social_activity_kind,'contentId',coalesce(v_weight.content_id,p_metric),'regionId',v_weight.social_region_id,'tags',v_weight.social_tags),
    jsonb_build_object('partyEventInstanceIds',v_events)
  ) on conflict(source_event_id) do nothing;
  return v_count;
end $$;
revoke all on function public.settle_party_activity_v16(uuid,text,numeric,text,timestamptz) from public,anon,authenticated;
grant execute on function public.settle_party_activity_v16(uuid,text,numeric,text,timestamptz) to service_role;

-- One-minute lifecycle/outbox hook. The database worker is deliberately service-role only;
-- clients can read event projections but cannot trigger authoritative processing.
create or replace function public.maintain_party_social_v17() returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer:=0;
begin
  perform public.process_social_contribution_outbox_v17(100);
  update public.liveops_event_instances set status='active' where status='scheduled' and starts_at<=now() and ends_at>now();
  update public.liveops_event_instances set status='settling' where status='active' and ends_at<=now();
  update public.guild_applications set status='expired',responded_at=now() where status='pending' and expires_at<=now();
  update public.guild_invites set status='expired',responded_at=now() where status='pending' and expires_at<=now();
  return v_count;
end $$;
revoke all on function public.maintain_party_social_v17() from public,anon,authenticated;
grant execute on function public.maintain_party_social_v17() to service_role;
do $$ begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.schedule('veldryn-liveops-v17','* * * * *','select public.maintain_party_social_v17()');
  end if;
end $$;

create or replace function public.process_social_contribution_outbox_v17(p_limit integer default 100)
returns integer language plpgsql security definer set search_path=public as $$
declare o record; e record; target jsonb; p jsonb; v_category text; v_kind text; v_region text; v_raw integer; v_credit integer; v_party_credit integer; v_today integer; v_binding uuid; v_member_points bigint; v_multiplier numeric; v_base numeric; v_tag_match boolean; v_count integer:=0;
begin
  if p_limit is null or p_limit<1 or p_limit>500 then raise exception 'invalid_worker_limit'; end if;
  for o in select * from public.social_contribution_outbox where status='pending' and available_at<=now() order by created_at for update skip locked limit p_limit loop
    begin
      update public.social_contribution_outbox set status='processing',attempts=attempts+1,locked_at=now() where id=o.id;
      p:=o.event_json->'profile'; v_category:=p->>'category'; v_kind:=o.event_json->>'activityKind'; v_region:=p->>'regionId';
      v_base:=greatest(1,(p->>'expectedSecondsPerUnit')::numeric)*(o.event_json->>'units')::numeric/3600*1000;
      v_multiplier:=case p->>'challenge' when 'demanding' then 1.10 when 'elite' then 1.20 when 'boss' then 1.35 else 1 end;
      v_raw:=greatest(0,round(v_base*v_multiplier)::integer);
      for target in select jsonb_array_elements(o.targets_json->'partyEventInstanceIds') loop
        select * into e from public.liveops_event_instances where id=(target #>> '{}')::uuid;
        if e.id is null or e.definition_snapshot->'allowedCategories' ? v_category then
          if e.id is null then continue; end if;
          if e.definition_snapshot ? 'allowedActivityKinds' and not (e.definition_snapshot->'allowedActivityKinds' ? v_kind) then continue; end if;
          if e.definition_snapshot ? 'allowedRegionIds' and v_region is not null and not (e.definition_snapshot->'allowedRegionIds' ? v_region) then continue; end if;
          if e.definition_snapshot ? 'requiredAnyTags' then
            select exists(select 1 from jsonb_array_elements_text(e.definition_snapshot->'requiredAnyTags') a join jsonb_array_elements_text(coalesce(p->'tags','[]'::jsonb)) b on a=b) into v_tag_match;
            if not v_tag_match then continue; end if;
          end if;
          v_multiplier:=v_multiplier*coalesce((e.definition_snapshot->'activityMultipliers'->>v_kind)::numeric,1)*coalesce((e.definition_snapshot->'challengeMultipliers'->>(p->>'challenge'))::numeric,1);
          v_raw:=greatest(0,round(v_base*v_multiplier)::integer);
          select coalesce(sum(credited_points),0) into v_today from public.liveops_event_contribution_receipts where event_instance_id=e.id and account_id=o.account_id and date_key=(o.event_json->>'dateKey')::date;
          v_credit:=least(v_raw,greatest(0,coalesce((e.definition_snapshot->>'dailyAccountCreditCap')::integer,2400)-v_today));
          if v_credit<=0 then continue; end if;
          if exists(select 1 from public.liveops_event_contribution_receipts where event_instance_id=e.id and account_id=o.account_id and source_event_id=o.source_event_id) then continue; end if;
          select party_id into v_binding from public.liveops_event_party_bindings where event_instance_id=e.id and account_id=o.account_id;
          v_party_credit:=case when v_binding is null or v_binding=o.party_id_at_settlement then v_credit else 0 end;
          insert into public.liveops_event_contribution_receipts(event_instance_id,account_id,party_id,party_name_at_settlement,source_event_id,date_key,category,activity_kind,content_id,raw_points,credited_points,party_credited_points,occurred_at)
            values(e.id,o.account_id,o.party_id_at_settlement,o.party_name_at_settlement,o.source_event_id,(o.event_json->>'dateKey')::date,v_category,v_kind,o.event_json->>'contentId',v_raw,v_credit,v_party_credit,(to_timestamp((o.event_json->>'occurredAtMs')::numeric/1000))) on conflict do nothing;
          insert into public.liveops_event_account_progress(event_instance_id,account_id,personal_points,combat_points,skilling_points,last_contribution_at)
            values(e.id,o.account_id,v_credit,case when v_category='combat' then v_credit else 0 end,case when v_category='skilling' then v_credit else 0 end,to_timestamp((o.event_json->>'occurredAtMs')::numeric/1000))
            on conflict(event_instance_id,account_id) do update set personal_points=public.liveops_event_account_progress.personal_points+excluded.personal_points,combat_points=public.liveops_event_account_progress.combat_points+excluded.combat_points,skilling_points=public.liveops_event_account_progress.skilling_points+excluded.skilling_points,last_contribution_at=excluded.last_contribution_at;
          if v_party_credit>0 then
            insert into public.liveops_event_party_member_progress(event_instance_id,party_id,account_id,points,combat_points,skilling_points,first_contribution_at,last_contribution_at)
              values(e.id,o.party_id_at_settlement,o.account_id,v_party_credit,case when v_category='combat' then v_party_credit else 0 end,case when v_category='skilling' then v_party_credit else 0 end,to_timestamp((o.event_json->>'occurredAtMs')::numeric/1000),to_timestamp((o.event_json->>'occurredAtMs')::numeric/1000))
              on conflict(event_instance_id,party_id,account_id) do update set points=public.liveops_event_party_member_progress.points+excluded.points,combat_points=public.liveops_event_party_member_progress.combat_points+excluded.combat_points,skilling_points=public.liveops_event_party_member_progress.skilling_points+excluded.skilling_points,last_contribution_at=excluded.last_contribution_at;
            select points into v_member_points from public.liveops_event_party_member_progress where event_instance_id=e.id and party_id=o.party_id_at_settlement and account_id=o.account_id;
            if v_binding is null and v_member_points>=250 then insert into public.liveops_event_party_bindings(event_instance_id,account_id,party_id,locked_at,points_at_lock) values(e.id,o.account_id,o.party_id_at_settlement,to_timestamp((o.event_json->>'occurredAtMs')::numeric/1000),v_member_points::integer) on conflict do nothing; end if;
            insert into public.liveops_event_party_progress(event_instance_id,party_id,party_name_snapshot,score,combat_points,skilling_points,last_score_at)
              values(e.id,o.party_id_at_settlement,o.party_name_at_settlement,v_party_credit,case when v_category='combat' then v_party_credit else 0 end,case when v_category='skilling' then v_party_credit else 0 end,to_timestamp((o.event_json->>'occurredAtMs')::numeric/1000))
              on conflict(event_instance_id,party_id) do update set score=public.liveops_event_party_progress.score+excluded.score,combat_points=public.liveops_event_party_progress.combat_points+excluded.combat_points,skilling_points=public.liveops_event_party_progress.skilling_points+excluded.skilling_points,last_score_at=excluded.last_score_at;
            update public.liveops_event_party_progress pp set meaningful_contributors=(select count(*) from public.liveops_event_party_member_progress mp where mp.event_instance_id=e.id and mp.party_id=pp.party_id and mp.points>=250),ranked_eligible=(pp.score>=4000 and (select count(*) from public.liveops_event_party_member_progress mp where mp.event_instance_id=e.id and mp.party_id=pp.party_id and mp.points>=250)>=2) where pp.event_instance_id=e.id and pp.party_id=o.party_id_at_settlement;
          end if;
        end if;
      end loop;
      update public.social_contribution_outbox set status='processed',processed_at=now(),result_json=jsonb_build_object('processed',true) where id=o.id; v_count:=v_count+1;
    exception when others then
      update public.social_contribution_outbox set status=case when attempts>=12 then 'dead_letter' else 'pending' end,last_error=left(sqlerrm,500),available_at=now()+interval '1 minute' where id=o.id;
    end;
  end loop;
  return v_count;
end $$;
revoke all on function public.process_social_contribution_outbox_v17(integer) from public,anon,authenticated;
grant execute on function public.process_social_contribution_outbox_v17(integer) to service_role;
