/**
 * Hidden Enemy/Bosses 2.0 kit composer for the Classes/Skills V2 draft.
 *
 * One authoritative kit-building path per NEW solo encounter:
 * - normal/elite: seeded Enemy 2.0 traits (no second generic V2_ENEMY kit)
 * - boss: ONE regional handcrafted boss profile (no generic pressure phase)
 * Candidates MUST be persisted atomically and verified again before use.
 * Existing dungeon/Live/Q-mode and World Boss code never imports this module.
 */
import type {CombatantDefinition} from '../types';
import {
 ENEMY_V2_RULESET,prepareEnemyV2,
 type EnemyV2ServerOptions,type EnemyV2Region,type EnemyV2Tier,
} from '../enemy-v2-prototype';
import {prepareAsterfallBossV2} from '../boss-v2-asterfall-prototype';
import {prepareRegionalBossV2} from '../boss-v2-regional-prototype';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';

export const ENEMY_V2_KIT_VERSION='enemy-kit-composer-v1' as const;
const KIT_TAG='enemy-v2:kit:v1';
type EnemyKitPreviewV2=Readonly<{
 enemyId:string;
 kind:'normal'|'elite'|'boss';
 traitIds:readonly string[];
 profile:string;
 abilityNames:readonly string[];
 phaseNames:readonly string[];
}>;
interface EnemyKitCoreV2 {
 readonly kitVersion:typeof ENEMY_V2_KIT_VERSION;
 readonly ruleset:typeof ENEMY_V2_RULESET;
 readonly mode:'solo';
 readonly encounterId:string;
 /** Private, never expose through player-facing previews. */
 readonly seed:string;
 readonly region:EnemyV2Region;
 readonly equipmentTier:EnemyV2Tier;
 readonly eliteEnemyIds:readonly string[];
 readonly enemyIds:readonly string[];
 readonly bossIds:readonly string[];
 readonly baseEnemyDigest:string;
 readonly preparedEnemyDigest:string;
 readonly preparedEnemies:readonly CombatantDefinition[];
 readonly preview:readonly EnemyKitPreviewV2[];
}
export interface EnemyKitCandidateV2 extends EnemyKitCoreV2 {
 readonly source:'unpersisted-candidate-v2';
}
export interface PersistedEnemyKitV2 extends EnemyKitCoreV2 {
 readonly source:'server-persisted-v2';
 readonly revision:number;
}
const permittedBossIds:Readonly<Record<EnemyV2Region,readonly string[]>>={
 asterfall:['BOSS_EXP_ROOT','BOSS_EXP_BELL'],
 sunscar:['BOSS_EXP_SOLAR','BOSS_EXP_SPHINX'],
 frostmarch:['BOSS_EXP_BELLBEAST','BOSS_EXP_CANTOR'],
};
function assert(condition:unknown,code:string):asserts condition{
 if(!condition)throw Error('combat_v2_enemy_kit_'+code);
}
const validId=(x:unknown):x is string=>
 typeof x==='string'&&x.length>0&&x.length<=128&&/^[A-Za-z0-9:_-]+$/.test(x);
const distinct=(ids:readonly string[])=>new Set(ids).size===ids.length;
const duplicateAbility=(entry:CombatantDefinition)=>{
 const ids=entry.abilities.map(x=>x.id);
 const phases=(entry.phases??[]).map(x=>x.id);
 return !distinct(ids)||!distinct(phases);
};
const baseIsUncompiled=(enemy:CombatantDefinition)=>(
 enemy.team==='enemies'&&enemy.role==='enemy'&&validId(enemy.id)&&
 Array.isArray(enemy.abilities)&&Array.isArray(enemy.tags??[])&&
 !(enemy.tags??[]).some(tag=>
  tag==='combat-v2-enemy'||tag.startsWith('enemy-v2:'))&&
 !enemy.abilities.some(ability=>/^ENEMY_V2_|^V2_ENEMY_/.test(ability.id))&&
 !duplicateAbility(enemy)
);
const clone=(entry:CombatantDefinition):CombatantDefinition=>({
 ...entry,stats:{...entry.stats},tags:[...(entry.tags??[])],
 abilities:entry.abilities.map(a=>({...a,effects:a.effects.map(e=>({...e})),tags:a.tags?[...a.tags]:undefined})),
 phases:entry.phases?.map(p=>({...p,effects:p.effects.map(e=>({...e}))})),
});
const sortedUnique=(ids:readonly string[])=>[...ids].sort();
const clonePreview=(x:EnemyKitPreviewV2):EnemyKitPreviewV2=>({
 enemyId:x.enemyId,kind:x.kind,profile:x.profile,
 traitIds:[...x.traitIds],abilityNames:[...x.abilityNames],
 phaseNames:[...x.phaseNames],
});

/** This produces a CANDIDATE only. A trusted transaction must persist it
 * exactly once, then return an authenticated PersistedEnemyKitV2 receipt.
 * It must not be called on retry/replay: load the frozen kit from storage. */
