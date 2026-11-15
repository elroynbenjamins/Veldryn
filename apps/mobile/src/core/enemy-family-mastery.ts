import {ENEMY_FAMILIES,enemyFamilyForMonster,type EnemyFamilyId} from '../content/enemy-families';
import {MONSTERS} from '../content/monsters';
import {masteryRewardBonuses} from './mastery-rewards';
import type {GameState} from './types';

/** Escalating 30-rank progression to 50,000 total family points.
 * Rank 1: 300 points; Rank 30: 50,000. Earn 1–6 points per ordinary kill,
 * according to the enemy's authored level/zone rather than player level.
 */
export const FAMILY_MASTERY_MAX_RANK=30;
export const FAMILY_MASTERY_MAX_POINTS=50_000;
export function familyMasteryPointsForRank(rank:number):number{
 const r=Number.isFinite(rank)?Math.max(0,Math.min(FAMILY_MASTERY_MAX_RANK,Math.floor(rank))):0;
 return Math.round(300*r+41_000*r*(r-1)/(30*29));
}

/** Authoritative monster difficulty, not a player's level or selected region.
 * The level- and zone-based scales overlap using max rather than sum.
 */
export const FAMILY_MASTERY_ZONE_REWARDS:Readonly<Record<string,number>>={
 'Greenfields':1,'Silverbrook':1,'Ironwood Forest':1,
 'Old Mines':2,"King's Road":2,'Sunscar':3,'Frostmarch':4,'Ashlands':6,
};
export function enemyFamilyMasteryPointsPerKill(monsterId:string):number{
 if(!enemyFamilyForMonster(monsterId))return 0;
 const monster=MONSTERS.find(row=>row.id===monsterId&&!row.boss);
 if(!monster)return 0;
 const byLevel=monster.level>=75?6:monster.level>=55?4:monster.level>=35?3:monster.level>=20?2:1;
 return Math.max(1,Math.min(6,Math.max(FAMILY_MASTERY_ZONE_REWARDS[monster.zone]??1,byLevel)));
}

export function normalizeEnemyFamilyMastery(raw:unknown):Record<string,number>{
 const data=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
 const out:Record<string,number>={};
 for(const family of ENEMY_FAMILIES){
  if(!family.monsterIds.length)continue; // Unreleased families cannot carry imported progress.
  const n=data[family.id];
  if(typeof n==='number'&&Number.isFinite(n)&&Number.isSafeInteger(n)&&n>0){
   out[family.id]=Math.min(FAMILY_MASTERY_MAX_POINTS,n);
  }
 }
 return out;
}

/** Migration-only: give existing hunters weighted credit for historical kills.
 * Historical species counters only recorded up to their previous 750-kill cap;
 * future saves may have up to 1,500 per species. Unknown excess cannot be reconstructed.
 * Never recompute after family tracking is present: fresh kills also progress
 * past each species's cap without creating a duplicate backfill.
 */
export function backfillEnemyFamilyMastery(speciesPoints:unknown):Record<string,number>{
 const species=speciesPoints&&typeof speciesPoints==='object'&&!Array.isArray(speciesPoints)
  ?speciesPoints as Record<string,unknown>:{};
 const points:Record<string,number>={};
 for(const [monsterId,value] of Object.entries(species)){
  const id=enemyFamilyForMonster(monsterId)?.id;
  if(!id||typeof value!=='number'||!Number.isFinite(value)||value<=0)continue;
  // Preserve newer 1,500-kill species saves as well as legacy capped snapshots.
  const count=Math.min(1_500,Math.floor(value));
  // Credit historical species kills by their authored region/level weight.
  // Historical kills beyond each species cap cannot be reconstructed.
  const weighted=count*enemyFamilyMasteryPointsPerKill(monsterId);
  points[id]=Math.min(FAMILY_MASTERY_MAX_POINTS,(points[id]??0)+weighted);
 }
 return points;
}

export function enemyFamilyMastery(state:GameState,id:EnemyFamilyId){
 const points=normalizeEnemyFamilyMastery(state.character?.familyMasteryPoints)[id]??0;
 let rank=0;
 while(rank<FAMILY_MASTERY_MAX_RANK&&points>=familyMasteryPointsForRank(rank+1))rank++;
 return {
  points,rank,
  nextRankPoints:familyMasteryPointsForRank(Math.min(FAMILY_MASTERY_MAX_RANK,rank+1)),
  ...masteryRewardBonuses(rank),
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
 const perKill=enemyFamilyMasteryPointsPerKill(monsterId);
 if(perKill<1)return state;
 const points=normalizeEnemyFamilyMastery(state.character.familyMasteryPoints);
 // Multiply only after validating the authoritative kill count; bounded at cap.
 points[family.id]=Math.min(FAMILY_MASTERY_MAX_POINTS,(points[family.id]??0)+kills*perKill);
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
 const currentRankPoints=familyMasteryPointsForRank(mastery.rank);
 const nextRankPoints=mastery.nextRankPoints;
 return {...mastery,next,
  pointsToNextRank:Math.max(0,nextRankPoints-mastery.points),
  pointsToNextMilestone:next?Math.max(0,familyMasteryPointsForRank(next.rank)-mastery.points):0,
  currentRankProgress:mastery.points-currentRankPoints,
  currentRankTarget:nextRankPoints-currentRankPoints};
}
