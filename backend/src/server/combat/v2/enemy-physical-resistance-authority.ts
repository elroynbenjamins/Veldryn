/**
 * HIDDEN ENEMY 2.0 — source-authorized candidate physical resistance profiles.
 * No V1/live imports or automatic enemy archetype inference.
 *
 * These numbers are preliminary PvE counterplay design values and are NOT
 * approved gameplay balance. The only accepted scope is an encounter already
 * authorized by the persisted Enemy V2 engine; unsigned enemy tags are not a
 * source of authority. No kit reauthoring or reward writes.
 */
import type {CombatInput} from '../types';
import {authorizeEnemyV2EngineExecution,type EnemyV2EngineAuthority,enemyV2SnapshotDigest} from './enemy-engine-authority';
import type {PhysicalResistanceV2} from './physical-damage-engine-authority';

export const ENEMY_PHYSICAL_RESISTANCE_RULES_V2='enemy-physical-subtypes-review-v1' as const;
/** These are explicit boss-ID design candidates, not auto-derived material penalties. */
export const REVIEW_BOSS_PHYSICAL_RESISTANCE_V2={
 BOSS_EXP_ROOT:{slashing:.08,piercing:.10,blunt:-.10},
 BOSS_EXP_BELL:{slashing:.10,piercing:.10,blunt:-.08},
 BOSS_EXP_SOLAR:{slashing:.08,piercing:.10,blunt:-.06},
 BOSS_EXP_SPHINX:{slashing:0,piercing:-.06,blunt:.08},
 BOSS_EXP_BELLBEAST:{slashing:-.06,piercing:0,blunt:.06},
 BOSS_EXP_CANTOR:{slashing:.06,piercing:.06,blunt:-.08},
} as const satisfies Readonly<Record<string,PhysicalResistanceV2>>;
const MARK_BY_BOSS:Readonly<Record<keyof typeof REVIEW_BOSS_PHYSICAL_RESISTANCE_V2,string>>={
 BOSS_EXP_ROOT:'enemy-v2:boss-profile:asterfall-1',
 BOSS_EXP_BELL:'enemy-v2:boss-profile:asterfall-1',
 BOSS_EXP_SOLAR:'enemy-v2:boss-profile:regional-1',
 BOSS_EXP_SPHINX:'enemy-v2:boss-profile:regional-1',
 BOSS_EXP_BELLBEAST:'enemy-v2:boss-profile:regional-1',
 BOSS_EXP_CANTOR:'enemy-v2:boss-profile:regional-1',
};
const brand:unique symbol=Symbol('enemy-v2-physical-profile');
export type EnemyPhysicalResistanceAuthorityV2=Readonly<{readonly [brand]:true}>;
type Scope=Readonly<{digest:string;profiles:ReadonlyMap<string,PhysicalResistanceV2>}>;
const scopes=new WeakMap<object,Scope>();
const fail=(s:string):never=>{throw Error('enemy_v2_physical_resistance_'+s);};
const neutral=Object.freeze({slashing:0,piercing:0,blunt:0}) satisfies PhysicalResistanceV2;

/**
 * Existing signed Enemy V2 authority must verify exact new-run persisted scope.
 * QA-only fake verification in tests must never be mounted on routes.
 */
export function issueAuthoredEnemyPhysicalResistancesV2(
 input:CombatInput,enemyAuthority:EnemyV2EngineAuthority,
):EnemyPhysicalResistanceAuthorityV2{
 if(!authorizeEnemyV2EngineExecution(input,enemyAuthority))
   fail('missing_persisted_enemy_kit');
 const profiles=new Map<string,PhysicalResistanceV2>();
 for(const enemy of input.enemies){
  const exact=Object.prototype.hasOwnProperty.call(REVIEW_BOSS_PHYSICAL_RESISTANCE_V2,enemy.id)
   ?enemy.id as keyof typeof REVIEW_BOSS_PHYSICAL_RESISTANCE_V2:undefined;
  if(enemy.boss&&!exact)fail('boss_not_authored');
  if(!enemy.boss&&exact)fail('boss_identity_mismatch');
  if(!(enemy.tags??[]).includes('enemy-v2:kit:v1'))
   fail('missing_authenticated_kit_tag');
  if(!exact)continue; // ordinary and elite remain neutral pending per-species authoring.
  const tag=MARK_BY_BOSS[exact];
  if((enemy.tags??[]).filter(s=>s===tag).length!==1)
   fail('boss_profile_tag_mismatch');
  const candidate=REVIEW_BOSS_PHYSICAL_RESISTANCE_V2[exact];
  for(const value of Object.values(candidate)){
   if(!Number.isFinite(value)||value<-.20||value>.30)
    fail('candidate_out_of_policy');
  }
  profiles.set(enemy.id,Object.freeze({...candidate}));
 }
 const token=Object.freeze({[brand]:true}) as EnemyPhysicalResistanceAuthorityV2;
 scopes.set(token,Object.freeze({digest:enemyV2SnapshotDigest(input),profiles}));
 return token;
}
/** Snapshot-bound resolver; no mutable record or source-provided coefficients. */
export function authorizeAuthoredEnemyPhysicalResistancesV2(
 input:CombatInput,token:EnemyPhysicalResistanceAuthorityV2,
):(enemyId:string)=>PhysicalResistanceV2{
 const scope=scopes.get(token);
 if(!scope||scope.digest!==enemyV2SnapshotDigest(input))
   fail('stale_or_forged_profile');
 return (enemyId:string)=>scope.profiles.get(enemyId)??neutral;
}
