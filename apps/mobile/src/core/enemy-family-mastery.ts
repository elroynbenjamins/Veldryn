import {ENEMY_FAMILIES,enemyFamilyForMonster,type EnemyFamilyId} from '../content/enemy-families';
import {MONSTERS} from '../content/monsters';
import type {GameState} from './types';

/** Weighted family-mastery points: a kill is worth at least 2 points.
 * 250 points/rank requires 125 entry-zone kills versus 25 species kills,
 * and still takes at least 42 top-zone kills per family rank.
 */
export const FAMILY_MASTERY_POINTS_PER_RANK=250;
export const FAMILY_MASTERY_MAX_RANK=30;
export const FAMILY_MASTERY_MAX_POINTS=FAMILY_MASTERY_POINTS_PER_RANK*FAMILY_MASTERY_MAX_RANK;

/** Reward the monster's authored difficulty, never the player's current
 * location or character level (which could be changed without a harder fight).
 * Region floors and enemy-level thresholds both contribute. The maximum of
 * the two avoids inflating rewards by counting the same difficulty twice.
 */
const ZONE_MASTERY_POINTS:Readonly<Record<string,number>>={
 'Greenfields':2,'Silverbrook':2,'Ironwood Forest':2,
 'Old Mines':3,"King's Road":3,'Sunscar':4,'Frostmarch':5,'Ashlands':6,
};
export function enemyFamilyMasteryPointsPerKill(monsterId:string):number{
 const family=enemyFamilyForMonster(monsterId);
 if(!family)return 0;
 const monster=MONSTERS.find(row=>row.id===monsterId&&!row.boss);
 if(!monster)return 0;
 const byLevel=monster.level>=75?6:monster.level>=55?5:monster.level>=35?4:monster.level>=20?3:2;
 const byZone=ZONE_MASTERY_POINTS[monster.zone]??2;
 return Math.max(2,Math.min(6,Math.max(byZone,byLevel)));
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
 * Species counters cap at 750 so earlier excess kills cannot be reconstructed.
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
  // Original species counters are capped at 750 verified kills.
  const count=Math.min(750,Math.floor(value));
  // Credit historical species kills by their authored region/level weight.
  // Historical kills beyond each species cap cannot be reconstructed.
  const weighted=count*enemyFamilyMasteryPointsPerKill(monsterId);
  points[id]=Math.min(FAMILY_MASTERY_MAX_POINTS,(points[id]??0)+weighted);
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
 const perKill=enemyFamilyMasteryPointsPerKill(monsterId);
 if(perKill<2)return state;
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
 return {...mastery,next,killsToNextRank:Math.max(0,mastery.nextRankPoints-mastery.points),
  killsToNextMilestone:next?Math.max(0,next.rank*FAMILY_MASTERY_POINTS_PER_RANK-mastery.points):0};
}
