/**
 * Veldryn 2.0 resource sink PREVIEW. This module has no Guild API,
 * SQL, Edge or mobile import and MUST NOT be used to settle a donation.
 * All account/character/inventory/progress input is untrusted without a
 * future authenticated, locking, atomic database adapter.
 */
import {
 GUILD_TREE_DEVELOPMENT_GATES, guildTreeDevelopmentCost,
} from './progression';

export const GUILD_V2_RESOURCE_SINK_CONTRACT = 'guild-v2-resource-sinks-review-v1' as const;
export const GUILD_V2_RESOURCE_SINK_RELEASE_ENABLED = false as const;
export type GuildV2SourceStatus = 'existing_inventory_identity'|'unregistered_eq2_output';
export interface GuildV2MaterialOption {
 readonly itemId:string;
 readonly credit:number;
 readonly registration:GuildV2SourceStatus;
}
export interface GuildV2BasketSpec {
 readonly id:string;
 readonly shareBps:number;
 readonly options:readonly GuildV2MaterialOption[];
}
export interface GuildV2SinkDefinition {
 readonly unlockKey?:string;
 readonly id?:string;
 readonly branch?:'professions'|'fellowship'|'vanguard';
 readonly tier?:2|3;
 readonly requiredGuildLevel?:number;
 readonly minGuildLevel?:number;
 readonly goldBase?:number;
 readonly goldPerMember?:number;
 readonly weightedBase:number;
 readonly weightedPerMember:number;
 readonly baskets:readonly GuildV2BasketSpec[];
}
export interface GuildV2SinkPolicy {
 readonly schema:'veldryn-eq2-guild-resource-sink-review-v1';
 readonly releaseState:'HIDDEN_REVIEW_ONLY';
 readonly safeguards:{
  readonly mayCharge:false;
  readonly mayActivateGuildProjects:false;
  readonly mayRegisterNewMaterials:false;
 };
 readonly guildDevelopmentGates:readonly GuildV2SinkDefinition[];
 readonly weeklySupplyCandidates:readonly GuildV2SinkDefinition[];
}
export interface GuildV2BasketTarget {
 readonly id:string;
 readonly target:number;
 readonly options:readonly GuildV2MaterialOption[];
}
export interface GuildV2FrozenCostPreview {
 readonly contract:typeof GUILD_V2_RESOURCE_SINK_CONTRACT;
 readonly reviewOnly:true;
 readonly canActivate:false;
 readonly projectInstanceId:string;
 readonly guildId:string;
 readonly definitionKey:string;
 readonly kind:'development'|'weekly_supply';
 readonly policyVersion:string;
 readonly activeMembersSnapshot:number;
 readonly guildLevelAtStart:number;
 readonly goldTarget:number;
 readonly weightedTarget:number;
 readonly baskets:readonly GuildV2BasketTarget[];
 readonly startsAtMs:number;
 readonly endsAtMs:number;
}
export class GuildV2SinkReviewError extends Error {
 constructor(readonly code:string){super(code);this.name='GuildV2SinkReviewError';}
}
function fail(code:string):never { throw new GuildV2SinkReviewError(code); }
function nonNegative(n:unknown):n is number {
 return typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
}
function positive(n:unknown):n is number{return nonNegative(n)&&n>0;}
function key(s:unknown):s is string {
 return typeof s==='string' && s.length>0 && s.length<=160 &&
  /^[A-Za-z0-9_.:-]+$/.test(s) && !['__proto__','constructor','prototype'].includes(s);
}
function validDefinition(def:GuildV2SinkDefinition):void{
 if(!nonNegative(def.weightedBase)||!positive(def.weightedBase)||
  !nonNegative(def.weightedPerMember)||!Array.isArray(def.baskets)||
  def.baskets.length<3)fail('invalid_sink_definition');
 const ids=new Set<string>();
 const allItems=new Set<string>();
 let sum=0;
 for(const basket of def.baskets){
  if(!key(basket.id)||ids.has(basket.id)||!positive(basket.shareBps)||
    basket.shareBps>10000||!Array.isArray(basket.options)||!basket.options.length)
   fail('invalid_sink_basket');
  ids.add(basket.id);sum+=basket.shareBps;
  if(!basket.options.some(opt=>opt.registration==='existing_inventory_identity'))
   fail('no_existing_source_option');
  for(const opt of basket.options){
   if(!key(opt.itemId)||allItems.has(opt.itemId)||!positive(opt.credit)||opt.credit>8||
     !['existing_inventory_identity','unregistered_eq2_output'].includes(opt.registration))
    fail('invalid_sink_material_option');
   if(opt.registration==='unregistered_eq2_output'&&!opt.itemId.startsWith('EQ2_'))
    fail('unregistered_item_identity');
   allItems.add(opt.itemId);
  }
 }
 if(sum!==10000)fail('invalid_basket_share_total');
}
/** Hamilton largest-remainder allocation: exact integer sum, stable basket order. */
export function guildV2AllocateBasketQuotas(total:number, baskets:readonly GuildV2BasketSpec[]):number[]{
 if(!positive(total)||!Array.isArray(baskets)||baskets.length<1)fail('invalid_weighted_target');
 const share=baskets.reduce((sum,b)=>sum+b.shareBps,0);
 if(share!==10000||baskets.some(b=>!positive(b.shareBps)))fail('invalid_basket_share_total');
 const raw=baskets.map(b=>total*b.shareBps/10000);
 const result=raw.map(Math.floor);
 let left=total-result.reduce((sum,n)=>sum+n,0);
 if(left<0||left>=baskets.length)fail('quota_rounding_error');
 const byFraction=raw.map((x,i)=>i).sort((a,b)=>
  (raw[b]-Math.floor(raw[b]))-(raw[a]-Math.floor(raw[a])) || a-b);
 for(let i=0;i<left;i++)result[byFraction[i]]++;
 if(result.some(n=>!positive(n))||result.reduce((sum,n)=>sum+n,0)!==total)
  fail('quota_rounding_error');
 return result;
}
export function guildV2MakeCostPreview(input:{
 readonly policy:GuildV2SinkPolicy;
 readonly kind:'development'|'weekly_supply';
 readonly definitionKey:string;
 readonly guildId:string;
 readonly projectInstanceId:string;
 readonly policyVersion:string;
 readonly guildLevel:number;
 readonly activeMembers:number;
 readonly startsAtMs:number;
 readonly endsAtMs:number;
}):GuildV2FrozenCostPreview{
 if(input.policy?.schema!=='veldryn-eq2-guild-resource-sink-review-v1'||
    input.policy.releaseState!=='HIDDEN_REVIEW_ONLY'||
    input.policy.safeguards?.mayCharge!==false||
    input.policy.safeguards?.mayActivateGuildProjects!==false||
    input.policy.safeguards?.mayRegisterNewMaterials!==false)fail('unapproved_or_invalid_policy');
 if(!key(input.definitionKey)||!key(input.guildId)||!key(input.projectInstanceId)||
    !key(input.policyVersion)||!nonNegative(input.guildLevel)||
    !nonNegative(input.activeMembers)||!nonNegative(input.startsAtMs)||
    !positive(input.endsAtMs)||input.endsAtMs<=input.startsAtMs)fail('invalid_cost_snapshot_identity');
 const members=Math.max(2,Math.min(20,Math.floor(input.activeMembers)));
 const definitions=input.kind==='development'?
  input.policy.guildDevelopmentGates:input.kind==='weekly_supply'?
  input.policy.weeklySupplyCandidates:fail('invalid_sink_kind');
 const matches=definitions.filter(d=>(input.kind==='development'?d.unlockKey:d.id)===input.definitionKey);
 if(matches.length!==1)fail('unknown_or_duplicate_sink');
 const def=matches[0];validDefinition(def);
 let gold=0;
 let requiredLevel=def.minGuildLevel;
 let weighted=def.weightedBase+def.weightedPerMember*members;
 if(input.kind==='development'){
  const gates=GUILD_TREE_DEVELOPMENT_GATES.filter(g=>g.unlockKey===def.unlockKey);
  if(gates.length!==1)fail('unknown_canonical_development_gate');
  const gate=gates[0];
  if(gate.branch!==def.branch||gate.tier!==def.tier||
    gate.requiredGuildLevel!==def.requiredGuildLevel||
    gate.baseGold!==def.goldBase||gate.goldPerActiveMember!==def.goldPerMember||
    gate.baseWeightedResources!==def.weightedBase||
    gate.weightedResourcesPerActiveMember!==def.weightedPerMember)
   fail('guild_gate_source_drift');
  const cost=guildTreeDevelopmentCost(gate,members);
  gold=cost.gold;weighted=cost.weightedResources;
  requiredLevel=gate.requiredGuildLevel;
 }
 if(!positive(weighted)||!nonNegative(gold)||!nonNegative(requiredLevel)||
    input.guildLevel<requiredLevel)fail('guild_level_below_sink_gate');
 const quotas=guildV2AllocateBasketQuotas(weighted,def.baskets);
 const targets=def.baskets.map((basket,i)=>Object.freeze({
  id:basket.id,target:quotas[i],options:Object.freeze(
   basket.options.map(opt=>Object.freeze({...opt}))),
 }));
 return Object.freeze({
  contract:GUILD_V2_RESOURCE_SINK_CONTRACT,
  reviewOnly:true as const,canActivate:false as const,
  projectInstanceId:input.projectInstanceId,guildId:input.guildId,
  definitionKey:input.definitionKey,kind:input.kind,
  policyVersion:input.policyVersion,activeMembersSnapshot:members,
  guildLevelAtStart:input.guildLevel,goldTarget:gold,weightedTarget:weighted,
  baskets:Object.freeze(targets),startsAtMs:input.startsAtMs,endsAtMs:input.endsAtMs,
 });
}
export interface GuildV2AuthenticatedReviewState {
 /** Every value must come from the FUTURE trusted DB adapter, never the request. */
 readonly accountId:string;
 readonly authenticatedCharacterId:string;
 readonly guildId:string;
 readonly memberOfGuild:boolean;
 readonly projectId:string;
 readonly policyVersion:string;
 readonly revision:number;
 readonly status:'active'|'completed'|'expired'|'cancelled';
 readonly nowMs:number;
 readonly inventory:Readonly<Record<string,number>>;
 readonly bank:Readonly<Record<string,number>>;
 readonly walletGold:number;
 readonly progress:Readonly<Record<string,number>>;
 readonly goldContributed:number;
 readonly previousReceipt?:{
  readonly idempotencyKey:string;
  readonly fingerprint:string;
  readonly debitAmount:number;
  readonly creditedUnits:number;
 };
}
export interface GuildV2DonationPreviewRequest {
 readonly accountId:string;
 readonly characterId:string;
 readonly guildId:string;
 readonly projectInstanceId:string;
 readonly policyVersion:string;
 readonly expectedRevision:number;
 readonly idempotencyKey:string;
 readonly resourceKind:'item'|'gold';
 readonly resourceId:string;
 readonly amount:number;
}
export interface GuildV2DonationDebitPlan {
 readonly fromInventory:number;
 readonly fromBank:number;
 readonly fromGold:number;
}
export interface GuildV2DonationReview {
 readonly contract:typeof GUILD_V2_RESOURCE_SINK_CONTRACT;
 readonly canPersist:false;
 readonly requiresAuthenticatedAtomicDbAdapter:true;
 readonly replay:boolean;
 readonly fingerprint:string;
 readonly basketId:string|null;
 readonly creditUnits:number;
 readonly debit:GuildV2DonationDebitPlan;
 readonly reason:'REVIEW_ONLY_ATOMIC_SETTLEMENT_REQUIRED';
}
export function guildV2DonationFingerprint(req:GuildV2DonationPreviewRequest):string{
 return [req.guildId,req.projectInstanceId,req.accountId,req.characterId,
  req.policyVersion,req.resourceKind,req.resourceId,req.amount].join('|');
}
/** Pure debiting PLAN; it does NOT write money, items, progress or receipts. */
export function guildV2ReviewDonation(input:{
 readonly snapshot:GuildV2FrozenCostPreview;
 readonly state:GuildV2AuthenticatedReviewState;
 readonly request:GuildV2DonationPreviewRequest;
}):GuildV2DonationReview{
 const {snapshot,state,request}=input;
 if(snapshot?.contract!==GUILD_V2_RESOURCE_SINK_CONTRACT||
   snapshot.canActivate!==false||snapshot.reviewOnly!==true)
  fail('unapproved_cost_snapshot');
 if(!key(request.accountId)||!key(request.characterId)||!key(request.guildId)||
   !key(request.projectInstanceId)||!key(request.policyVersion)||
   !key(request.idempotencyKey)||request.idempotencyKey.length<8||
   !positive(request.amount)||!nonNegative(request.expectedRevision)||
   !key(request.resourceId))fail('invalid_donation_request');
 if(request.accountId!==state.accountId||request.characterId!==state.authenticatedCharacterId||
    request.guildId!==state.guildId||!state.memberOfGuild||
    request.projectInstanceId!==snapshot.projectInstanceId||
    request.projectInstanceId!==state.projectId||
    request.guildId!==snapshot.guildId||
    request.policyVersion!==snapshot.policyVersion||
    request.policyVersion!==state.policyVersion)
  fail('guild_account_character_or_policy_mismatch');
 if(!nonNegative(state.revision)||!nonNegative(state.nowMs)||
   !nonNegative(state.walletGold)||!nonNegative(state.goldContributed)||
   !state.inventory||!state.bank||!state.progress)fail('invalid_authoritative_state');
 const fingerprint=guildV2DonationFingerprint(request);
 if(state.previousReceipt?.idempotencyKey===request.idempotencyKey){
  if(state.previousReceipt.fingerprint!==fingerprint||
     !nonNegative(state.previousReceipt.debitAmount)||
     !nonNegative(state.previousReceipt.creditedUnits))
   fail('idempotency_key_payload_conflict');
  return {
   contract:GUILD_V2_RESOURCE_SINK_CONTRACT,canPersist:false,
   requiresAuthenticatedAtomicDbAdapter:true,replay:true,fingerprint,
   basketId:null,creditUnits:0,debit:{fromInventory:0,fromBank:0,fromGold:0},
   reason:'REVIEW_ONLY_ATOMIC_SETTLEMENT_REQUIRED',
  };
 }
 if(request.expectedRevision!==state.revision)fail('stale_project_revision');
 if(state.status!=='active'||state.nowMs<snapshot.startsAtMs||
    state.nowMs>=snapshot.endsAtMs)fail('project_not_active');
 let basketId:string|null=null,creditUnits=0;
 let fromInventory=0,fromBank=0,fromGold=0;
 if(request.resourceKind==='gold'){
  if(request.resourceId!=='gold'||snapshot.kind!=='development'||
    snapshot.goldTarget<=0)fail('gold_not_required');
  if(request.amount>snapshot.goldTarget-state.goldContributed)
   fail('donation_exceeds_remaining_gold');
  if(request.amount>state.walletGold)fail('insufficient_gold');
  fromGold=request.amount;
 }else if(request.resourceKind==='item'){
  const eligible=snapshot.baskets.flatMap(b=>
   b.options.map(opt=>({basket:b,option:opt})))
   .filter(x=>x.option.itemId===request.resourceId);
  if(eligible.length!==1)fail('item_not_required');
  const {basket,option}=eligible[0];
  if(option.registration!=='existing_inventory_identity')
   fail('unregistered_item_not_donatable');
  const current=state.progress[basket.id]??0;
  if(!nonNegative(current)||current>basket.target)fail('corrupt_project_progress');
  const product=request.amount*option.credit;
  if(!positive(product)||product>basket.target-current)
   fail('donation_exceeds_remaining_quota');
  const availableInventory=state.inventory[request.resourceId]??0;
  const availableBank=state.bank[request.resourceId]??0;
  if(!nonNegative(availableInventory)||!nonNegative(availableBank))
   fail('invalid_material_balance');
  if(availableInventory+availableBank<request.amount)fail('insufficient_materials');
  fromInventory=Math.min(request.amount,availableInventory);
  fromBank=request.amount-fromInventory;
  creditUnits=product;basketId=basket.id;
 }else fail('invalid_resource_kind');
 return {
  contract:GUILD_V2_RESOURCE_SINK_CONTRACT,canPersist:false,
  requiresAuthenticatedAtomicDbAdapter:true,replay:false,fingerprint,
  basketId,creditUnits,
  debit:{fromInventory,fromBank,fromGold},
  reason:'REVIEW_ONLY_ATOMIC_SETTLEMENT_REQUIRED',
 };
}
