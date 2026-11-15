import {ENEMY_FAMILIES,enemyFamilyForMonster,type EnemyFamilyId} from '../content/enemy-families';
import {normalizeMonsterMastery} from './monster-mastery';
import type {GameState} from './types';

/** Four times the species-mastery requirement (100 vs 25 kills per rank).
 * Total is 3,000 verified ordinary kills within this family for Rank 30.
 */
export const FAMILY_MASTERY_POINTS_PER_RANK=100;
export const FAMILY_MASTERY_MAX_RANK=30;
export const FAMILY_MASTERY_MAX_POINTS=FAMILY_MASTERY_POINTS_PER_RANK*FAMILY_MASTERY_MAX_RANK;

export function normalizeEnemyFamilyMastery(raw:unknown):Record<string,number>{
 const data=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
 const out:Record<string,number>={};
 for(const family of ENEMY_FAMILIES){
  const n=data[family.id];
  if(typeof n==='number'&&Number.isFinite(n)&&Number.isSafeInteger(n)&&n>0){
   out[family.id]=Math.min(FAMILY_MASTERY_MAX_POINTS,n);
  }
 }
 return out;
}

/** Migration-only: give existing hunters credit for known historical kills.
 * Species counters cap at 750 so earlier excess kills cannot be reconstructed.
 * Never recompute after family tracking is present: fresh kills also progress
 * past each species's cap without creating a duplicate backfill.
 */
export function backfillEnemyFamilyMastery(speciesPoints:unknown):Record<string,number>{
 const species=normalizeMonsterMastery(speciesPoints),points:Record<string,number>={};
 for(const [monsterId,count] of Object.entries(species)){
  const id=enemyFamilyForMonster(monsterId)?.id;
  if(id)points[id]=Math.min(FAMILY_MASTERY_MAX_POINTS,(points[id]??0)+count);
 }
 return points;
}

export function enemyFamilyMastery(state:GameState,id:EnemyFamilyId){
 const points=normalizeEnemyFamilyMastery(state.character?.familyMasteryPoints)[id]??0;
 const rank=Math.min(FAMILY_MASTERY_MAX_RANK,Math.floor(points/FAMILY_MASTERY_POINTS_PER_RANK));
 return {
  points,rank,
  nextRankPoints:rank>=FAMILY_MASTERY_MAX_RANK?FAMILY_MASTERY_MAX_POINTS:(rank+1)*FAMILY_MASTERY_POINTS_PER_RANK,
  damageBonus:rank>=30?.02:rank>=5?.01:0,
  materialBonus:rank>=30?.05:rank>=15?.03:0,
  dropKnowledge:rank>=10,
  eliteKnowledge:rank>=20,
  badgeUnlocked:rank>=25,
 };
}

/** Only called from the already verified species-kill settlement path.
 * No client command may directly award a family rank.
 */
export function recordEnemyFamilyMastery(state:GameState,monsterId:string,kills:number):GameState{
 const family=enemyFamilyForMonster(monsterId);
 if(!family||!state.character||!Number.isSafeInteger(kills)||kills<=0)return state;
 const points=normalizeEnemyFamilyMastery(state.character.familyMasteryPoints);
 points[family.id]=Math.min(FAMILY_MASTERY_MAX_POINTS,(points[family.id]??0)+kills);
 return {...state,character:{...state.character,familyMasteryPoints:points}};
}

export const ENEMY_FAMILY_MASTERY_MILESTONES=[
 {rank:5,label:'Family Hunter',detail:'+1% damage against this enemy family.'},
 {rank:10,label:'Family Knowledge',detail:'Reveal the base drop tables of encountered enemies in this family.'},
 {rank:15,label:'Family Expertise',detail:'+3% normal material yield from this enemy family.'},
 {rank:20,label:'Elite Knowledge',detail:'Unlock an advanced family-knowledge milestone.'},
 {rank:25,label:'Family Emblem',detail:'Display the family mastery emblem.'},
 {rank:30,label:'Perfect Understanding',detail:'+2% damage and +5% normal materials from this enemy family.'},
] as const;
export function enemyFamilyMasteryGuidance(state:GameState,id:EnemyFamilyId){
 const mastery=enemyFamilyMastery(state,id);
 const next=ENEMY_FAMILY_MASTERY_MILESTONES.find(row=>row.rank>mastery.rank);
 return {...mastery,next,killsToNextRank:Math.max(0,mastery.nextRankPoints-mastery.points),
  killsToNextMilestone:next?Math.max(0,next.rank*FAMILY_MASTERY_POINTS_PER_RANK-mastery.points):0};
}
