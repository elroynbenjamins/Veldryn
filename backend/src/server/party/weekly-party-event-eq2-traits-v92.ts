/**
 * Party Events V92: HIDDEN / QA-ONLY Combat 2.0 equipment trait bridge.
 *
 * This composes the *actual* V2 equipment trait engine (not an estimated
 * multiplier) with the V90 authored Party boss. It accepts only a fully
 * compiled party actor + source-owned equipped receipt snapshot AND an
 * independently persisted new-run Party event witness.
 *
 * The trusted verifier is deliberately NOT implemented here. It must be
 * supplied later by a privileged, transactional DB adapter, NEVER by HTTP
 * input. No existing Party event / solo/dungeon entrypoint imports this file.
 */
import {simulateCombat} from '../combat/engine';
import type {CombatInput,CombatResult} from '../combat/types';
import {enemyV2SnapshotDigest} from '../combat/v2/enemy-engine-authority';
import {compileEquippedActor,
 type TrustedEquipmentRuntimeV2,type EquipmentEncounterEvidenceV2,
} from '../combat/v2/unified-equipment-encounter';
import {compileExactEquipmentTraitSourceV2,
 type TrustedEquipmentTraitReceiptPortV2,
} from '../combat/v2/equipment-trait-exact-copy-adapter';
import type {VerifiedSkillBuildV2} from '../combat/v2/skill-effects';
import type {CombatantDefinition} from '../combat/types';
import {
 issueEquipmentV2TraitAuthority,
 type VerifiedV2EquipmentEffectSource,
} from '../combat/v2/equipment-trait-engine-authority';
import {
 PARTY_EVENT_BOSS_TRAITS_V90_VERSION,
 preparePartyEventBossTraitKitV90,
 type PartyBossTraitV90,
} from './weekly-party-boss-traits-v90';
import type {WeeklyPartyFamily,WeeklyPartyDifficulty} from './weekly-party-events-v2';
import {partyEventRosterMedianLevel,PARTY_EVENT_BOSS_TIER_GROWTH_V4} from './weekly-party-boss-v2';

export const PARTY_EVENT_EQ2_TRAIT_V92_RELEASED=false;
export const PARTY_EVENT_EQ2_TRAIT_V92_VERSION='party-event-eq2-traits-v92' as const;
export const PARTY_EVENT_EQ2_TRAIT_V92_MAX_MS=90_000;
export const PARTY_EVENT_EQ2_TRAIT_V92_SETTLE_GRACE_MS=3_600_000;

export interface FrozenPartyEventV92Witness {
 readonly source:'server-persisted-party-boss-v92';
 readonly ruleset:typeof PARTY_EVENT_EQ2_TRAIT_V92_VERSION;
 readonly phaseKitVersion:typeof PARTY_EVENT_BOSS_TRAITS_V90_VERSION;
 readonly mode:'new-run-only';
 readonly encounterId:string;
 readonly eventId:string;
 readonly partyId:string;
 readonly family:WeeklyPartyFamily;
 readonly difficulty:WeeklyPartyDifficulty;
 readonly tier:number;
 readonly revision:number;
 readonly seed:string;
 readonly weekStartsAtMs:number;
 readonly weekEndsAtMs:number;
 readonly frozenAtMs:number;
 readonly settlementAtMs:number;
 readonly roster:readonly {
  readonly accountId:string;
  readonly characterId:string;
  readonly actorId:string;
  readonly receiptRevision:number;
  readonly equipmentReceiptDigest:string;
 }[];
}
export interface VerifiedPartyEventV92Ports {
 /** Server-private: must lock/read the canonical, immutable V11/V18/V23/V87
  * event + victory/tier certificate, verified actor builds, exact worn items,
  * and their receipt revisions. The callback does NOT make itself trusted. */
 readonly verifyPersisted:(
  witness:FrozenPartyEventV92Witness,
  sources:readonly VerifiedV2EquipmentEffectSource[],
  fullEncounterDigest:string,
 )=>boolean;
}
const bossProfiles:Readonly<Record<WeeklyPartyFamily,{
 name:string;trait:PartyBossTraitV90;abilities:readonly [string,string];
 phase70:string;phase35:string;
}>>={
 broken_caravan:{name:'Roadbreaker Captain',trait:'roadbreaker_rally',abilities:['PE_V90_RALLY_CLEAVE','PE_V90_REINFORCED_SWING'],
  phase70:'PE_V90_CARAVAN_FORMATION',phase35:'PE_V90_CARAVAN_LAST_STAND'},
 nightfall_hunt:{name:'Nightfall Alpha',trait:'nightfall_rend',abilities:['PE_V90_RENDING_HOWL','PE_V90_HUNTER_LUNGE'],
  phase70:'PE_V90_NIGHTFALL_SHROUD',phase35:'PE_V90_NIGHTFALL_LAST_HUNT'},
 broken_wards:{name:'The Unbound Guardian',trait:'runebound_ward',abilities:['PE_V90_RUNE_STORM','PE_V90_STONE_HEART'],
  phase70:'PE_V90_WARD_IGNITION',phase35:'PE_V90_WARD_FRACTURE'},
 lost_reliquary:{name:'Reliquary Sentinel',trait:'reliquary_mirror',abilities:['PE_V90_SHADOW_ECHO','PE_V90_MIRROR_VEIL'],
  phase70:'PE_V90_RELIQUARY_REFLECTION',
  phase35:'PE_V90_RELIQUARY_FRACTURED_MIRROR'},
};
const id=(v:unknown):v is string=>typeof v==='string'&&
 v.length>0&&v.length<=128&&/^[A-Za-z0-9:_-]+$/.test(v);
