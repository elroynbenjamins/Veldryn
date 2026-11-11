/**
 * World Boss V12 War Camp donations — DISABLED, IN-MEMORY ONLY.
 *
 * Models server-owned inventory debit and an idempotent receipt in ONE
 * serialized critical section. Do NOT expose to HTTP, reuse for live wallets,
 * or treat a Promise mutex as cross-process/DB transaction.
 *
 * Server policy fixes material recipes and community goals at event start.
 * Client request chooses recipeId and requestId only; accountId comes from
 * authenticated server context. No client inventory, amount, tier or buffs.
 */
import {makeWorldBossWarCampSnapshotV11,type WorldBossWarCampSnapshotV11,type WorldBossWarCampTierV11} from './world-boss-war-camp-v11';
export const WORLD_BOSS_V12_SUPPLY_EMULATOR_LIVE=false as const;
export type WorldBossSupplyTrackV12='fortifications'|'fieldProvisions'|'siegecraft';
export interface WorldBossSupplyMaterialV12{itemId:string;quantity:number}
export interface WorldBossSupplyRecipeV12{
 id:string;track:WorldBossSupplyTrackV12;materials:readonly WorldBossSupplyMaterialV12[];
}
export interface WorldBossSupplyGoalV12{tier1At:number;tier2At:number}
export interface WorldBossSupplyEventPolicyV12{
 eventId:string;startsAtUtcMs:number;endsAtUtcMs:number;
 goals:Record<WorldBossSupplyTrackV12,WorldBossSupplyGoalV12>;
 recipes:readonly WorldBossSupplyRecipeV12[];
}
export interface WorldBossSupplyReceiptV12{
 eventId:string;accountId:string;requestId:string;recipeId:string;
 track:WorldBossSupplyTrackV12;ordinal:1|2;
 paidMaterials:readonly WorldBossSupplyMaterialV12[];
 atUtcMs:number;trackContributions:number;warCampRevision:number;
 /** Approval-only economic preview; NOT a currency ledger. */
 hypotheticalSigils:5;
}
export interface WorldBossSupplyStateV12{
 inventory:Record<string,Record<string,number>>;
 contributions:Record<WorldBossSupplyTrackV12,number>;
 receipts:Readonly<Record<string,WorldBossSupplyReceiptV12>>;
 revision:number;warCamp:WorldBossWarCampSnapshotV11;
}
const tracks:WorldBossSupplyTrackV12[]=['fortifications','fieldProvisions','siegecraft'];
const copy=<T>(value:T):T=>structuredClone(value);
const safe=(s:string)=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/.test(s);
const req=(s:string)=>typeof s==='string'&&/^[A-Za-z0-9_-]{8,128}$/.test(s);
const qty=(n:number)=>Number.isSafeInteger(n)&&n>0&&n<=1e9;
const key=(account:string,request:string)=>JSON.stringify([account,request]);
const levels=(goals:WorldBossSupplyEventPolicyV12['goals'],counts:WorldBossSupplyStateV12['contributions'])=>
 Object.fromEntries(tracks.map(track=>[track,
  counts[track]>=goals[track].tier2At?2:counts[track]>=goals[track].tier1At?1:0,
 ])) as Record<WorldBossSupplyTrackV12,WorldBossWarCampTierV11>;

