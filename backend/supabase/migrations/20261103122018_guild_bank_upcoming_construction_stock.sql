-- Migration history marker for a Supabase MCP deployment.
-- Staging applied the verified, member-scaled Guild Bank upcoming-stock SQL under remote version 20261103122018. Full DDL lives at 20261104000500_guild_bank_upcoming_construction_stock.sql.
-- No schema change: the original SQL is applied and verified in the target environment.
select 1;