const digest=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const num=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v);
const unique=(xs:readonly string[])=>new Set(xs).size===xs.length;
const fail=(why:string):never=>{throw Error('party_event_v92_'+why);};
/** One physical equipped copy may not supply stats/traits to two party actors.
 * Mirrors the newer unified encounter's cross-actor copy invariant, without
 * using its dungeon role quota or issuing a persisted encounter authority.
 */
function assertDistinctPartyEquipmentCopies(sources:readonly VerifiedV2EquipmentEffectSource[]):void{
 const seen=new Set<string>();
 for(const source of sources){
  if(!Array.isArray(source.ownedEquippedInstanceIds))fail('invalid_equipment_copy_scope');
  for(const copy of source.ownedEquippedInstanceIds){
   if(!id(copy))fail('invalid_equipment_copy_scope');
   if(seen.has(copy))fail('duplicate_party_equipment_copy');
   seen.add(copy);
  }
 }
}
function checkWitness(w:FrozenPartyEventV92Witness){
 if(!w||w.source!=='server-persisted-party-boss-v92'||
  w.ruleset!==PARTY_EVENT_EQ2_TRAIT_V92_VERSION||
  w.phaseKitVersion!==PARTY_EVENT_BOSS_TRAITS_V90_VERSION||
  w.mode!=='new-run-only'||!id(w.encounterId)||!id(w.eventId)||
  !id(w.partyId)||!Object.prototype.hasOwnProperty.call(bossProfiles,w.family)||
  !['standard','veteran','heroic'].includes(w.difficulty)||
  !num(w.tier)||w.tier<1||w.tier>12||
  !num(w.revision)||w.revision<1||
  typeof w.seed!=='string'||w.seed.length<1||w.seed.length>256||
  !num(w.weekStartsAtMs)||!num(w.weekEndsAtMs)||
  w.weekEndsAtMs-w.weekStartsAtMs!==7*86_400_000||
  !num(w.frozenAtMs)||w.frozenAtMs<w.weekStartsAtMs||
  w.frozenAtMs>=w.weekEndsAtMs||
  !num(w.settlementAtMs)||w.settlementAtMs<
     w.weekEndsAtMs+PARTY_EVENT_EQ2_TRAIT_V92_SETTLE_GRACE_MS||
  !Array.isArray(w.roster)||w.roster.length<2||w.roster.length>4)
  fail('invalid_frozen_new_run_witness');
 const rows=w.roster;
 if(!unique(rows.map(r=>r.accountId))||!unique(rows.map(r=>r.characterId))||
   !unique(rows.map(r=>r.actorId))||rows.some(r=>!id(r.accountId)||
   !id(r.characterId)||!id(r.actorId)||!num(r.receiptRevision)||
   r.receiptRevision<1||!digest(r.equipmentReceiptDigest)))
  fail('invalid_or_duplicate_party_roster');
}
function checkBoss(input:CombatInput,w:FrozenPartyEventV92Witness){
 const boss=input.enemies?.[0],profile=bossProfiles[w.family];
 // This V92 pilot is tied to the existing provisional V4 server boss curve,
 // not a client-supplied CP scaling value or an accidental future ruleset.
 // Any approved new 2.0 tune must increment the frozen ruleset version.
 const median=partyEventRosterMedianLevel(input.players.map(p=>p.level));
 const scale={standard:1,veteran:1.20,heroic:1.40}[w.difficulty];
 const levelScale=Math.max(.045,median/25);
 const expectedHp=Math.round(input.players.length*5400*levelScale*
  Math.pow(PARTY_EVENT_BOSS_TIER_GROWTH_V4.hp,w.tier-1)*scale);
 const expectedAtk=Math.round(355*levelScale*
  Math.pow(PARTY_EVENT_BOSS_TIER_GROWTH_V4.attack,w.tier-1)*scale);
 const expectedDef=Math.round(520*levelScale*
  Math.pow(PARTY_EVENT_BOSS_TIER_GROWTH_V4.defense,w.tier-1)*scale);
 if(!Array.isArray(input.enemies)||input.enemies.length!==1||!boss||
  boss.id!=='PARTY_EVENT_BOSS'||boss.team!=='enemies'||
  boss.level!==Math.max(1,Math.min(100,median+2*(w.tier-1)))||
  boss.stats.maxHp!==expectedHp||
  boss.stats.attackPower!==expectedAtk||
  boss.stats.defense!==expectedDef||
  boss.basicAttackMs!==2700||boss.basicAttackCoeff!==.8||
  boss.alchemyModifiers!==undefined||(boss.effectGems?.length??0)!==0||
  boss.role!=='enemy'||boss.boss!==true||boss.name!==profile.name||
  !Array.isArray(boss.tags)||!boss.tags.includes('party-event:boss-traits:v90')||
  !boss.tags.includes('party-event:boss-family:'+w.family)||
  boss.tags.some(tag=>tag.startsWith('enemy-v2:'))||
  boss.abilities.length!==2||boss.phases?.length!==2||
  boss.abilities[0].id!==profile.abilities[0]||
  boss.abilities[1].id!==profile.abilities[1]||
  boss.phases[0].id!==profile.phase70||boss.phases[1].id!==profile.phase35||
  boss.phases[0].hpPct!==.7||boss.phases[1].hpPct!==.35||
  !boss.abilities.every(a=>a.interruptible===true&&a.castTimeMs>=800&&
    a.castTimeMs<=3000&&a.cooldownMs>=8000&&
    a.effects.every(e=>e.damageType!=='true'&&(e.shieldReflectPct??0)===0&&
     (e.kind!=='damage'||(e.coeff??0)<=1.1)&&
     (e.kind!=='shield'||(e.flat??0)<=Math.round(boss.stats.maxHp*.04))))||
  boss.phases.some(p=>p.effects.some(e=>
    (e.shieldReflectPct??0)!==0||
    (e.kind==='shield'&&(e.flat??0)>Math.round(boss.stats.maxHp*.04)))))
  fail('untrusted_or_unbounded_v90_boss');
 // V94: limits alone are insufficient. A forged, weaker cast or altered
 // cleanse/bleed/ward phase within those limits must fail as decisively as
 // an overpowered one. Rebuild the *entire* exact V4+V90 canonical boss
 // from trusted Party witness scope, not attacker-supplied boss fields.
 const canonical=preparePartyEventBossTraitKitV90({
  id:'PARTY_EVENT_BOSS',name:profile.name,team:'enemies',role:'enemy',
  boss:true,level:Math.max(1,Math.min(100,median+2*(w.tier-1))),
  stats:{maxHp:expectedHp,attackPower:expectedAtk,healingPower:0,
   defense:expectedDef,accuracy:750,evasion:110,critChance:.045,
   critMultiplier:1.4,haste:.03},
  basicAttackMs:2700,basicAttackCoeff:.8,
  abilities:[
   {id:'PE_BOSS_SLAM',name:'Overwhelming Strike',cooldownMs:6900,
    castTimeMs:400,target:'current_target',priority:80,
    effects:[{kind:'damage',coeff:1.15}]},
   {id:'PE_BOSS_PULSE',name:'Rising Threat',cooldownMs:12000,
    castTimeMs:900,target:'all_enemies',priority:85,interruptible:true,
    effects:[{kind:'damage',coeff:.38+Math.min(.3,.03*w.tier)}]},
  ],
  phases:[{id:'ENRAGE',hpPct:.35,target:'self',
   effects:[{kind:'buff',tag:'damage_done',
    value:Math.min(.35,.07+.015*w.tier),durationMs:90_000}]}],
 },w.family,w.tier,true);
 if(enemyV2SnapshotDigest(boss)!==enemyV2SnapshotDigest(canonical))
  fail('noncanonical_v90_boss_kit');
}
/**
 * The actual full EQ2 compiler path for Party V92. It resolves verified
 * class baseline, 54 authored skills/variants, equipped item base/quality,
 * sets and original 13 affixes ONCE, then verifies the three new affix
 * channels and selected supported signature trait origins from exact
 * per-copy receipts. Returning sources does NOT issue an authority token.
 * The V92 frozen-battle issuer still needs an independently trusted
 * persisted account/roster/gear/victory verifier.
 */
