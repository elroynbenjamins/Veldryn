-- NON-EXECUTABLE ROLLBACK DRAFT for profile_cosmetic_grants_v1.
-- This removes only the new receipt/RPC infrastructure. It intentionally does
-- NOT delete cosmetic ownership already written into game-state JSON.

revoke all on function public.profile_cosmetic_grant_server_v1(uuid,text,text,text) from public,anon,authenticated,service_role;
drop function if exists public.profile_cosmetic_grant_server_v1(uuid,text,text,text);

revoke all on private.profile_cosmetic_grant_receipts_v1 from public,anon,authenticated,service_role;
drop table if exists private.profile_cosmetic_grant_receipts_v1;
