-- Purchase a run-only Merchant offer atomically. Server-role only: the Edge
-- runtime applies authoritative QModeService rules before this transaction.
begin;
create or replace function public.purchase_online_qmode_merchant_server_v1(
 p_account_id uuid,p_run_id uuid,p_expected_version bigint,p_request_id text,p_request_hash text,
 p_offer_id text,p_actor_id text,p_private_state jsonb,p_client_projection jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
 v_prior jsonb;v_state jsonb;v_node jsonb;v_version bigint;v_content text;
 v_cost integer;v_balance integer;v_count integer;v_purchases jsonb;
begin
 select state_version into v_version from public.expedition_runs
 where id=p_run_id and coop_mode='qmode' and controller_account_id=p_account_id for update;
 if not found then raise exception 'NOT_PARTICIPANT';end if;
 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'qmode_merchant_purchase_v1',p_run_id::text,p_request_id);
 if v_prior is not null then
  if v_prior->>'requestHash'<>p_request_hash then raise exception 'idempotency_key_conflict';end if;
  return v_prior->'response';
 end if;
 if v_version<>p_expected_version then raise exception 'STALE_STATE';end if;
 select state_json into v_state from public.coop_run_private_state where run_id=p_run_id for update;
 if not found or v_state ? 'pending' then raise exception 'node_resolving';end if;
 if v_state#>>'{run,phase}'<>'awaiting_choice' or p_private_state#>>'{run,phase}'<>'awaiting_choice' then raise exception 'run_not_awaiting_choice';end if;
 if v_state#>>'{run,players,0,id}' is distinct from p_actor_id then raise exception 'invalid_merchant_actor';end if;
 select value into v_node from jsonb_array_elements(v_state#>'{run,graph,nodes}') value
 where value->>'nodeId'=v_state#>>'{run,currentNodeId}';
 if v_node is null or v_node->>'kind'<>'merchant' then raise exception 'not_a_merchant_node';end if;
 if not coalesce(v_state#>'{run,persistentState,visitedNodeIds}','[]'::jsonb) @> jsonb_build_array(v_node->>'nodeId') then raise exception 'merchant_not_resolved';end if;
 v_content:=regexp_replace(upper(v_node->>'contentId'),'[^A-Z0-9_]','','g');
 if p_offer_id not in (v_content||':boon',v_content||':artifact',v_content||':salve') then raise exception 'invalid_merchant_offer';end if;
 v_cost:=case split_part(p_offer_id,':',2) when 'boon' then 2 when 'artifact' then 3 else 1 end;
 v_balance:=(v_state#>>'{run,persistentState,resources}')::integer;
 v_purchases:=coalesce((v_state#>'{run,persistentState,personalEffects}')->p_actor_id->'purchases','[]'::jsonb);
 if v_purchases @> jsonb_build_array(p_offer_id) then raise exception 'merchant_offer_already_purchased';end if;
 if v_balance<v_cost then raise exception 'insufficient_run_resources';end if;
 if v_state->'seed' is distinct from p_private_state->'seed'
   or v_state#>'{run,graph}' is distinct from p_private_state#>'{run,graph}'
   or v_state#>'{run,players}' is distinct from p_private_state#>'{run,players}'
   or v_state#>'{run,persistentState,visitedNodeIds}' is distinct from p_private_state#>'{run,persistentState,visitedNodeIds}'
   or v_state#>>'{run,currentNodeId}' is distinct from p_private_state#>>'{run,currentNodeId}'
   or (p_private_state#>>'{run,persistentState,resources}')::integer<>v_balance-v_cost
   or p_private_state#>>'{run,lastResolution,result,summary,offerId}' is distinct from p_offer_id
   or p_private_state#>>'{run,lastResolution,result,summary,actorId}' is distinct from p_actor_id
   or p_private_state#>>'{run,lastResolution,result,summary,kind}'<>'merchant_purchase'
   or not coalesce((p_private_state#>'{run,persistentState,personalEffects}')->p_actor_id->'purchases','[]'::jsonb) @> jsonb_build_array(p_offer_id)
 then raise exception 'invalid_merchant_purchase_state';end if;
 if p_client_projection->>'runId' is distinct from p_run_id::text
   or (p_client_projection->>'stateVersion')::bigint<>v_version+1
   or p_client_projection#>>'{merchantShop,resources}' is distinct from (v_balance-v_cost)::text
 then raise exception 'invalid_merchant_projection';end if;
 v_count:=(select count(*) from jsonb_array_elements_text(v_state#>'{run,persistentState,visitedNodeIds}') n
 where n<>v_state#>>'{run,graph,bossNodeId}');
 perform public.commit_coop_runtime_server_v1(p_run_id,p_account_id,p_expected_version,
   'awaiting_choice',v_node->>'nodeId',v_count,p_private_state,p_client_projection,v_version+1,
   'merchant_purchase',jsonb_build_object('offerKind',split_part(p_offer_id,':',2),'cost',v_cost),
   'qmode:'||p_run_id||':merchant:'||p_offer_id);
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json)
 values(p_account_id,'qmode_merchant_purchase_v1',p_run_id::text,p_request_id,p_request_hash,p_client_projection);
 return p_client_projection;
end $$;
revoke all on function public.purchase_online_qmode_merchant_server_v1(uuid,uuid,bigint,text,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.purchase_online_qmode_merchant_server_v1(uuid,uuid,bigint,text,text,text,text,jsonb,jsonb) to service_role;
commit;
