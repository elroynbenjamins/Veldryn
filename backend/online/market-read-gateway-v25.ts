import {
  bindAuthenticatedMarketRequest,
  MarketRequestError,
  type MarketAuthServices,
  type MarketOperation,
} from './market-auth-boundary';

/**
 * V25 internal READ-only adapter for private V24 Market projections.
 *
 * Not mounted by edge.ts or generated functions. This is deliberately NOT a
 * public RPC: the V24 SECURITY INVOKER SQL functions remain REVOKED, the
 * trading/snapshot gates remain false, and no service-role permission changes
 * are made here. A later reviewed, account-bound server SQL bridge and durable
 * rate limiter are required before this may be exposed.
 */
export type MarketBrowseOperation=Extract<MarketOperation,{kind:'browse'}>;
export interface MarketReadServices extends MarketAuthServices{
  /** Must read only private.market_browse_combined_v24 after a safe SQL bridge. */
  readBrowse(filters:MarketBrowseOperation):Promise<unknown>;
  /** MUST scope private.market_inbox_unified_v24 to this verified actor. */
  readInbox(actorAccountId:string,history:boolean,offset:number):Promise<unknown>;
  /** Future production implementation must use an authoritative rate limiter. */
  allowRead(actorAccountId:string,kind:'browse'|'inbox'):Promise<boolean>;
}

const headers={
  'Content-Type':'application/json',
  'Cache-Control':'private, no-store',
  'Vary':'Authorization',
  'X-Content-Type-Options':'nosniff',
};
const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
const record=(value:unknown):value is Record<string,unknown>=>
  !!value&&typeof value==='object'&&!Array.isArray(value);
const count=(value:unknown,max:number):value is number=>
  typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=max;
const browseFields=[
  'offerId','sourceKind','resaleId','itemId','assetKind','quantity','unitGold',
  'totalGold','createdAt','expiresAt','minimumGold','maximumGold','rarity',
  'quality','enhancementRank','statGemId','effectGemId',
  'statGemRollPercent','effectGemRollPercent',
] as const;
const inboxFields=[
  'id','kind','deliveryId','itemId','assetKind','quantity','goldChange',
  'status','createdAt','claimedAt',
] as const;
const project=(value:unknown,fields:readonly string[]):Record<string,unknown>=>{
  if(!record(value))throw new Error('invalid_projection');
  const projected:Record<string,unknown>={};
  for(const key of fields){
    if(!(key in value))continue;
    const field=value[key];
    // Private references, nested custody records and raw receipt objects must
    // NEVER leak even if a SQL projection changes unexpectedly.
    if(field!==null&&typeof field!=='string'&&typeof field!=='number'
      &&typeof field!=='boolean')throw new Error('invalid_projection');
    if(typeof field==='number'&&!Number.isSafeInteger(field))throw new Error('invalid_projection');
    projected[key]=field;
  }
  return projected;
};
function safeBrowse(value:unknown,filters:MarketBrowseOperation){
  if(!record(value)||!Array.isArray(value.entries)
    ||value.entries.length>filters.limit
    ||!count(value.total,Number.MAX_SAFE_INTEGER)
    ||!count(value.offset,1000)
    ||!count(value.limit,50)
    ||value.offset!==filters.offset||value.limit!==filters.limit
    ||typeof value.hasMore!=='boolean')throw new Error('invalid_projection');
  return {entries:value.entries.map(row=>project(row,browseFields)),
    total:value.total,offset:value.offset,limit:value.limit,hasMore:value.hasMore};
}
function safeInbox(value:unknown){
  if(!record(value)||!Array.isArray(value.entries)
    ||value.entries.length>40
    ||!count(value.pendingCount,Number.MAX_SAFE_INTEGER)
    ||!count(value.total,Number.MAX_SAFE_INTEGER))throw new Error('invalid_projection');
  return {entries:value.entries.map(row=>project(row,inboxFields)),
    pendingCount:value.pendingCount,total:value.total};
}

/** Internal, testable only. Callers cannot pass accountId, arbitrary RPC names,
 * SQL text, write operations, or a seller's identity. Unreleased routes still
 * return 404 through createHiddenMarketHandler and never call this function.
 */
export async function executeAuthenticatedMarketReadV25(
  request:Request,services:MarketReadServices,
):Promise<Response>{
  try{
    const bound=await bindAuthenticatedMarketRequest(request,services);
    const operation=bound.operation;
    if(operation.kind!=='browse'&&operation.kind!=='inbox')
      return response({error:'not_found'},404);
    if(!await services.allowRead(bound.actorAccountId,operation.kind))
      return response({error:'rate_limited'},429);
    if(operation.kind==='browse')
      return response(safeBrowse(await services.readBrowse(operation),operation));
    return response(safeInbox(await services.readInbox(
      bound.actorAccountId,operation.history,operation.offset,
    )));
  }catch(error){
    if(error instanceof MarketRequestError)return response({error:error.code},error.status);
    // Never return a SQL error message, schema detail, or private custody data.
    return response({error:'market_unavailable'},503);
  }
}
