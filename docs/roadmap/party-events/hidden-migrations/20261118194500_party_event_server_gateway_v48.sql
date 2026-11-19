-- Veldryn Party Events V48 — UNPROMOTED service-role-only PostgREST RPC.
-- Keep the real canonical writer in private; backend/online/edge.ts currently
-- calls /rest/v1/rpc/{name}, which only exposes public RPCs.
-- DRAFT: no staging or production installation, no feature activation.
begin;

create or replace function public.commit_online_game_party_sources_server_v48(
 p_account_id uuid,
 p_expected_version bigint,
 p_expected_gold bigint,
 p_request_id text,
 p_request_hash text,
 p_response jsonb,
 p_contributions jsonb,
 p_packet jsonb,
 p_deleted_character_id uuid default null
) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 -- PostgREST checks EXECUTE on this public RPC as the caller before entering
 -- this SECURITY DEFINER body. Only service_role has EXECUTE (see below).
 -- Never forward a mobile player's JWT as the RPC service credential.
 return private.commit_online_game_party_sources_v45(
  p_account_id,p_expected_version,p_expected_gold,p_request_id,p_request_hash,
  p_response,p_contributions,p_packet,p_deleted_character_id);
end;$$;

revoke all on function public.commit_online_game_party_sources_server_v48(
 uuid,bigint,bigint,text,text,jsonb,jsonb,jsonb,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.commit_online_game_party_sources_server_v48(
 uuid,bigint,bigint,text,text,jsonb,jsonb,jsonb,uuid)
 to service_role;

comment on function public.commit_online_game_party_sources_server_v48(
 uuid,bigint,bigint,text,text,jsonb,jsonb,jsonb,uuid) is
 'UNRELEASED V48: service-role-only PostgREST bridge to private same-transaction canonical source writer; no independent credit/reward grant.';

commit;
