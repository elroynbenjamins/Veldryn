/**
 * HIDDEN World Boss V89 — a fail-closed, structural Combat 2.0 integration audit.
 *
 * It does NOT compile stats, authenticate equipment, issue authority tokens,
 * simulate a fight, grant rewards or enable production. An all-green audit is
 * evidence of interface coverage ONLY, never persistence/compiler proof.
 *
 * The V25 World Boss engine still runs legacy authored 5-second rounds and
 * must not be treated as equivalent to the canonical millisecond V2 engine.
 */
export const WORLD_BOSS_CANONICAL_V89_LIVE = false as const;

export const WORLD_BOSS_CANONICAL_STATS_V89 = [
 'attack_pct','defense_pct','max_hp_pct','crit_rate_pp',
 'crit_damage_pct','class_healing_pct','haste_pp','accuracy_pp',
 'evasion_pp','penetration_pp','ward_pp','shield_strength_pct',
 'hex_potency_pct','basic_attack_damage_pct','ability_damage_pct',
 'reflect_damage_pct',
] as const;

/** Full provenance is required; a populated number is not a capability. */
export const WORLD_BOSS_CANONICAL_SIGNALS_V89 = [
 'class-skill-base-and-item-compile',
 'verified-equip-copy-and-selected-trait',
 'original-versus-generated-hit-provenance',
 'millisecond-action-order-and-cooldowns',
 'accuracy-evasion-and-penetration',
 'typed-physical-magical-true-damage',
 'ward-applied-to-eligible-magic-once',
 'actual-shield-consumption-and-healing',
 'per-second-nonrecursive-hot-and-dot',
 'local-guard-separated-from-world-hp',
 'boss-specific-telegraphs-and-counters',
 'shared-5s-boss-retaliation-budget',
 'server-seeded-immutable-event-replay',
 'residual-echo-zero-global-hp',
] as const;

export const WORLD_BOSS_CANONICAL_TRAITS_V89 = [
 'sword_dance','echoing_strike','thornbound_riposte',
 'mending_echo','restorative_bloom',
] as const;

export type WorldBossV89Boss = 'hollowroot'|'sunscar'|'frostmarch';
export type WorldBossV89Phase = 'armored'|'exposed'|'enraged';

export interface WorldBossV89ActorEvidence {
 readonly actorId:string;
 readonly characterId:string;
 readonly snapshotId:string;
 readonly sourceRevision:number;
 readonly sourceHash:string;
 readonly compiledCombatantDigest:string;
 readonly equippedCopyIds:readonly string[];
 readonly activeTraits:readonly {
  readonly instanceId:string;
  readonly traitId:string;
 }[];
}

/**
 * Metadata from a hypothetical future trusted compiler. The current V12
 * roster and synthetic V88 callbacks are NEVER sufficient to issue it.
 * This type is structurally forgeable and must never cross a public boundary.
 */
export interface WorldBossCanonicalEvidenceV89 {
 readonly source:'canonical-combat-v2-server-projection';
 readonly eventId:string;
 readonly accountId:string;
 readonly bossId:WorldBossV89Boss;
 readonly phase:WorldBossV89Phase;
 readonly rosterDigest:string;
 readonly bossMaxHp:number;
 readonly compilerVersion:string;
 readonly actors:readonly WorldBossV89ActorEvidence[];
 readonly statChannels:readonly string[];
 readonly eventSignals:readonly string[];
 readonly executableTraits:readonly string[];
 /** Combat 2.0 Restorative Bloom: four separate 1-second ticks. */
 readonly restorativeBloomOffsetsMs:readonly number[];
 /** The V25 authored 5-second-round substitute cannot satisfy this. */
 readonly eventTimeResolutionMs:number;
 readonly phaseThresholdsPct:readonly [number,number];
}

export interface WorldBossCanonicalAuditV89 {
 readonly structurallyCompatible:boolean;
 readonly releaseReady:false;
 readonly blockers:readonly string[];
 readonly note:'source-metadata-only-not-authentication';
}

const ID=/^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/;
const DIGEST=/^[0-9a-f]{64}$/;
const BOSSES:ReadonlySet<string>=new Set(['hollowroot','sunscar','frostmarch']);
const PHASES:ReadonlySet<string>=new Set(['armored','exposed','enraged']);
const BLOOM_TICKS=[1000,2000,3000,4000] as const;
const id=(x:unknown):x is string=>typeof x==='string'&&ID.test(x);
const digest=(x:unknown):x is string=>typeof x==='string'&&DIGEST.test(x);

