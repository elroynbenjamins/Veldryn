import type {GameState} from './types';
import type {OwnedCompanionProgress,CompanionSanctuaryState,CompanionPhase2ProfileState,CompanionAvailabilityStatus,CombatCompanionRole} from './combat-companion-types';
import {defaultCompanionSanctuary,reconcileCombatCompanionUnlocks,classCompanionRole} from './combat-companions';
import {COMBAT_COMPANIONS,COMPANION_SANCTUARY_TRAINING_XP_PER_DAY} from '../content/combat-companions';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {simulateCombat} from '../../../../backend/src/server/combat/engine';
import {startCompanionTrial,resolveCompanionTrialFloor,abandonCompanionTrial,claimMonthlyCompanionChallenge} from '../../../../backend/src/server/companions/trials';
import {startCompanionAssignment,claimCompanionAssignment,rolloverCompanionAssignmentStatuses,validateCompanionMissionTeam} from '../../../../backend/src/server/companions/assignments';
import {awardCompanionXpServer,awardCompanionBondXpServer,companionUnlockRequirementsSatisfied,selectCompanionTechnique,setCompanionShowcase,grantCombatCompanionOrConvertDuplicate} from '../../../../backend/src/server/companions/progression-v2';
import {claimCompanionCodexMilestone} from '../../../../backend/src/server/companions/codex';
import {projectCompanionCodex,projectCompanionTrial,projectCompanionProvingGrounds} from '../../../../backend/src/server/companions/projection';
import {claimCompanionProvingGroundChallenge,recordCompanionProvingGroundEvent,activeCompanionProvingGroundChallenges,provingGroundEventMatches} from '../../../../backend/src/server/companions/proving-grounds';
import {companionTrialWeekKey} from '../../../../backend/src/server/companions/trial-season';
import {companionTeamPower,validateCompanionTrialTeam} from '../../../../backend/src/server/companions/team';
import {COMPANION_SPECIAL_CHALLENGES,COMPANION_WEEKLY_CHALLENGES,companionMission,companionTrialRecommendedPower,companionServerDefinition,companionTrialSeasonDefinition} from '../../../../backend/src/server/companions/content';
import {resolveSpecialCompanionChallenge} from '../../../../backend/src/server/companions/special-challenges';
import {companionExpeditionStaminaCost,companionFoodStamina} from './companion-provisions';
import {itemDef} from '../content/items';
import type {CompanionAssignment,CompanionTrialProgress,CompanionProvingGroundState,CompanionOverflowState,OwnedCompanionSnapshot,CompanionEconomyState,CompanionCombatExecutor,CompanionUnlockFacts,CompanionProvingGroundEvent} from '../../../../backend/src/server/companions/domain';
import type {CombatEvent,CombatResult} from '../../../../backend/src/server/combat/types';

function expeditionFoodArg(value:unknown){if(!Array.isArray(value)||value.length<1||value.length>20)throw new Error('invalid_companion_food');return value.map(row=>{if(!row||typeof row!=='object'||Array.isArray(row))throw new Error('invalid_companion_food');const r=row as Record<string,unknown>;if(typeof r.itemId!=='string'||!Number.isSafeInteger(r.quantity)||Number(r.quantity)<1||Number(r.quantity)>10000)throw new Error('invalid_companion_food');const item=itemDef(r.itemId);if(item.type!=='food'||!item.heal)throw new Error('invalid_companion_food');return {itemId:r.itemId,quantity:Number(r.quantity)};});}
function spendExpeditionFood(state:GameState,food:{itemId:string;quantity:number}[],requiredStamina:number){
 const available=(id:string)=>[...state.inventory.stacks,...state.bank.stacks].filter(s=>s.itemId===id).reduce((sum,s)=>sum+s.quantity,0);
 for(const row of food)if(available(row.itemId)<row.quantity)throw new Error('companion_food_missing');
 const supplied=food.reduce((sum,row)=>sum+companionFoodStamina(row.itemId)*row.quantity,0);if(supplied<requiredStamina)throw new Error('companion_stamina_required');
 const spend=(stacks:typeof state.inventory.stacks,id:string,amount:number)=>stacks.map(s=>s.itemId===id?{...s,quantity:s.quantity-amount}:s).filter(s=>s.quantity>0);
 let inventory=state.inventory.stacks.map(x=>({...x})),bank=state.bank.stacks.map(x=>({...x}));
 for(const row of food){let remaining=row.quantity,take=Math.min(remaining,inventory.find(s=>s.itemId===row.itemId)?.quantity??0);if(take){inventory=spend(inventory,row.itemId,take);remaining-=take;}if(remaining)bank=spend(bank,row.itemId,remaining);}
 return {...state,inventory:{...state.inventory,stacks:inventory},bank:{...state.bank,stacks:bank},account:{...state.account,longTermMetrics:{...(state.account.longTermMetrics??{}),'companions.expedition.stamina_supplied':(state.account.longTermMetrics?.['companions.expedition.stamina_supplied']??0)+Math.floor(supplied)}}};
}