export interface TrustedPartyV92BuildInput {
 readonly actor:CombatantDefinition;
 readonly build:VerifiedSkillBuildV2;
 readonly equipment:TrustedEquipmentRuntimeV2;
 readonly exactTraitReceipts:TrustedEquipmentTraitReceiptPortV2;
}
export interface PreparedPartyV92Equipment {
 readonly players:readonly CombatantDefinition[];
 readonly sources:readonly VerifiedV2EquipmentEffectSource[];
 readonly evidence:readonly EquipmentEncounterEvidenceV2[];
}
/** Private in-process seal, not a database ownership/victory certificate. */
const compiledPartySeals=new WeakMap<object,string>();
export function prepareFullyEquippedPartyV92(
 party:readonly TrustedPartyV92BuildInput[],
 qaEnabled=false,
):PreparedPartyV92Equipment {
 if(!qaEnabled||PARTY_EVENT_EQ2_TRAIT_V92_RELEASED||
   process.env.NODE_ENV==='production')fail('unreleased');
 if(!Array.isArray(party)||party.length<2||party.length>4)
  fail('invalid_party_build_count');
 const players:CombatantDefinition[]=[];
 const sources:VerifiedV2EquipmentEffectSource[]=[];
 const evidence:EquipmentEncounterEvidenceV2[]=[];
 for(const member of party){
  if(!member||!member.actor||!member.build||!member.equipment||
    !member.exactTraitReceipts||
    member.actor.id!==member.build.actor.id||
    member.actor!==member.build.actor||
    member.actor.id!==member.equipment.actorId||
    member.equipment.characterId!==member.exactTraitReceipts.characterId)
   fail('untrusted_complete_item_build');
  const compiled=compileEquippedActor(
   member.actor,member.build,member.equipment);
  const source=compileExactEquipmentTraitSourceV2(
   member.build,member.equipment,member.exactTraitReceipts);
  if(compiled.actor.combatV2?.version!==2||
    compiled.actor.id!==source.actorId||
    source.characterId!==member.equipment.characterId)
   fail('incomplete_v2_actor_source');
  players.push(compiled.actor);sources.push(source);evidence.push(compiled.evidence);
 }
 if(!unique(sources.map(s=>s.accountId))||
   !unique(sources.map(s=>s.characterId))||
   !unique(players.map(p=>p.id)))
  fail('duplicate_equipment_party_owner');
 assertDistinctPartyEquipmentCopies(sources);
 const prepared:PreparedPartyV92Equipment={players,sources,evidence};
 compiledPartySeals.set(prepared,enemyV2SnapshotDigest(prepared));
 return prepared;
}

