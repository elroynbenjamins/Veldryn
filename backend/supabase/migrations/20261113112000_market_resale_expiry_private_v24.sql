-- Hidden Market V24c: safe per-offer resale expiry and worker discovery.
-- Not a scheduler and never an automatic Gold or copy transfer. An external
-- authenticated server worker must invoke one offer per DB transaction.
begin;

create index market_resale_due_expiry_v24
 on private.market_equipment_resale_offers_v23(expires_at,resale_id)
 where status='active';

-- Gives a trusted *future* worker bounded due IDs. Do not expose seller IDs
-- or ids to anon/authenticated/service_role. An expiry is not a claim.
create function private.market_due_resales_v24(p_limit integer default 25)
returns jsonb
language plpgsql stable security invoker set search_path=''
as $market_due_resales$
declare v_entries jsonb;
begin
 if p_limit is null or p_limit not between 1 and 100
 then raise exception 'market_expiry_invalid_limit';end if;
 if not exists(select 1 from private.market_runtime_guard_v1
   where singleton and trading_enabled and snapshot_bridge_ready)
   or not exists(select 1 from private.market_equipment_guard_v8
   where singleton and equipment_transfers_enabled)
 then raise exception 'market_disabled';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
     'resaleId',due.resale_id,'sellerAccountId',due.seller_account_id,
     'expiresAt',due.expires_at) order by due.expires_at,due.resale_id),
     '[]'::jsonb) into v_entries
 from (
   select o.resale_id,o.seller_account_id,o.expires_at
   from private.market_equipment_resale_offers_v23 o
   where o.status='active' and o.expires_at<=now()
   order by o.expires_at,o.resale_id limit p_limit
 ) due;
 return pg_catalog.jsonb_build_object('entries',v_entries);
end;
$market_due_resales$;
revoke all on function private.market_due_resales_v24(integer)
 from public,anon,authenticated,service_role;

create function private.market_expire_resale_v24(
 p_resale_id uuid,p_idempotency_key text,p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_expiry$
declare
 v_seller uuid;
 v_account public.online_game_states%rowtype;
 v_offer private.market_equipment_resale_offers_v23%rowtype;
 v_prior private.market_resale_action_receipts_v23%rowtype;
 v_result jsonb;
begin
 if p_resale_id is null
   or p_idempotency_key is null
   or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
   or p_request_hash is null
   or p_request_hash !~ '^[a-f0-9]{64}$'
 then raise exception 'market_expiry_invalid_request';end if;
 if not exists(select 1 from private.market_runtime_guard_v1
   where singleton and trading_enabled and snapshot_bridge_ready)
   or not exists(select 1 from private.market_equipment_guard_v8
   where singleton and equipment_transfers_enabled)
 then raise exception 'market_disabled';end if;

 -- Offer is an initial hint; after account serialization, it is reloaded
 -- under FOR UPDATE. This order matches V23 seller cancel/purchase.
 select seller_account_id into v_seller
   from private.market_equipment_resale_offers_v23
   where resale_id=p_resale_id;
 if not found then raise exception 'market_resale_not_found';end if;
 perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('party-account:'||v_seller::text,0));
 select * into v_account from public.online_game_states
   where account_id=v_seller for update;
 if not found then raise exception 'market_state_missing';end if;

 -- Only an exact previous expiry key may return its durable result.
 select * into v_prior from private.market_resale_action_receipts_v23 a
   where a.actor_account_id=v_seller and a.idempotency_key=p_idempotency_key;
 if found then
   if v_prior.action<>'cancel'
     or v_prior.request_hash<>p_request_hash
     or v_prior.inputs is distinct from
       pg_catalog.jsonb_build_object('resaleId',p_resale_id)
   then raise exception 'market_idempotency_conflict';end if;
   return v_prior.result||pg_catalog.jsonb_build_object('replayed',true);
 end if;

 select * into v_offer from private.market_equipment_resale_offers_v23 o
   where o.resale_id=p_resale_id and o.seller_account_id=v_seller for update;
 if not found or v_offer.status<>'active' or v_offer.expires_at>now()
 then raise exception 'market_resale_not_expired_or_not_open';end if;

 -- Atomic V23 cancel writes one return entitlement. No refund is due,
 -- because reserve only moved custody and did not charge Gold.
 v_result:=private.market_cancel_equipment_resale_v23(
   v_seller,p_resale_id,p_idempotency_key,p_request_hash);
 return v_result||pg_catalog.jsonb_build_object('expired',true);
end;
$market_expiry$;
revoke all on function private.market_expire_resale_v24(uuid,text,text)
 from public,anon,authenticated,service_role;

commit;