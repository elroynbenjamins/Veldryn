import type {MonsterDef} from '../content/monsters';
import type {CombatAffixId,CombatChallengeId,GameState} from './types';
import {hash32} from './rng';
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

export interface CombatAffixDef{
 id:CombatAffixId;name:string;description:string;hpMultiplier:number;attackMultiplier:number;defenseMultiplier:number;xpMultiplier:number;goldMultiplier:number;dropChanceMultiplier:number;accent:string;
}
export const COMBAT_AFFIX_IDS:readonly CombatAffixId[]=['bloodthirsty','ironhide','colossal','cursed'];
export const COMBAT_AFFIXES:Record<CombatAffixId,CombatAffixDef>={
 bloodthirsty:{id:'bloodthirsty',name:'Bloodthirsty',description:'Hits harder than the standard challenge profile.',hpMultiplier:1,attackMultiplier:1.18,defenseMultiplier:1,xpMultiplier:1.06,goldMultiplier:1.12,dropChanceMultiplier:1,accent:'#d95763'},
 ironhide:{id:'ironhide',name:'Ironhide',description:'Extra armour slows kills but improves material odds.',hpMultiplier:1,attackMultiplier:1,defenseMultiplier:1.20,xpMultiplier:1.05,goldMultiplier:1.04,dropChanceMultiplier:1.12,accent:'#c6a35a'},
 colossal:{id:'colossal',name:'Colossal',description:'More health turns each kill into a longer endurance check.',hpMultiplier:1.24,attackMultiplier:1.06,defenseMultiplier:1,xpMultiplier:1.12,goldMultiplier:1.06,dropChanceMultiplier:1.05,accent:'#7bb6d8'},
 cursed:{id:'cursed',name:'Cursed',description:'A broad difficulty increase with balanced bonus rewards.',hpMultiplier:1.10,attackMultiplier:1.10,defenseMultiplier:1.10,xpMultiplier:1.08,goldMultiplier:1.08,dropChanceMultiplier:1.08,accent:'#a67be0'},
};
export const COMBAT_CHALLENGE_IDS:readonly CombatChallengeId[]=['ferocious','hardened','nemesis','apex'];
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
 apex:{
  id:'apex',name:'Apex Hunt',shortName:'Apex',masteryRank:30,
  description:'The species capstone: extreme durability and pressure for players who have fully mastered this monster.',
  hpMultiplier:2.35,attackMultiplier:1.55,defenseMultiplier:1.40,cycleMultiplier:1.35,
  xpMultiplier:2.35,goldMultiplier:2.20,dropChanceMultiplier:1.55,accent:'#f0b35a',
 },
};

export function combatChallenge(id:CombatChallengeId|undefined){return id?COMBAT_CHALLENGES[id]:undefined;}
export function challengeHuntUnlocked(state:GameState,monsterId:string,id:CombatChallengeId){
 return monsterMastery(state,monsterId).rank>=COMBAT_CHALLENGES[id].masteryRank;
}
export function combatAffix(id:CombatAffixId|undefined){return id?COMBAT_AFFIXES[id]:undefined;}
export function challengeAffixWeekKey(nowMs:number){const d=new Date(nowMs),day=(d.getUTCDay()+6)%7;return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-day).toString();}
export function rotatingChallengeAffix(monsterId:string,challengeId:CombatChallengeId,nowMs:number):CombatAffixId{
 const key=challengeAffixWeekKey(nowMs),index=hash32(`${key}:${monsterId}:${challengeId}`)%COMBAT_AFFIX_IDS.length;return COMBAT_AFFIX_IDS[index];
}
export function challengeHuntStats(monster:MonsterDef,id:CombatChallengeId|undefined,affixId?:CombatAffixId){
 const challenge=combatChallenge(id);if(!challenge)return monster;const affix=combatAffix(affixId);
 return {...monster,
  hp:Math.ceil(monster.hp*challenge.hpMultiplier*(affix?.hpMultiplier??1)),
  attack:Math.ceil(monster.attack*challenge.attackMultiplier*(affix?.attackMultiplier??1)),
  defense:Math.ceil(monster.defense*challenge.defenseMultiplier*(affix?.defenseMultiplier??1)),
  secondsPerKill:Math.ceil(monster.secondsPerKill*challenge.cycleMultiplier),
 };
}
export function challengeRewardMultipliers(id:CombatChallengeId|undefined,affixId?:CombatAffixId){
 const challenge=combatChallenge(id),affix=combatAffix(affixId);
 return challenge?{xp:challenge.xpMultiplier*(affix?.xpMultiplier??1),gold:challenge.goldMultiplier*(affix?.goldMultiplier??1),dropChance:challenge.dropChanceMultiplier*(affix?.dropChanceMultiplier??1)}:{xp:1,gold:1,dropChance:1};
}
export function challengeHuntLabel(id:CombatChallengeId|undefined,monsterName:string,affixId?:CombatAffixId){
 const challenge=combatChallenge(id),affix=combatAffix(affixId);return challenge?`${challenge.shortName}${affix?` [${affix.name}]`:''} · ${monsterName}`:monsterName;
}

export function challengeHuntClearKey(monsterId:string,challengeId:CombatChallengeId){return `${monsterId}:${challengeId}`;}
export function challengeHuntCleared(state:GameState,monsterId:string,challengeId:CombatChallengeId){return !!state.character?.challengeHuntClearIds?.includes(challengeHuntClearKey(monsterId,challengeId));}
export function challengeHuntFirstClearReward(monster:MonsterDef,challengeId:CombatChallengeId){
 const level=Math.max(1,monster.level);
 const tier=challengeId==='ferocious'?{gold:20,dust:2,cores:0}:challengeId==='hardened'?{gold:34,dust:4,cores:1}:challengeId==='nemesis'?{gold:55,dust:7,cores:1}:{gold:90,dust:10,cores:2};
 return {gold:Math.max(75,level*tier.gold),items:[{itemId:'TEMPERING_DUST',quantity:tier.dust},...(tier.cores?[{itemId:'TEMPERING_CORE',quantity:tier.cores}]:[])],label:`${COMBAT_CHALLENGES[challengeId].name} first clear`};
}