/**
 * V93 strict QA entry: refuses an arbitrary hand-built CombatInput actor even
 * when the caller supplies a synthetic receipt validator. The in-process
 * seal proves only that *this process* compiled all members with verified
 * skill/item source policies, not that the DB rows are real. That still
 * requires the independently privileged persistence callback.
 */
export function simulateCompiledPartyEventEquipmentV92(input:{
 readonly prepared:PreparedPartyV92Equipment;
 readonly witness:FrozenPartyEventV92Witness;
 readonly boss:CombatantDefinition;
 readonly ports:VerifiedPartyEventV92Ports;
},qaEnabled=false):CombatResult{
 if(!qaEnabled||PARTY_EVENT_EQ2_TRAIT_V92_RELEASED||
  process.env.NODE_ENV==='production')fail('unreleased');
 const {prepared,witness,boss,ports}=input;
 if(!prepared||!compiledPartySeals.has(prepared))
  fail('unsealed_equipment_party');
 if(compiledPartySeals.get(prepared)!==enemyV2SnapshotDigest(prepared))
  fail('compiled_equipment_party_tampered');
 return simulateFrozenPartyEventEquipmentV92({
  witness,
  combat:{seed:witness.seed,players:[...prepared.players],enemies:[boss],
   maxDurationMs:PARTY_EVENT_EQ2_TRAIT_V92_MAX_MS},
  sources:prepared.sources,ports,
 },true);
}

