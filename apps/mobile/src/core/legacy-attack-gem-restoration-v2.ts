/**
 * Veldryn 2.0 only. Typed RPC boundary; NO automatic calls from the 1.0.x
 * client. The player's opt-in UI is a separate reviewed design gate.
 * The database is authoritative for entitlement, quantities and receipts.
 */
export type LegacyAttackGemIdV2='EMBER_SHARD'|'EMBERHEART_GEM';

export interface LegacyAttackGemRestorationOptionV2{
  legacyId:LegacyAttackGemIdV2;
  status:'not_eligible'|'already_restored'|'ready'|'manual_review';
  originalCount:number;
  restoredCount:number;
  remainingEligible:number;
  canRestoreNow:number;
  needsReview:number;
  consume:{itemId:string;quantity:number};
  grant:{itemId:string;quantity:number};
}
export interface LegacyAttackGemRestorationPreviewV2{
  enabled:boolean;
  revision:number;
  restorations:LegacyAttackGemRestorationOptionV2[];
}
export interface LegacyAttackGemRestorationReceiptV2{
  requestId:string;
  legacyId:LegacyAttackGemIdV2;
  restored:number;
  consumed:{itemId:string;quantity:number};
  granted:{itemId:string;quantity:number};
  revision:number;
  status:'restored';
}
export interface LegacyAttackGemRpcV2{
  rpc(name:string,args?:Record<string,unknown>):Promise<{data:unknown;error:null|{message:string}}>;
}
const isRecord=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const count=(v:unknown):number=>{
  if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0)throw new Error('Invalid restoration response');
  return v;
};
const legacyId=(id:unknown):LegacyAttackGemIdV2=>{
  if(id==='EMBER_SHARD'||id==='EMBERHEART_GEM')return id;
  throw new Error('Invalid legacy gem');
};
const resultOrThrow=(result:{data:unknown;error:null|{message:string}})=>{
  if(result.error)throw new Error(result.error.message||'Legacy restoration failed');
  if(!isRecord(result.data))throw new Error('Invalid restoration response');
  return result.data;
};
function stack(v:unknown){
  if(!isRecord(v)||typeof v.itemId!=='string'||!v.itemId)throw new Error('Invalid restoration response');
  return {itemId:v.itemId,quantity:count(v.quantity)};
}
function row(v:unknown):LegacyAttackGemRestorationOptionV2{
  if(!isRecord(v)||!['not_eligible','already_restored','ready','manual_review'].includes(String(v.status)))
    throw new Error('Invalid restoration response');
  return {
    legacyId:legacyId(v.legacyId),
    status:v.status as LegacyAttackGemRestorationOptionV2['status'],
    originalCount:count(v.originalCount),restoredCount:count(v.restoredCount),
    remainingEligible:count(v.remainingEligible),canRestoreNow:count(v.canRestoreNow),
    needsReview:count(v.needsReview),consume:stack(v.consume),grant:stack(v.grant),
  };
}
export async function previewLegacyAttackGemRestorationV2(
  client:LegacyAttackGemRpcV2,
):Promise<LegacyAttackGemRestorationPreviewV2>{
  const v=resultOrThrow(await client.rpc('preview_legacy_attack_gem_restoration_v2'));
  if(typeof v.enabled!=='boolean'||!Array.isArray(v.restorations))
    throw new Error('Invalid restoration response');
  return {enabled:v.enabled,revision:count(v.revision),restorations:v.restorations.map(row)};
}
export async function claimLegacyAttackGemRestorationV2(
  client:LegacyAttackGemRpcV2,
  options:{legacyId:LegacyAttackGemIdV2;quantity:number;requestId:string;expectedRevision:number},
):Promise<LegacyAttackGemRestorationReceiptV2>{
  const id=legacyId(options.legacyId);
  if(!Number.isSafeInteger(options.quantity)||options.quantity<1||options.quantity>1000)
    throw new Error('Invalid restoration quantity');
  if(!Number.isSafeInteger(options.expectedRevision)||options.expectedRevision<0)
    throw new Error('Invalid game revision');
  if(!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(options.requestId))
    throw new Error('Invalid restoration request ID');
  const v=resultOrThrow(await client.rpc('claim_legacy_attack_gem_restoration_v2',{
    p_legacy_id:id,p_quantity:options.quantity,p_request_id:options.requestId,
    p_expected_revision:options.expectedRevision,
  }));
  if(v.status!=='restored'||v.legacyId!==id||v.requestId!==options.requestId)
    throw new Error('Invalid restoration response');
  const amount=count(v.restored);
  if(amount!==options.quantity)throw new Error('Restoration quantity mismatch');
  return {requestId:options.requestId,legacyId:id,restored:amount,
    consumed:stack(v.consumed),granted:stack(v.granted),revision:count(v.revision),status:'restored'};
}
