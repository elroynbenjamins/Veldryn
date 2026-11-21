import {MarketRequestError} from './market-auth-boundary';
import type {
  MarketBrowseOperation,MarketReadServices,
} from './market-read-gateway-v25';

/**
 * V26 read-only PostgREST adapter. The SQL facade is SECURITY INVOKER,
 * callable only under a verified authenticated user JWT. The account
 * identity stays in auth.uid() inside the private SQL function: no actor ID
 * is ever sent as an RPC argument. All market writes remain inaccessible.
 *
 * This module is deliberately NOT imported/mounted by online/edge.ts.
 */
export interface MarketSqlConfigV26 {
  supabaseUrl:string;
  anonKey:string;
  fetchImpl?:typeof fetch;
}

type RpcPayload=Record<string,string|number|boolean|null>;
const jsonHeaders={'Content-Type':'application/json'};
const SUPPORTED_MARKET_RPC='market_read_gateway_v26' as const;

export function createMarketSqlReadServicesV26(
  request:Request,configuration:MarketSqlConfigV26,
):MarketReadServices{
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1]??'';
  const fetchImpl=configuration.fetchImpl??fetch;
  const root=configuration.supabaseUrl.replace(/\/+$/,'');
  if(!/^https:\/\//.test(root)||!configuration.anonKey)
    throw new Error('market_config_missing');

  const rpc=async(args:RpcPayload):Promise<unknown>=>{
    if(!token)throw new MarketRequestError('auth_required',401);
    const result=await fetchImpl(root+'/rest/v1/rpc/'+SUPPORTED_MARKET_RPC,{
      method:'POST',
      headers:{...jsonHeaders,apikey:configuration.anonKey,
        Authorization:'Bearer '+token},
      body:JSON.stringify(args),
    });
    if(!result.ok){
      // Do not propagate SQL messages, private schema names or stack traces.
      // SQL uses stable error codes for the only two expected failure cases.
      if(result.status===401||result.status===403)
        throw new MarketRequestError('invalid_session',401);
      let message:unknown;
      try{
        const failure=await result.json();
        message=typeof failure?.message==='string'?failure.message:null;
      }catch{ /* Keep errors opaque. */ }
      if(message==='market_rate_limited')
        throw new MarketRequestError('market_rate_limited',429);
      if(message==='market_disabled')
        throw new MarketRequestError('not_found',404);
      throw new Error('market_database_unavailable');
    }
    return result.json();
  };

  return {
    authenticate:async(candidate:string)=>{
      if(!token||candidate!==token)return null;
      try{
        const result=await fetchImpl(root+'/auth/v1/user',{
          method:'GET',headers:{apikey:configuration.anonKey,
            Authorization:'Bearer '+candidate},
        });
        if(!result.ok)return null;
        const user=await result.json();
        return typeof user?.id==='string'?user.id:null;
      }catch{return null;}
    },
    // The durable per-account per-minute bucket is checked atomically by
    // the private V26 SQL routine, within the same RPC transaction as data
    // retrieval. Never mistake this local advisory for a real limiter.
    allowRead:async()=>true,
    readBrowse:(filters:MarketBrowseOperation)=>rpc({
      p_action:'browse',
      p_kind:filters.assetKind,
      p_item_id:filters.itemId,
      p_search:filters.search,
      p_sort:filters.sort,
      p_min_total_gold:filters.minTotalGold,
      p_max_total_gold:filters.maxTotalGold,
      p_limit:filters.limit,
      p_offset:filters.offset,
    }),
    readInbox:(_actorAccountId:string,history:boolean,offset:number)=>rpc({
      p_action:'inbox',p_history:history,p_offset:offset,
    }),
  };
}
