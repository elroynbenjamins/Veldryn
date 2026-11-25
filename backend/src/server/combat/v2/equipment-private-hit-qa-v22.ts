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
 'eq2_t5_rimewatch:6':{pct:6,threshold:0,window:4000,cd:30000,mode:'timed',family:'weather_the_break'},
} as const);
const timedSpecs=Object.freeze({
 'eq2_t1_oathplate:4':{channel:'defense',pct:3.2,window:6000,cd:18000,trigger:'hp_loss',threshold:.05,family:'oathplate'},
 'eq2_t2_oathplate:4':{channel:'defense',pct:3.6,window:6000,cd:18000,trigger:'hp_loss',threshold:.05,family:'oathplate'},
 'eq2_t3_oathplate:4':{channel:'defense',pct:4,window:6000,cd:18000,trigger:'hp_loss',threshold:.05,family:'oathplate'},
 'eq2_t4_oathplate:4':{channel:'defense',pct:4.4,window:6000,cd:18000,trigger:'hp_loss',threshold:.05,family:'oathplate'},
 'eq2_t5_oathplate:4':{channel:'defense',pct:4,window:6000,cd:16000,trigger:'hp_loss',threshold:.05,family:'oathplate'},
 'EQ2_DUNGEON_ROOTBOUND_T2_WEAPON_IRONWARDEN':{channel:'defense',pct:4,window:5000,cd:20000,trigger:'mitigated',threshold:0,family:'oathguard_riposte'},
 'EQ2_DUNGEON_OBSERVATORY_T4_WEAPON_IRONWARDEN':{channel:'defense',pct:4,window:5000,cd:20000,trigger:'mitigated',threshold:0,family:'oathguard_riposte'},
 'EQ2_DUNGEON_SHIVERLAKE_T5_WEAPON_IRONWARDEN':{channel:'defense',pct:4,window:5000,cd:20000,trigger:'mitigated',threshold:0,family:'oathguard_riposte'},
 'eq2_t4_bastionmail:4':{channel:'defense',pct:4,window:5000,cd:14000,trigger:'mitigated',threshold:0,family:'braced_formation'},
 'eq2_combo_t5_runeforge_link:2':{channel:'haste',pct:2,window:6000,cd:18000,trigger:'hit_or_heal',threshold:0,family:'runeforge_momentum'},
} as const);
// Source-authored self shields only. Hybrid Bellwake and ally/cleanse
// shields require their other outputs/target provenance before execution.
const shieldSpecs=Object.freeze({
 'eq2_t1_citadel:4':{pct:3.2,threshold:.06,window:6000,cd:24000,trigger:'loss',family:'citadel_shield'},
 'eq2_t2_citadel:4':{pct:3.6,threshold:.06,window:6000,cd:24000,trigger:'loss',family:'citadel_shield'},
 'eq2_t3_citadel:4':{pct:4,threshold:.06,window:6000,cd:24000,trigger:'loss',family:'citadel_shield'},
 'EQ2_SET_GLASSBOUND_BULWARK:4':{pct:4.5,threshold:.06,window:6000,cd:22000,trigger:'loss',family:'glassbound_bulwark'},
 'eq2_dungeon_rootbound_t2_heartward:4':{pct:4,threshold:.06,window:6000,cd:22000,trigger:'loss',family:'heartward'},
 'eq2_rare_t5_citadel:4':{pct:6,threshold:.08,window:6000,cd:18000,trigger:'loss',family:'citadel_shield'},
 'eq2_t4_bastionmail:6':{pct:5,threshold:.35,window:6000,cd:35000,trigger:'cross_below',family:'hold_the_line'},
 'eq2_t5_rimewatch:4':{pct:4,threshold:.50,window:6000,cd:24000,trigger:'below_before',family:'rimeguard'},
} as const);
const supportSpecs=Object.freeze({
 'eq2_t1_brightweave:4':{channel:'shield',pct:2.4,window:6000,cd:20000,family:'brightweave'},
 'eq2_t2_brightweave:4':{channel:'shield',pct:2.7,window:6000,cd:20000,family:'brightweave'},
 'eq2_t3_brightweave:4':{channel:'shield',pct:3,window:6000,cd:20000,family:'brightweave'},
 'eq2_t4_brightweave:4':{channel:'shield',pct:3.3,window:6000,cd:20000,family:'brightweave'},
 'eq2_rare_t5_dawnspire:4':{channel:'shield',pct:5,window:6000,cd:20000,family:'sanctuary_thread'},
 'eq2_t5_dawnweave:4':{channel:'shield',pct:3,window:6000,cd:18000,family:'soft_refuge'},
 'eq2_dungeon_rootbound_t2_lifebloom:4':{channel:'defense',pct:3,window:6000,cd:20000,family:'lifebloom'},
 'eq2_combo_t5_dawnmender_chain:2':{channel:'defense',pct:3,window:6000,cd:18000,family:'comforting_thread'},
} as const);
type SupportId=keyof typeof supportSpecs;
type ShieldId=keyof typeof shieldSpecs;
type TimedId=keyof typeof timedSpecs;
type DefensiveId=keyof typeof defensiveSpecs;
type CurrentId=keyof typeof specs;
type ChargeId=keyof typeof chargeSpecs;
export type Eq2PrivateHitIdV22=CurrentId|ChargeId|DefensiveId|TimedId|ShieldId|SupportId;
const isCurrent=(id:unknown):id is CurrentId=>typeof id==='string'&&Object.hasOwn(specs,id);
const isCharge=(id:unknown):id is ChargeId=>typeof id==='string'&&Object.hasOwn(chargeSpecs,id);
const isDefensive=(id:unknown):id is DefensiveId=>typeof id==='string'&&Object.hasOwn(defensiveSpecs,id);
const isTimed=(id:unknown):id is TimedId=>typeof id==='string'&&Object.hasOwn(timedSpecs,id);
const isShield=(id:unknown):id is ShieldId=>typeof id==='string'&&Object.hasOwn(shieldSpecs,id);
const isSupport=(id:unknown):id is SupportId=>typeof id==='string'&&Object.hasOwn(supportSpecs,id);
const family=(id:Eq2PrivateHitIdV22)=>isCurrent(id)?specs[id].family:isCharge(id)?chargeSpecs[id].family:isDefensive(id)?defensiveSpecs[id].family:isTimed(id)?timedSpecs[id].family:isShield(id)?shieldSpecs[id].family:supportSpecs[id as SupportId].family;
type Scope={digest:string;actorId:string;ids:readonly Eq2PrivateHitIdV22[];supportOnly:boolean;playerMaxHp:ReadonlyMap<string,number>};
const issued=new WeakMap<object,Scope>();
const fail=(x:string):never=>{throw Error('eq2_private_hit_v22_'+x);};
export function issueEq2PrivateHitQaV22(input:CombatInput,actorId:string,ids:readonly Eq2PrivateHitIdV22[],verifyFixture:(digest:string)=>boolean):Eq2PrivateHitAuthorityV22{
 // Array.isArray narrows to any[] in TypeScript; revalidate every unknown
 // element and retain a typed readonly copy before indexing any source table.
 const supplied:unknown=ids;
 if(!Array.isArray(supplied))return fail('fixture_scope');
 const rawIds:readonly unknown[]=supplied;
 const allowedId=(id:unknown):id is Eq2PrivateHitIdV22=>isCurrent(id)||isCharge(id)||isDefensive(id)||isTimed(id)||isShield(id)||isSupport(id);
 const exactIds=rawIds.filter(allowedId);
 if(exactIds.length!==rawIds.length||exactIds.length<1||exactIds.length>4||
    new Set(exactIds.map(family)).size!==exactIds.length||
    (exactIds.includes('eq2_t5_rimewatch:6')&&!exactIds.includes('eq2_t5_rimewatch:4')))return fail('fixture_scope');
 const actor=input.players.find(x=>x.id===actorId);
 const supportOnly=exactIds.every(isSupport);
 const playerMaxHp=new Map(input.players.map(p=>[p.id,p.stats.maxHp]));
 if(!actor||actor.combatV2?.version!==2||actor.team!=='players'||
 input.enemyDamageProfile!==undefined||input.initialPlayerState!==undefined)return fail('fixture_scope');
 if(supportOnly){
  // Verified V2 actors retain the launch display-name class identity, while
  // isolated QA fixtures use the canonical enum. Accept only exact aliases.
  const supportClass=actor.classId==='DAWNKEEPER'||actor.classId==='Dawnkeeper'?'DAWNKEEPER':
   actor.classId==='STONECALLER'||actor.classId==='Stonecaller'?'STONECALLER':null;
  if(actor.role!=='support'||!supportClass||
   !actor.id.startsWith('QA_EQ2_'+supportClass+'_')||input.players.length<1||input.players.length>4||
   playerMaxHp.size!==input.players.length||input.players.some(p=>p.team!=='players'||p.combatV2?.version!==2||
   !p.id.startsWith('QA_EQ2_')||!Number.isFinite(p.stats.maxHp)||p.stats.maxHp<=0))return fail('fixture_scope');
 }else if(input.players.length!==1||!((actor.id.startsWith('QA_EQ2_RAVAGER_')&&exactIds.every(id=>isCurrent(id)||isCharge(id)||id==='eq2_combo_t5_runeforge_link:2'))||
 (actor.id.startsWith('QA_EQ2_IRONWARDEN_')&&exactIds.every(id=>isDefensive(id)||isTimed(id)||isShield(id)))||
 (actor.id.startsWith('QA_EQ2_DAWNKEEPER_')&&exactIds.every(id=>id==='eq2_combo_t5_runeforge_link:2'))))return fail('fixture_scope');
 const digest=enemyV2SnapshotDigest(input);
 if(typeof verifyFixture!=='function'||verifyFixture(digest)!==true)fail('fixture_unverified');
 const token=Object.freeze({[brand]:true}) as Eq2PrivateHitAuthorityV22;
 issued.set(token,{digest,actorId,ids:Object.freeze(exactIds),supportOnly,playerMaxHp});
 return token;
}
export interface Eq2PrivateHitEventV22{
 now:number;actorId:string;targetId:string;abilityId:string;originalClassAbility:boolean;
 direct:boolean;physical:boolean;nontrue:boolean;sourceAlive:boolean;targetAlive:boolean;
 targetHp:number;targetMaxHp:number;shield:number;raw:number;
}
export type Eq2PrivateIncomingEventV24=Omit<Eq2PrivateHitEventV22,'originalClassAbility'>&{originalEnemyAbility:boolean;mitigated?:boolean};
export interface Eq2PrivateSupportHealEventV28{
 now:number;actorId:string;targetId:string;abilityId:string;originalClassHeal:boolean;direct:boolean;
 sourceAlive:boolean;targetAlive:boolean;targetHpBefore:number;targetMaxHp:number;actualHeal:number;
}
type SupportShieldState={id:SupportId;ownerId:string;earnedAt:number;expiresAt:number;remaining:number};
type SupportDefenseState={id:SupportId;earnedAt:number;expiresAt:number;pct:number};
export type Eq2PrivateSupportGrantV28=
 {channel:'shield';id:SupportId;amount:number;expiresAt:number;replaced?:{id:SupportId;remaining:number}}|
 {channel:'defense';id:SupportId;pct:number;expiresAt:number};
