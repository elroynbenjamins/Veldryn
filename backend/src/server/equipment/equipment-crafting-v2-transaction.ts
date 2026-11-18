import {randomUUID,randomInt} from 'node:crypto';
import {assertEquipmentCraftingV2Released} from './equipment-crafting-v2-gate';
import {v2ServerRecipeAndPiece,type V2ServerProfession} from './equipment-crafting-v2-manifest';
import {draftEquipmentV2Outcome,type V2DraftRollOutcome} from './equipment-crafting-v2-rolls';

/** Hidden, isolated, account-scoped TRANSACTION MODEL.
 * NOT wired to live Inventory, server tables, online RPCs or the player UI.
 * A production adapter must serialize each account and atomically persist the
 * resulting inventory/Gold/queue/copy/XP/receipt changes as a single commit.
 */
export interface V2DraftJob {
 id:string;accountId:string;ownerCharacterId:string;recipeId:string;pieceId:string;
 startedAtMs:number;finishesAtMs:number;slotIndex:0|1|2;
 goldReserved:number;materialsReserved:readonly {itemId:string;quantity:number;fromInventory:number;fromBank:number}[];
 status:'queued'|'claimed';resultId?:string;
}
export interface V2DraftItem {
 id:string;accountId:string;ownerCharacterId:string;
 createdAtMs:number;jobId:string;outcome:V2DraftRollOutcome;
}
export interface V2DraftSkillAward {
 characterId:string;profession:V2ServerProfession;xp:number;jobId:string;
}
export type V2DraftReceiptResponse=
 |{kind:'started';jobId:string;recipeId:string;pieceId:string;finishesAtMs:number;goldCharged:number;version:number}
 |{kind:'claimed';jobId:string;instanceId:string;outcome:V2DraftRollOutcome;xpAwarded:number;profession:V2ServerProfession;version:number};
export interface V2DraftReceipt {requestId:string;commandFingerprint:string;response:V2DraftReceiptResponse}
export interface V2DraftSnapshot {
 accountId:string;activeCharacterId:string;version:number;
 characterLevel:number;professionLevels:Record<V2ServerProfession,number>;
 gold:number;inventory:Record<string,number>;bank:Record<string,number>;
 jobs:V2DraftJob[];equipment:V2DraftItem[];skillAwards:V2DraftSkillAward[];
 receipts:V2DraftReceipt[];
}
export type V2DraftCommand=
 |{kind:'start';requestId:string;expectedVersion:number;recipeId:string}
 |{kind:'claim';requestId:string;expectedVersion:number;jobId:string};
