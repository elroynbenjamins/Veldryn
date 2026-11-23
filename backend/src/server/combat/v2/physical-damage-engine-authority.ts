/**
 * HIDDEN / NOT RELEASED: source-bound physical subtype mechanics for Combat 2.0.
 *
 * This module cannot mint or reroll items, change rarity, create player stats,
 * or authorize an account snapshot. The producing Forge bridge must FIRST
 * validate full immutable claim/custody/ledger evidence. A direct QA caller of
 * this issuer is NOT a production auth service. No live route imports this.
 */
import type {CombatInput,CombatantDefinition,PhysicalDamageSubtypeV2} from '../types';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import {v2PinnedPhysicalSubtypeReview} from '../../equipment/equipment-crafting-v2-physical-types-review';
import {v2ServerPiece} from '../../equipment/equipment-crafting-v2-manifest';
import {CLASS_NAMES_V2,SKILL_IDENTITIES_V2,skillIdV2} from './skill-catalog';
import {authorizeAuthoredEnemyPhysicalResistancesV2,type EnemyPhysicalResistanceAuthorityV2} from './enemy-physical-resistance-authority';

const brand:unique symbol=Symbol('combat-v2-authored-physical-types');
export type PhysicalDamageAuthorityV2=Readonly<{readonly [brand]:true}>;
export type PhysicalWeightV2=Readonly<{type:PhysicalDamageSubtypeV2;basisPoints:number}>;
export type PhysicalResistanceV2=Readonly<Record<PhysicalDamageSubtypeV2,number>>;
export type PhysicalOutgoingV2=Readonly<Record<PhysicalDamageSubtypeV2,number>>;
export const PHYSICAL_SUBTYPES_V2=['slashing','piercing','blunt'] as const;
/** REVIEW BALANCE ONLY. Change only under a versioned full Combat 2.0 approval. */
export const PHYSICAL_DAMAGE_POLICY_V2=Object.freeze({
 version:'physical-subtypes-review-v1',
 maxOutgoingBonus:.15,maxResistance:.30,maxVulnerability:.20,
});

export interface FrozenPhysicalEvidenceV2 {
 readonly actorId:string;
 /** SHA256 source digest from the already authenticated frozen Forge compiler. */
 readonly receiptDigest:string;
 readonly items:readonly {readonly instanceId:string;readonly pieceId:string}[];
}
interface IssuedProfile {
 readonly actorId:string;
 readonly pieceId:string|null;
 readonly mode:'physical'|'spell_source'|'physical_staff_strike_only'|'none';
 readonly weights:readonly PhysicalWeightV2[];
 readonly shieldEquipped:boolean;
}
interface Scope {
 readonly digest:string;
 readonly playerIds:readonly string[];
 readonly enemyIds:readonly string[];
 readonly profiles:ReadonlyMap<string,IssuedProfile>;
 readonly resistancesFor?:(enemyId:string)=>PhysicalResistanceV2;
}
const issued=new WeakMap<object,Scope>();
const fail=(suffix:string):never=>{throw Error('combat_v2_physical_subtype_'+suffix);};
const isId=(x:unknown):x is string=>typeof x==='string'&&
 x.length>0&&x.length<=128&&/^[A-Za-z0-9_:.-]+$/.test(x);
const types=new Set<string>(PHYSICAL_SUBTYPES_V2);
const zero:PhysicalResistanceV2=Object.freeze({slashing:0,piercing:0,blunt:0});
const noBonus:PhysicalOutgoingV2=zero;
const unique=(xs:readonly string[])=>new Set(xs).size===xs.length;
const approvedWeights=(xs:readonly PhysicalWeightV2[],mode:IssuedProfile['mode'])=>{
 if(mode==='spell_source'||mode==='none')return xs.length===0;
 return xs.length>=1&&xs.length<=2&&
  unique(xs.map(x=>x.type))&&xs.every(x=>types.has(x.type)&&
   Number.isSafeInteger(x.basisPoints)&&x.basisPoints>0&&x.basisPoints<=10000)&&
  xs.reduce((s,x)=>s+x.basisPoints,0)===10000;
};
const blast=(type:PhysicalDamageSubtypeV2):readonly PhysicalWeightV2[]=>
 Object.freeze([{type,basisPoints:10000}]);

/**
 * Pure, deterministic math: single already-mitigated direct-hit budget.
 * No new hit/crit/RNG. Defender profile is sourced separately from verified
 * Enemy 2.0 kit (currently neutral in the first launch bridge).
 * Fail closed instead of silently clamping forged bonuses or resistances.
 */
