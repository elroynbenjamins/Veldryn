-- Expose read-only member contribution totals from the already-authoritative
-- Party weekly contract progress ledger. Does not alter reward eligibility.
-- A separate RPC version leaves installed clients using v18 unaffected.
create or replace function public.party_social_state_v19()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_state jsonb;
  v_party_id uuid;
  v_contracts jsonb;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  v_state := public.party_social_state_v18();
  if jsonb_typeof(v_state->'party') is distinct from 'object' then return v_state; end if;
  v_party_id := (v_state#>>'{party,id}')::uuid;
  if not exists (
    select 1 from public.party_members pm
    where pm.party_id=v_party_id and pm.account_id=v_uid and pm.left_at is null
  ) then return v_state; end if;

  select coalesce(jsonb_agg(
    contract.value || jsonb_build_object('memberContributions',coalesce((
      select jsonb_agg(
        jsonb_build_object('accountId',member.value->>'accountId',
          'points',coalesce(progress.normalized_points,0))
        order by coalesce(progress.normalized_points,0) desc,
          member.value->>'characterName'
      )
      from jsonb_array_elements(v_state#>'{party,members}') member(value)
      left join public.party_contract_member_progress_v16 progress
        on progress.instance_id=(contract.value->>'id')::uuid
       and progress.account_id=(member.value->>'accountId')::uuid
    ),'[]'::jsonb))
  ),'[]'::jsonb) into v_contracts
  from jsonb_array_elements(coalesce(v_state->'contracts','[]'::jsonb)) contract(value);

  return jsonb_set(v_state,'{contracts}',v_contracts);
end;
$function$;

-- A SECURITY DEFINER RPC may read the protected progress ledger only after
-- the authenticated player's active membership has been checked above.
revoke all on function public.party_social_state_v19() from public, anon;
grant execute on function public.party_social_state_v19() to authenticated;
