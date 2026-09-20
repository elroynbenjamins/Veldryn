import type {MonsterDef} from '../content/monsters';
import type {CombatChallengeId,GameState} from './types';
import {monsterMastery} from './monster-mastery';

export interface CombatChallengeDef{
 id:CombatChallengeId;
 name:string;
 shortName:string;
 description:string;
 masteryRank:number;
 hpMultiplier:number;
 attackMultiplier:number;
 defenseMultiplier:number;
 cycleMultiplier:number;
 xpMultiplier:number;
 goldMultiplier:number;
 dropChanceMultiplier:number;
 accent:string;
}

export const COMBAT_CHALLENGE_IDS:readonly CombatChallengeId[]=['ferocious','hardened','nemesis'];
export const COMBAT_CHALLENGES:Record<CombatChallengeId,CombatChallengeDef>={
 ferocious:{
  id:'ferocious',name:'Ferocious Hunt',shortName:'Ferocious',masteryRank:3,
  description:'An aggressive variant that hits much harder and rewards faster, safer builds.',
  hpMultiplier:1.22,attackMultiplier:1.32,defenseMultiplier:1.05,cycleMultiplier:1.08,
  xpMultiplier:1.30,goldMultiplier:1.30,dropChanceMultiplier:1.10,accent:'#d76a63',
 },
 hardened:{
  id:'hardened',name:'Hardened Hunt',shortName:'Hardened',masteryRank:10,
  description:'A heavily reinforced target with substantially more durability and improved rewards.',
  hpMultiplier:1.48,attackMultiplier:1.14,defenseMultiplier:1.32,cycleMultiplier:1.16,
  xpMultiplier:1.52,goldMultiplier:1.48,dropChanceMultiplier:1.18,accent:'#c89c54',
 },
 nemesis:{
  id:'nemesis',name:'Nemesis Hunt',shortName:'Nemesis',masteryRank:20,
  description:'A mastery challenge combining dangerous damage, high durability and the strongest hunt rewards.',
  hpMultiplier:1.82,attackMultiplier:1.38,defenseMultiplier:1.22,cycleMultiplier:1.24,
  xpMultiplier:1.88,goldMultiplier:1.80,dropChanceMultiplier:1.32,accent:'#b88ae3',
 },
};

export function combatChallenge(id:CombatChallengeId|undefined){return id?COMBAT_CHALLENGES[id]:undefined;}
export function challengeHuntUnlocked(state:GameState,monsterId:string,id:CombatChallengeId){
 return monsterMastery(state,monsterId).rank>=COMBAT_CHALLENGES[id].masteryRank;
}
export function challengeHuntStats(monster:MonsterDef,id:CombatChallengeId|undefined){
 const challenge=combatChallenge(id);if(!challenge)return monster;
 return {...monster,
  hp:Math.ceil(monster.hp*challenge.hpMultiplier),
  attack:Math.ceil(monster.attack*challenge.attackMultiplier),
  defense:Math.ceil(monster.defense*challenge.defenseMultiplier),
  secondsPerKill:Math.ceil(monster.secondsPerKill*challenge.cycleMultiplier),
 };
}
export function challengeRewardMultipliers(id:CombatChallengeId|undefined){
 const challenge=combatChallenge(id);
 return challenge?{xp:challenge.xpMultiplier,gold:challenge.goldMultiplier,dropChance:challenge.dropChanceMultiplier}:{xp:1,gold:1,dropChance:1};
}
export function challengeHuntLabel(id:CombatChallengeId|undefined,monsterName:string){
 const challenge=combatChallenge(id);return challenge?`${challenge.shortName} · ${monsterName}`:monsterName;
}
