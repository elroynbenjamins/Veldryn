import {COMPANION_PROVING_GROUNDS,companionServerDefinition} from './content';
import type {CompanionRarity} from './policy';
import {companionTrialWeekKey} from './trial-season';
import type {CompanionProvingGroundChallengeDefinition,CompanionProvingGroundEvent,CompanionProvingGroundState,OwnedCompanionSnapshot} from './domain';

const RARITY_ORDER:Record<CompanionRarity,number>={standard:0,rare:1,elite:2,prestige:3};
export const COMPANION_PROVING_GROUND_WEEKLY_COUNT=3;
export function activeCompanionProvingGroundChallenges(serverNowMs:number){const weekKey=companionTrialWeekKey(serverNowMs),hash=[...weekKey].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,17),start=hash%COMPANION_PROVING_GROUNDS.length,definitions:Array<CompanionProvingGroundChallengeDefinition>=[];for(let i=0;i<Math.min(COMPANION_PROVING_GROUND_WEEKLY_COUNT,COMPANION_PROVING_GROUNDS.length);i++)definitions.push(COMPANION_PROVING_GROUNDS[(start+i)%COMPANION_PROVING_GROUNDS.length]);return {weekKey,definitions};}
export function newCompanionProvingGroundState(serverNowMs:number):CompanionProvingGroundState{return {weekKey:companionTrialWeekKey(serverNowMs),progress:{},completedIds:[],claimedIds:[]};}
export function rolloverCompanionProvingGroundState(state:CompanionProvingGroundState|undefined,serverNowMs:number){const weekKey=companionTrialWeekKey(serverNowMs);return !state||state.weekKey!==weekKey?{state:newCompanionProvingGroundState(serverNowMs),rolled:true}:{state,rolled:false};}
function eventMembers(event:CompanionProvingGroundEvent,owned:Record<string,OwnedCompanionSnapshot>){return event.companionIds.map(id=>({def:companionServerDefinition(id),progress:owned[id]})).filter((x):x is {def:NonNullable<ReturnType<typeof companionServerDefinition>>;progress:OwnedCompanionSnapshot}=>!!x.def&&!!x.progress);}
function rarityMixSatisfied(rarities:CompanionRarity[],members:ReturnType<typeof eventMembers>){return rarities.every((r,i)=>i===rarities.length-1&&r==='elite'?members.some(x=>x.def.rarity==='elite'||x.def.rarity==='prestige'):members.some(x=>x.def.rarity===r));}
export function provingGroundEventMatches(definition:CompanionProvingGroundChallengeDefinition,event:CompanionProvingGroundEvent,owned:Record<string,OwnedCompanionSnapshot>){
 if(!definition.eventTypes.includes(event.type))return false;const members=eventMembers(event,owned);if(!members.length)return false;const c=definition.condition;
 if(c.maxRarity&& !members.some(x=>RARITY_ORDER[x.def.rarity]<=RARITY_ORDER[c.maxRarity!]))return false;
 if(c.minBondLevel!==undefined&&!members.some(x=>x.progress.bondLevel>=c.minBondLevel!))return false;
 if(c.requiredCharacterRole&&event.characterRole!==c.requiredCharacterRole)return false;
 if(c.requiredCompanionRole&&!members.some(x=>x.def.role===c.requiredCompanionRole))return false;
 if(c.requiredRarity&&!members.some(x=>x.def.rarity===c.requiredRarity))return false;
 if(c.requiredOriginId&&(members.filter(x=>x.def.originId===c.requiredOriginId).length<(c.requiredOriginCount??1)))return false;
 if(!c.requiredOriginId&&c.requiredOriginCount){const counts=new Map<string,number>();for(const x of members)counts.set(x.def.originId,(counts.get(x.def.originId)??0)+1);if(Math.max(0,...counts.values())<c.requiredOriginCount)return false;}
 if(c.trialBoss===true&&event.type!=='trial_boss_clear')return false;
 if(c.belowRecommendedPower===true&&!(typeof event.teamPower==='number'&&typeof event.recommendedPower==='number'&&event.teamPower<event.recommendedPower))return false;
 if(c.rarityMix&&!rarityMixSatisfied(c.rarityMix,members))return false;
 return true;
}
export function recordCompanionProvingGroundEvent(input:{state?:CompanionProvingGroundState;serverNowMs:number;event:CompanionProvingGroundEvent;owned:Record<string,OwnedCompanionSnapshot>}){
 const rolled=rolloverCompanionProvingGroundState(input.state,input.serverNowMs),active=activeCompanionProvingGroundChallenges(input.serverNowMs),progress={...rolled.state.progress},completed=new Set(rolled.state.completedIds);
 for(const def of active.definitions){if(completed.has(def.id)||!provingGroundEventMatches(def,input.event,input.owned))continue;const next=Math.min(def.targetCount,(progress[def.id]??0)+1);progress[def.id]=next;if(next>=def.targetCount)completed.add(def.id);}
 return {state:{...rolled.state,progress,completedIds:[...completed]},rolled:rolled.rolled,active:active.definitions};
}
export function claimCompanionProvingGroundChallenge(input:{state?:CompanionProvingGroundState;serverNowMs:number;challengeId:string}){
 const rolled=rolloverCompanionProvingGroundState(input.state,input.serverNowMs),active=activeCompanionProvingGroundChallenges(input.serverNowMs),definition=active.definitions.find(x=>x.id===input.challengeId);if(!definition)throw new Error('proving_ground_challenge_not_active');if(!rolled.state.completedIds.includes(definition.id))throw new Error('proving_ground_challenge_not_complete');if(rolled.state.claimedIds.includes(definition.id))throw new Error('proving_ground_challenge_already_claimed');return {state:{...rolled.state,claimedIds:[...rolled.state.claimedIds,definition.id]},reward:definition.rewards,definition};
}