/** Additive account schema; game schema 6 and the existing atomic online store remain compatible. */
export type CompanionBattlePlaybackEvent=Pick<CombatEvent,'atMs'|'type'|'actorId'|'targetId'|'abilityId'|'interruptedAbilityId'|'amount'|'critical'|'absorbed'|'detail'>;
export interface CompanionBattlePlaybackUnit{id:string;name:string;team:'players'|'enemies';role:string;maxHp:number;boss:boolean;}
export interface CompanionBattlePlaybackSnapshot{durationMs:number;units:CompanionBattlePlaybackUnit[];abilityNames:Record<string,string>;events:CompanionBattlePlaybackEvent[];}
const PLAYBACK_EVENT_TYPES=new Set<CombatEvent['type']>(['combat_start','phase','cast_start','cast_complete','damage','miss','heal','shield','dot_tick','hot_tick','interrupt','down','death','combat_end']);
function companionBattlePlayback(result:CombatResult):CompanionBattlePlaybackSnapshot{
 const states=[...result.players,...result.enemies],abilityNames:Record<string,string>={BASIC:'Basic attack'};
 for(const state of states){for(const ability of state.definition.abilities)abilityNames[ability.id]=ability.name;for(const phase of state.definition.phases??[])abilityNames[phase.id]=phase.name??phase.id.replace(/_/g,' ');}
 const events=result.events.filter(event=>PLAYBACK_EVENT_TYPES.has(event.type)).map(event=>({atMs:event.atMs,type:event.type,actorId:event.actorId,targetId:event.targetId,abilityId:event.abilityId,interruptedAbilityId:event.interruptedAbilityId,amount:event.amount,critical:event.critical,absorbed:event.absorbed,detail:event.detail})).slice(0,420);
 return {durationMs:result.durationMs,units:states.map(state=>({id:state.definition.id,name:state.definition.name,team:state.definition.team,role:state.definition.role,maxHp:state.definition.stats.maxHp,boss:state.definition.boss===true})),abilityNames,events};
}