export interface Eq2PrivateIncomingResultV24{raw:number;activated:readonly DefensiveId[];reductionPct:number}
export interface Eq2PrivateHitResultV22{raw:number;activated:readonly Eq2PrivateHitIdV22[];bonusPct:number}
export function authorizeEq2PrivateHitQaV22(input:CombatInput,authority?:Eq2PrivateHitAuthorityV22){
 if(authority===undefined)return undefined;
 const scope=typeof authority==='object'&&authority!==null?issued.get(authority):undefined;
 if(!scope||scope.digest!==enemyV2SnapshotDigest(input))return fail('invalid_authority');
 const cooldown=new Map<string,number>();
 let shieldState:{id:ShieldId;ownerId:string;earnedAt:number;expiresAt:number;remaining:number}|undefined;
 const supportShields=new Map<string,SupportShieldState>();
 const supportDefense=new Map<string,SupportDefenseState>();
 const supportHealReceipts=new WeakSet<Eq2PrivateSupportHealEventV28>();
 const shieldAbsorbed=new WeakSet<Eq2PrivateIncomingEventV24>();
 const shieldGranted=new WeakSet<Eq2PrivateIncomingEventV24>();
 const namedDirectBreaks=new WeakSet<Eq2PrivateIncomingEventV24>();
 const shieldFor=(ownerId:string)=>scope.supportOnly?supportShields.get(ownerId):shieldState?.ownerId===ownerId?shieldState:undefined;
 const shieldAvailable=(ownerId:string,now:number)=>{const state=shieldFor(ownerId);return state&&now>state.earnedAt&&now<state.expiresAt?state.remaining:0;};
 const timedState=new Map<TimedId,{earnedAt:number;expiresAt:number}>();
 const healReceipts=new WeakSet<object>();
 const earnTimed=(id:TimedId,now:number)=>{
  const s=timedSpecs[id],state=timedState.get(id);
  if(now<(cooldown.get(s.family)??0)||(state&&now<state.expiresAt))return false;
  cooldown.set(s.family,now+s.cd);timedState.set(id,{earnedAt:now,expiresAt:now+s.window});return true;
 };
 const timedValue=(actorId:string,now:number,channel:'defense'|'haste')=>{
  if(!Number.isSafeInteger(now)||now<0)return {pct:0,ids:[] as (TimedId|SupportId)[]};
  if(scope.supportOnly){
   const state=channel==='defense'?supportDefense.get(actorId):undefined;
   return state&&now>state.earnedAt&&now<state.expiresAt?{pct:state.pct,ids:[state.id]}:{pct:0,ids:[] as SupportId[]};
  }
  if(actorId!==scope.actorId)return {pct:0,ids:[] as TimedId[]};
  const active=scope.ids.filter(isTimed).filter(id=>{
   const s=timedSpecs[id],state=timedState.get(id);
   return s.channel===channel&&state!==undefined&&now>state.earnedAt&&now<state.expiresAt;
  }).sort((a,b)=>timedSpecs[b].pct-timedSpecs[a].pct||a.localeCompare(b));
  return active.length?{pct:timedSpecs[active[0]].pct,ids:[active[0]]}:{pct:0,ids:[] as TimedId[]};
 };
 const defensiveState=new Map<DefensiveId,{earnedAt:number;expiresAt:number}>();
 const incomingBefore=new WeakSet<Eq2PrivateIncomingEventV24>();
 const incomingAfter=new WeakSet<Eq2PrivateIncomingEventV24>();
 const eligibleIncoming=(e:Eq2PrivateIncomingEventV24)=>(scope.supportOnly?scope.playerMaxHp.get(e.targetId)===e.targetMaxHp:e.targetId===scope.actorId)&&e.actorId!==e.targetId&&
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
  shieldAvailable,
  expireShield(now:number){
   if(shieldState&&now>=shieldState.expiresAt){const expired={...shieldState};shieldState=undefined;return expired;}
   for(const [ownerId,state] of supportShields)if(now>=state.expiresAt){supportShields.delete(ownerId);return {...state};}
   return undefined;
  },
  absorbShield(e:Eq2PrivateIncomingEventV24,unabsorbed:number){
   if(!incomingBefore.has(e)||shieldAbsorbed.has(e)||!eligibleIncoming(e)||!Number.isFinite(unabsorbed)||unabsorbed<0)return undefined;
   shieldAbsorbed.add(e);
   const state=shieldFor(e.targetId);
   if(unabsorbed===0||!state||!shieldAvailable(e.targetId,e.now))return undefined;
   const amount=Math.min(unabsorbed,state.remaining),id=state.id;
   state.remaining-=amount;
   const broken=state.remaining<=0;
   if(broken){
    if(id==='eq2_t5_rimewatch:4'&&e.direct)namedDirectBreaks.add(e);
    if(scope.supportOnly)supportShields.delete(e.targetId);else shieldState=undefined;
   }
   return {id,amount,broken};
  },
  afterShieldHit(e:Eq2PrivateIncomingEventV24,actualHpLoss:number){
   if(scope.supportOnly||!incomingAfter.has(e)||!shieldAbsorbed.has(e)||shieldGranted.has(e))return undefined;
   shieldGranted.add(e);
   if(!eligibleIncoming(e)||!e.direct||!Number.isFinite(actualHpLoss)||actualHpLoss<=0||actualHpLoss>=e.targetHp)return undefined;
   if(shieldState&&e.now>=shieldState.expiresAt)shieldState=undefined;
   const afterHp=e.targetHp-actualHpLoss;
   const candidates=scope.ids.filter(isShield).filter(id=>{
    const s=shieldSpecs[id];
    if(e.now<(cooldown.get(s.family)??0)||shieldState?.id===id)return false;
    if(s.trigger==='loss')return actualHpLoss/e.targetMaxHp>=s.threshold;
    if(s.trigger==='cross_below')return e.targetHp/e.targetMaxHp>=s.threshold&&afterHp/e.targetMaxHp<s.threshold;
    return e.targetHp/e.targetMaxHp<s.threshold;
   }).sort((a,b)=>shieldSpecs[b].pct-shieldSpecs[a].pct||a.localeCompare(b));
   const id=candidates[0];
   if(!id)return undefined;
   const s=shieldSpecs[id],amount=e.targetMaxHp*s.pct/100;
   // One equipment-only shield slot. Never add to or consume the existing
   // class/gem shield pool. Stronger remaining pool wins; only a real grant
   // spends its cooldown. A replacement is not a shield break.
   if(shieldState&&amount<=shieldState.remaining)return undefined;
   const replaced=shieldState?{id:shieldState.id,remaining:shieldState.remaining}:undefined;
   shieldState={id,ownerId:e.targetId,earnedAt:e.now,expiresAt:e.now+s.window,remaining:amount};
   cooldown.set(s.family,e.now+s.cd);
   return {id,amount,expiresAt:shieldState.expiresAt,replaced};
  },
  timedStat(actorId:string,now:number,channel:'defense'|'haste'){return timedValue(actorId,now,channel);},
  afterSupportHeal(e:Eq2PrivateSupportHealEventV28):readonly Eq2PrivateSupportGrantV28[]{
   if(!scope.supportOnly||supportHealReceipts.has(e)||e.actorId!==scope.actorId||
     !e.direct||!e.originalClassHeal||!e.sourceAlive||!e.targetAlive||
     /^(V2_|GEM_|COMPANION_)/.test(e.abilityId)||!e.abilityId||
     !Number.isSafeInteger(e.now)||e.now<0||scope.playerMaxHp.get(e.targetId)!==e.targetMaxHp||
     ![e.targetHpBefore,e.targetMaxHp,e.actualHeal].every(Number.isFinite)||
     e.targetHpBefore<=0||e.targetHpBefore>=e.targetMaxHp||e.actualHeal<=0||
     e.actualHeal>e.targetMaxHp-e.targetHpBefore+1e-9)return [];
   supportHealReceipts.add(e);
   const grants:Eq2PrivateSupportGrantV28[]=[];
   const eligible=scope.ids.filter(isSupport).filter(id=>e.now>=(cooldown.get(supportSpecs[id].family)??0))
    .sort((a,b)=>supportSpecs[b].pct-supportSpecs[a].pct||a.localeCompare(b));
   for(const channel of ['shield','defense'] as const){
    const id=eligible.find(id=>supportSpecs[id].channel===channel);if(!id)continue;
    const s=supportSpecs[id],expiresAt=e.now+s.window;
    if(channel==='shield'){
     let old=supportShields.get(e.targetId);
     if(old&&e.now>=old.expiresAt){supportShields.delete(e.targetId);old=undefined;}
     const amount=e.targetMaxHp*s.pct/100;
     if(old&&(old.id===id||amount<=old.remaining))continue;
     const replaced=old?{id:old.id,remaining:old.remaining}:undefined;
     supportShields.set(e.targetId,{id,ownerId:e.targetId,earnedAt:e.now,expiresAt,remaining:amount});
     grants.push({channel,id,amount,expiresAt,...(replaced?{replaced}:{})});
    }else{
     const old=supportDefense.get(e.targetId);
     if(old&&e.now<old.expiresAt&&s.pct<=old.pct)continue;
     supportDefense.set(e.targetId,{id,earnedAt:e.now,expiresAt,pct:s.pct});
     grants.push({channel,id,pct:s.pct,expiresAt});
    }
    cooldown.set(s.family,e.now+s.cd);
   }
   return grants;
  },
  afterEffectiveHeal(e:{now:number;actorId:string;targetId:string;abilityId:string;originalClassHeal:boolean;actualHeal:number}):readonly TimedId[]{
   if(healReceipts.has(e)||e.actorId!==scope.actorId||!e.originalClassHeal||/^(V2_|GEM_|COMPANION_)/.test(e.abilityId)||
    !Number.isSafeInteger(e.now)||e.now<0||!Number.isFinite(e.actualHeal)||e.actualHeal<=0)return [];
   healReceipts.add(e);
   return scope.ids.filter(isTimed).filter(id=>timedSpecs[id].trigger==='hit_or_heal'&&earnTimed(id,e.now));
  },
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
  afterIncomingHit(e:Eq2PrivateIncomingEventV24,actualHpLoss:number):readonly (DefensiveId|TimedId)[]{
   if(!incomingBefore.has(e)||incomingAfter.has(e))return [];
   incomingAfter.add(e);
   if(!eligibleIncoming(e)||!e.direct||!Number.isFinite(actualHpLoss)||actualHpLoss<0||actualHpLoss>=e.targetHp)return [];
   const earned:(DefensiveId|TimedId)[]=[];
   // A hit that exactly depletes Rimeguard can remove zero HP. The named
   // break receipt, not HP loss or a generic shield amount, is its trigger.
   const breakId='eq2_t5_rimewatch:6' as const;
   if(scope.ids.includes(breakId)&&namedDirectBreaks.has(e)&&e.now>=(cooldown.get(defensiveSpecs[breakId].family)??0)){
    const s=defensiveSpecs[breakId];
    defensiveState.set(breakId,{earnedAt:e.now,expiresAt:e.now+s.window});
    cooldown.set(s.family,e.now+s.cd);earned.push(breakId);
   }
   if(actualHpLoss===0)return earned;
   for(const id of scope.ids.filter(isDefensive)){
    if(id===breakId)continue;
    const s=defensiveSpecs[id],state=defensiveState.get(id);
    if(state&&e.now>=state.expiresAt)defensiveState.delete(id);
    if(defensiveState.has(id)||e.now<(cooldown.get(s.family)??0)||actualHpLoss/e.targetMaxHp<s.threshold)continue;
    defensiveState.set(id,{earnedAt:e.now,expiresAt:e.now+s.window});
    cooldown.set(s.family,e.now+s.cd);
    earned.push(id);
   }
   for(const id of scope.ids.filter(isTimed)){
    const s=timedSpecs[id];
    if((s.trigger==='hp_loss'&&actualHpLoss/e.targetMaxHp>=s.threshold||s.trigger==='mitigated'&&e.mitigated===true)&&earnTimed(id,e.now))earned.push(id);
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
  afterDirectHit(e:Eq2PrivateHitEventV22,actualHpLoss:number):readonly (ChargeId|TimedId)[]{
   if(!beforeReceipts.has(e)||afterReceipts.has(e))return [];
   afterReceipts.add(e);
   if(!eligible(e)||!classHit(e)||!Number.isFinite(actualHpLoss)||actualHpLoss<=0||actualHpLoss>e.targetHp)return [];
   const earned:(ChargeId|TimedId)[]=[];
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
   for(const id of scope.ids.filter(isTimed))if(timedSpecs[id].trigger==='hit_or_heal'&&earnTimed(id,e.now))earned.push(id);
   return earned;
  },
 };
}
