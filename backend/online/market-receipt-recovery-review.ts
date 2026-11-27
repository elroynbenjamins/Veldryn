import {bindAuthenticatedMarketRequest,MarketRequestError,type MarketAuthServices} from './market-auth-boundary';
/** Unmounted read-only receipt adapter. Only an independently authenticated,
 * account-scoped durable ledger may implement the port. No actual RPC, writes,
 * route or permission is introduced. Not-found means unknown, not failed. */
export interface MarketReceiptReviewServices extends MarketAuthServices{
 allowReceiptRead(accountId:string):Promise<boolean>;
 readCommittedReceipt(accountId:string,requestKey:string):Promise<unknown>;
}
const headers={'Content-Type':'application/json','Cache-Control':'private, no-store','Vary':'Authorization','X-Content-Type-Options':'nosniff'};
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const safe=(x:unknown)=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function executeMarketReceiptReview(request:Request,services:MarketReceiptReviewServices):Promise<Response>{
 try{
  const {actorAccountId,operation}=await bindAuthenticatedMarketRequest(request,services);
  if(operation.kind!=='receipt_status')return response({error:'not_found'},404);
  if(!await services.allowReceiptRead(actorAccountId))return response({error:'rate_limited'},429);
  const row=await services.readCommittedReceipt(actorAccountId,operation.requestKey);
  if(row===null)return response({status:'unknown',requestKey:operation.requestKey});
  if(!obj(row)||row.actorAccountId!==actorAccountId||row.requestKey!==operation.requestKey||
     row.status!=='committed'||(typeof row.operation!=='string'||!['publish','buy','cancel','claim'].includes(row.operation))||
     !safe(row.revision)||typeof row.receiptId!=='string'||!uuid.test(row.receiptId))
   return response({error:'market_unavailable'},503);
  // Never expose arbitrary payload, account IDs, SQL errors or private mint.
  return response({status:'committed',requestKey:operation.requestKey,operation:row.operation,
   revision:row.revision,receiptId:row.receiptId});
 }catch(error){
  if(error instanceof MarketRequestError)return response({error:error.code},error.status);
  return response({error:'market_unavailable'},503);
 }
}
