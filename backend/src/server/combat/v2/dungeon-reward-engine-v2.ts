/**
 * HIDDEN, opt-in Dungeon 2.0 reactive effect runtime.
 * No 1.0.x route, no public CombatInput JSON field, no unverified source.
 *
 * Secondary damage / bleed ticks do not re-enter direct-hit, gem, equipment,
 * class passives, resource, lifesteal or other reward-proc pipelines.
 */
import type {CombatInput} from '../types';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import {assertVerifiedDungeonRewardSnapshotV2,type VerifiedDungeonRewardSnapshotV2} from './dungeon-rewards-v2';
import {assertVerifiedDungeonPartyRewardSnapshotV2,
 type VerifiedDungeonPartyRewardSnapshotV2} from './dungeon-reward-party-v2';
import {ReactiveReflectionBudgetV2} from './reactive-reflection-budget';

export const EXECUTABLE_DUNGEON_REWARDS_V2=Object.freeze([
 'ROOM_BOON_BLOODTHIRST','ROOM_BOON_LAST_STAND','ROOM_BOON_CRIPPLING_BLOWS',
 'ROOM_BOON_BURST_WINDOW','RELIC_TEMPORAL_ECHO','RELIC_GLACIAL_CROWN',
 'ROOM_BOON_WARDWEAVE','RELIC_THORNBOUND_AEGIS','RELIC_SOUL_LANTERN',
] as const);
export type ExecutableDungeonRewardIdV2=(typeof EXECUTABLE_DUNGEON_REWARDS_V2)[number];
export const DUNGEON_REWARD_ENGINE_VERSION_V2='dungeon-reward-reactive-hidden-v1' as const;
const recognized=new Set<string>(EXECUTABLE_DUNGEON_REWARDS_V2);
const fail=(what:string):never=>{throw Error('dungeon_v2_engine_'+what);};
const brand:unique symbol=Symbol('dungeon-v2-engine-authority');
export type DungeonRewardEngineAuthorityV2=Readonly<{readonly [brand]:true}>;
interface FrozenRewardScope {
 readonly inputDigest:string; readonly seed:string;
 readonly members:readonly {actorId:string;
  counts:Readonly<Partial<Record<ExecutableDungeonRewardIdV2,number>>>}[];
}
const scopes=new WeakMap<object,FrozenRewardScope>();
const eligible=(abilityId:string)=>abilityId==='BASIC'||(
 !abilityId.startsWith('V2_')&&!abilityId.startsWith('GEM_')&&
 !abilityId.startsWith('COMPANION_'));
const legal=(n:number)=>Number.isFinite(n)&&n>=0;
const round=(n:number)=>Math.round(n*1e6)/1e6;

/** A ledger verifier must independently assert the stored run, owner, actor,
 * revision and room receipts. A fake callback in unit tests is NOT DB proof. */
export function issueDungeonRewardEngineAuthorityV2(
 input:CombatInput,snapshot:VerifiedDungeonRewardSnapshotV2,
 verifyPersisted:(snapshot:VerifiedDungeonRewardSnapshotV2,inputDigest:string)=>boolean,
):DungeonRewardEngineAuthorityV2{
 assertVerifiedDungeonRewardSnapshotV2(input,snapshot,verifyPersisted);
 const counts={} as Record<ExecutableDungeonRewardIdV2,number>;
 for(const receipt of snapshot.receipts){
  const id=receipt.id;
  if(recognized.has(id))
   counts[id as ExecutableDungeonRewardIdV2]=(counts[id as ExecutableDungeonRewardIdV2]??0)+1;
  else if(id.startsWith('ROOM_BOON_')||id.startsWith('RELIC_')){
   // Stat-only and utility rewards are validated by the snapshot compiler;
   // unsupported reactive rewards are specifically rejected there.
  }
 }
 const token=Object.freeze({[brand]:true}) as DungeonRewardEngineAuthorityV2;
 scopes.set(token,Object.freeze({inputDigest:enemyV2SnapshotDigest(input),
  seed:input.seed,members:Object.freeze([{actorId:snapshot.actorId,
   counts:Object.freeze({...counts})}])}));
 return token;
}
/** Party authority remains private to a trusted caller that has already
 * committed the room ledger, four member grants and immutable encounter.
 * No public Live/Q-mode routes issue this token. */
