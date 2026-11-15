/**
 * Veldryn Guild Expeditions V9 — HIDDEN transactional PORT contract.
 *
 * Domain logic runs against a fully atomic SERIALIZABLE transaction port.
 * InMemoryGuildPveV9Store is a pure test double which serializes & rolls back;
 * it is not a database, service endpoint, outbox, wallet or migration.
 *
 * The production adapter must guarantee transaction isolation + durability
 * across workers and *authenticate* principalAccountId before calling run().
 * No existing Guild Hunt table is used or modified.
 */
import {createHash} from 'node:crypto';
import type {CombatantDefinition} from './types';
import {
 GUILD_PVE_V8_MANIFEST,verifyGuildPveV8Manifest,type GuildPveNodeIdV8,
 type GuildPveV8TrustedActor,
} from './guild-pve-shared-v8';
import {
 GUILD_PVE_V7_PHASES,verifyGuildPveReferenceV7,previewBrokenForgeAttemptV7,
 type GuildPveReferenceV7,type GuildPveDifficultyV7,type GuildPveStanceV7,
 type GuildPvePhaseV7,type GuildPvePreviewV7,
} from './guild-pve-broken-forge-v7';

export const GUILD_PVE_V9_LIVE=false as const;
const DAY=86400000;
const safe=(s:unknown)=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9:_-]{1,99}$/.test(s);
const round=(x:number)=>Number(Math.max(0,x).toFixed(2));
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const sha=(data:unknown)=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
const difficultyWeight:Record<GuildPveDifficultyV7,number>={Scout:1,Veteran:1.24,Mythic:1.5};
const nodeIndex=new Map(GUILD_PVE_V8_MANIFEST.map(x=>[x.id,x]));
verifyGuildPveV8Manifest();

export type GuildPveV9Mode='battle'|'exploration';
export interface GuildPveV9Account {
 sealsSpent:number;ordersSpent:number;
}
export interface GuildPveV9Node {
 hp:number;maxHp:number;cleared:boolean;
 phase:GuildPvePhaseV7|null;phaseTriggers:GuildPvePhaseV7[];
}
export interface GuildPveV9Run {
 cycleId:string;guildId:string;startMs:number;endMs:number;
 difficulty:GuildPveDifficultyV7;reference:GuildPveReferenceV7;
 revision:number;pressure:number;
 members:Record<string,GuildPveV9Account>;
 nodes:Record<GuildPveNodeIdV8,GuildPveV9Node>;
}
export interface GuildPveV9Receipt {
 cycleId:string;guildId:string;accountId:string;characterId:string;
 requestId:string;nodeId:GuildPveNodeIdV8;kind:GuildPveV9Mode;
 status:'committed'|'stale';costSeals:0|1;costOrders:0|1;
 beforeHp:number;afterHp:number;creditedHp:number;
 beforePressure:number;afterPressure:number;
 phaseTransitions:GuildPvePhaseV7[];
 guildRevision:number;combat:GuildPvePreviewV7|null;
 rewardMinted:false;inventorySpent:false;databasePersisted:false;
}
export interface GuildPveV9StoreState {
 guildRuns:Record<string,GuildPveV9Run>;
 cycleBindings:Record<string,string>;
 receipts:Record<string,{fingerprint:string;value:GuildPveV9Receipt}>;
}
export interface GuildPveV9AtomicPort {
 /** Contract: serialize conflicts, fully roll back on throw, commit durable
  * state+receipt+binding atomically, including across multiple service workers.
  * The test adapter below is NOT an implementation of that DB guarantee.
  */
 transaction<T>(job:(mutable:GuildPveV9StoreState)=>Promise<T>):Promise<T>;
}
export interface GuildPveV9TrustedLoader {
 /** Server-only, DB-owned GameState, validated equipment/companion + revision.
  * NEVER implement this from request JSON or unverified client stats.
  */
 resolveOwnedActor(principalAccountId:string,characterId:string):
  Promise<GuildPveV8TrustedActor>;
}
export interface GuildPveV9TrustedServerContext {
 /** From authenticated server principal, not request body or JWT user_metadata. */
 principalAccountId:string;
 /** Server clock, not client-provided timestamp. */
 nowUtcMs:number;
}
export interface GuildPveV9Action {
 cycleId:string;guildId:string;characterId:string;requestId:string;
 nodeId:GuildPveNodeIdV8;kind:GuildPveV9Mode;
 stance?:GuildPveStanceV7;
}
const runKey=(cycle:string,guild:string)=>JSON.stringify([cycle,guild]);
const bindingKey=(cycle:string,account:string)=>JSON.stringify([cycle,account]);
const receiptKey=(cycle:string,account:string,request:string)=>JSON.stringify([cycle,account,request]);