export interface V2DraftContext {
 /** Only trusted server sources may inject these values. */
 accountId:string;characterId:string;nowMs:number;
 randomId?():string;randomInt?(exclusiveMax:number):number;
}
export class V2DraftCraftError extends Error {
 constructor(readonly reason:string){super(reason);}
}
export interface V2DraftResolution {
 next:V2DraftSnapshot;response:V2DraftReceiptResponse;replayed:boolean;
}
const MAX_QUEUED_CRAFTS=8; // 3 active and 5 waiting; ready capacity enforced separately
const MAX_UNCLAIMED_READY=20;
const fail=(reason:string):never=>{throw new V2DraftCraftError(reason);};
const safeCount=(x:number)=>Number.isSafeInteger(x)&&x>=0;
function verifyCommand(command:V2DraftCommand){
 if(!command||typeof command!=='object')fail('invalid_command');
 const keys=Object.keys(command),type=command.kind;
 const expected=type==='start'?['expectedVersion','kind','recipeId','requestId']:
  type==='claim'?['expectedVersion','jobId','kind','requestId']:fail('invalid_command_kind');
 if(keys.length!==expected.length||!keys.slice().sort().every((key,i)=>key===expected[i]))fail('invalid_command_fields');
 if(!/^[a-zA-Z0-9_-]{8,128}$/.test(command.requestId))fail('invalid_request_id');
 if(!safeCount(command.expectedVersion))fail('invalid_expected_version');
 if(type==='start'&&(!command.recipeId||typeof command.recipeId!=='string'))fail('invalid_recipe_id');
 if(type==='claim'&&(!command.jobId||typeof command.jobId!=='string'))fail('invalid_job_id');
}
function verifyState(state:V2DraftSnapshot,ctx:V2DraftContext){
 if(!state||state.accountId!==ctx.accountId||state.activeCharacterId!==ctx.characterId)fail('invalid_owner');
 if(!safeCount(state.version)||!safeCount(state.gold)||!safeCount(state.characterLevel)
   ||!safeCount(state.professionLevels.smithing)||!safeCount(state.professionLevels.tailoring)
   ||!Number.isSafeInteger(ctx.nowMs)||ctx.nowMs<0)fail('invalid_trusted_snapshot');
 if(state.jobs.some(j=>j.accountId!==ctx.accountId)||state.equipment.some(i=>i.accountId!==ctx.accountId))fail('foreign_account_records');
}
function fingerprint(c:V2DraftCommand){
 return c.kind==='start'?'start:'+c.recipeId:'claim:'+c.jobId;
}
function consumption(state:V2DraftSnapshot,inputs:readonly {itemId:string;quantity:number}[]){
 const plan:{itemId:string;quantity:number;fromInventory:number;fromBank:number}[]=[];
 for(const input of inputs){
  if(!input.itemId||!Number.isSafeInteger(input.quantity)||input.quantity<1)fail('invalid_canonical_recipe');
  const inv=state.inventory[input.itemId]??0,bank=state.bank[input.itemId]??0;
  if(!safeCount(inv)||!safeCount(bank))fail('invalid_material_inventory');
  if(inv+bank<input.quantity)fail('insufficient_materials');
  const fromInventory=Math.min(inv,input.quantity);
  plan.push({...input,fromInventory,fromBank:input.quantity-fromInventory});
 }
 return plan;
}
function nextSlot(jobs:readonly V2DraftJob[],nowMs:number){
 const remaining=[nowMs,nowMs,nowMs];
 for(const job of jobs.filter(job=>job.status==='queued')){
  const index=job.slotIndex;
  if(index!==0&&index!==1&&index!==2)fail('invalid_queue_slot');
  remaining[index]=Math.max(remaining[index],job.finishesAtMs);
 }
 const min=Math.min(...remaining);
 const slotIndex=remaining.indexOf(min) as 0|1|2;
 return {slotIndex,startedAtMs:min};
}
function applyStart(state:V2DraftSnapshot,command:Extract<V2DraftCommand,{kind:'start'}>,ctx:V2DraftContext){
 const match=v2ServerRecipeAndPiece(command.recipeId);
 if(!match)fail('unknown_v2_recipe');
 const {recipe,piece}=match;
 if(piece.tier!==recipe.tier||piece.id!==recipe.pieceId)fail('inconsistent_canonical_manifest');
 if(state.characterLevel<recipe.characterLevel
   ||state.professionLevels[recipe.profession]<recipe.professionLevel)fail('craft_requirement_locked');
 if(!safeCount(recipe.gold)||recipe.gold===0||!safeCount(recipe.seconds)||recipe.seconds===0||!safeCount(recipe.xp))fail('invalid_recipe_economy');
 if(state.gold<recipe.gold)fail('insufficient_gold');
 const queue=state.jobs.filter(j=>j.status==='queued');
 if(queue.length>=MAX_QUEUED_CRAFTS)fail('queue_full');
 const ready=queue.filter(j=>j.finishesAtMs<=ctx.nowMs);
 if(ready.length>=MAX_UNCLAIMED_READY)fail('ready_storage_full');
 const material=consumption(state,recipe.inputs);
 const start=nextSlot(queue,ctx.nowMs);
 const jobId=(ctx.randomId??randomUUID)();
 if(!jobId||state.jobs.some(j=>j.id===jobId))fail('invalid_job_id_generated');
 const job:V2DraftJob={
  id:jobId,accountId:ctx.accountId,ownerCharacterId:ctx.characterId,
  recipeId:recipe.id,pieceId:piece.id,
  startedAtMs:start.startedAtMs,finishesAtMs:start.startedAtMs+recipe.seconds*1000,
  slotIndex:start.slotIndex,status:'queued',
  goldReserved:recipe.gold,materialsReserved:material,
 };
 if(!Number.isSafeInteger(job.finishesAtMs))fail('invalid_job_finish_time');
 for(const row of material){
  state.inventory[row.itemId]=(state.inventory[row.itemId]??0)-row.fromInventory;
  state.bank[row.itemId]=(state.bank[row.itemId]??0)-row.fromBank;
 }
 state.gold-=recipe.gold;
 state.jobs.push(job);
 const response:V2DraftReceiptResponse={kind:'started',jobId,recipeId:recipe.id,pieceId:piece.id,
  finishesAtMs:job.finishesAtMs,goldCharged:recipe.gold,version:state.version+1};
 return response;
}
function applyClaim(state:V2DraftSnapshot,command:Extract<V2DraftCommand,{kind:'claim'}>,ctx:V2DraftContext){
 const job=state.jobs.find(j=>j.id===command.jobId);
 if(!job||job.accountId!==ctx.accountId||job.ownerCharacterId!==ctx.characterId)fail('unknown_owned_job');
 if(job.status==='claimed')fail('already_claimed');
 if(ctx.nowMs<job.finishesAtMs)fail('job_not_finished');
 const matched=v2ServerRecipeAndPiece(job.recipeId);
 if(!matched||matched.recipe.pieceId!==job.pieceId)fail('unknown_job_recipe');
 const {recipe,piece}=matched;
 const outcome=draftEquipmentV2Outcome({recipeId:recipe.id,pieceId:piece.id,slot:piece.slot,role:piece.role,tier:piece.tier},
  ctx.randomInt??randomInt);
 const instanceId=(ctx.randomId??randomUUID)();
 if(!instanceId||state.equipment.some(item=>item.id===instanceId))fail('invalid_item_id_generated');
 const item:V2DraftItem={id:instanceId,accountId:ctx.accountId,ownerCharacterId:job.ownerCharacterId,
  createdAtMs:ctx.nowMs,jobId:job.id,outcome};
 state.equipment.push(item);
 state.skillAwards.push({characterId:job.ownerCharacterId,profession:recipe.profession,xp:recipe.xp,jobId:job.id});
 job.status='claimed';job.resultId=instanceId;
 const response:V2DraftReceiptResponse={kind:'claimed',jobId:job.id,instanceId,
  outcome,xpAwarded:recipe.xp,profession:recipe.profession,version:state.version+1};
 return response;
}
/** Pure resolution against a TRUSTED account snapshot. Caller must execute
 * this inside an account-scoped serializable database transaction.
 * Returns a new aggregate, never mutates the input. All receipt replay happens
 * BEFORE stale-version handling; duplicate claims cannot mint another copy.
 */
