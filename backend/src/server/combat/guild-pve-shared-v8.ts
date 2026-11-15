/**
 * Veldryn Guild PvE V8 — HIDDEN, SINGLE-PROCESS shared-run EMULATOR.
 * Never import into a live route. No DB, Cron, inventory debit or reward wallet.
 *
 * Runs actual V7 phase-local game-engine previews against a test-only shared
 * guild HP/Pressure ledger. The mutex is IN-PROCESS ONLY, not durable or
 * multi-worker-safe. It is deliberately NOT a production transaction.
 */
import {createHash} from 'node:crypto';
import type {CombatantDefinition} from './types';
import {
 GUILD_PVE_V7_PHASES,previewBrokenForgeAttemptV7,verifyGuildPveReferenceV7,
 type GuildPveBossV7,type GuildPvePhaseV7,type GuildPveStanceV7,
 type GuildPveDifficultyV7,type GuildPveReferenceV7,type GuildPvePreviewV7,
} from './guild-pve-broken-forge-v7';

export const GUILD_PVE_V8_LIVE=false as const;
const DAY=86400000;
export const GUILD_PVE_V8_ACTIVE_DAYS=14;
export const GUILD_PVE_V8_CYCLE_DAYS=42;
export const GUILD_PVE_V8_SEAL_CEILINGS=[4,8] as const;
export const GUILD_PVE_V8_ORDER_CEILINGS=[3,6] as const;
type NodeKind='start'|'combat'|'guardian'|'final'|'explore'|'supplies'|'vote'|'dual'|'elite';
export type GuildPveNodeIdV8=
 'C1-01'|'C1-02'|'C1-03'|'C1-04'|'C1-05'|'C1-06'|
 'C2-01'|'C2-02'|'C2-03'|'C2-04'|'C2-05'|'C2-06'|
 'C3-01'|'C3-02'|'C3-03'|'C3-04'|'C3-05'|'C3-06';
type NodeDef={id:GuildPveNodeIdV8;name:string;kind:NodeKind;
 required:boolean;all:readonly GuildPveNodeIdV8[];
 any?:readonly GuildPveNodeIdV8[];
 boss?:GuildPveBossV7;weight?:number};