export function calculatePhysicalSubtypeV2(
 postPhysicalMitigation:number,
 weights:readonly PhysicalWeightV2[],
 resistance:PhysicalResistanceV2=zero,
 outgoing:PhysicalOutgoingV2=noBonus,
):{damage:number;multiplier:number}{
 if(!Number.isFinite(postPhysicalMitigation)||postPhysicalMitigation<0||
    !approvedWeights(weights,'physical'))fail('invalid_damage_or_weights');
 const keys=Object.keys(resistance),bonuses=Object.keys(outgoing);
 if(keys.length!==3||bonuses.length!==3||
    keys.some(k=>!types.has(k))||bonuses.some(k=>!types.has(k)))
   fail('invalid_profile_keys');
 // Validate ALL typed channels, including unused weights, to reject
 // malformed records before future status/gear integrations use them.
 for(const type of PHYSICAL_SUBTYPES_V2){
  const r=resistance[type],b=outgoing[type];
  if(!Number.isFinite(r)||r< -PHYSICAL_DAMAGE_POLICY_V2.maxVulnerability||
     r>PHYSICAL_DAMAGE_POLICY_V2.maxResistance||
     !Number.isFinite(b)||b<0||b>PHYSICAL_DAMAGE_POLICY_V2.maxOutgoingBonus)
    fail('unapproved_profile_value');
 }
 let factor=0;
 for(const {type,basisPoints} of weights)
  factor+=(basisPoints/10000)*(1+outgoing[type])*(1-resistance[type]);
 return {damage:postPhysicalMitigation*factor,multiplier:factor};
}
const SKILL_OVERRIDES:Readonly<Record<string,{type:PhysicalDamageSubtypeV2;needsShield?:true}>>={
 [skillIdV2('IRONWARDEN','Rune Bash')]:{type:'blunt',needsShield:true},
 [skillIdV2('BASTION','Fortress Rebuff')]:{type:'blunt',needsShield:true},
 [skillIdV2('BASTION','Citadel Slam')]:{type:'blunt',needsShield:true},
 [skillIdV2('RAVAGER','Crush Guard')]:{type:'blunt'},
 [skillIdV2('RAVAGER','Sunder Blow')]:{type:'blunt'},
 [skillIdV2('WAYFINDER','Windshot')]:{type:'piercing'},
 [skillIdV2('WAYFINDER','Heartseeker')]:{type:'piercing'},
 [skillIdV2('KNIFE_DANCER','Scarlet Loop')]:{type:'slashing'},
 [skillIdV2('KNIFE_DANCER','Twin Fang')]:{type:'piercing'},
};
export interface PhysicalSubtypeHitV2{
 readonly damage:number;
 readonly multiplier:number;
 readonly weights:readonly PhysicalWeightV2[];
 readonly sourcePieceId:string;
}
/**
 * Only call AFTER the full real Forge compiler accepted each account's claim
 * ledger, exact item snapshots, equip assignment and locked custody readback.
 * This token is scoped to the exact compiled encounter digest.
 */
