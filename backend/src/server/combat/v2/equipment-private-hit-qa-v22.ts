/** Private QA-only conditional execution. No ownership, mint or release authority.
 * V22 current-hit, V23 one-use charge, V24 incoming mitigation. Exact source IDs only.
 */
import type {CombatInput} from '../types';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
const policy='eq2-v22-private-current-hit-qa' as const;
const brand:unique symbol=Symbol(policy);
export type Eq2PrivateHitAuthorityV22=Readonly<{readonly [brand]:true}>;
const specs=Object.freeze({
 'EQ2_DUNGEON_ROOTBOUND_T2_WEAPON_RAVAGER':{pct:7,below:.35,cd:20000,physical:false,family:'winterbreaker'},
 'EQ2_DUNGEON_OBSERVATORY_T4_WEAPON_RAVAGER':{pct:7,below:.35,cd:20000,physical:false,family:'winterbreaker'},
 'EQ2_DUNGEON_SHIVERLAKE_T5_WEAPON_RAVAGER':{pct:7,below:.35,cd:20000,physical:false,family:'winterbreaker'},
 'eq2_t5_avalanche:6':{pct:8,below:.30,cd:20000,physical:true,family:'avalanche'},
} as const);
const chargeSpecs=Object.freeze({
 'eq2_t5_avalanche:4':{pct:6,window:6000,cd:16000,trigger:'physical',consume:'basic',count:1,family:'avalanche_follow_through'},
 'eq2_combo_t5_glacier_talons:2':{pct:6,window:5000,cd:14000,trigger:'physical',consume:'basic',count:1,family:'glacier_talons'},
 'eq2_dungeon_rootbound_t2_thornstrider:4':{pct:6,window:6000,cd:18000,trigger:'class',consume:'class',count:2,family:'thornstrider'},
} as const);
const defensiveSpecs=Object.freeze({
 'eq2_dungeon_observatory_t4_helioguard:4':{pct:5,threshold:.06,window:6000,cd:20000,mode:'next_hit',family:'helioguard'},
 'eq2_combo_t5_stonewinter_frame:2':{pct:4,threshold:.06,window:6000,cd:18000,mode:'next_hit',family:'stonewinter'},
 'eq2_dungeon_shiverlake_t5_rimevanguard:4':{pct:6,threshold:.07,window:5000,cd:22000,mode:'timed',family:'rimevanguard'},
} as const);
type DefensiveId=keyof typeof defensiveSpecs;
type CurrentId=keyof typeof specs;
type ChargeId=keyof typeof chargeSpecs;
export type Eq2PrivateHitIdV22=CurrentId|ChargeId|DefensiveId;
const isCurrent=(id:Eq2PrivateHitIdV22):id is CurrentId=>Object.hasOwn(specs,id);
const isCharge=(id:Eq2PrivateHitIdV22):id is ChargeId=>Object.hasOwn(chargeSpecs,id);
const isDefensive=(id:Eq2PrivateHitIdV22):id is DefensiveId=>Object.hasOwn(defensiveSpecs,id);
const family=(id:Eq2PrivateHitIdV22)=>isCurrent(id)?specs[id].family:isCharge(id)?chargeSpecs[id].family:defensiveSpecs[id as DefensiveId].family;
type Scope={digest:string;actorId:string;ids:readonly Eq2PrivateHitIdV22[]};
const issued=new WeakMap<object,Scope>();
const fail=(x:string):never=>{throw Error('eq2_private_hit_v22_'+x);};
export function issueEq2PrivateHitQaV22(input:CombatInput,actorId:string,ids:readonly Eq2PrivateHitIdV22[],verifyFixture:(digest:string)=>boolean):Eq2PrivateHitAuthorityV22{
 if(!Array.isArray(ids))fail('fixture_scope');
 const actor=input.players.find(x=>x.id===actorId);
 if(!actor||actor.combatV2?.version!==2||actor.team!=='players'||!((actor.id.startsWith('QA_EQ2_RAVAGER_')&&ids.every(id=>!isDefensive(id)))||(actor.id.startsWith('QA_EQ2_IRONWARDEN_')&&ids.every(isDefensive)))||
 input.players.length!==1||input.enemyDamageProfile!==undefined||input.initialPlayerState!==undefined||
 !Array.isArray(ids)||ids.length<1||ids.length>4||ids.some(id=>!isCurrent(id)&&!isCharge(id)&&!isDefensive(id))||
 new Set(ids.map(family)).size!==ids.length)fail('fixture_scope');
 const digest=enemyV2SnapshotDigest(input);
 if(typeof verifyFixture!=='function'||verifyFixture(digest)!==true)fail('fixture_unverified');
 const token=Object.freeze({[brand]:true}) as Eq2PrivateHitAuthorityV22;
 issued.set(token,{digest,actorId,ids:Object.freeze([...ids])});
 return token;
}
export interface Eq2PrivateHitEventV22{
 now:number;actorId:string;targetId:string;abilityId:string;originalClassAbility:boolean;
 direct:boolean;physical:boolean;nontrue:boolean;sourceAlive:boolean;targetAlive:boolean;
 targetHp:number;targetMaxHp:number;shield:number;raw:number;
}
export type Eq2PrivateIncomingEventV24=Omit<Eq2PrivateHitEventV22,'originalClassAbility'>&{originalEnemyAbility:boolean};
export interface Eq2PrivateIncomingResultV24{raw:number;activated:readonly DefensiveId[];reductionPct:number}
export interface Eq2PrivateHitResultV22{raw:number;activated:readonly Eq2PrivateHitIdV22[];bonusPct:number}
export function authorizeEq2PrivateHitQaV22(input:CombatInput,authority?:Eq2PrivateHitAuthorityV22){
 if(authority===undefined)return undefined;
 const scope=typeof authority==='object'&&authority!==null?issued.get(authority):undefined;
 if(!scope||scope.digest!==enemyV2SnapshotDigest(input))return fail('invalid_authority');
 const cooldown=new Map<string,number>();
 const defensiveState=new Map<DefensiveId,{earnedAt:number;expiresAt:number}>();
 const incomingBefore=new WeakSet<Eq2PrivateIncomingEventV24>();
 const incomingAfter=new WeakSet<Eq2PrivateIncomingEventV24>();
 const eligibleIncoming=(e:Eq2PrivateIncomingEventV24)=>e.targetId===scope.actorId&&e.actorId!==e.targetId&&
  e.originalEnemyAbility&&e.nontrue&&e.sourceAlive&&e.targetAlive&&
  !/^(V2_|GEM_|COMPANION_)/.test(e.abilityId)&&Number.isSafeInteger(e.now)&&e.now>=0&&
  [e.targetHp,e.targetMaxHp,e.shield,e.raw].every(n=>Number.isFinite(n)&&n>=0)&&
  e.targetMaxHp>0&&e.targetHp>0&&e.targetHp<=e.targetMaxHp&&e.raw>0;
 const charges=new Map<ChargeId,{earnedAt:number;expiresAt:number;targetId:string}>();
 const streak=new Map<ChargeId,{targetId:string;count:number;at:number}>();
 // Engine phase receipt is object identity, minted per actual hit. Each phase
 // may run once. Do not accept caller-constructed replayed post-hit events.
 const beforeReceipts=new WeakSet<Eq2PrivateHitEventV22>();
 const afterReceipts=new WeakSet<Eq2PrivateHitEventV22>();
 const eligible=(e:Eq2PrivateHitEventV22)=>e.actorId===scope.actorId&&e.actorId!==e.targetId&&e.direct&&
  (e.originalClassAbility||e.abilityId==='BASIC')&&e.nontrue&&e.sourceAlive&&e.targetAlive&&
  !/^(V2_|GEM_|COMPANION_)/.test(e.abilityId)&&Number.isSafeInteger(e.now)&&e.now>=0&&
  [e.targetHp,e.targetMaxHp,e.shield,e.raw].every(n=>Number.isFinite(n)&&n>=0)&&
  e.targetMaxHp>0&&e.targetHp>0&&e.targetHp<=e.targetMaxHp&&e.raw>e.shield;
 const classHit=(e:Eq2PrivateHitEventV22)=>e.originalClassAbility&&e.abilityId!=='BASIC';
 return {
  beforeIncomingHit(e:Eq2PrivateIncomingEventV24):Eq2PrivateIncomingResultV24{
   const unchanged={raw:e.raw,activated:[],reductionPct:0};
   if(!eligibleIncoming(e)||incomingBefore.has(e))return unchanged;
   incomingBefore.add(e);
   const active=scope.ids.filter(isDefensive).filter(id=>{
    const state=defensiveState.get(id),s=defensiveSpecs[id];
    if(!state)return false;
    if(e.now>=state.expiresAt){defensiveState.delete(id);return false;}
    return e.now>state.earnedAt&&(s.mode==='timed'||(e.direct&&e.raw>e.shield));
   }).sort((a,b)=>defensiveSpecs[b].pct-defensiveSpecs[a].pct||a.localeCompare(b));
   const chosen=active[0];
   if(!chosen)return unchanged;
   const s=defensiveSpecs[chosen],reductionPct=Math.min(15,s.pct);
   if(s.mode==='next_hit')defensiveState.delete(chosen);
   return {raw:e.raw*(1-reductionPct/100),activated:[chosen],reductionPct};
  },
  afterIncomingHit(e:Eq2PrivateIncomingEventV24,actualHpLoss:number):readonly DefensiveId[]{
   if(!incomingBefore.has(e)||incomingAfter.has(e))return [];
   incomingAfter.add(e);
   if(!eligibleIncoming(e)||!e.direct||!Number.isFinite(actualHpLoss)||actualHpLoss<=0||actualHpLoss>=e.targetHp)return [];
   const earned:DefensiveId[]=[];
   for(const id of scope.ids.filter(isDefensive)){
    const s=defensiveSpecs[id],state=defensiveState.get(id);
    if(state&&e.now>=state.expiresAt)defensiveState.delete(id);
    if(defensiveState.has(id)||e.now<(cooldown.get(s.family)??0)||actualHpLoss/e.targetMaxHp<s.threshold)continue;
    defensiveState.set(id,{earnedAt:e.now,expiresAt:e.now+s.window});
    cooldown.set(s.family,e.now+s.cd);
    earned.push(id);
   }
   return earned;
  },
  miss(actorId:string,abilityId:string){
   if(actorId!==scope.actorId||abilityId==='BASIC'||/^(V2_|GEM_|COMPANION_)/.test(abilityId))return;
   for(const id of scope.ids.filter(isCharge))if(chargeSpecs[id].count>1)streak.delete(id);
  },
  beforeDirectHit(e:Eq2PrivateHitEventV22):Eq2PrivateHitResultV22{
   const unchanged={raw:e.raw,activated:[],bonusPct:0};
   if(!eligible(e)||beforeReceipts.has(e))return unchanged;
   beforeReceipts.add(e);
   const current=scope.ids.filter(isCurrent).filter(id=>{const s=specs[id];return classHit(e)&&e.targetHp/e.targetMaxHp<s.below&&(!s.physical||e.physical)&&e.now>=(cooldown.get(s.family)??0);});
   const consumed=scope.ids.filter(isCharge).filter(id=>{
    const ch=charges.get(id),s=chargeSpecs[id];
    if(!ch)return false;
    if(e.now>=ch.expiresAt){charges.delete(id);return false;}
    // At same simulation timestamp, even another component of a multi-hit
    // ability cannot spend the newly earned charge. No miss/absorbed consumption.
    return e.now>ch.earnedAt&&(s.consume==='basic'?e.abilityId==='BASIC'&&e.physical:classHit(e)&&e.targetId===ch.targetId);
   });
   const active:Eq2PrivateHitIdV22[]=[...current,...consumed];
   const bonusPct=Math.min(20,current.reduce((n,id)=>n+specs[id].pct,0)+consumed.reduce((n,id)=>n+chargeSpecs[id].pct,0));
   for(const id of current)cooldown.set(specs[id].family,e.now+specs[id].cd);
   for(const id of consumed)charges.delete(id);
   return {raw:e.raw*(1+bonusPct/100),activated:active,bonusPct};
  },
  afterDirectHit(e:Eq2PrivateHitEventV22,actualHpLoss:number):readonly ChargeId[]{
   if(!beforeReceipts.has(e)||afterReceipts.has(e))return [];
   afterReceipts.add(e);
   if(!eligible(e)||!classHit(e)||!Number.isFinite(actualHpLoss)||actualHpLoss<=0||actualHpLoss>e.targetHp)return [];
   const earned:ChargeId[]=[];
   for(const id of scope.ids.filter(isCharge)){
    const s=chargeSpecs[id],ch=charges.get(id);
    if(ch&&e.now>=ch.expiresAt)charges.delete(id);
    if(charges.has(id)||e.now<(cooldown.get(s.family)??0))continue;
    if(s.trigger==='physical'&&!e.physical)continue;
    if(s.count>1){
     const prior=streak.get(id);
     if(prior?.at===e.now)continue; // one qualifying action per tick, conservative
     const count=prior?.targetId===e.targetId?prior.count+1:1;
     if(count<s.count){streak.set(id,{targetId:e.targetId,count,at:e.now});continue;}
     streak.delete(id);
    }
    cooldown.set(s.family,e.now+s.cd);
    charges.set(id,{earnedAt:e.now,expiresAt:e.now+s.window,targetId:e.targetId});
    earned.push(id);
   }
   return earned;
  },
 };
}