export const GUILD_PVE_V8_MANIFEST:readonly NodeDef[]=[
 {id:'C1-01',name:'Broken Camp',kind:'start',required:true,all:[]},
 {id:'C1-02',name:'Scout the Ruins',kind:'explore',required:false,all:['C1-01']},
 {id:'C1-03',name:'Supply Cache',kind:'supplies',required:false,all:['C1-01']},
 {id:'C1-04',name:'Gate Patrol',kind:'combat',required:true,all:['C1-01'],boss:'gatekeeper',weight:.09},
 {id:'C1-05',name:'Watchtower Defenses',kind:'explore',required:false,all:[],any:['C1-02','C1-04']},
 {id:'C1-06',name:'Ironbound Gatekeeper',kind:'guardian',required:true,all:['C1-04'],boss:'gatekeeper',weight:.17},
 {id:'C2-01',name:'Molten Corridor',kind:'combat',required:true,all:['C1-06'],boss:'seer',weight:.10},
 {id:'C2-02',name:'Shattered Armoury',kind:'explore',required:false,all:['C2-01']},
 {id:'C2-03',name:'Rescue Captives',kind:'explore',required:false,all:['C2-01']},
 {id:'C2-04',name:'Shrine of Embers',kind:'vote',required:false,all:['C2-01']},
 {id:'C2-05',name:'Forge Overseers',kind:'combat',required:true,all:['C2-01'],boss:'seer',weight:.10},
 {id:'C2-06',name:'Emberbound Seer',kind:'guardian',required:true,all:['C2-05'],boss:'seer',weight:.18},
 {id:'C3-01',name:'Inner Lift',kind:'combat',required:true,all:['C2-06'],boss:'warden',weight:.10},
 {id:'C3-02',name:'Destroy War Drums',kind:'dual',required:false,all:['C3-01']},
 {id:'C3-03',name:'Final Supplies',kind:'supplies',required:false,all:['C3-01']},
 {id:'C3-04',name:'Core Stabilizer',kind:'explore',required:false,all:['C3-01']},
 {id:'C3-05',name:'Inner Wardens',kind:'elite',required:false,all:['C3-01']},
 {id:'C3-06',name:'The Hollow Warden',kind:'final',required:true,all:['C3-01','C1-06','C2-06'],boss:'warden',weight:.26},
] as const;
const byNode=new Map(GUILD_PVE_V8_MANIFEST.map(x=>[x.id,x]));
const COMBAT=GUILD_PVE_V8_MANIFEST.filter(x=>x.boss);
const IDS=new Set(GUILD_PVE_V8_MANIFEST.map(x=>x.id));
export function verifyGuildPveV8Manifest(){
 if(IDS.size!==18||GUILD_PVE_V8_MANIFEST.length!==18||
  COMBAT.length!==7||COMBAT.some(x=>!x.required)||
  COMBAT.reduce((n,x)=>n+(x.weight??0),0)<.999999)
  throw Error('guild_pve_v8_bad_manifest');
 for(const n of GUILD_PVE_V8_MANIFEST){
  if([...n.all,...(n.any??[])].some(x=>!IDS.has(x)||x===n.id))
   throw Error('guild_pve_v8_invalid_dependency:'+n.id);
 }
 // A valid directed graph must have no prerequisite cycles.
 const visited=new Set<string>(),active=new Set<string>();
 const check=(id:GuildPveNodeIdV8)=>{
  if(active.has(id))throw Error('guild_pve_v8_dependency_cycle');
  if(visited.has(id))return;
  active.add(id);const n=byNode.get(id)!;
  for(const p of [...n.all,...(n.any??[])])check(p);
  active.delete(id);visited.add(id);
 };
 for(const n of GUILD_PVE_V8_MANIFEST)check(n.id);
 return GUILD_PVE_V8_MANIFEST.length;
}
verifyGuildPveV8Manifest();
const safestr=(v:string)=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9:_-]{1,99}$/.test(v);
const round=(n:number)=>Number(Math.max(0,n).toFixed(2));
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const checksum=(...text:string[])=>createHash('sha256').update(JSON.stringify(text)).digest('hex');
const multi:Record<GuildPveDifficultyV7,number>={Scout:1,Veteran:1.24,Mythic:1.5};
export interface GuildPveV8TrustedActor{
 /** Caller must have checked online_game_states ownership and revision. */
 actor:CombatantDefinition;
 characterId:string;
 gameRevision:number;
 sourceHash:string;
}
export interface GuildPveV8ServerLoader{
 /** Called with an authenticated server principal; not a request-body account. */
 loadOwnedActor(input:{accountId:string;characterId:string}):Promise<GuildPveV8TrustedActor>;
}
export class GuildPveV8CycleBindings{
 private readonly bound=new Map<string,string>();
 /** In-memory example ONLY; not a distributed cross-server lock. */
 bind(cycle:string,account:string,guild:string){
  const key=cycle+':'+account;
  if(this.bound.has(key)&&this.bound.get(key)!==guild)
   throw Error('guild_pve_v8_account_already_bound_to_other_guild');
  this.bound.set(key,guild);
 }
 get(cycle:string,account:string){return this.bound.get(cycle+':'+account);}
}
type NodeRuntime={hp:number;maxHp:number;phase:GuildPvePhaseV7|null;triggered:GuildPvePhaseV7[];cleared:boolean};
export type GuildPveV8Receipt={
 kind:'battle'|'exploration';status:'committed'|'stale';requestId:string;
 guildId:string;accountId:string;characterId:string;nodeId:GuildPveNodeIdV8;
 costSeals:0|1;costOrders:0|1;
 beforeHp:number;afterHp:number;creditedHp:number;beforePressure:number;afterPressure:number;
 transitions:GuildPvePhaseV7[];cleared:boolean;
 result:GuildPvePreviewV7|null;
 rewardGranted:false;serverPersisted:false;
};
export type GuildPveV8Action={
 kind:'battle'|'exploration';
 /** Server-authenticated principal, never pass a user-controlled account ID here. */
 accountId:string;characterId:string;requestId:string;nodeId:GuildPveNodeIdV8;
 stance?:GuildPveStanceV7;
};
type AccountUse={seals:number;orders:number};
const isBattle=(n:NodeDef)=>n.kind==='combat'||n.kind==='guardian'||n.kind==='final';
export class GuildPveV8InMemoryGuild{
 readonly id:string;readonly eventId:string;readonly difficulty:GuildPveDifficultyV7;
 readonly startUtcMs:number;readonly endUtcMs:number;
 private readonly reference:GuildPveReferenceV7;
 private readonly members:Set<string>;
 private readonly bindings:GuildPveV8CycleBindings;
 private readonly loader:GuildPveV8ServerLoader;
 private readonly usage=new Map<string,AccountUse>();
 private readonly results=new Map<string,{fingerprint:string;receipt:GuildPveV8Receipt}>();
 private readonly nodes=new Map<GuildPveNodeIdV8,NodeRuntime>();
 private pressure=0;
 private revision=0;
 private mutex:Promise<unknown>=Promise.resolve();