export interface CompanionAccountState {
  guideState?:import('./onboarding').OnboardingGuideState;
  collectionPreferences?:import('./collection-preferences').CollectionPreferences;
  /** Account-owned Arena formation; positions are stored as Front/Middle/Back slots. */
  arenaSquadCharacterIds?:string[];
  companionSchemaVersion?:1;
  unlockedCombatCompanionIds?:string[];
  combatCompanionProgress?:Record<string,OwnedCompanionProgress>;
  companionUnlockProgress?:Record<string,number>;
  companionEssence?:number;bondstones?:number;
  companionSanctuary?:CompanionSanctuaryState;
  companionAssignments?:CompanionAssignment[];
  companionTrialProgress?:CompanionTrialProgress;
  companionProvingGround?:CompanionProvingGroundState;
  companionOverflow?:CompanionOverflowState;
  companionPhase2Profile?:CompanionPhase2ProfileState;
  companionMaterials?:Record<string,number>;
  companionBossClears?:Record<string,number>;
  companionSpecialClears?:string[];
  companionAssignmentBondstoneWeek?:string;
  companionAssignmentBondstones?:number;
  companionRematchBondstoneWeek?:string;
  companionRematchBondstones?:number;
  fallenKnightWeekly?:import('./weekly-boss').FallenKnightWeeklyState;
  companionActionSequence?:number;
  companionBondRewardClaims?:string[];
  companionBattleReadyAtMs?:number;
  companionBossRematchReadyAtMs?:number;
  companionLastBattle?:{title:string;won:boolean;durationMs:number;gold:number;essence:number;bondstones:number;atMs:number;playback?:CompanionBattlePlaybackSnapshot};
}
export const COMPANION_REMATCH_WEEKLY_BONDSTONE_CAP=1;
export function companionRematchBondstoneStatus(state:GameState,nowMs:number){
  const week=companionTrialWeekKey(nowMs),used=state.account.companionRematchBondstoneWeek===week?Math.min(COMPANION_REMATCH_WEEKLY_BONDSTONE_CAP,state.account.companionRematchBondstones??0):0;
  return {week,used,cap:COMPANION_REMATCH_WEEKLY_BONDSTONE_CAP,remaining:Math.max(0,COMPANION_REMATCH_WEEKLY_BONDSTONE_CAP-used)};
}
export function awardCompanionRematchBondstone(state:GameState,nowMs:number){
  const status=companionRematchBondstoneStatus(state,nowMs);
  if(status.remaining<=0)return {state,reward:0,status};
  const used=status.used+1;
  return {state:{...state,account:{...state.account,companionRematchBondstoneWeek:status.week,companionRematchBondstones:used}},reward:1,status:{...status,used,remaining:Math.max(0,status.cap-used)}};
}
export const companionCombatExecutor:CompanionCombatExecutor={simulate:input=>simulateCombat(input)};
export function companionOwned(state:GameState):Record<string,OwnedCompanionSnapshot>{
  return Object.fromEntries((state.account.unlockedCombatCompanionIds??[]).flatMap(id=>{
    const p=state.account.combatCompanionProgress?.[id];return p?[[id,{...p,companionId:id}]]:[];
  }));
}
export function companionEconomy(state:GameState):CompanionEconomyState {
  const materials={...(state.account.companionMaterials??{})};
  for(const stack of [...state.inventory.stacks,...state.bank.stacks])materials[stack.itemId]=(materials[stack.itemId]??0)+stack.quantity;
  return {gold:state.character?.gold??0,companionEssence:state.account.companionEssence??0,bondstones:state.account.bondstones??0,materials};
}
/** Apply only material deltas; preserve inventory locations, capacities and unrelated stacks. */
function applyEconomy(state:GameState,economy:CompanionEconomyState):GameState {
  const before=companionEconomy(state),materials={...(state.account.companionMaterials??{})};
  let inventory=state.inventory.stacks.map(x=>({...x})),bank=state.bank.stacks.map(x=>({...x}));
  for(const id of new Set([...Object.keys(before.materials),...Object.keys(economy.materials)])){
    const delta=(economy.materials[id]??0)-(before.materials[id]??0);
    if(delta>=0){if(delta)materials[id]=(materials[id]??0)+delta;continue;}
    let left=-delta;const stored=Math.min(left,materials[id]??0);materials[id]=(materials[id]??0)-stored;left-=stored;
    for(const stacks of [inventory,bank])for(const stack of stacks){if(stack.itemId!==id)continue;const used=Math.min(left,stack.quantity);stack.quantity-=used;left-=used;}
    if(left>0)throw new Error('Missing companion materials.');
  }
  return {...state,inventory:{...state.inventory,stacks:inventory.filter(x=>x.quantity>0)},bank:{...state.bank,stacks:bank.filter(x=>x.quantity>0)},character:state.character?{...state.character,gold:economy.gold}:null,account:{...state.account,companionEssence:economy.companionEssence,bondstones:economy.bondstones,companionMaterials:materials}};
}
function reward(state:GameState,r:{gold?:number;companionEssence?:number;bondstones?:number;materials?:Record<string,number>}):GameState {
  const e=companionEconomy(state);e.gold+=r.gold??0;e.companionEssence+=r.companionEssence??0;e.bondstones+=r.bondstones??0;
  for(const [id,n] of Object.entries(r.materials??{}))e.materials[id]=(e.materials[id]??0)+n;
  return applyEconomy(state,e);
}
function companionMetric(state:GameState,key:string,amount=1):GameState{
  const metrics={...(state.account.longTermMetrics??{})};metrics[key]=(metrics[key]??0)+amount;
  return {...state,account:{...state.account,longTermMetrics:metrics}};
}
function companionMetricMany(state:GameState,entries:Record<string,number>):GameState{
  let next=state;for(const [key,value] of Object.entries(entries))if(value)next=companionMetric(next,key,value);return next;
}
function setOwned(state:GameState,owned:Record<string,OwnedCompanionSnapshot>):GameState {
  return {...state,account:{...state.account,unlockedCombatCompanionIds:Object.keys(owned),combatCompanionProgress:Object.fromEntries(Object.entries(owned).map(([id,p])=>[id,{...state.account.combatCompanionProgress?.[id],...p}]))}};
}
function awardUse(state:GameState,ids:string[],xp:number,bond:number,now:number):GameState {
  const owned=companionOwned(state);let essence=state.account.companionEssence??0,overflow=state.account.companionOverflow;
  const earnedBond=Math.round(bond*(1+(state.account.companionSanctuary?.bondHallLevel??0)*.05));
  for(const id of ids){if(!owned[id])continue;const r=awardCompanionXpServer({progress:owned[id],amount:xp,companionEssence:essence,overflow,serverNowMs:now});essence=r.companionEssence;overflow=r.overflow;owned[id]=awardCompanionBondXpServer(r.progress,earnedBond);}
  return {...setOwned(state,owned),account:{...setOwned(state,owned).account,companionEssence:essence,companionOverflow:overflow}};
}
export function reconcileCompanionDiscoveries(state:GameState):GameState{
  const current=state.account.companionPhase2Profile??{showcaseCompanionIds:[],showcaseSlotsUnlocked:1},discovered=new Set(current.discoveredCompanionIds??[]),facts=companionUnlockFacts(state);
  for(const id of state.account.unlockedCombatCompanionIds??[])discovered.add(id);
  for(const challenge of COMPANION_SPECIAL_CHALLENGES){
    if(!companionServerDefinition(challenge.rewardCompanionId))continue;
    if(companionUnlockRequirementsSatisfied(challenge.requirements,facts))discovered.add(challenge.rewardCompanionId);
  }
  const nextIds=[...discovered];
  if(nextIds.length===(current.discoveredCompanionIds??[]).length&&nextIds.every(id=>(current.discoveredCompanionIds??[]).includes(id)))return state;
  return {...state,account:{...state.account,companionPhase2Profile:{...current,discoveredCompanionIds:nextIds}}};
}
export function refreshCompanions(state:GameState,now:number):GameState {
  let next=reconcileCombatCompanionUnlocks(state,now);
  next={...next,account:{...next.account,companionSchemaVersion:1,companionAssignments:rolloverCompanionAssignmentStatuses(next.account.companionAssignments??[],now),companionTrialProgress:projectCompanionTrial(next.account.companionTrialProgress,now).progress,companionProvingGround:projectCompanionProvingGrounds(next.account.companionProvingGround,now).state}};
  return reconcileCompanionDiscoveries(next);
}
export function companionView(state:GameState,now:number){
  const owned=companionOwned(state),profile=state.account.companionPhase2Profile??{showcaseCompanionIds:[],showcaseSlotsUnlocked:1};
  return {owned,trial:projectCompanionTrial(state.account.companionTrialProgress,now),codex:projectCompanionCodex(owned,profile),weekly:activeCompanionProvingGroundChallenges(now),proving:projectCompanionProvingGrounds(state.account.companionProvingGround,now),assignments:rolloverCompanionAssignmentStatuses(state.account.companionAssignments??[],now)};
}
export function companionAvailability(state:GameState,id:string):{status:CompanionAvailabilityStatus;label:string}{
  if(!(state.account.unlockedCombatCompanionIds??[]).includes(id))return {status:'locked',label:'Locked'};
  const run=state.account.companionTrialProgress?.season.activeRun;
  if(run?.teamCompanionIds.includes(id))return {status:'active_trial',label:'In Trial'};
  const assignment=(state.account.companionAssignments??[]).find(row=>row.status!=='claimed'&&row.status!=='cancelled'&&row.companionIds.includes(id));
  if(assignment)return {status:'expedition',label:assignment.status==='completed'?'Expedition complete':'On Expedition'};
  if(state.character?.equippedCombatCompanionId===id)return {status:'equipped',label:'Equipped'};
  return {status:'available',label:'Available'};
}
export function recommendedCompanionTrialTeam(state:GameState,now=Date.now()){
  const owned=companionOwned(state),roles:CombatCompanionRole[]=['tank','damage','support'];
  const candidates=Object.keys(owned).filter(id=>{const status=companionAvailability(state,id).status;return status==='available'||status==='equipped';});
  const byRole=Object.fromEntries(roles.map(role=>[role,candidates.filter(id=>companionServerDefinition(id)?.role===role)])) as Record<CombatCompanionRole,string[]>;
  const missingRoles=roles.filter(role=>byRole[role].length===0);
  if(missingRoles.length)return {ids:[] as string[],power:0,ready:false,missingRoles,targetChallenge:undefined,targetMet:false,missingAffinities:[] as string[],reason:'Missing a required Trial role.'};
  const projected=projectCompanionTrial(state.account.companionTrialProgress,now).progress,season=companionTrialSeasonDefinition(projected.season.seasonKey);
  const affinityTypes=new Set(['require_affinity','prohibit_affinity','affinity_diversity','affinity_unique']);
  const targetChallenge=season.specialChallenges.map(id=>COMPANION_WEEKLY_CHALLENGES.find(c=>c.id===id)).find(c=>c?.restrictions.some(r=>affinityTypes.has(r.type)));
  const choose=(restrictions:NonNullable<typeof targetChallenge>['restrictions']|undefined)=>{
    let best:string[]=[];let bestPower=-1;
    for(const tank of byRole.tank)for(const damage of byRole.damage)for(const support of byRole.support){
      const ids=[tank,damage,support],check=validateCompanionTrialTeam({companionIds:ids,owned,busyCompanionIds:new Set(),restrictions});
      if(!check.ok)continue;
      const power=check.power;if(power>bestPower){best=ids;bestPower=power;}
    }
    return {ids:best,power:Math.max(0,bestPower)};
  };
  const targeted=targetChallenge?choose(targetChallenge.restrictions):{ids:[] as string[],power:0};
  if(targeted.ids.length)return {...targeted,ready:true,missingRoles:[] as CombatCompanionRole[],targetChallenge:{id:targetChallenge!.id,name:targetChallenge!.name,description:targetChallenge!.description},targetMet:true,missingAffinities:[] as string[],reason:undefined};
  const fallback=choose(undefined);
  const affinityCounts=new Map<string,number>();for(const id of candidates){const affinity=companionServerDefinition(id)?.affinity;if(affinity)affinityCounts.set(affinity,(affinityCounts.get(affinity)??0)+1);}
  const missingAffinities=targetChallenge?.restrictions.flatMap(r=>r.type==='require_affinity'&&(affinityCounts.get(r.affinity)??0)<r.count?[r.affinity]:[])??[];
  return {...fallback,ready:fallback.ids.length===3,missingRoles:[] as CombatCompanionRole[],targetChallenge:targetChallenge?{id:targetChallenge.id,name:targetChallenge.name,description:targetChallenge.description}:undefined,targetMet:!targetChallenge,missingAffinities,reason:targetChallenge?'No available Tank / Damage / Support trio currently meets the monthly Affinity rule.':undefined};
}
export function recommendedCompanionMissionTeam(state:GameState,missionId:string,now:number){
  const mission=companionMission(missionId),owned=companionOwned(state);
  if(!mission)return {ids:[] as string[],power:0,grade:undefined as 'C'|'B'|'A'|'S'|undefined,bonusRequirementMet:false,ready:false,reason:'Assignment unavailable.'};
  const candidates=Object.keys(owned).filter(id=>companionAvailability(state,id).status==='available');
  const equipped=new Set(state.character?.equippedCombatCompanionId?[state.character.equippedCombatCompanionId]:[]),lockedTrial=new Set(state.account.companionTrialProgress?.season.activeRun?.teamCompanionIds??[]);
  const gradeRank={C:0,B:1,A:2,S:3} as const;let best:{ids:string[];power:number;grade:'C'|'B'|'A'|'S';bonusRequirementMet:boolean}|undefined;
  const evaluate=(ids:string[])=>{const check=validateCompanionMissionTeam({missionId,companionIds:ids,owned,assignments:state.account.companionAssignments??[],equippedCompanionIds:equipped,lockedTrialCompanionIds:lockedTrial,expeditionPensLevel:state.account.companionSanctuary?.expeditionPensLevel??0,serverNowMs:now});if(!check.ok)return;const candidate={ids:[...ids],power:check.power,grade:check.grade,bonusRequirementMet:check.bonusRequirementMet};if(!best||gradeRank[candidate.grade]>gradeRank[best.grade]||gradeRank[candidate.grade]===gradeRank[best.grade]&&Number(candidate.bonusRequirementMet)>Number(best.bonusRequirementMet)||gradeRank[candidate.grade]===gradeRank[best.grade]&&candidate.bonusRequirementMet===best.bonusRequirementMet&&candidate.power>best.power)best=candidate;};
  const build=(size:number,start:number,picked:string[])=>{if(picked.length===size){evaluate(picked);return;}for(let i=start;i<candidates.length;i++)build(size,i+1,[...picked,candidates[i]]);};
  for(let size=mission.minCompanions;size<=mission.maxCompanions;size++)build(size,0,[]);
  return best?{...best,ready:true,reason:undefined}:{ids:[] as string[],power:0,grade:undefined as 'C'|'B'|'A'|'S'|undefined,bonusRequirementMet:false,ready:false,reason:'No currently available team meets every assignment requirement.'};
}
/** Training shares the capped max-level XP conversion used by real combat. */
export function claimCompanionTraining(input:GameState,now:number):GameState{
 let state=refreshCompanions(input,now);const sanctuary=state.account.companionSanctuary!,level=sanctuary.trainingGroundLevel;
 if(!level)return state;
 const last=sanctuary.lastTrainingClaimAtMs,day=86400000;
 if(last===undefined)return {...state,account:{...state.account,companionSanctuary:{...sanctuary,lastTrainingClaimAtMs:now}}};
 const days=Math.min(7,Math.floor(Math.max(0,now-last)/day));if(days<1)return state;
 const available=Object.keys(companionOwned(state)).filter(id=>{try{assertCompanionIdle(state,id);return true;}catch{return false;}});
 state=awardUse(state,available,COMPANION_SANCTUARY_TRAINING_XP_PER_DAY[level as 1|2|3]*days,0,now);
 return {...state,account:{...state.account,companionSanctuary:{...sanctuary,lastTrainingClaimAtMs:now-Math.max(0,now-last)%day}}};
}
function stringArg(a:Record<string,unknown>,key:string){const v=a[key];if(typeof v!=='string'||!v||v.length>120)throw new Error(`Invalid ${key}.`);return v;}
function idsArg(a:Record<string,unknown>){const v=a.ids;if(!Array.isArray(v)||v.length>3||v.some(x=>typeof x!=='string'||x.length>80)||new Set(v).size!==v.length)throw new Error('Choose unique companions.');return v as string[];}
export function assertCompanionIdle(state:GameState,id:string){
  if((state.account.companionAssignments??[]).some(a=>a.status!=='claimed'&&a.status!=='cancelled'&&a.companionIds.includes(id))||state.account.companionTrialProgress?.season.activeRun?.teamCompanionIds.includes(id))throw new Error('Companion is busy. Finish or abandon its activity first.');
}
/** Synchronous domain entry point called only inside the existing trusted game transaction online. */
export function executeCompanionActivity(input:GameState,type:string,a:Record<string,unknown>,now:number):GameState {
  let state=refreshCompanions(structuredClone(input),now);if(!state.character)throw new Error('Create a character first.');
  const owned=companionOwned(state),profile=state.account.companionPhase2Profile??{showcaseCompanionIds:[],showcaseSlotsUnlocked:1};
  const assignments=state.account.companionAssignments??[];
  const busy=new Set(assignments.filter(x=>x.status!=='claimed'&&x.status!=='cancelled').flatMap(x=>x.companionIds));
  const sequence=(state.account.companionActionSequence??0)+1,seed=`${state.character.id}:${sequence}:${now}`;
  const trialInput={progress:state.account.companionTrialProgress,owned,busyCompanionIds:busy,trialsUnlocked:['tank','damage','support'].every(role=>Object.keys(owned).some(id=>companionServerDefinition(id)?.role===role)),serverNowMs:now};
  switch(type){
    case 'companion_monthly':{const r=claimMonthlyCompanionChallenge(state.account.companionTrialProgress!,stringArg(a,'id'),now);state=reward(state,r.reward);state.account.companionTrialProgress=r.progress;break;}
    case 'companion_supplies':{
      if(!(state.account.companionSanctuary?.expeditionPensLevel))throw new Error('Build Expedition Pens first.');
      const economy=companionEconomy(state);if(economy.gold<250)throw new Error('Not enough Gold.');
      economy.gold-=250;economy.materials.SUPPLIES=(economy.materials.SUPPLIES??0)+5;state=applyEconomy(state,economy);break;
    }
    case 'companion_bond_reward':{
      const id=stringArg(a,'id'),progress=owned[id];if(!progress)throw new Error('Companion is locked.');
      const rewards:Record<number,number>={2:20,4:35,6:55,8:80},claims=state.account.companionBondRewardClaims??[];
      const requested=a.level===undefined?[8,6,4,2].find(level=>progress.bondLevel>=level&&!claims.includes(`${id}:${level}`)):Number(a.level);
      if(!requested||!rewards[requested])throw new Error('No Bond milestone reward is available.');
      if(progress.bondLevel<requested)throw new Error(`Reach Bond ${requested} first.`);
      const key=`${id}:${requested}`;if(claims.includes(key))throw new Error('Bond reward already claimed.');
      state=reward(state,{companionEssence:rewards[requested]});
      const profileRewards=requested===4?[`COMPANION_PORTRAIT_${id}`]:requested===8?[`COMPANION_TITLE_${id}`]:[];
      if(profileRewards.length){const current=state.account.companionPhase2Profile??{showcaseCompanionIds:[],showcaseSlotsUnlocked:1};state.account.companionPhase2Profile={...current,codexRewardIds:[...new Set([...(current.codexRewardIds??[]),...profileRewards])]};}
      state.account.companionBondRewardClaims=[...claims,key];break;
    }
    case 'companion_trial_start':{
      const ids=idsArg(a),r=startCompanionTrial(trialInput,ids,seed,[],a.floor===undefined?undefined:Number(a.floor));state.account.companionTrialProgress=r.progress;
      state=companionMetricMany(state,{'companions.trial.runs_started':1,'companions.trial.start_team_power_total':r.teamPower});
      for(const id of ids)state=companionMetric(state,`companions.trial.team_usage.${id}`);
      break;
    }
    case 'companion_trial_abandon':{
      if(state.account.companionTrialProgress?.season.activeRun?.runId!==stringArg(a,'id'))throw new Error('Trial run is no longer active.');
      state.account.companionTrialProgress=abandonCompanionTrial(state.account.companionTrialProgress!,now);break;
    }
    case 'companion_trial_floor':{
      if(now<(state.account.companionBattleReadyAtMs??0))throw new Error('Companions are recovering from battle.');
      const run=state.account.companionTrialProgress?.season.activeRun;
      if(!run||a.floor!==run.currentFloor)throw new Error('Trial floor changed. Refresh before continuing.');
      const floor=run.currentFloor,r=resolveCompanionTrialFloor(trialInput,stringArg(a,'id'),companionCombatExecutor),power=companionTeamPower(run.teamCompanionIds,owned);
      state.account.companionTrialProgress=r.progress;state=reward(state,r.reward);
      state=companionMetricMany(state,{[`companions.trial.floor.${floor}.attempts`]:1,[`companions.trial.floor.${floor}.${r.result.victory?'wins':'losses'}`]:1,[`companions.trial.floor.${floor}.duration_ms_total`]:r.result.durationMs,[`companions.trial.floor.${floor}.team_power_total`]:power,'companions.trial.attempts':1,[r.result.victory?'companions.trial.wins':'companions.trial.losses']:1});
      if(floor%5===0)state=companionMetric(state,`companions.trial.boss.${floor}.${r.result.victory?'wins':'losses'}`);
      if(r.result.victory){state=awardUse(state,run.teamCompanionIds,12+run.currentFloor*2,8+(run.currentFloor%5===0?18:0),now);state.account.companionProvingGround=recordCompanionProvingGroundEvent({state:state.account.companionProvingGround,serverNowMs:now,owned,event:{eventId:`${run.runId}:${run.currentFloor}`,type:run.currentFloor%5===0?'trial_boss_clear':'trial_floor_clear',companionIds:run.teamCompanionIds,trialFloor:run.currentFloor,teamPower:companionTeamPower(run.teamCompanionIds,owned),recommendedPower:companionTrialRecommendedPower(run.currentFloor),noDefeats:r.result.players?.every(p=>p.alive)}}).state;}
      state.account.companionBattleReadyAtMs=now+Math.max(1000,r.result.durationMs);
      state.account.companionLastBattle={title:`Trial Floor ${run.currentFloor}`,won:r.result.victory,durationMs:r.result.durationMs,gold:r.reward.gold,essence:r.reward.companionEssence,bondstones:r.reward.bondstones,atMs:now,playback:companionBattlePlayback(r.result)};break;
    }
    case 'companion_assignment_start':{
      const missionDef=companionMission(stringArg(a,'id'));if(!missionDef)throw new Error('unknown_companion_mission');const food=expeditionFoodArg(a.food),requiredStamina=companionExpeditionStaminaCost(missionDef.durationMs/3600000);
      const r=startCompanionAssignment({accountId:state.character.id,missionId:stringArg(a,'id'),companionIds:idsArg(a),owned,assignments:assignments.filter(x=>x.status!=='claimed'&&x.status!=='cancelled'),equippedCompanionIds:new Set(state.character.equippedCombatCompanionId?[state.character.equippedCombatCompanionId]:[]),lockedTrialCompanionIds:new Set(state.account.companionTrialProgress?.season.activeRun?.teamCompanionIds??[]),expeditionPensLevel:state.account.companionSanctuary?.expeditionPensLevel??0,economy:companionEconomy(state),serverNowMs:now,requestId:seed});
      state=spendExpeditionFood(state,food,requiredStamina);state=applyEconomy(state,r.economy);state.account.companionAssignments=[...assignments.filter(x=>x.status==='claimed'||x.status==='cancelled').slice(-8),...assignments.filter(x=>x.status!=='claimed'&&x.status!=='cancelled'),r.assignment];
      state=companionMetric(state,`companions.expedition.${r.assignment.missionId}.starts`);for(const id of r.assignment.companionIds)state=companionMetric(state,`companions.expedition.usage.${id}`);
      break;
    }
    case 'companion_assignment_claim':{
      const assignment=assignments.find(x=>x.assignmentId===stringArg(a,'id'));if(!assignment)throw new Error('Assignment not found.');
      const week=companionTrialWeekKey(now),used=state.account.companionAssignmentBondstoneWeek===week?state.account.companionAssignmentBondstones??0:0;
      const r=claimCompanionAssignment({assignment,owned,serverNowMs:now,bondstonesClaimedThisWeek:used});state=reward(state,r.reward);
      for(const id of assignment.companionIds)state=awardUse(state,[id],r.reward.companionXpById?.[id]??0,r.reward.bondXpById?.[id]??0,now);
      const missionDef=companionMission(assignment.missionId),unlockProgress={...(state.account.companionUnlockProgress??{})};
      if(missionDef?.originId){const missionKey=`COMPANION_MISSIONS:${missionDef.originId}`;unlockProgress[missionKey]=(unlockProgress[missionKey]??0)+1;if(r.assignment.performanceGrade==='S'){const gradeKey=`COMPANION_S_GRADE:${missionDef.originId}`;unlockProgress[gradeKey]=(unlockProgress[gradeKey]??0)+1;}}
      state.account.companionUnlockProgress=unlockProgress;
      state.account.companionAssignments=assignments.map(x=>x.assignmentId===assignment.assignmentId?r.assignment:x);state.account.companionAssignmentBondstoneWeek=week;state.account.companionAssignmentBondstones=used+r.reward.bondstones;
      state=companionMetricMany(state,{[`companions.expedition.${assignment.missionId}.claims`]:1,[`companions.expedition.${assignment.missionId}.grade.${r.assignment.performanceGrade??'C'}`]:1,[`companions.expedition.${assignment.missionId}.essence_earned`]:r.reward.companionEssence,[`companions.expedition.${assignment.missionId}.bondstones_earned`]:r.reward.bondstones,[`companions.expedition.${assignment.missionId}.bonus_rewards`]:r.reward.bonusRewardGranted?1:0});
      break;
    }
    case 'companion_technique':{
      const id=stringArg(a,'id');assertCompanionIdle(state,id);if(!owned[id])throw new Error('Companion is locked.');
      const technique=stringArg(a,'technique'),r=selectCompanionTechnique(owned[id],technique,companionEconomy(state));state=applyEconomy(setOwned(state,{...owned,[id]:r.progress}),r.economy);
      state=companionMetric(state,`companions.technique.${id}.${technique}.selections`);break;
    }
    case 'companion_codex':{const r=claimCompanionCodexMilestone({milestoneId:stringArg(a,'id'),owned,profile,economy:companionEconomy(state)});state=applyEconomy(state,r.economy);state.account.companionPhase2Profile=r.profile;break;}
    case 'companion_showcase':{state.account.companionPhase2Profile=setCompanionShowcase(profile,new Set(Object.keys(owned)),a.id===undefined?undefined:stringArg(a,'id'),idsArg(a));break;}
    case 'companion_weekly':{const r=claimCompanionProvingGroundChallenge({state:state.account.companionProvingGround,serverNowMs:now,challengeId:stringArg(a,'id')});state=reward(state,r.reward);if(Object.keys(owned).some(id=>companionServerDefinition(id)?.originId.startsWith('EVENT_')))state=reward(state,{materials:{EVENT_BONDBLOOM:1}});state.account.companionProvingGround=r.state;state.account.companionPhase2Profile={...profile,codexRewardIds:[...new Set([...(profile.codexRewardIds??[]),...(r.reward.rewardIds??[])])]};break;}
    case 'companion_special':{
      if(now<(state.account.companionBattleReadyAtMs??0))throw new Error('Companions are recovering from battle.');
      const id=stringArg(a,'id');if(state.account.companionSpecialClears?.includes(id))throw new Error('Special challenge reward already claimed.');
      for(const locked of state.account.companionTrialProgress?.season.activeRun?.teamCompanionIds??[])busy.add(locked);
      const teamIds=idsArg(a),r=resolveSpecialCompanionChallenge({challengeId:id,facts:companionUnlockFacts(state),teamIds,owned,busyCompanionIds:busy,seed},companionCombatExecutor);
      state=companionMetricMany(state,{[`companions.special.${id}.attempts`]:1,[`companions.special.${id}.${r.result.victory?'wins':'losses'}`]:1,[`companions.special.${id}.duration_ms_total`]:r.result.durationMs});
      if(r.unlockedCompanionId){const granted=grantCombatCompanionOrConvertDuplicate({companionId:r.unlockedCompanionId,owned,companionEssence:state.account.companionEssence??0});state=setOwned(state,granted.owned);state.account.companionEssence=granted.companionEssence;state.account.companionSpecialClears=[...(state.account.companionSpecialClears??[]),id];}
      state.account.companionBattleReadyAtMs=now+Math.max(1000,r.result.durationMs);
      state.account.companionLastBattle={title:'Special Companion Challenge',won:r.result.victory,durationMs:r.result.durationMs,gold:0,essence:0,bondstones:0,atMs:now,playback:companionBattlePlayback(r.result)};break;
    }
    default:throw new Error('Unknown companion activity.');
  }
  state.account.companionActionSequence=sequence;return refreshCompanions(state,now);
}
export function companionUnlockFacts(state:GameState):CompanionUnlockFacts {
  const owned=companionOwned(state),ownedByRole={tank:0,damage:0,support:0},bondTotalByOrigin:Record<string,number>={},levelTotalByOrigin:Record<string,number>={};
  for(const [id,p] of Object.entries(owned)){const d=companionServerDefinition(id);if(!d)continue;ownedByRole[d.role]++;bondTotalByOrigin[d.originId]=(bondTotalByOrigin[d.originId]??0)+p.bondLevel;levelTotalByOrigin[d.originId]=(levelTotalByOrigin[d.originId]??0)+p.level;}
  return {highestTrialFloor:state.account.companionTrialProgress?.lifetime.lifetimeHighestFloor??0,specialBossClears:new Set(state.account.companionSpecialClears??[]),bossClearCounts:{...Object.fromEntries(state.defeatedBossIds.map(id=>[id,1])),...state.account.companionBossClears},regionCompletion:new Set(state.quests.some(q=>q.questId==='QST_015'&&q.status==='claimed')?['REG_001']:[]),eventCompletion:new Set(),ownedCompanionIds:new Set(Object.keys(owned)),ownedByRole,bondTotal:Object.values(owned).reduce((s,p)=>s+p.bondLevel,0),levelTotal:Object.values(owned).reduce((s,p)=>s+p.level,0),bondTotalByOrigin,levelTotalByOrigin,achievements:new Set(),mastery:state.account.companionUnlockProgress??{},reputation:{},eventChallenges:new Set(),companionEssence:state.account.companionEssence??0};
}
/** Call only for settled, verified activity. Counts never arrive from a client command. */
export function recordCompanionActivity(state:GameState,source:'combat'|'gathering'|'boss'|'crafting',target:string,units:number,now:number):GameState {
  if(units<=0)return state;
  let next=structuredClone(state);const counters={...(next.account.companionUnlockProgress??{})};
  if(source==='combat'){
    const oldMines=WORLD_ZONES.find(zone=>zone.id==='OLD_MINES');
    if(oldMines&&MONSTERS.find(m=>m.id===target)?.zone===oldMines.name)counters.OLD_MINES_KILLS=(counters.OLD_MINES_KILLS??0)+units;
  }
  if(source==='gathering'){
    const gatheringNodes=[...GATHERING,...HERB_NODES];
    const node=gatheringNodes.find(g=>g.id===target);if(node?.zoneId==='SILVERBROOK')counters[`node:${target}`]=1;
    const nodes=gatheringNodes.filter(g=>g.zoneId==='SILVERBROOK');if(nodes.length&&nodes.every(g=>counters[`node:${g.id}`]))counters.SILVERBROOK_NODES=1;
  }
  if(source==='crafting')counters.EQUIPMENT_CRAFTS=(counters.EQUIPMENT_CRAFTS??0)+units;
  if(source==='boss')next.account.companionBossClears={...next.account.companionBossClears,[target]:(next.account.companionBossClears?.[target]??0)+units};
  next.account.companionUnlockProgress=counters;
  const id=next.character?.equippedCombatCompanionId;
  const available=id&&!next.account.companionTrialProgress?.season.activeRun?.teamCompanionIds.includes(id)&&!(next.account.companionAssignments??[]).some(a=>a.status!=='claimed'&&a.status!=='cancelled'&&a.companionIds.includes(id));
  if(id&&available&&(source==='combat'||source==='boss')){
    next=companionMetricMany(next,{[`companions.usage.${id}.${source}_units`]:units,[`companions.usage.${id}.settlements`]:1});
    next=awardUse(next,[id],(source==='boss'?120:9)*units,(source==='boss'?60:4)*units,now);
    const event:CompanionProvingGroundEvent={eventId:`${target}:${now}`,type:source==='boss'?'boss_defeat':'battle_complete',companionIds:[id],characterRole:classCompanionRole(next.character!.classId)};
    const view=projectCompanionProvingGrounds(next.account.companionProvingGround,now),owned=companionOwned(next),progress={...view.state.progress},completed=new Set(view.state.completedIds);
    for(const def of activeCompanionProvingGroundChallenges(now).definitions)if(provingGroundEventMatches(def,event,owned)){progress[def.id]=Math.min(def.targetCount,(progress[def.id]??0)+units);if(progress[def.id]>=def.targetCount)completed.add(def.id);}
    next.account.companionProvingGround={...view.state,progress,completedIds:[...completed]};
  }
  return reconcileCombatCompanionUnlocks(next,now);
}
