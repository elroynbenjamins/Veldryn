/**
 * HIDDEN, NOT MOUNTED: Equipment 2.0 trait authority for the Combat 2.0 engine.
 * A server-only snapshot verification callback MUST confirm exact persisted
 * account/character/item/build state. Never forward client JSON into issuer.
 * This token is separate from enemy-kit authority and cannot enable legacy runs.
 */
import type {CombatInput} from '../types';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';

const brand:unique symbol=Symbol('equipment-v2-trait-engine-snapshot');
export type EquipmentV2TraitEngineAuthority=Readonly<{readonly [brand]:true}>;
export const EQUIPMENT_V2_TRAIT_ENGINE_POLICY='eq2-traits-hidden-engine-pass1' as const;
export type ExecutableEquipmentTraitV2='thornbound_riposte'|'sword_dance'|'echoing_strike'|'mending_echo'|'restorative_bloom';
export const EXECUTABLE_EQUIPMENT_TRAITS_V2:readonly ExecutableEquipmentTraitV2[]=[
 'thornbound_riposte','sword_dance','echoing_strike','mending_echo','restorative_bloom',
] as const;
export interface VerifiedV2SelectedTrait{
 readonly instanceId:string;
 readonly traitId:ExecutableEquipmentTraitV2;
}
export interface VerifiedV2EquipmentEffectSource {
 readonly source:'server-persisted-equipment-v2';
 readonly policy:typeof EQUIPMENT_V2_TRAIT_ENGINE_POLICY;
 readonly revision:number;
 readonly accountId:string;
 readonly characterId:string;
 readonly actorId:string;
 readonly ownedEquippedInstanceIds:readonly string[];
 /** Canonical digest of the separately verified exact-item receipt set. */
 readonly equipmentReceiptDigest:string;
 readonly basicAttackDamagePct:number;
 readonly abilityDamagePct:number;
 readonly reflectDamagePct:number;
 readonly traits:readonly VerifiedV2SelectedTrait[];
}
interface FrozenScope{
 readonly inputDigest:string;
 readonly inputSeed:string;
 readonly actors:readonly VerifiedV2EquipmentEffectSource[];
}
const scoped=new WeakMap<object,FrozenScope>();
const validId=(x:unknown):x is string=>typeof x==='string'&&x.length>0&&x.length<=128&&
 /^[A-Za-z0-9:_-]+$/.test(x);
const validPct=(x:unknown,max:number)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=max;
function fail(why:string):never{throw Error('combat_v2_equipment_trait_'+why);}
const allowed=new Set<string>(EXECUTABLE_EQUIPMENT_TRAITS_V2);
const frozen=<T>(x:T):T=>JSON.parse(JSON.stringify(x)) as T;
/** Keep the readonly element type after Array.isArray runtime guards. */
const freezeSources=(sources:readonly VerifiedV2EquipmentEffectSource[])=>Object.freeze(sources.map(row=>Object.freeze({
 ...frozen(row),ownedEquippedInstanceIds:Object.freeze([...row.ownedEquippedInstanceIds]),
 traits:Object.freeze(row.traits.map(trait=>Object.freeze({...trait}))),
})));
function validate(source:VerifiedV2EquipmentEffectSource){
 if(!source||source.source!=='server-persisted-equipment-v2'||
  source.policy!==EQUIPMENT_V2_TRAIT_ENGINE_POLICY||
  !Number.isSafeInteger(source.revision)||source.revision<1||
  !validId(source.accountId)||!validId(source.characterId)||!validId(source.actorId)||
  !/^[0-9a-f]{64}$/.test(source.equipmentReceiptDigest)||
  !Array.isArray(source.ownedEquippedInstanceIds)||
  source.ownedEquippedInstanceIds.length>10||
  source.ownedEquippedInstanceIds.some(id=>!validId(id))||
  new Set(source.ownedEquippedInstanceIds).size!==source.ownedEquippedInstanceIds.length||
  !validPct(source.basicAttackDamagePct,19)||!validPct(source.abilityDamagePct,22)||
  !validPct(source.reflectDamagePct,8)||!Array.isArray(source.traits)||
  source.traits.length>2)
  fail('invalid_persisted_source');
 const selected=new Set<string>(),traits=new Set<string>();
 for(const trait of source.traits){
  if(!trait||!validId(trait.instanceId)||!allowed.has(trait.traitId)||
   !source.ownedEquippedInstanceIds.includes(trait.instanceId)||
   selected.has(trait.instanceId)||traits.has(trait.traitId))
   fail('trait_not_owned_selected_or_supported');
  selected.add(trait.instanceId);traits.add(trait.traitId);
 }
}
/** The divergent original-Forge compiler has a fractional abilityDamagePct
 * channel; this sidecar has a percent-valued channel of the same meaning.
 * Do not multiply them together or silently discard an earned roll. Until a
 * versioned combined source/cap policy exists, mixed nonzero channels fail
 * closed. This also guards any later branch reconciliation of those types. */