export class WorldBossSupplyEmulatorV12{
 private policy:WorldBossSupplyEventPolicyV12;
 private state:WorldBossSupplyStateV12;
 private chain:Promise<void>=Promise.resolve();
 constructor(policy:WorldBossSupplyEventPolicyV12,authoritativeInventory:Record<string,Record<string,number>>){
  if(!safe(policy.eventId)||!Number.isSafeInteger(policy.startsAtUtcMs)||
   !Number.isSafeInteger(policy.endsAtUtcMs)||policy.startsAtUtcMs>=policy.endsAtUtcMs||
   policy.endsAtUtcMs-policy.startsAtUtcMs>7*86400000||
   !policy.goals||!Array.isArray(policy.recipes)||!policy.recipes.length||
   policy.recipes.length>100||new Set(policy.recipes.map(r=>r.id)).size!==policy.recipes.length||
   tracks.some(t=>!policy.goals[t]||!qty(policy.goals[t].tier1At)||
    !qty(policy.goals[t].tier2At)||policy.goals[t].tier2At<=policy.goals[t].tier1At)||
   policy.recipes.some(r=>!safe(r.id)||!tracks.includes(r.track)||
    !r.materials.length||r.materials.length>12||
    new Set(r.materials.map((m:WorldBossSupplyMaterialV12)=>m.itemId)).size!==r.materials.length||
    r.materials.some((m:WorldBossSupplyMaterialV12)=>!safe(m.itemId)||!qty(m.quantity))))
   throw Error('world_boss_v12_invalid_server_supply_policy');
  if(Object.entries(authoritativeInventory).some(([account,items])=>
   !safe(account)||!items||Object.entries(items).some(([id,amount])=>
    !safe(id)||!Number.isSafeInteger(amount)||amount<0)))
   throw Error('world_boss_v12_invalid_server_inventory_fixture');
  this.policy=copy(policy);
  this.state={inventory:copy(authoritativeInventory),
   contributions:{fortifications:0,fieldProvisions:0,siegecraft:0},receipts:{},revision:0,
   warCamp:makeWorldBossWarCampSnapshotV11({eventId:policy.eventId,revision:0,
    levels:{fortifications:0,fieldProvisions:0,siegecraft:0}})};
 }
 snapshot():WorldBossSupplyStateV12{return copy(this.state);}
 private async lock<T>(fn:()=>T):Promise<T>{
  let release!:()=>void;
  const prior=this.chain;this.chain=new Promise<void>(res=>{release=res;});
  await prior;
  try{return fn();}finally{release();}
 }
 async donate(input:{principalAccountId:string;requestId:string;recipeId:string;nowUtcMs:number}):
 Promise<{receipt:WorldBossSupplyReceiptV12;repeated:boolean;warCamp:WorldBossWarCampSnapshotV11}>{
  return this.lock(()=>{
   const {principalAccountId:account,requestId,recipeId,nowUtcMs:now}=input;
   if(!safe(account)||!req(requestId)||!safe(recipeId)||!Number.isSafeInteger(now))
    throw Error('world_boss_v12_invalid_authenticated_donation');
   const old=this.state.receipts[key(account,requestId)];
   if(old){
    if(old.recipeId!==recipeId)throw Error('world_boss_v12_supply_idempotency_conflict');
    return {receipt:copy(old),repeated:true,warCamp:copy(this.state.warCamp)};
   }
   if(now<this.policy.startsAtUtcMs||now>=this.policy.endsAtUtcMs)
    throw Error('world_boss_v12_supply_event_closed');
   const recipe=this.policy.recipes.find(r=>r.id===recipeId);
   if(!recipe)throw Error('world_boss_v12_unknown_supply_recipe');
   const already=Object.values(this.state.receipts).filter(r=>r.accountId===account).length;
   if(already>=2)throw Error('world_boss_v12_supply_account_limit');
   if(this.state.contributions[recipe.track]>=this.policy.goals[recipe.track].tier2At)
    throw Error('world_boss_v12_supply_track_already_completed');
   const owned=this.state.inventory[account];
   if(!owned||recipe.materials.some(m=>(owned[m.itemId]??0)<m.quantity))
    throw Error('world_boss_v12_supply_insufficient_owned_resources');
   for(const m of recipe.materials)owned[m.itemId]-=m.quantity;
   this.state.contributions[recipe.track]++;
   this.state.revision++;
   const receipt:WorldBossSupplyReceiptV12={
    eventId:this.policy.eventId,accountId:account,requestId,recipeId,
    track:recipe.track,ordinal:(already+1) as 1|2,paidMaterials:copy(recipe.materials),
    atUtcMs:now,trackContributions:this.state.contributions[recipe.track],
    warCampRevision:this.state.revision,hypotheticalSigils:5,
   };
   this.state.receipts={...this.state.receipts,[key(account,requestId)]:receipt};
   this.state.warCamp=makeWorldBossWarCampSnapshotV11({
    eventId:this.policy.eventId,revision:this.state.revision,
    levels:levels(this.policy.goals,this.state.contributions),
   });
   return {receipt:copy(receipt),repeated:false,warCamp:copy(this.state.warCamp)};
  });
 }
}