export function prepareSoloEnemyKitsV2(
 enemies:readonly CombatantDefinition[],
 options:EnemyV2ServerOptions,
):EnemyKitCandidateV2{
 assert(options&&options.ruleset===ENEMY_V2_RULESET,'missing_server_ruleset');
 assert(validId(options.encounterId)&&typeof options.serverSeed==='string'&&
  options.serverSeed.length>=8&&options.serverSeed.length<=256,
  'invalid_encounter_identity');
 assert((['asterfall','sunscar','frostmarch'] as string[]).includes(options.region)&&
   Number.isSafeInteger(options.equipmentTier)&&
   options.equipmentTier>=2&&options.equipmentTier<=5,'unsupported_region_or_tier');
 assert(Array.isArray(enemies)&&enemies.length>=1&&enemies.length<=4&&
  enemies.every(baseIsUncompiled)&&distinct(enemies.map(e=>e.id)),
  'unverified_or_already_compiled_enemy');
 const eliteIds=[...(options.eliteEnemyIds??[])];
 assert(eliteIds.every(validId)&&distinct(eliteIds)&&
  eliteIds.every(id=>enemies.some(e=>e.id===id&&!e.boss)),
  'invalid_elite_enemy_ids');
 const bossIds=enemies.filter(e=>e.boss===true).map(e=>e.id);
 assert(bossIds.length<=1&&bossIds.every(id=>permittedBossIds[options.region].includes(id)),
   'boss_requires_regional_profile');
 const names=new Set<string>();
 const preview:EnemyKitPreviewV2[]=[];
 const prepared=enemies.map(base=>{
  let transformed:CombatantDefinition;
  let traitIds:string[]=[];
  let kind:EnemyKitPreviewV2['kind'];
  let profile:string;
  if(base.boss){
   kind='boss';
   transformed=options.region==='asterfall'?
     prepareAsterfallBossV2(base,ENEMY_V2_RULESET):
     prepareRegionalBossV2(base,ENEMY_V2_RULESET);
   profile=options.region+'-boss-v1';
   assert(transformed!==base&&
     (transformed.tags??[]).some(t=>t.startsWith('enemy-v2:boss-profile:')),
     'unrecognized_authored_boss');
   // Both boss prototypes replace phases; preserve pre-existing legacy phases
   // as part of a new-run-only compiled snapshot, never erase authored tells.
   transformed={...transformed,phases:[
      ...(base.phases??[]).map(p=>({...p,effects:p.effects.map(e=>({...e}))})),
      ...(transformed.phases??[]).map(p=>({...p,effects:p.effects.map(e=>({...e}))})),
   ]};
  }else{
   kind=eliteIds.includes(base.id)?'elite':'normal';
   const result=prepareEnemyV2([base],options);
   transformed=result.enemies[0];
   traitIds=[...(result.preview[0]?.traitIds??[])];
   profile=result.preview[0]?.archetype??'unrolled';
  }
  const next=clone(transformed);
  next.tags=[...(next.tags??[]),KIT_TAG];
  assert(next.team==='enemies'&&next.id===base.id&&
     next.name===base.name&&next.role===base.role&&
     next.level===base.level&&next.boss===base.boss&&
     !duplicateAbility(next),'duplicate_or_mutated_enemy_kit');
  // Require every new ability and phase ID to differ from the original;
  // never allow two independent kit compilers to touch a single enemy.
  const baselineIds=new Set(base.abilities.map(a=>a.id));
  const baselinePhases=new Set((base.phases??[]).map(p=>p.id));
  assert(next.abilities.filter(a=>!baselineIds.has(a.id)).every(a=>!names.has(base.id+':'+a.id))&&
    (next.phases??[]).filter(p=>!baselinePhases.has(p.id)).every(p=>!names.has(base.id+':phase:'+p.id)),
    'duplicate_authored_id');
  for(const a of next.abilities)names.add(base.id+':'+a.id);
  for(const p of next.phases??[])names.add(base.id+':phase:'+p.id);
  preview.push({
    enemyId:base.id,kind,traitIds,profile,
    abilityNames:next.abilities.filter(a=>!baselineIds.has(a.id)).map(a=>a.name),
    phaseNames:(next.phases??[]).filter(p=>!baselinePhases.has(p.id)).map(p=>p.name??p.id),
  });
  return next;
 });
 const enemyIds=enemies.map(e=>e.id);
 return {
  source:'unpersisted-candidate-v2',
  kitVersion:ENEMY_V2_KIT_VERSION,ruleset:ENEMY_V2_RULESET,mode:'solo',
  encounterId:options.encounterId,seed:options.serverSeed,
  region:options.region,equipmentTier:options.equipmentTier,
  eliteEnemyIds:sortedUnique(eliteIds),enemyIds,bossIds,
  baseEnemyDigest:enemyV2SnapshotDigest(enemies),
  preparedEnemyDigest:enemyV2SnapshotDigest(prepared),
  preparedEnemies:prepared.map(clone),preview:preview.map(clonePreview),
 };
}

