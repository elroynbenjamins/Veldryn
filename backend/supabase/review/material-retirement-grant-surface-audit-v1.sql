-- READ ONLY: exact live grant/use surface audit for Echo Bat Wing retirement.
-- Returns only surfaces with a current or historical exact reference.
with hits as (
 select 'private.reward_gift_catalog_v1' source,count(*) total,count(*) active_or_pending
 from private.reward_gift_catalog_v1 where concat_ws(' ',id,resource_id,name) ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'private.reward_gift_campaigns_v1',count(*),count(*) filter(where sent_at is null)
 from private.reward_gift_campaigns_v1 where concat_ws(' ',title,body,reason,attachments::text) ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'private.reward_inbox_v1',count(*),count(*) filter(where claimed_at is null)
 from private.reward_inbox_v1 where concat_ws(' ',title,body,attachments::text) ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'public.coop_reward_entitlements',count(*),count(*) filter(where claimed_at is null)
 from public.coop_reward_entitlements where reward_json::text ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'public.party_contract_definitions_v16',count(*),count(*) filter(where active)
 from public.party_contract_definitions_v16 where reward_json::text ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'public.party_contract_reward_entitlements_v16',count(*),count(*) filter(where claimed_at is null)
 from public.party_contract_reward_entitlements_v16 where reward_json::text ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'public.dungeon_shop_catalogue_v1',count(*),count(*) filter(where enabled)
 from public.dungeon_shop_catalogue_v1 where concat_ws(' ',item_id,name,reward_id,reward_field) ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'public.guild_shop_reward_catalogue',count(*),count(*) filter(where enabled)
 from public.guild_shop_reward_catalogue where concat_ws(' ',item_id,reward_id,reward_ids::text) ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'public.guild_project_supply_catalogue_v1',count(*),count(*)
 from public.guild_project_supply_catalogue_v1 where concat_ws(' ',item_id,item_name) ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'public.liveops_event_definitions',count(*),count(*)
 from public.liveops_event_definitions where concat_ws(' ',event_id,definition_json::text) ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'public.liveops_event_drafts',count(*),count(*) filter(where status is distinct from 'archived')
 from public.liveops_event_drafts where concat_ws(' ',name,definition_json::text,schedule_json::text,published_event_id) ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'public.liveops_event_instances',count(*),count(*) filter(where status not in ('finalized','cancelled'))
 from public.liveops_event_instances where concat_ws(' ',event_id,definition_snapshot::text) ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'public.ops_admin_content_catalog',count(*),count(*) filter(where enabled)
 from public.ops_admin_content_catalog where concat_ws(' ',entity_type,entity_key,label,description,metadata_json::text,source_version) ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'public.liveops_admin_reward_catalog',count(*),count(*) filter(where enabled and validated)
 from public.liveops_admin_reward_catalog where concat_ws(' ',bundle_id,label,tier,notes) ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'public.ops_remote_config',count(*),count(*) filter(where enabled)
 from public.ops_remote_config where concat_ws(' ',config_key,category,label,description,default_value::text,current_value::text,constraints_json::text,notes) ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'public.expedition_reward_claims',count(*),count(*) filter(where claimed_at is null)
 from public.expedition_reward_claims where reward_json::text ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'public.squad_arena_reward_claims',count(*),count(*) filter(where claimed_at is null)
 from public.squad_arena_reward_claims where reward_payload::text ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'public.equipment_craft_queue_steps',count(*),count(*)
 from public.equipment_craft_queue_steps where concat_ws(' ',inventory_key,depends_on::text,state) ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
 union all
 select 'public.equipment_craft_queues',count(*),count(*)
 from public.equipment_craft_queues where concat_ws(' ',state,blocker_keys::text) ~* 'ECHO_BAT_WING|ITEM_0077|Echo Bat Wing'
)
select source,total,active_or_pending,
       (source='private.reward_gift_catalog_v1' and active_or_pending=1) as expected_preclosure_only
from hits
where total>0 or active_or_pending>0
order by source;
