/**
 * Guild Expeditions V18 — HIDDEN/TEST-ONLY atomic settlement domain port.
 *
 * Demonstrates one atomic state transition around REAL V17 engine results.
 * InMemoryV18Port is VOLATILE; no production database adapter, real auth,
 * network route, wallet, outbox publisher, materials or live Guild Hunt writes.
 *
 * A future PostgreSQL port MUST lock both guild-run and global cycle/account
 * binding, re-read membership + GameState under the same transaction, and
 * commit HP/Pressure/seals/charges/receipt together. This file cannot do that.
 */
import {createHash} from 'node:crypto';
import {GUILD_PVE_V8_MANIFEST,type GuildPveNodeIdV8,type GuildPveV8TrustedActor} from './guild-pve-shared-v8';
import {GUILD_PVE_V7_PHASES,type GuildPveStanceV7,type GuildPvePhaseV7} from './guild-pve-broken-forge-v7';
import {previewGuildPveV17EffectfulAttempt,
 type GuildPveV17CombatProof,type GuildPveV17ServerTactics,
 type GuildPveV17Shrine} from './guild-pve-effects-v17';
import type {GuildPveV9StoreState,GuildPveV9Run} from './guild-pve-transaction-v9';

export const GUILD_PVE_V18_LIVE=false as const;
const DAY=86_400_000;
const safe=(v:unknown):v is string=>
 typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9:_-]{1,99}$/.test(v);