/** Creates immutable parameters for one guild's candidate 14-day run.
 * Campaign HP formula is V8's UNAPPROVED synthetic calibration. The SQL
 * version must freeze real verified HP, roster & profile under server policy.
 */
export function makeGuildPveV9Run(input:{
 cycleId:string;guildId:string;startMs:number;
 difficulty:GuildPveDifficultyV7;accountIds:readonly string[];
 reference:GuildPveReferenceV7;
}):GuildPveV9Run {
 if(!safe(input.cycleId)||!safe(input.guildId)||
  !Number.isSafeInteger(input.startMs)||input.startMs<=0||
  new Date(input.startMs).getUTCDay()!==1||
  new Date(input.startMs).getUTCHours()!==0||
  new Date(input.startMs).getUTCMinutes()!==0||
  input.startMs%60000!==0||
  !Object.hasOwn(difficultyWeight,input.difficulty)||
  input.accountIds.length===0||
  input.accountIds.some(x=>!safe(x))||
  new Set(input.accountIds).size!==input.accountIds.length)
  throw Error('guild_pve_v9_invalid_run');
 verifyGuildPveReferenceV7(input.reference);
 const scaled=Math.max(4,input.accountIds.length);
 const nodes=Object.fromEntries(GUILD_PVE_V8_MANIFEST.map(n=>{
  const hp=n.boss?Math.ceil(input.reference.attack*24*scaled*
   (n.weight??0)*difficultyWeight[input.difficulty]):0;
  const phase=n.boss?GUILD_PVE_V7_PHASES[n.boss][0]:null;
  return [n.id,{hp,maxHp:hp,phase,phaseTriggers:[],cleared:n.kind==='start'}];
 })) as Record<GuildPveNodeIdV8,GuildPveV9Node>;
 return {
  cycleId:input.cycleId,guildId:input.guildId,startMs:input.startMs,
  endMs:input.startMs+14*DAY,difficulty:input.difficulty,
  reference:structuredClone(input.reference),
  pressure:0,revision:0,nodes,
  members:Object.fromEntries(input.accountIds.map(id=>[id,{sealsSpent:0,ordersSpent:0}])),
 };
}

/** Test-only portable storage; callers may reinstantiate services with the
 * same store to simulate loss of application process-local caches.
 * This object itself must not be called durable: its memory still disappears.
 */
export class InMemoryGuildPveV9Store implements GuildPveV9AtomicPort {
 private state:GuildPveV9StoreState={guildRuns:{},cycleBindings:{},receipts:{}};
 private queue:Promise<unknown>=Promise.resolve();
 private injectedAbort=false;
 abortNextTransactionBeforeCommit(){this.injectedAbort=true;}
 async transaction<T>(job:(mutable:GuildPveV9StoreState)=>Promise<T>):Promise<T>{
  const process=async()=>{
   const candidate=structuredClone(this.state);
   const value=await job(candidate);
   if(this.injectedAbort){
    this.injectedAbort=false;
    throw Error('guild_pve_v9_injected_commit_abort');
   }
   this.state=candidate;
   return structuredClone(value);
  };
  const current=this.queue.then(process);
  this.queue=current.then(()=>undefined,()=>undefined);
  return current;
 }
 inspect(){return structuredClone(this.state);}
}
export async function registerGuildPveV9TestRun(
 port:GuildPveV9AtomicPort,run:GuildPveV9Run
):Promise<void>{
 await port.transaction(async state=>{
  const key=runKey(run.cycleId,run.guildId);
  if(state.guildRuns[key])throw Error('guild_pve_v9_duplicate_guild_run');
  state.guildRuns[key]=structuredClone(run);
 });
}