function rejectUnreconciledAbilityDamage(input:CombatInput,source:VerifiedV2EquipmentEffectSource){
 const effects=input.players.find(p=>p.id===source.actorId)?.combatV2?.equipmentEffects;
 if(source.abilityDamagePct>0&&effects&&'abilityDamagePct' in effects&&
    effects.abilityDamagePct!==undefined&&effects.abilityDamagePct!==0)
  fail('unreconciled_ability_damage_channels');
}
/** In the hidden server adapter, verifyPersisted MUST read actual ownership,
 * equipped item receipts, revision, selected trait IDs and a frozen digest.
 * Issuing a token is never proof the DB implementation is present in production. */
export function issueEquipmentV2TraitAuthority(
 input:CombatInput,
 sources:readonly VerifiedV2EquipmentEffectSource[],
 verifyPersisted:(sources:readonly VerifiedV2EquipmentEffectSource[],inputDigest:string)=>boolean,
):EquipmentV2TraitEngineAuthority{
 if(typeof verifyPersisted!=='function'||!Array.isArray(sources)||
    sources.length!==input?.players?.length||sources.length<1||sources.length>4||
    typeof input.seed!=='string'||!input.seed)
   fail('verified_storage_required');
 if(input.initialPlayerState&&Object.keys(input.initialPlayerState).length>0||
    input.enemyDamageProfile!==undefined||!Array.isArray(input.enemies)||!input.enemies.length||
    input.players.some(p=>p.team!=='players'||p.combatV2?.version!==2)||
    input.enemies.some(e=>e.team!=='enemies'))
   fail('no_legacy_or_inflight_encounter');
 const ids=new Set<string>(),characters=new Set<string>(),copies=new Set<string>();
 for(const source of sources){
  validate(source);
  rejectUnreconciledAbilityDamage(input,source);
  if(ids.has(source.actorId)||!input.players.some(p=>p.id===source.actorId)||
    characters.has(source.characterId))
    fail('source_actor_or_owner_mismatch');
  for(const copy of source.ownedEquippedInstanceIds){
   if(copies.has(copy))fail('duplicate_encounter_equipment_copy');
   copies.add(copy);
  }
  ids.add(source.actorId);characters.add(source.characterId);
 }
 const digest=enemyV2SnapshotDigest(input);
 const verifiedSources=freezeSources(sources);
 const sourceDigest=enemyV2SnapshotDigest(verifiedSources);
 let accepted=false;
 try{accepted=verifyPersisted(verifiedSources,digest)===true;}catch{accepted=false;}
 if(!accepted||enemyV2SnapshotDigest(input)!==digest||
    enemyV2SnapshotDigest(sources)!==sourceDigest)
  fail('persisted_ledger_not_verified');
 const token=Object.freeze({[brand]:true}) as EquipmentV2TraitEngineAuthority;
 scoped.set(token,Object.freeze({inputDigest:digest,inputSeed:input.seed,
  actors:verifiedSources,
 }));
 return token;
}
/** Called at engine entry, every run. No token => precise preexisting behavior. */
export function authorizeEquipmentV2TraitEngine(
 input:CombatInput,authority?:EquipmentV2TraitEngineAuthority,
):ReadonlyMap<string,VerifiedV2EquipmentEffectSource>{
 if(authority===undefined)return new Map();
 if(!authority||typeof authority!=='object'||!scoped.has(authority))
  fail('not_server_issued');
 const scope=scoped.get(authority)!;
 if(scope.inputSeed!==input.seed||scope.inputDigest!==enemyV2SnapshotDigest(input)||
  input.initialPlayerState&&Object.keys(input.initialPlayerState).length>0||
  input.enemyDamageProfile!==undefined||
  input.players.length!==scope.actors.length||
  input.players.some(p=>p.team!=='players'||p.combatV2?.version!==2||
    !scope.actors.some(actor=>actor.actorId===p.id)))
  fail('not_matching_compiled_encounter');
 return new Map(scope.actors.map(source=>[source.actorId,source]));
}
