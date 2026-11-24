-- READ ONLY: environment readiness for material retirement review.
select
 current_database() database_name,
 to_regclass('public.online_game_states') is not null as has_online_state,
 to_regclass('public.characters') is not null as has_characters,
 to_regclass('public.character_wallets') is not null as has_wallets,
 to_regclass('public.server_action_receipts') is not null as has_receipts,
 to_regclass('private.reward_inbox_v1') is not null as has_reward_inbox,
 to_regclass('private.reward_gift_catalog_v1') is not null as has_gift_catalog,
 to_regclass('private.reward_gift_campaigns_v1') is not null as has_gift_campaigns,
 to_regprocedure('public.commit_online_game_guild_pve_v1(uuid,bigint,bigint,text,text,jsonb,jsonb,uuid)') is not null as has_game_commit_gateway,
 to_regprocedure('public.load_online_game_server_v1(uuid)') is not null as has_game_load,
 (
   to_regclass('public.online_game_states') is not null
   and to_regclass('public.characters') is not null
   and to_regclass('public.character_wallets') is not null
   and to_regclass('public.server_action_receipts') is not null
   and to_regclass('private.reward_inbox_v1') is not null
   and to_regclass('private.reward_gift_catalog_v1') is not null
   and to_regclass('private.reward_gift_campaigns_v1') is not null
 ) as retirement_schema_ready;

-- Staging parity synchronized and rollback-verified on 2026-11-24; this query remains read-only.