function isAccessible(run:GuildPveV9Run,id:GuildPveNodeIdV8){
 const node=nodeIndex.get(id)!;
 return node.all.every(x=>run.nodes[x].cleared)&&
  (!node.any||node.any.some(x=>run.nodes[x].cleared));
}
function nextGuardianPhase(
 boss:'gatekeeper'|'seer'|'warden',
 remaining:number,max:number
):GuildPvePhaseV7{
 const cut=boss==='gatekeeper'?[.6,.2]:boss==='seer'?[.65,.3]:[.7,.3];
 const p=GUILD_PVE_V7_PHASES[boss];
 return remaining/max>cut[0]?p[0]:remaining/max>cut[1]?p[1]:p[2];
}
export class GuildPveV9TransactionService {
 constructor(private readonly storage:GuildPveV9AtomicPort,
  private readonly loader:GuildPveV9TrustedLoader){}
 async commit(server:GuildPveV9TrustedServerContext,
  action:GuildPveV9Action):Promise<GuildPveV9Receipt>{
  if(!safe(server.principalAccountId)||!safe(action.cycleId)||
   !safe(action.guildId)||!safe(action.characterId)||
   !safe(action.requestId)||!nodeIndex.has(action.nodeId)||
   !Number.isSafeInteger(server.nowUtcMs)||server.nowUtcMs<=0)
   throw Error('guild_pve_v9_invalid_command');
  if(action.kind==='battle'&&!['Assault','Guard','Rally'].includes(action.stance??''))
   throw Error('guild_pve_v9_invalid_stance');
  if(action.kind==='exploration'&&action.stance!==undefined)
   throw Error('guild_pve_v9_exploration_has_stance');
  if(!['battle','exploration'].includes(action.kind))
   throw Error('guild_pve_v9_invalid_action_kind');
  const account=server.principalAccountId;
  const key=receiptKey(action.cycleId,account,action.requestId);
  const fingerprint=sha([action.cycleId,action.guildId,action.characterId,
   action.nodeId,action.kind,action.stance??null]);
  return this.storage.transaction(async state=>{
   const previous=state.receipts[key];
   if(previous){
    if(previous.fingerprint!==fingerprint)
     throw Error('guild_pve_v9_idempotency_key_conflict');
    return previous.value;
   }
   const run=state.guildRuns[runKey(action.cycleId,action.guildId)];
   if(!run)throw Error('guild_pve_v9_unknown_run');
   const member=run.members[account];
   if(!member)throw Error('guild_pve_v9_not_in_frozen_roster');
   if(server.nowUtcMs<run.startMs||server.nowUtcMs>=run.endMs)
    throw Error('guild_pve_v9_run_not_active');
   const def=nodeIndex.get(action.nodeId)!,node=run.nodes[action.nodeId];
   const canFight=def.kind==='combat'||def.kind==='guardian'||def.kind==='final';
   const canExplore=def.kind==='explore'||def.kind==='dual';
   if(action.kind==='battle'&&!canFight||
    action.kind==='exploration'&&!canExplore)
    throw Error('guild_pve_v9_unsupported_node_action');
   const binding=state.cycleBindings[bindingKey(action.cycleId,account)];
   if(binding&&binding!==action.guildId)
    throw Error('guild_pve_v9_already_bound_to_other_guild');
   const oldHp=node.hp,oldPressure=run.pressure;
   const receipt=(status:'committed'|'stale',combat:GuildPvePreviewV7|null,
    transitions:GuildPvePhaseV7[]):GuildPveV9Receipt=>({
    cycleId:action.cycleId,guildId:action.guildId,accountId:account,
    characterId:action.characterId,requestId:action.requestId,nodeId:action.nodeId,
    kind:action.kind,status,costSeals:status==='committed'&&action.kind==='battle'?1:0,
    costOrders:status==='committed'&&action.kind==='exploration'?1:0,
    beforeHp:oldHp,afterHp:node.hp,creditedHp:round(oldHp-node.hp),
    beforePressure:oldPressure,afterPressure:run.pressure,
    phaseTransitions:transitions,guildRevision:run.revision,combat,
    rewardMinted:false,inventorySpent:false,databasePersisted:false,
   });
   const save=(value:GuildPveV9Receipt)=>{
    state.receipts[key]={fingerprint,value};
    return value;
   };
   // A cycle-bound account cannot probe another guild via a free stale
   // result. Even a zero-cost saved receipt requires correct guild binding.
   if(node.cleared)return save(receipt('stale',null,[]));
   if(!isAccessible(run,action.nodeId))throw Error('guild_pve_v9_node_locked');
   const week2=server.nowUtcMs>=run.startMs+7*DAY;
   if(action.kind==='battle'&&member.sealsSpent>=(week2?8:4))
    throw Error('guild_pve_v9_no_assault_seals');
   if(action.kind==='exploration'&&member.ordersSpent>=(week2?6:3))
    throw Error('guild_pve_v9_no_exploration_orders');
   let combat:GuildPvePreviewV7|null=null;
   let transitions:GuildPvePhaseV7[]=[];
   if(action.kind==='battle'){
    const actor=await this.loader.resolveOwnedActor(account,action.characterId);
    if(!actor||actor.characterId!==action.characterId||
     actor.actor?.id!==action.characterId||
     actor.actor.team!=='players'||
     !['tank','damage','support'].includes(actor.actor.role)||
     !Number.isSafeInteger(actor.gameRevision)||actor.gameRevision<1||
     !/^[a-f0-9]{64}$/.test(actor.sourceHash))
     throw Error('guild_pve_v9_unverified_actor');
    const seed=sha([run.cycleId,run.guildId,account,action.characterId,
     action.requestId,action.nodeId,run.revision,actor.gameRevision,actor.sourceHash]);
    combat=previewBrokenForgeAttemptV7({
     boss:def.boss!,phase:node.phase!,difficulty:run.difficulty,
     reference:run.reference,player:actor.actor,stance:action.stance!,seed,
    });
    node.hp=round(Math.max(0,node.hp-Math.min(node.hp,combat.bossHpRemoved)));
    if(def.kind==='guardian'||def.kind==='final'){
     const phases=GUILD_PVE_V7_PHASES[def.boss!];
     const first=phases.indexOf(node.phase!);
     const last=phases.indexOf(node.hp===0?phases[2]:
      nextGuardianPhase(def.boss!,node.hp,node.maxHp));
     transitions=phases.slice(first+1,last+1);
     for(const phase of transitions)
      if(!node.phaseTriggers.includes(phase))node.phaseTriggers.push(phase);
     node.phase=phases[last];
    }
    node.cleared=node.hp===0;
    const drumBonus=action.nodeId==='C3-06'&&action.stance==='Assault'&&
     run.nodes['C3-02'].cleared?3:0;
    const raw=action.stance==='Assault'?15:action.stance==='Guard'?-12:-8;
    run.pressure=clamp(run.pressure+raw-4-drumBonus,0,100);
    member.sealsSpent++;
   }else {
    node.cleared=true;
    member.ordersSpent++;
   }
   state.cycleBindings[bindingKey(action.cycleId,account)]=action.guildId;
   run.revision++;
   return save(receipt('committed',combat,transitions));
  });
 }
}