/**
 * Experimental execution for a server-frozen NEW 2.0 Party Event only.
 * Real trait hooks run in the existing engine, with the shared boss reflect
 * budget and no proc recursion. No equipment bonuses are applied twice here:
 * player stats MUST already be compiled from source-owned EQ2 originals.
 *
 * Even correct code + a QA fake verifier does not certify a real DB result.
 */
export function simulateFrozenPartyEventEquipmentV92(input:{
 readonly witness:FrozenPartyEventV92Witness;
 readonly combat:CombatInput;
 readonly sources:readonly VerifiedV2EquipmentEffectSource[];
 readonly ports:VerifiedPartyEventV92Ports;
},qaEnabled=false):CombatResult{
 if(!qaEnabled||PARTY_EVENT_EQ2_TRAIT_V92_RELEASED||
  process.env.NODE_ENV==='production')
  fail('unreleased');
 const {witness,combat,sources,ports}=input;
 checkWitness(witness);
 if(!ports||typeof ports.verifyPersisted!=='function'||
   !combat||combat.seed!==witness.seed||
   combat.maxDurationMs!==PARTY_EVENT_EQ2_TRAIT_V92_MAX_MS||
   combat.tickMs!==undefined||combat.mitigationConstant!==undefined||
   combat.accuracyScale!==undefined||combat.initialPlayerState!==undefined||
   combat.enemyDamageProfile!==undefined||
   !Array.isArray(combat.players)||combat.players.length!==witness.roster.length||
   !Array.isArray(sources)||sources.length!==combat.players.length||
   !unique(combat.players.map(p=>p.id))||
   combat.players.some((p,i)=>p.team!=='players'||p.role==='enemy'||
    p.combatV2?.version!==2||p.id!==witness.roster[i].actorId)||
   sources.some((s,i)=>s.actorId!==witness.roster[i].actorId||
    s.accountId!==witness.roster[i].accountId||
    s.characterId!==witness.roster[i].characterId||
    s.revision!==witness.roster[i].receiptRevision||
    s.equipmentReceiptDigest!==witness.roster[i].equipmentReceiptDigest))
   fail('party_equipment_snapshot_mismatch');
 assertDistinctPartyEquipmentCopies(sources);
 checkBoss(combat,witness);
 const witnessDigest=enemyV2SnapshotDigest({
  witness,combatDigest:enemyV2SnapshotDigest(combat),sources,
 });
 const traitAuthority=issueEquipmentV2TraitAuthority(combat,sources,
  (verified,combatDigest)=>
   combatDigest===enemyV2SnapshotDigest(combat)&&
   ports.verifyPersisted(witness,verified,
    enemyV2SnapshotDigest({witness,combatDigest,sources:verified}))===true);
 // The entire witness + equipped source is bound to one verifier decision.
 // QA-only returned evidence has no grant or reward authority.
 if(witnessDigest.length!==64)fail('snapshot_digest_invalid');
 return simulateCombat(combat,undefined,traitAuthority);
}