function exactSet(label:string,items:unknown,required:readonly string[],issues:string[]){
 if(!Array.isArray(items)){
  issues.push(label+'_missing');
  return;
 }
 const values=Array.from(items) as unknown[];
 if(values.length!==required.length||
    new Set(values).size!==values.length||
    values.some(value=>typeof value!=='string'||!required.includes(value)))
  issues.push(label+'_not_exact');
 else if(required.some(value=>!values.includes(value)))
  issues.push(label+'_missing_required');
}

/** Pure comparison for the planned canonical adapter; never a trust boundary. */
export function auditWorldBossCanonicalRuntimeV89(
 evidence:WorldBossCanonicalEvidenceV89,
):WorldBossCanonicalAuditV89{
 const issues:string[]=[];
 if(!evidence||typeof evidence!=='object')
  return Object.freeze({structurallyCompatible:false,releaseReady:false,
   blockers:Object.freeze(['missing_evidence']),
   note:'source-metadata-only-not-authentication'});
 if(evidence.source!=='canonical-combat-v2-server-projection'||
  !id(evidence.eventId)||!id(evidence.accountId)||
  !BOSSES.has(evidence.bossId)||!PHASES.has(evidence.phase)||
  !digest(evidence.rosterDigest)||!id(evidence.compilerVersion)||
  !Number.isSafeInteger(evidence.bossMaxHp)||
  evidence.bossMaxHp<=0||evidence.bossMaxHp>1e12)
  issues.push('invalid_server_scope');
 exactSet('stat_channels',evidence.statChannels,
  WORLD_BOSS_CANONICAL_STATS_V89,issues);
 exactSet('event_signals',evidence.eventSignals,
  WORLD_BOSS_CANONICAL_SIGNALS_V89,issues);
 exactSet('trait_set',evidence.executableTraits,
  WORLD_BOSS_CANONICAL_TRAITS_V89,issues);
 if(!Number.isSafeInteger(evidence.eventTimeResolutionMs)||
   evidence.eventTimeResolutionMs<1||evidence.eventTimeResolutionMs>1000)
  issues.push('subsecond_or_1s_timing_required');
 if(!Array.isArray(evidence.restorativeBloomOffsetsMs)||
   evidence.restorativeBloomOffsetsMs.length!==BLOOM_TICKS.length||
   Array.from(evidence.restorativeBloomOffsetsMs).some((n,i)=>n!==BLOOM_TICKS[i]))
  issues.push('restorative_bloom_four_real_ticks_required');
 if(!Array.isArray(evidence.phaseThresholdsPct)||
   evidence.phaseThresholdsPct.length!==2||
   evidence.phaseThresholdsPct[0]!==70||
   evidence.phaseThresholdsPct[1]!==30)
  issues.push('global_phase_threshold_mismatch');
 if(!Array.isArray(evidence.actors)||
    evidence.actors.length<1||evidence.actors.length>5){
  issues.push('account_roster_must_have_1_to_5');
 }else{
  const actors=new Set<string>(),characters=new Set<string>(),copies=new Set<string>();
  for(const row of evidence.actors){
   if(!row||!id(row.actorId)||!id(row.characterId)||
    !id(row.snapshotId)||!digest(row.sourceHash)||
    !digest(row.compiledCombatantDigest)||
    !Number.isSafeInteger(row.sourceRevision)||row.sourceRevision<1||
    actors.has(row.actorId)||characters.has(row.characterId)){
    issues.push('untrusted_or_duplicate_actor');
    continue;
   }
   actors.add(row.actorId);characters.add(row.characterId);
   if(!Array.isArray(row.equippedCopyIds)||row.equippedCopyIds.length>10||
      Array.from(row.equippedCopyIds).some((copy:unknown)=>!id(copy))){
    issues.push('invalid_equipped_copies');
    continue;
   }
   for(const copy of row.equippedCopyIds){
    if(copies.has(copy))issues.push('item_copy_reused_across_characters');
    copies.add(copy);
   }
   if(!Array.isArray(row.activeTraits)||row.activeTraits.length>2){
    issues.push('invalid_trait_selection');
    continue;
   }
   const selectedInstances=new Set<string>(),selectedTraits=new Set<string>();
   for(const trait of row.activeTraits){
    if(!trait||!id(trait.instanceId)||
       !WORLD_BOSS_CANONICAL_TRAITS_V89.some(t=>t===trait.traitId)||
       !row.equippedCopyIds.includes(trait.instanceId)||
       selectedInstances.has(trait.instanceId)||selectedTraits.has(trait.traitId))
     issues.push('unowned_or_duplicate_active_trait');
    else {
     selectedInstances.add(trait.instanceId);
     selectedTraits.add(trait.traitId);
    }
   }
  }
 }
 return Object.freeze({
  structurallyCompatible:issues.length===0,
  releaseReady:false,
  blockers:Object.freeze([...new Set(issues)].sort()),
  note:'source-metadata-only-not-authentication',
 });
}
