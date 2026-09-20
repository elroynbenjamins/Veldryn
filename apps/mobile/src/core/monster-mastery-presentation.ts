import type {GameState} from './types';
import {COMBAT_CHALLENGES,COMBAT_CHALLENGE_IDS,challengeHuntClearSummary} from './challenge-hunts';
import {MASTERY_POINTS_PER_RANK,MONSTER_MASTERY_MAX_RANK,monsterMastery} from './monster-mastery';

export interface MasteryMilestone{
 rank:number;
 label:string;
 detail:string;
 kind:'challenge'|'combat'|'knowledge'|'materials'|'cosmetic'|'capstone';
}

const FIXED_MILESTONES:MasteryMilestone[]=[
 {rank:5,label:'Hunter Instinct',detail:'+1% damage against this species.',kind:'combat'},
 {rank:10,label:'Drop Knowledge',detail:'Reveal the full base drop table.',kind:'knowledge'},
 {rank:15,label:'Material Expertise',detail:'+3% normal material yield from this species.',kind:'materials'},
 {rank:20,label:'Elite Knowledge',detail:'Reveal advanced mastery knowledge and Nemesis access.',kind:'knowledge'},
 {rank:25,label:'Mastery Badge',detail:'Unlock the species mastery badge.',kind:'cosmetic'},
 {rank:30,label:'Perfect Study',detail:'+2% damage and +5% normal material yield.',kind:'capstone'},
];
export const MONSTER_MASTERY_MILESTONES:readonly MasteryMilestone[]=[
 ...COMBAT_CHALLENGE_IDS.map(id=>({rank:COMBAT_CHALLENGES[id].masteryRank,label:COMBAT_CHALLENGES[id].name,detail:`Unlock ${COMBAT_CHALLENGES[id].shortName} Challenge Hunts for this species.`,kind:'challenge' as const})),
 ...FIXED_MILESTONES,
].sort((a,b)=>a.rank-b.rank||a.label.localeCompare(b.label));

export function unlockedMasteryMilestones(rank:number){return MONSTER_MASTERY_MILESTONES.filter(row=>rank>=row.rank);}
export function nextMasteryMilestone(rank:number){return MONSTER_MASTERY_MILESTONES.find(row=>rank<row.rank);}
export function monsterMasteryGuidance(state:GameState,id:string){
 const mastery=monsterMastery(state,id),clearSummary=challengeHuntClearSummary(state,id),next=nextMasteryMilestone(mastery.rank),nextRankPoints=mastery.rank>=MONSTER_MASTERY_MAX_RANK?MASTERY_POINTS_PER_RANK*MONSTER_MASTERY_MAX_RANK:(mastery.rank+1)*MASTERY_POINTS_PER_RANK;
 return {
  ...mastery,
  next,
  killsToNextRank:Math.max(0,nextRankPoints-mastery.points),
  killsToNextMilestone:next?Math.max(0,next.rank*MASTERY_POINTS_PER_RANK-mastery.points):0,
  challengeUnlocks:COMBAT_CHALLENGE_IDS.map(id=>({id,def:COMBAT_CHALLENGES[id],unlocked:mastery.rank>=COMBAT_CHALLENGES[id].masteryRank,cleared:clearSummary.rows.find(row=>row.id===id)?.cleared??false})),
  clearSummary,
 };
}
export function masterySummary(state:GameState,ids:string[]){
 const rows=ids.map(id=>monsterMasteryGuidance(state,id));
 return {
  species:rows.length,
  totalRanks:rows.reduce((sum,row)=>sum+row.rank,0),
  rank10:rows.filter(row=>row.rank>=10).length,
  rank20:rows.filter(row=>row.rank>=20).length,
  rank30:rows.filter(row=>row.rank>=30).length,
  challengeTiers:rows.reduce((sum,row)=>sum+row.challengeUnlocks.filter(challenge=>challenge.unlocked).length,0),
  challengeClears:rows.reduce((sum,row)=>sum+row.clearSummary.cleared,0),
  conqueredSpecies:rows.filter(row=>row.clearSummary.conquered).length,
 };
}
