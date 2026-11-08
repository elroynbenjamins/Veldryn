/**
 * Internal future Player Market gateway contract.
 *
 * NEVER mount this handler in backend/online/edge.ts before full rollout.
 * The market isn't deployable: private SQL routines currently have no REST
 * grants, and the separate global market gates are CHECK-constrained false.
 *
 * Session account identity must be sourced from the verified Supabase Auth
 * /auth/v1/user response, not JWT payload parsing, query params, or body.
 */
export const MARKET_EDGE_TRANSPORT_RELEASED = false;

export interface MarketAuthServices {
  authenticate(token: string): Promise<string | null>;
}
export type MarketOperation =
  | {kind:'inbox';history:boolean;offset:number}
  | {kind:'my_offers';history:boolean;offset:number}
  | {kind:'publish';holdId:string;unitPrice:number;quantity:number;requestKey:string}
  | {kind:'cancel';offerId:string;requestKey:string}
  | {kind:'buy';offerId:string;unitPrice:number;quantity:number;buyerRevision:number;sellerRevision:number;requestKey:string}
  | {kind:'claim';deliveryId:string;deliveryKind:'purchased'|'returned';destination:'inventory'|'bank'|'gem_pouch';requestKey:string};

export interface BoundMarketRequest {
  actorAccountId:string;
  operation:MarketOperation;
}

export class MarketRequestError extends Error {
  constructor(public readonly code:string,public readonly status:number){super(code);}
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const key=/^[A-Za-z0-9_-]{8,128}$/;
const int=(v:unknown,min:number,max:number):v is number=>
  typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const only=(body:Record<string,unknown>,fields:string[])=>{
  const keys=Object.keys(body);
  return keys.length===fields.length&&keys.every(k=>fields.includes(k));
};
const id=(v:unknown):v is string=>typeof v==='string'&&uuid.test(v);
const requestKey=(v:unknown):v is string=>typeof v==='string'&&key.test(v);
const bad=()=>{throw new MarketRequestError('market_invalid_request',400);};

function validate(operation:string,method:string,query:URLSearchParams,body:unknown):MarketOperation{
  const params:string[]=[];
  query.forEach((_value,key)=>params.push(key));
  if(params.some(k=>k!=='action'&&k!=='history'&&k!=='offset'))bad();
  if(operation==='inbox'||operation==='my_offers'){
    if(method!=='GET'||body!==null)bad();
    if(params.some(k=>!['action','history','offset'].includes(k))
      ||query.getAll('history').length>1||query.getAll('offset').length>1)bad();
    const history=query.get('history');
    const rawOffset=query.get('offset');
    if(history!==null&&history!=='true'&&history!=='false')bad();
    if(rawOffset!==null&&!/^(0|[1-9][0-9]{0,4})$/.test(rawOffset))bad();
    const offset=rawOffset===null?0:Number(rawOffset);
    if(!int(offset,0,10000))bad();
    return {kind:operation,history:history==='true',offset};
  }
  if(method!=='POST'||!object(body))bad();
  if(params.some(k=>k!=='action'))bad();
  if(operation==='publish'){
    if(!only(body,['holdId','unitPrice','quantity','requestKey'])
      ||!id(body.holdId)||!int(body.unitPrice,1,1000000000000)
      ||!int(body.quantity,1,2147483647)||!requestKey(body.requestKey)
      ||body.unitPrice*body.quantity>1000000000000000)bad();
    return {kind:'publish',holdId:body.holdId as string,
      unitPrice:body.unitPrice as number,quantity:body.quantity as number,
      requestKey:body.requestKey as string};
  }
  if(operation==='cancel'){
    if(!only(body,['offerId','requestKey'])
      ||!id(body.offerId)||!requestKey(body.requestKey))bad();
    return {kind:'cancel',offerId:body.offerId as string,requestKey:body.requestKey as string};
  }
  if(operation==='buy'){
    if(!only(body,['offerId','unitPrice','quantity','buyerRevision','sellerRevision','requestKey'])
      ||!id(body.offerId)||!int(body.unitPrice,1,1000000000000)
      ||!int(body.quantity,1,2147483647)||!int(body.buyerRevision,0,Number.MAX_SAFE_INTEGER)
      ||!int(body.sellerRevision,0,Number.MAX_SAFE_INTEGER)
      ||!requestKey(body.requestKey)
      ||body.unitPrice*body.quantity>1000000000000000)bad();
    return {kind:'buy',offerId:body.offerId as string,
      unitPrice:body.unitPrice as number,quantity:body.quantity as number,
      buyerRevision:body.buyerRevision as number,sellerRevision:body.sellerRevision as number,
      requestKey:body.requestKey as string};
  }
  if(operation==='claim'){
    if(!only(body,['deliveryId','deliveryKind','destination','requestKey'])
      ||!id(body.deliveryId)||!['purchased','returned'].includes(body.deliveryKind as string)
      ||!['inventory','bank','gem_pouch'].includes(body.destination as string)
      ||!requestKey(body.requestKey))bad();
    return {kind:'claim',deliveryId:body.deliveryId as string,
      deliveryKind:body.deliveryKind as 'purchased'|'returned',
      destination:body.destination as 'inventory'|'bank'|'gem_pouch',
      requestKey:body.requestKey as string};
  }
  bad();
}

/** Testable validation only. No database access and no route registration. */
export async function bindAuthenticatedMarketRequest(
  request:Request,
  services:MarketAuthServices,
):Promise<BoundMarketRequest>{
  const url=new URL(request.url);
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)throw new MarketRequestError('auth_required',401);
  const actor=await services.authenticate(token);
  if(!actor||!id(actor))throw new MarketRequestError('invalid_session',401);

  if(url.searchParams.getAll('action').length!==1)bad();
  const action=url.searchParams.get('action')??'';
  if(!['inbox','my_offers','publish','cancel','buy','claim'].includes(action))bad();
  let body:unknown=null;
  if(request.method==='POST'){
    const length=request.headers.get('content-length');
    if(length!==null&&(!/^[0-9]+$/.test(length)||Number(length)>2048))
      throw new MarketRequestError('market_request_too_large',413);
    const raw=await request.text();
    if(raw.length>2048)throw new MarketRequestError('market_request_too_large',413);
    try{body=JSON.parse(raw);}catch{throw new MarketRequestError('market_invalid_json',400);}
  }
  return {actorAccountId:actor,operation:validate(action,request.method,url.searchParams,body)};
}

/** Safe-for-production default: every method returns 404 with no Auth or RPC.
 * No runtime env/config switch can enable the market accidentally.
 */
export function createHiddenMarketHandler(_services:MarketAuthServices){
  return async (_request:Request):Promise<Response>=>{
    return new Response(JSON.stringify({error:'not_found'}),{
      status:404,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
    });
  };
}
