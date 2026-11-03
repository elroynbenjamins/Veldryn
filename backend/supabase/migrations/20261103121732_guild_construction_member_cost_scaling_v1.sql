-- Migration history marker for a Supabase MCP deployment.
-- Staging applied the canonical Guild Construction member-scaling SQL through Supabase under remote version 20261103121732. Full DDL lives at 20261104000034_guild_construction_member_cost_scaling_v1.sql.
-- No schema change: the original SQL is applied and verified in the target environment.
select 1;