export function resolveEquipmentV2DraftCommand(
 old:V2DraftSnapshot,command:V2DraftCommand,ctx:V2DraftContext,
):V2DraftResolution{
 verifyCommand(command);verifyState(old,ctx);
 const key=fingerprint(command);
 const stored=old.receipts.find(receipt=>receipt.requestId===command.requestId);
 if(stored){
  if(stored.commandFingerprint!==key)fail('request_id_conflict');
  return {next:old,response:stored.response,replayed:true};
 }
 if(command.expectedVersion!==old.version)fail('stale_game_version');
 const next:V2DraftSnapshot=structuredClone(old);
 const response=command.kind==='start'?applyStart(next,command,ctx):applyClaim(next,command,ctx);
 next.version=old.version+1;
 next.receipts.push({requestId:command.requestId,commandFingerprint:key,response});
 return {next,response,replayed:false};
}
/** Production entry: fail closed, and demand an authenticated, SERIALIZABLE
 * account transaction implementation. No actual implementation is mounted.
 */
export interface V2CraftTransactionalStore {
 withAccountTransaction<T>(accountId:string,fn:(read:V2DraftSnapshot)=>Promise<{next:V2DraftSnapshot;result:T}>):Promise<T>;
}
export function runEquipmentV2Command(
 store:V2CraftTransactionalStore,ctx:V2DraftContext,command:V2DraftCommand,
){
 assertEquipmentCraftingV2Released();
 return store.withAccountTransaction(ctx.accountId,async read=>{
  const resolution=resolveEquipmentV2DraftCommand(read,command,ctx);
  return {next:resolution.next,result:{response:resolution.response,replayed:resolution.replayed}};
 });
}
