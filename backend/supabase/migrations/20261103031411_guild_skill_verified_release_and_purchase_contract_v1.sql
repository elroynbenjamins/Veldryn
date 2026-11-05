-- Production migration-history receipt for a directly applied Guild Skill
-- purchase-contract change (version 20261103031411).
-- The durable idempotent implementation is retained in
-- 20261104000033_guild_skill_verified_release_and_purchase_contract.sql.
-- This no-op records the earlier production operation for migration parity.
select 1;