export function issueFrozenForgePhysicalAuthorityV2(
 input:CombatInput,evidence:readonly FrozenPhysicalEvidenceV2[],
 enemyProfile?:EnemyPhysicalResistanceAuthorityV2,
):PhysicalDamageAuthorityV2{
 if(!Array.isArray(input.players)||!Array.isArray(input.enemies)||
    !input.players.length||!input.enemies.length||input.players.length>4||
    evidence.length!==input.players.length||
    !unique(input.players.map(x=>x.id))||!unique(input.enemies.map(x=>x.id))||
    !unique([...input.players,...input.enemies].map(x=>x.id)))
   fail('invalid_party_scope');
 const profiles=new Map<string,IssuedProfile>();
 const allInstances=new Set<string>();
 for(const actor of input.players){
  const matches=evidence.filter(e=>e.actorId===actor.id);
  if(matches.length!==1||!actor.combatV2||actor.combatV2.version!==2||
     !actor.tags?.includes('combat-v2-gear-base-resolved'))
   fail('missing_compiled_forge_actor');
  const e=matches[0];
  if(!/^[a-f0-9]{64}$/i.test(e.receiptDigest)||!Array.isArray(e.items)||
     e.items.length<1||e.items.length>10||
     !unique(e.items.map(x=>x.instanceId))||
     e.items.some(x=>!isId(x.instanceId)||!isId(x.pieceId)))
   fail('bad_frozen_evidence');
  for(const item of e.items){
   if(allInstances.has(item.instanceId))fail('cross_party_duplicate_copy');
   allInstances.add(item.instanceId);
   if(!v2ServerPiece(item.pieceId))fail('not_pinned_forge_piece');
  }
  const weapon=e.items.filter(x=>v2ServerPiece(x.pieceId)?.slot==='weapon');
  if(weapon.length>1)fail('multiple_weapons');
  // Defence in depth: even QA-issued tokens cannot turn a verified weapon
  // from another class into this actor's physical damage profile.
  if(weapon.length){
   const sourceClass=Object.entries(CLASS_NAMES_V2).find(([,name])=>name===actor.classId)?.[0]??actor.classId;
   if(v2ServerPiece(weapon[0].pieceId)?.classRestriction!==sourceClass)
    fail('weapon_class_mismatch');
  }
  const shield=e.items.filter(x=>v2PinnedPhysicalSubtypeReview(x.pieceId)?.shieldBashDamageType==='blunt');
  if(shield.length>1)fail('multiple_shields');
  const profile=weapon.length?v2PinnedPhysicalSubtypeReview(weapon[0].pieceId):null;
  if(weapon.length&&!profile?.profile)fail('noncanonical_physical_weapon');
  const mode=profile?.profile?.mode??'none', weights=profile?.profile?.weights??[];
  if(!approvedWeights(weights,mode))fail('unbalanced_weapon_profile');
  profiles.set(actor.id,Object.freeze({
   actorId:actor.id,pieceId:weapon[0]?.pieceId??null,mode,
   weights:Object.freeze(weights.map(w=>Object.freeze({...w}))),
   shieldEquipped:Boolean(shield.length),
  }));
 }
 const resistanceFor=enemyProfile?authorizeAuthoredEnemyPhysicalResistancesV2(input,enemyProfile):undefined;
 const token=Object.freeze({[brand]:true}) as PhysicalDamageAuthorityV2;
 issued.set(token,{digest:enemyV2SnapshotDigest(input),resistancesFor:resistanceFor,
   playerIds:input.players.map(x=>x.id),enemyIds:input.enemies.map(x=>x.id),
   profiles});
 return token;
}
/** No token == no mechanic, preserving V1, ordinary hunts and other 2.0 paths. */
export function authorizePhysicalSubtypeEngineV2(
 input:CombatInput,token?:PhysicalDamageAuthorityV2,
):((source:CombatantDefinition,target:CombatantDefinition,abilityId:string,
   damageType:string|undefined,postMitigationDamage:number,
   isDirect:boolean)=>PhysicalSubtypeHitV2|undefined)|null{
 if(!token)return null;
 const scope=issued.get(token);
 if(!scope)throw Error('combat_v2_physical_subtype_stale_or_forged_encounter');
 if(scope.digest!==enemyV2SnapshotDigest(input)||
    !unique(scope.playerIds)||!unique(scope.enemyIds)||
    input.players.some((p,i)=>p.id!==scope.playerIds[i])||
    input.enemies.some((p,i)=>p.id!==scope.enemyIds[i]))
   fail('stale_or_forged_encounter');
 const verifiedProfiles=scope.profiles;
 const verifiedEnemyResistances=scope.resistancesFor;
 return (source,target,abilityId,damageType,postMitigationDamage,isDirect)=>{
  if(!isDirect||damageType!=='physical'||source.team!=='players'||target.team!=='enemies'||
     !Number.isFinite(postMitigationDamage)||postMitigationDamage<0)
   return undefined;
  const profile=verifiedProfiles.get(source.id);
  if(!profile||!profile.pieceId||profile.mode==='spell_source'||profile.mode==='none')
   return undefined;
  if(abilityId!=='BASIC'&&!source.abilities.some(a=>a.id===abilityId))
   return undefined;
  // Original V2 compiler emits baseAbilityId + ':v2:' + variantIndex.
  // Never match the *concept* skill ID directly to an executed event ID.
  // Resolve against the actual compiled server-authored ability identity.
  const skill=source.abilities.find(a=>a.id===abilityId&&
   /^.+:v2:[012]$/.test(a.id));
  const known=skill?SKILL_IDENTITIES_V2.find(k=>
   (source.classId===k.classId||source.classId===CLASS_NAMES_V2[k.classId])&&
   k.name===skill.name):undefined;
  const special=known?SKILL_OVERRIDES[known.id]:undefined;
  let weights:readonly PhysicalWeightV2[]=profile.weights;
  if(special&&(!special.needsShield||profile.shieldEquipped))
   weights=blast(special.type);
  else if(profile.mode==='physical_staff_strike_only')
   return undefined;
  // No subtype bonus affix or set trait is approved. Enemy resistances are
  // optional and require a separate, signed persisted Enemy V2 authority.
  // Applies only profiles issued from an already verified persisted Enemy V2 kit.
  // Legacy/generic/unverified enemies remain neutral by construction.
  const result=calculatePhysicalSubtypeV2(postMitigationDamage,weights,
    verifiedEnemyResistances?.(target.id)??zero,noBonus);
  return {damage:result.damage,multiplier:result.multiplier,weights,
    sourcePieceId:profile.pieceId};
 };
}