/** Read-only entitlement preview. Trusted server-only committed attack receipts
 * are inputs; this does NOT write a World Sigil wallet or grant currency.
 */
export interface WorldBossCommittedAttemptV12{
 eventId:string;accountId:string;requestId:string;ordinal:1|2|3;
 survived:boolean;impact:number;
}
export type WorldBossMilestoneV12=70|30|0;
export interface WorldBossRewardPreviewV12{
 accountId:string;eventId:string;
 total:number;maxAllowed:100;rewardEligible:false;
 lines:readonly {key:string;amount:number}[];
}
export function previewWorldBossRewardsV12(input:{
 eventId:string;accountId:string;
 attempts:readonly WorldBossCommittedAttemptV12[];
 supplyReceipts:readonly WorldBossSupplyReceiptV12[];
 reachedGlobalMilestones:readonly WorldBossMilestoneV12[];
}):WorldBossRewardPreviewV12{
 const {eventId,accountId,attempts,supplyReceipts,reachedGlobalMilestones}=input;
 if(!safe(eventId)||!safe(accountId)||attempts.length>3||supplyReceipts.length>2||
  new Set(attempts.map(a=>a.ordinal)).size!==attempts.length||
  new Set(attempts.map(a=>a.requestId)).size!==attempts.length||
  new Set(supplyReceipts.map(r=>r.requestId)).size!==supplyReceipts.length||
  new Set(supplyReceipts.map(r=>r.ordinal)).size!==supplyReceipts.length||
  new Set(reachedGlobalMilestones).size!==reachedGlobalMilestones.length||
  reachedGlobalMilestones.some(x=>![70,30,0].includes(x))||
  attempts.some(a=>a.eventId!==eventId||a.accountId!==accountId||!req(a.requestId)||
   ![1,2,3].includes(a.ordinal)||typeof a.survived!=='boolean'||
   !Number.isFinite(a.impact)||a.impact<0||a.impact>1.4)||
  supplyReceipts.some(r=>r.eventId!==eventId||r.accountId!==accountId||!req(r.requestId)||
   ![1,2].includes(r.ordinal)||r.hypotheticalSigils!==5))
  throw Error('world_boss_v12_invalid_trusted_reward_proof');
 const lines:{key:string;amount:number}[]=[];
 for(const a of [...attempts].sort((x,y)=>x.ordinal-y.ordinal))
  lines.push({key:'attack:'+a.ordinal,amount:a.survived?10:5});
 const impact=attempts.reduce((n,a)=>n+a.impact,0);
 for(const [threshold,amount] of [[.8,5],[1.8,10],[3,15]] as const)
  if(impact+1e-6>=threshold)lines.push({key:'impact:'+threshold,amount});
 if(attempts.length){
  for(const [threshold,amount] of [[70,5],[30,10],[0,15]] as const)
   if(reachedGlobalMilestones.includes(threshold))lines.push({key:'global:'+threshold,amount});
 }
 for(const s of [...supplyReceipts].sort((x,y)=>x.ordinal-y.ordinal))
  lines.push({key:'supply:'+s.ordinal,amount:5});
 const total=lines.reduce((n,line)=>n+line.amount,0);
 if(total>100)throw Error('world_boss_v12_reward_cap_exceeded');
 return {accountId,eventId,total,maxAllowed:100,rewardEligible:false,lines};
}