const sha=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const round=(v:number)=>Math.max(0,Number(v.toFixed(2)));
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const runKey=(c:string,g:string)=>JSON.stringify([c,g]);
const bindingKey=(c:string,a:string)=>JSON.stringify([c,a]);
const receiptKey=(c:string,a:string,r:string)=>JSON.stringify([c,a,r]);
const nodes=new Map(GUILD_PVE_V8_MANIFEST.map(n=>[n.id,n]));
function reject(reason:string):never{throw Error('guild_pve_v18_'+reason);}
export interface GuildPveV18Charges {
 shrineChoice:GuildPveV17Shrine|null;
 protection:number;cleanse:number;insight:number;
}
export interface GuildPveV18Receipt {
 cycleId:string;guildId:string;accountId:string;characterId:string;
 nodeId:GuildPveNodeIdV8;requestId:string;stance:GuildPveStanceV7;
 status:'committed'|'stale';sealDebit:0|1;
 beforeHp:number;afterHp:number;creditedHp:number;
 beforePressure:number;afterPressure:number;
 phaseTransitions:readonly GuildPvePhaseV7[];
 beforeCharges:GuildPveV18Charges;afterCharges:GuildPveV18Charges;
 guildRevision:number;gameRevision:number|null;actorSourceHash:string|null;
 combat:GuildPveV17CombatProof|null;
 rewardGranted:false;walletWritten:false;outboxCreated:false;
}
export interface GuildPveV18StoreState {
 guild:GuildPveV9StoreState;
 charges:Record<string,GuildPveV18Charges>;
 receipts:Record<string,{fingerprint:string;value:GuildPveV18Receipt}>;
}
export interface GuildPveV18AtomicPort {
 transaction<T>(job:(state:GuildPveV18StoreState)=>Promise<T>):Promise<T>;
}
export class InMemoryGuildPveV18Port implements GuildPveV18AtomicPort {
 private current:GuildPveV18StoreState;
 private queue:Promise<unknown>=Promise.resolve();
 private abortNext=false;
 constructor(initial:GuildPveV18StoreState){this.current=structuredClone(initial);}
 failNextCommit(){this.abortNext=true;}
 inspect(){return structuredClone(this.current);}
 async transaction<T>(job:(state:GuildPveV18StoreState)=>Promise<T>):Promise<T>{
  const process=async()=>{
   const proposed=structuredClone(this.current);
   const result=await job(proposed);
   if(this.abortNext){this.abortNext=false;reject('synthetic_rollback');}
   this.current=proposed;
   return structuredClone(result);
  };
  const p=this.queue.then(process);
  this.queue=p.then(()=>undefined,()=>undefined);
  return p;
 }
}
export interface GuildPveV18TrustedAuthority {
 /**
  * This interface is strictly for server-owned authenticated identity and
  * same-transaction guild member + GameState validation. A fake reader in
  * isolated QA does NOT establish database/authentication guarantees.
  */
 verifyOwnedGuildActor(input:{
  principalAccountId:string;guildId:string;characterId:string;
  cycleId:string;
 }):Promise<GuildPveV8TrustedActor>;
}
export interface GuildPveV18Action {
 cycleId:string;guildId:string;characterId:string;requestId:string;
 nodeId:GuildPveNodeIdV8;stance:GuildPveStanceV7;
}
export interface GuildPveV18ServerContext {
 /** Only from trusted server auth. Never deserialize from client command. */
 principalAccountId:string;
 /** Only from database/host clock, never client timestamp. */
 nowUtcMs:number;
}
function validCharges(x:GuildPveV18Charges):boolean{
 return !!x&&[null,'warding','cleansing','insight'].includes(x.shrineChoice)&&
  [x.protection,x.cleanse,x.insight].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=2);
}
function tacticsFromRun(run:GuildPveV9Run,charges:GuildPveV18Charges):GuildPveV17ServerTactics{
 if(!validCharges(charges))reject('invalid_frozen_charges');
 return {
  clearedNodes:Object.fromEntries(GUILD_PVE_V8_MANIFEST.map(n=>[n.id,run.nodes[n.id]?.cleared===true])),
  pressure:run.pressure,shrineChoice:charges.shrineChoice,
  protectionCharges:charges.protection,
  cleanseCharges:charges.cleanse,insightCharges:charges.insight,
 };
}
function nextPhase(boss:'gatekeeper'|'seer'|'warden',hp:number,max:number):GuildPvePhaseV7{
 const cuts=boss==='gatekeeper'?[.6,.2]:boss==='seer'?[.65,.3]:[.7,.3];
 const phases=GUILD_PVE_V7_PHASES[boss];
 return hp/max>cuts[0]?phases[0]:hp/max>cuts[1]?phases[1]:phases[2];
}
export class GuildPveV18SettlementService {
 constructor(private readonly port:GuildPveV18AtomicPort,
  private readonly authority:GuildPveV18TrustedAuthority){}
 async attack(server:GuildPveV18ServerContext,
  action:GuildPveV18Action):Promise<GuildPveV18Receipt>{
  if(!safe(server.principalAccountId)||!Number.isSafeInteger(server.nowUtcMs)||
   server.nowUtcMs<0||!safe(action.cycleId)||!safe(action.guildId)||
   !safe(action.characterId)||!safe(action.requestId)||
   !nodes.has(action.nodeId)||!['Assault','Guard','Rally'].includes(action.stance))
   reject('invalid_request');
  const account=server.principalAccountId;
  const key=receiptKey(action.cycleId,account,action.requestId);
  const fingerprint=sha([
   action.cycleId,action.guildId,action.characterId,
   action.requestId,action.nodeId,action.stance,
  ]);
  return this.port.transaction(async state=>{
   const previous=state.receipts[key];
   if(previous){
    if(previous.fingerprint!==fingerprint)reject('nonce_conflict');
    return previous.value;
   }
   const run=state.guild.guildRuns[runKey(action.cycleId,action.guildId)];
   if(!run)reject('unknown_run');
   if(!Object.hasOwn(run.members,account))reject('not_frozen_member');
   const member=run.members[account];
   if(!Number.isSafeInteger(run.revision)||run.revision<0||
    !Number.isFinite(run.pressure)||run.pressure<0||run.pressure>100)
    reject('invalid_run_state');
   const existingBinding=state.guild.cycleBindings[bindingKey(action.cycleId,account)];
   if(existingBinding&&existingBinding!==action.guildId)reject('already_bound_elsewhere');
   if(server.nowUtcMs<run.startMs||server.nowUtcMs>=run.endMs)
    reject('campaign_closed');
   const definition=nodes.get(action.nodeId)!;
   if(!definition.boss||!definition.required)reject('unsupported_node');
   const node=run.nodes[action.nodeId];
   if(!node)reject('missing_node');
   if(!Number.isFinite(node.hp)||!Number.isFinite(node.maxHp)||
    node.maxHp<=0||node.hp<0||node.hp>node.maxHp||
    node.cleared!==(node.hp===0))
    reject('invalid_shared_hp');
   if(!definition.all.every(id=>run.nodes[id]?.cleared===true)||
    (definition.any?.length&&!definition.any.some(id=>run.nodes[id]?.cleared===true)))
    reject('locked_node');
   const charges=state.charges[runKey(action.cycleId,action.guildId)];
   if(!validCharges(charges))reject('no_frozen_charge_record');
   const before=structuredClone(charges);
   const oldHp=node.hp,oldPressure=run.pressure;
   const makeReceipt=(status:'committed'|'stale',combat:GuildPveV17CombatProof|null,
    transitions:GuildPvePhaseV7[],actor:GuildPveV8TrustedActor|null):
    GuildPveV18Receipt=>({
    cycleId:action.cycleId,guildId:action.guildId,accountId:account,
    characterId:action.characterId,nodeId:action.nodeId,requestId:action.requestId,
    stance:action.stance,status,sealDebit:status==='committed'?1:0,
    beforeHp:oldHp,afterHp:node.hp,creditedHp:round(oldHp-node.hp),
    beforePressure:oldPressure,afterPressure:run.pressure,
    phaseTransitions:transitions,beforeCharges:before,afterCharges:structuredClone(charges),
    guildRevision:run.revision,gameRevision:actor?.gameRevision??null,
    actorSourceHash:actor?.sourceHash??null,combat,
    rewardGranted:false,walletWritten:false,outboxCreated:false,
   });
   const save=(value:GuildPveV18Receipt)=>{
    state.receipts[key]={fingerprint,value};return value;
   };
   // Even zero-debit stale actions must prove ownership and current guild
   // membership; the cleared-node state is not an authorization bypass.
   const actor=await this.authority.verifyOwnedGuildActor({
    principalAccountId:account,guildId:action.guildId,
    characterId:action.characterId,cycleId:action.cycleId,
   });
   if(!actor||actor.characterId!==action.characterId||
    actor.actor?.id!==action.characterId||
    actor.actor.team!=='players'||
    !['damage','tank','support'].includes(actor.actor.role)||
    !Number.isSafeInteger(actor.gameRevision)||actor.gameRevision<1||
    !/^[a-f0-9]{64}$/.test(actor.sourceHash))
    reject('unverified_actor');
   if(!Number.isSafeInteger(member.sealsSpent)||member.sealsSpent<0||
    member.sealsSpent>8)reject('corrupt_seal_budget');
   // Stale targets cost no Seals even if an account already spent its budget.
   if(node.cleared)return save(makeReceipt('stale',null,[],actor));
   if(member.sealsSpent>=(server.nowUtcMs>=run.startMs+7*DAY?8:4))
    reject('no_assault_seals');
   if(definition.kind==='guardian'||definition.kind==='final'){
    const expected=nextPhase(definition.boss,node.hp,node.maxHp);
    if(node.phase!==expected)reject('inconsistent_guardian_phase');
   }
   const seed=sha([
    action.cycleId,action.guildId,account,action.characterId,
    action.requestId,action.nodeId,run.revision,actor.gameRevision,actor.sourceHash,
   ]);
   const combat=previewGuildPveV17EffectfulAttempt({
    player:actor.actor,boss:definition.boss,phase:node.phase!,
    difficulty:run.difficulty,reference:run.reference,
    stance:action.stance,tactics:tacticsFromRun(run,charges),seed,
   });
   for(const [property,charge] of [
    ['protection',combat.proposedChargeUses.protection],
    ['cleanse',combat.proposedChargeUses.cleanse],
    ['insight',combat.proposedChargeUses.insight],
   ] as const){
    if(charges[property]<charge)reject('charge_underflow');
    charges[property]-=charge;
   }
   node.hp=round(Math.max(0,oldHp-Math.min(oldHp,combat.bossHpRemoved)));
   let transitions:GuildPvePhaseV7[]=[];
   if(definition.kind==='guardian'||definition.kind==='final'){
    const phases=GUILD_PVE_V7_PHASES[definition.boss];
    const first=phases.indexOf(node.phase!);
    const last=phases.indexOf(node.hp===0?phases[2]:
     nextPhase(definition.boss,node.hp,node.maxHp));
    if(last<first||first<0)reject('phase_regression');
    transitions=phases.slice(first+1,last+1);
    for(const phase of transitions){
     if(!node.phaseTriggers.includes(phase))node.phaseTriggers.push(phase);
    }
    node.phase=phases[last];
   }
   node.cleared=node.hp===0;
   const drum=action.nodeId==='C3-06'&&action.stance==='Assault'&&
    run.nodes['C3-02']?.cleared?3:0;
   const delta=action.stance==='Assault'?15:action.stance==='Guard'?-12:-8;
   run.pressure=clamp(run.pressure+delta-4-drum,0,100);
   member.sealsSpent++;
   state.guild.cycleBindings[bindingKey(action.cycleId,account)]=action.guildId;
   run.revision++;
   return save(makeReceipt('committed',combat,transitions,actor));
  });
 }
}