 constructor(input:{eventId:string;guildId:string;startUtcMs:number;difficulty:GuildPveDifficultyV7;
  accountIds:readonly string[];reference:GuildPveReferenceV7;loader:GuildPveV8ServerLoader;
  bindings:GuildPveV8CycleBindings}){
  if(!safestr(input.eventId)||!safestr(input.guildId)||
   !Number.isSafeInteger(input.startUtcMs)||
   input.startUtcMs<=0||new Date(input.startUtcMs).getUTCDay()!==1||
   new Date(input.startUtcMs).getUTCHours()!==0||
   new Date(input.startUtcMs).getUTCMinutes()!==0||
   new Date(input.startUtcMs).getUTCSeconds()!==0||input.startUtcMs%1000!==0||
   !Object.hasOwn(multi,input.difficulty)||!input.accountIds.length||
   new Set(input.accountIds).size!==input.accountIds.length||
   input.accountIds.some(id=>!safestr(id)))
   throw Error('guild_pve_v8_invalid_run_config');
  verifyGuildPveReferenceV7(input.reference);
  this.id=input.guildId;this.eventId=input.eventId;this.difficulty=input.difficulty;
  this.startUtcMs=input.startUtcMs;this.endUtcMs=input.startUtcMs+14*DAY;
  this.reference=structuredClone(input.reference);this.members=new Set(input.accountIds);
  this.bindings=input.bindings;this.loader=input.loader;
  const n=Math.max(4,this.members.size);
  for(const def of GUILD_PVE_V8_MANIFEST){
   const hp=def.boss?Math.ceil(
    this.reference.attack*(def.weight??0)*n*24*multi[this.difficulty]
   ):0;
   this.nodes.set(def.id,{
    hp,maxHp:hp,phase:def.boss?GUILD_PVE_V7_PHASES[def.boss][0]:null,
    triggered:[],cleared:def.kind==='start'
   });
  }
 }
 private reachable(node:NodeDef){
  return node.all.every(id=>this.nodes.get(id)?.cleared)&&
   (!node.any||node.any.some(id=>this.nodes.get(id)?.cleared));
 }
 private currentPhase(node:NodeDef,hp:number,maxHp:number):GuildPvePhaseV7|null{
  if(!node.boss)return null;
  const [hi,lo]=node.boss==='gatekeeper'?[.6,.2]:node.boss==='seer'?[.65,.30]:[.70,.30];
  const phases=GUILD_PVE_V7_PHASES[node.boss];
  return hp/maxHp>hi?phases[0]:hp/maxHp>lo?phases[1]:phases[2];
 }
 private async process(cmd:GuildPveV8Action,nowUtcMs:number):Promise<GuildPveV8Receipt>{
  if(!safestr(cmd.accountId)||!safestr(cmd.characterId)||!safestr(cmd.requestId)||
   !byNode.has(cmd.nodeId))
   throw Error('guild_pve_v8_invalid_command');
  const nonce=cmd.accountId+':'+cmd.requestId;
  const fingerprint=JSON.stringify([cmd.kind,cmd.accountId,cmd.characterId,cmd.nodeId,cmd.stance??'']);
  const prior=this.results.get(nonce);
  if(prior){
   if(prior.fingerprint!==fingerprint)throw Error('guild_pve_v8_idempotency_key_reused');
   return structuredClone(prior.receipt);
  }
  if(!this.members.has(cmd.accountId))throw Error('guild_pve_v8_not_in_frozen_roster');
  if(!Number.isSafeInteger(nowUtcMs)||nowUtcMs<this.startUtcMs||nowUtcMs>=this.endUtcMs)
   throw Error('guild_pve_v8_outside_active_window');
  const node=byNode.get(cmd.nodeId)!,target=this.nodes.get(cmd.nodeId)!;
  if(cmd.kind==='battle'){
   if(!isBattle(node)||!['Assault','Guard','Rally'].includes(cmd.stance??''))
    throw Error('guild_pve_v8_unsupported_battle');
  }else if(cmd.kind==='exploration'){
   if(!(node.kind==='explore'||node.kind==='dual')||cmd.stance!==undefined)
    throw Error('guild_pve_v8_unsupported_exploration');
  }else throw Error('guild_pve_v8_invalid_action');
  const usage=this.usage.get(cmd.accountId)??{seals:0,orders:0};
  const half=nowUtcMs<this.startUtcMs+7*DAY?0:1;
  const maxSeals=GUILD_PVE_V8_SEAL_CEILINGS[half],maxOrders=GUILD_PVE_V8_ORDER_CEILINGS[half];
  const oldHp=target.hp,oldPressure=this.pressure;
  const makeReceipt=(status:'stale'|'committed',result:GuildPvePreviewV7|null,
   transitions:GuildPvePhaseV7[]=[]):GuildPveV8Receipt=>({
    kind:cmd.kind,status,requestId:cmd.requestId,accountId:cmd.accountId,guildId:this.id,
    characterId:cmd.characterId,nodeId:cmd.nodeId,costSeals:status==='committed'&&cmd.kind==='battle'?1:0,
    costOrders:status==='committed'&&cmd.kind==='exploration'?1:0,
    beforeHp:oldHp,afterHp:target.hp,creditedHp:round(Math.max(0,oldHp-target.hp)),
    beforePressure:oldPressure,afterPressure:this.pressure,transitions,cleared:target.cleared,
    result,rewardGranted:false,serverPersisted:false,
   });
  const store=(receipt:GuildPveV8Receipt)=>{
   this.results.set(nonce,{fingerprint,receipt:structuredClone(receipt)});
   return structuredClone(receipt);
  };
  // A genuinely stale node returns no debit; no other state is touched.
  if(target.cleared)return store(makeReceipt('stale',null));
  if(!this.reachable(node))throw Error('guild_pve_v8_node_locked');
  const bound=this.bindings.get(this.eventId,cmd.accountId);
  if(bound&&bound!==this.id)throw Error('guild_pve_v8_account_already_bound_to_other_guild');
  if(cmd.kind==='battle'&&usage.seals>=maxSeals)throw Error('guild_pve_v8_seals_exhausted');
  if(cmd.kind==='exploration'&&usage.orders>=maxOrders)throw Error('guild_pve_v8_orders_exhausted');
  // A fully trusted production caller would have already authenticated
  // cmd.accountId; this disabled emulator expects an injected server-only loader.
  let combat:GuildPvePreviewV7|null=null;
  let transitions:GuildPvePhaseV7[]=[];
  if(cmd.kind==='battle'){
   const verified=await this.loader.loadOwnedActor({
    accountId:cmd.accountId,characterId:cmd.characterId
   });
   if(!verified||verified.characterId!==cmd.characterId||
    verified.actor.id!==cmd.characterId||
    verified.actor.team!=='players'||!['tank','damage','support'].includes(verified.actor.role)||
    !Number.isSafeInteger(verified.gameRevision)||verified.gameRevision<1||
    !/^[a-f0-9]{64}$/.test(verified.sourceHash))
    throw Error('guild_pve_v8_invalid_trusted_actor');
   const seed=checksum(this.eventId,this.id,cmd.accountId,cmd.characterId,
    cmd.requestId,cmd.nodeId,verified.sourceHash,String(verified.gameRevision));
   combat=previewBrokenForgeAttemptV7({
    player:verified.actor,boss:node.boss!,phase:target.phase!,
    difficulty:this.difficulty,reference:this.reference,
    stance:cmd.stance!,seed
   });
   this.bindings.bind(this.eventId,cmd.accountId,this.id);
   // V7 is a phase-local 18-second result. The guild ledger is the true HP
   // remaining: overkill and damage to a full phase-local guardian never
   // produce more than the real remaining shared node HP.
   target.hp=round(Math.max(0,target.hp-Math.min(target.hp,combat.bossHpRemoved)));
   const phases=GUILD_PVE_V7_PHASES[node.boss!];
   const beforeIndex=phases.indexOf(target.phase!);
   const after=target.hp===0?phases[2]:this.currentPhase(node,target.hp,target.maxHp)!;
   const afterIndex=phases.indexOf(after);
   transitions=phases.slice(beforeIndex+1,afterIndex+1);
   for(const p of transitions)if(!target.triggered.includes(p))target.triggered.push(p);
   target.phase=after;
   target.cleared=target.hp<=0;
   const rawPressure=cmd.stance==='Assault'?15:cmd.stance==='Guard'?-12:-8;
   const warDrums=cmd.nodeId==='C3-06'&&cmd.stance==='Assault'&&this.nodes.get('C3-02')!.cleared?3:0;
   this.pressure=clamp(this.pressure+rawPressure-4-warDrums,0,100);
   usage.seals++;
  }else{
   this.bindings.bind(this.eventId,cmd.accountId,this.id);
   // Explorations are one immutable Order in this V8 emulator. They unlock
   // future side effects in V9 but do not fabricate damage or supplies here.
   target.cleared=true;
   usage.orders++;
  }
  // Registry is an in-process demonstration, not a DB uniqueness guarantee.
  this.usage.set(cmd.accountId,usage);
  this.revision++;
  return store(makeReceipt('committed',combat,transitions));
 }
 async commit(cmd:GuildPveV8Action,nowUtcMs:number):Promise<GuildPveV8Receipt>{
  // Sequentializes one emulator instance. Never claim multi-server safety.
  const task=this.mutex.then(()=>this.process(cmd,nowUtcMs));
  this.mutex=task.then(()=>undefined,()=>undefined);
  return task;
 }
 snapshot(nowUtcMs:number){
  const half=nowUtcMs<this.startUtcMs+7*DAY?0:1;
  const statuses=GUILD_PVE_V8_MANIFEST.map(n=>{
   const row=this.nodes.get(n.id)!;
   return {id:n.id,name:n.name,kind:n.kind,required:n.required,
    supported:isBattle(n)||n.kind==='explore'||n.kind==='dual'||n.kind==='start',
    state:row.cleared?'cleared':this.reachable(n)?'ready':'locked',
    hp:row.hp,maxHp:row.maxHp,phase:row.phase,transitions:[...row.triggered]};
  });
  return structuredClone({eventId:this.eventId,guildId:this.id,difficulty:this.difficulty,
   revision:this.revision,pressure:this.pressure,memberCount:this.members.size,
   startUtcMs:this.startUtcMs,endUtcMs:this.endUtcMs,
   timeStatus:nowUtcMs<this.startUtcMs?'upcoming':nowUtcMs>=this.endUtcMs?'closed':'active',
   maxSeals:GUILD_PVE_V8_SEAL_CEILINGS[half],maxOrders:GUILD_PVE_V8_ORDER_CEILINGS[half],
   members:Object.fromEntries([...this.members].map(id=>[id,this.usage.get(id)??{seals:0,orders:0}])),
   nodes:statuses,
   receipts:this.results.size,rewardGranted:false,serverPersisted:false});
 }
}