/** Structural proof only; the caller MUST additionally check authoritative
 * persisted ownership, kit digest, receipt revision and combat digest through
 * its authenticated persistence callback before executing combat. */
export function verifyPersistedEnemyKitsV2(
 baseEnemies:readonly CombatantDefinition[],
 snapshot:PersistedEnemyKitV2,
):{readonly enemies:readonly CombatantDefinition[];readonly preview:readonly EnemyKitPreviewV2[]}{
 assert(snapshot&&snapshot.source==='server-persisted-v2'&&
   snapshot.kitVersion===ENEMY_V2_KIT_VERSION&&snapshot.ruleset===ENEMY_V2_RULESET&&
   snapshot.mode==='solo'&&validId(snapshot.encounterId)&&
   typeof snapshot.seed==='string'&&snapshot.seed.length>=8&&snapshot.seed.length<=256&&
   Number.isSafeInteger(snapshot.revision)&&snapshot.revision>=1,'invalid_stored_kit');
 assert((['asterfall','sunscar','frostmarch'] as string[]).includes(snapshot.region)&&
   Number.isSafeInteger(snapshot.equipmentTier)&&snapshot.equipmentTier>=2&&
   snapshot.equipmentTier<=5,'invalid_stored_region_or_tier');
 assert(Array.isArray(baseEnemies)&&Array.isArray(snapshot.enemyIds)&&
   Array.isArray(snapshot.preparedEnemies)&&Array.isArray(snapshot.bossIds)&&
   Array.isArray(snapshot.eliteEnemyIds)&&Array.isArray(snapshot.preview)&&
   baseEnemies.length>=1&&baseEnemies.length<=4&&
   snapshot.enemyIds.length===baseEnemies.length&&
   snapshot.preparedEnemies.length===baseEnemies.length&&
   snapshot.preview.length===baseEnemies.length,'invalid_stored_kit_size');
 assert(baseEnemies.every(baseIsUncompiled)&&distinct(snapshot.enemyIds)&&
    distinct(snapshot.bossIds)&&snapshot.bossIds.length<=1&&
    distinct(snapshot.eliteEnemyIds)&&
    snapshot.eliteEnemyIds.every(id=>snapshot.enemyIds.includes(id)&&!snapshot.bossIds.includes(id)),
   'invalid_stored_enemy_membership');
 assert(snapshot.baseEnemyDigest===enemyV2SnapshotDigest(baseEnemies)&&
   snapshot.preparedEnemyDigest===enemyV2SnapshotDigest(snapshot.preparedEnemies),
   'stored_kit_digest_mismatch');
 assert(snapshot.enemyIds.every((id,i)=>id===baseEnemies[i].id&&
   id===snapshot.preparedEnemies[i].id&&id===snapshot.preview[i].enemyId),
   'stored_kit_order_mismatch');
 const actualBossIds=snapshot.preparedEnemies.filter(e=>e.boss===true).map(e=>e.id);
 assert(JSON.stringify(actualBossIds)===JSON.stringify(snapshot.bossIds)&&
   snapshot.bossIds.every(id=>permittedBossIds[snapshot.region].includes(id)),
   'invalid_stored_boss_profile');
 for(let i=0;i<baseEnemies.length;i++){
  const base=baseEnemies[i],next=snapshot.preparedEnemies[i],p=snapshot.preview[i];
  assert(next.team==='enemies'&&next.role===base.role&&next.name===base.name&&
   next.level===base.level&&next.boss===base.boss&&
   (next.tags??[]).filter(t=>t===KIT_TAG).length===1&&
   !duplicateAbility(next),'invalid_stored_enemy_identity');
  assert((base.boss===true)===(p.kind==='boss')&&
   (!base.boss||next.tags?.some(t=>t.startsWith('enemy-v2:boss-profile:'))),
   'invalid_stored_enemy_profile');
  assert(!base.boss&&(p.kind==='normal'||p.kind==='elite')?
     p.kind===(snapshot.eliteEnemyIds.includes(base.id)?'elite':'normal'):true,
    'invalid_stored_elite_kind');
  assert(p.traitIds.length<=(p.kind==='elite'&&snapshot.equipmentTier>=3?2:1)&&
    distinct(p.traitIds),'invalid_stored_trait_count');
  if(!base.boss){
   const actual=(next.tags??[]).filter(t=>t.startsWith('enemy-v2:trait:'))
     .map(t=>t.slice('enemy-v2:trait:'.length));
   assert(JSON.stringify(actual)===JSON.stringify(p.traitIds),'stored_trait_evidence_mismatch');
  }
 }
 return {
  enemies:snapshot.preparedEnemies.map(clone),
  preview:snapshot.preview.map(clonePreview),
 };
}