export function issueDungeonRewardPartyEngineAuthorityV2(
 input:CombatInput,snapshot:VerifiedDungeonPartyRewardSnapshotV2,
 verifyPersisted:(snapshot:VerifiedDungeonPartyRewardSnapshotV2,digest:string)=>boolean,
):DungeonRewardEngineAuthorityV2{
 assertVerifiedDungeonPartyRewardSnapshotV2(input,snapshot,verifyPersisted);
 const members=snapshot.grants.map(grant=>{
  const counts={} as Partial<Record<ExecutableDungeonRewardIdV2,number>>;
  for(const receipt of grant.receipts){
   if(recognized.has(receipt.id)){
    const id=receipt.id as ExecutableDungeonRewardIdV2;
    counts[id]=(counts[id]??0)+1;
   }
  }
  return Object.freeze({actorId:grant.actorId,counts:Object.freeze(counts)});
 });
 const token=Object.freeze({[brand]:true}) as DungeonRewardEngineAuthorityV2;
 scopes.set(token,Object.freeze({inputDigest:enemyV2SnapshotDigest(input),
  seed:input.seed,members:Object.freeze(members)}));
 return token;
}
export function authorizeDungeonRewardEngineV2(
 input:CombatInput,token?:DungeonRewardEngineAuthorityV2,
 reflectionBudget=new ReactiveReflectionBudgetV2(),
):DungeonRewardRuntimeV2|undefined{
 if(token===undefined)return undefined;
 if(typeof token!=='object'||!scopes.has(token))fail('not_server_issued');
 const scope=scopes.get(token)!;
 if(scope.inputDigest!==enemyV2SnapshotDigest(input)||scope.seed!==input.seed||
  input.players.length!==scope.members.length||
  input.players.some((p,i)=>p.id!==scope.members[i].actorId||
   p.combatV2?.version!==2)||
  (input.initialPlayerState&&Object.keys(input.initialPlayerState).length>0)||
  input.enemyDamageProfile!==undefined)fail('compiled_encounter_mismatch');
 const first=scope.members[0];
 return new DungeonRewardRuntimeV2(first.actorId,first.counts,
  new Map(scope.members.map(m=>[m.actorId,m.counts])),reflectionBudget);
}
export interface DungeonRewardProcActionV2{
 readonly rewardId:ExecutableDungeonRewardIdV2;
 readonly kind:'bleed'|'buff'|'debuff'|'secondary_damage'|
  'secondary_heal'|'secondary_shield'|'retaliation_damage';
 readonly target:'self'|'enemy'|'ally';
 /** Required for party-generated shielding and healing, never client-supplied. */
 readonly recipientId?:string;
 readonly tag?:'defense_pct'|'healing_received'|'damage_done'|'haste';
 readonly amount:number;
 readonly durationMs?:number;
 readonly tickMs?:number;
}
export class DungeonRewardRuntimeV2{
 private readonly cooldown=new Map<string,number>();
 private readonly lastStandUsed=new Set<string>();
 constructor(readonly actorId:string,
  private readonly counts:Readonly<Partial<Record<ExecutableDungeonRewardIdV2,number>>>,
  private readonly memberCounts:ReadonlyMap<string,
   Readonly<Partial<Record<ExecutableDungeonRewardIdV2,number>>>>=
    new Map([[actorId,counts]]),
  private readonly reflectionBudget=new ReactiveReflectionBudgetV2()){}
 hasMember(actorId:string){return this.memberCounts.has(actorId);}
 private stacks(id:ExecutableDungeonRewardIdV2,actorId:string){
  return this.memberCounts.get(actorId)?.[id]??0;
 }
 private has(id:ExecutableDungeonRewardIdV2,actorId:string){
  return this.stacks(id,actorId)>0;
 }
 private ready(id:ExecutableDungeonRewardIdV2,now:number,ms:number,
  actorId:string,target?:string):boolean{
  const key=actorId+':'+id+':'+(target??actorId),
   previous=this.cooldown.get(key)??-Infinity;
  if(now-previous<ms)return false;
  this.cooldown.set(key,now);return true;
 }
 /** ORIGINAL effective direct player damage to a living enemy ONLY.
  * The caller must attest original ability provenance and exclude generated
  * trait, gem, passive, reflect, DoT or reward events. */
 afterOriginalDirectHit(args:{
  now:number;sourceId:string;targetId:string;abilityId:string;critical:boolean;
  actualHpDamage:number;attackPower:number;targetMaxHp:number;boss:boolean;
 }):readonly DungeonRewardProcActionV2[]{
  const {now,sourceId,targetId,abilityId,critical,actualHpDamage,attackPower,targetMaxHp,boss}=args;
  if(!this.hasMember(sourceId)||!Number.isSafeInteger(now)||now<0||
   !legal(actualHpDamage)||actualHpDamage===0||!legal(attackPower)||
   !legal(targetMaxHp)||targetMaxHp===0||!eligible(abilityId))return [];
  const acts:DungeonRewardProcActionV2[]=[];
  const skill=abilityId!=='BASIC';
  if(critical&&this.has('ROOM_BOON_BLOODTHIRST',sourceId)&&
    this.ready('ROOM_BOON_BLOODTHIRST',now,12000,sourceId,targetId)){
   const tick=round(Math.min(attackPower*.04,targetMaxHp*(boss?.0003:.001)));
   if(tick>0)acts.push({rewardId:'ROOM_BOON_BLOODTHIRST',kind:'bleed',
    target:'enemy',amount:tick,durationMs:3000,tickMs:1000});
  }
  if(this.has('ROOM_BOON_CRIPPLING_BLOWS',sourceId)&&
    this.ready('ROOM_BOON_CRIPPLING_BLOWS',now,18000,sourceId,targetId))
   acts.push({rewardId:'ROOM_BOON_CRIPPLING_BLOWS',kind:'debuff',
    target:'enemy',tag:'defense_pct',amount:boss?-.025:-.04,durationMs:5000});
  if(this.has('RELIC_GLACIAL_CROWN',sourceId)&&
    this.ready('RELIC_GLACIAL_CROWN',now,20000,sourceId,targetId))
   acts.push({rewardId:'RELIC_GLACIAL_CROWN',kind:'debuff',target:'enemy',
    tag:'haste',amount:boss?-.02:-.04,durationMs:4000});
  if(skill&&this.has('ROOM_BOON_BURST_WINDOW',sourceId)&&
    this.ready('ROOM_BOON_BURST_WINDOW',now,25000,sourceId))
   acts.push({rewardId:'ROOM_BOON_BURST_WINDOW',kind:'buff',target:'self',
    tag:'damage_done',amount:.05,durationMs:5000});
  if(skill&&this.has('RELIC_TEMPORAL_ECHO',sourceId)&&
    this.ready('RELIC_TEMPORAL_ECHO',now,30000,sourceId)){
   const stacks=this.stacks('RELIC_TEMPORAL_ECHO',sourceId);
   const bonus=round(Math.min(actualHpDamage*(stacks===2?.06:.04),
     attackPower*.12,targetMaxHp*(boss?.0005:.002)));
   if(bonus>0)acts.push({rewardId:'RELIC_TEMPORAL_ECHO',
    kind:'secondary_damage',target:'enemy',amount:bonus});
  }
  return acts;
 }
 /** After enemy-origin direct HP loss crosses 30%, once per combat.
  * Boss phase hits/telegraphs are explicitly never qualifying inputs. */
 afterOriginalEnemyHit(args:{
  now:number;sourceId:string;targetId:string;abilityId:string;
  hpBeforePct:number;hpAfterPct:number;actualHpDamage:number;boss:boolean;
 }):readonly DungeonRewardProcActionV2[]{
  const {now,sourceId,targetId,abilityId,hpBeforePct,hpAfterPct,actualHpDamage,boss}=args;
  if(!this.hasMember(targetId)||sourceId===targetId||
   !this.has('ROOM_BOON_LAST_STAND',targetId)||this.lastStandUsed.has(targetId)||
   !Number.isSafeInteger(now)||now<0||!legal(actualHpDamage)||
   actualHpDamage===0||!legal(hpBeforePct)||!legal(hpAfterPct)||
   hpBeforePct<=.30||hpAfterPct>.30||hpAfterPct<=0||
   !eligible(abilityId)||(boss&&abilityId!=='BASIC'))return [];
  this.lastStandUsed.add(targetId);
  return [
   {rewardId:'ROOM_BOON_LAST_STAND',kind:'buff',target:'self',
    tag:'defense_pct',amount:.10,durationMs:6000},
   {rewardId:'ROOM_BOON_LAST_STAND',kind:'buff',target:'self',
    tag:'healing_received',amount:.10,durationMs:6000},
  ];
 }
}
